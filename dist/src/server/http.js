/**
 * SwitchCortex — Streamable HTTP MCP Server + Interactive Live Governance Studio UI
 *
 * Endpoints:
 * - POST /mcp              -> Standard MCP JSON-RPC 2.0 endpoint (HTTP transport)
 * - GET  /health           -> Health and formal verification status
 * - GET  /api/state        -> Live runtime state, instances, blueprints, and SHA-256 ledger
 * - POST /api/scenario/:id -> Run demo scenario (1, 2, 3, 4, all, reset)
 * - POST /api/live-chat    -> Trigger real Google Gemini multi-department AI agents on a chat prompt
 * - POST /api/human-gate   -> Approve/reject a humanOnly gate (or test agent self-approval block)
 * - POST /api/undo         -> Trigger reverse-topological compensating rollback (undo_workflow)
 * - POST /api/slack/events -> Slack Event Subscriptions & Switch AI Room webhook bridge
 * - GET  /                 -> Interactive Switch Room + BPMN 2.0 + DMN 1.3 Web Studio
 */
import * as http from 'node:http';
import { decideHumanGateAndContinue, getLiveIntegrationStatus, runLiveChatWorkflow, syncTranscriptToSlack, } from '../agents/live-orchestrator.js';
import { DEFAULT_BPMN_PROCESS, DEFAULT_DMN_TABLE, } from '../blueprints/defaults.js';
import { SwitchCortexRuntime } from '../governance/runtime.js';
import { CORTEX_MCP_TOOLS, handleMcpJsonRpc } from '../mcp/server.js';
import { renderMotionGraphicsHtml } from './motion.js';
import { runAllDemoScenarios, runScenario1GreenLane, runScenario2MultiDeptHumanGate, runScenario3GuardrailAndRollback, runScenario4FormalVerification, } from '../sim/scenarios.js';
export function createCortexHttpServer(initialRuntime) {
    let runtime = initialRuntime ?? new SwitchCortexRuntime();
    let lastScenarioSummaries = [];
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        // CORS headers for local developer tools
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.method === 'GET' && url.pathname === '/health') {
            const blueprints = runtime.listBlueprints();
            const ledgerIntegrity = runtime.ledger.verifyIntegrity();
            const liveStatus = getLiveIntegrationStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                service: 'switch-cortex',
                version: '1.0.0',
                mcpToolsCount: CORTEX_MCP_TOOLS.length,
                liveIntegration: liveStatus,
                blueprints,
                ledgerIntegrity,
            }));
            return;
        }
        if (req.method === 'POST' && url.pathname === '/mcp') {
            const body = await readBody(req);
            try {
                const rpcReq = JSON.parse(body);
                const rpcRes = handleMcpJsonRpc(runtime, rpcReq);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rpcRes ?? { jsonrpc: '2.0', id: null, result: {} }));
            }
            catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: err instanceof Error ? err.message : String(err) },
                }));
            }
            return;
        }
        if (req.method === 'GET' && url.pathname === '/api/state') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                liveIntegration: getLiveIntegrationStatus(),
                blueprints: runtime.listBlueprints(),
                dmnTable: runtime.getDmnTable(DEFAULT_DMN_TABLE.id),
                bpmnProcess: runtime.getBpmnProcess(DEFAULT_BPMN_PROCESS.id),
                instances: runtime.listInstances(),
                inbox: runtime.listInbox(),
                ledgerIntegrity: runtime.ledger.verifyIntegrity(),
                ledgerEntries: runtime.ledger.list(),
                scenarioSummaries: lastScenarioSummaries,
            }));
            return;
        }
        if (req.method === 'POST' && url.pathname === '/api/live-chat') {
            const body = await readBody(req);
            try {
                const parsed = JSON.parse(body);
                if (!parsed.prompt || !parsed.prompt.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'Missing prompt' }));
                    return;
                }
                const liveRes = await runLiveChatWorkflow(runtime, parsed);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(liveRes));
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
            }
            return;
        }
        if (req.method === 'POST' && url.pathname === '/api/human-gate') {
            const body = await readBody(req);
            try {
                const parsed = JSON.parse(body);
                const out = await decideHumanGateAndContinue(runtime, {
                    instanceId: parsed.instanceId,
                    caller: {
                        id: parsed.callerId ?? '@eng-manager',
                        kind: parsed.callerKind ?? 'human',
                        department: parsed.department ?? 'Executive',
                    },
                    approved: parsed.approved ?? true,
                    comment: parsed.comment ??
                        'Approved in Switch Room after verifying @sec-agent and @finops-agent sign-offs.',
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(out));
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
            }
            return;
        }
        if (req.method === 'POST' && url.pathname === '/api/undo') {
            const body = await readBody(req);
            try {
                const parsed = JSON.parse(body);
                const wfBefore = runtime.getInstance(parsed.instanceId);
                const prevLen = wfBefore ? wfBefore.roomTranscript.length : 0;
                const out = runtime.superviseControl({
                    action: 'undo_workflow',
                    targetId: parsed.instanceId,
                    caller: {
                        id: parsed.callerId ?? '@ciso',
                        kind: 'human',
                        department: 'Executive',
                    },
                    reason: parsed.reason ??
                        'Aborted by supervisor in Switch Room; executing reverse-topological compensating rollback.',
                });
                const wfAfter = runtime.getInstance(parsed.instanceId);
                if (wfAfter) {
                    await syncTranscriptToSlack(wfAfter, prevLen);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(out));
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
            }
            return;
        }
        // Standard Slack Event Subscriptions & Switch AI Room Webhook Endpoint
        if (req.method === 'POST' && url.pathname === '/api/slack/events') {
            const body = await readBody(req);
            try {
                const payload = JSON.parse(body);
                // 1. Slack URL Verification handshake
                if (payload.type === 'url_verification' && payload.challenge) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ challenge: payload.challenge }));
                    return;
                }
                // Ignore bot self-messages to avoid loops
                if (payload.event?.bot_id) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, ignored: 'bot_message' }));
                    return;
                }
                const text = payload.event?.text ?? payload.text ?? '';
                const user = payload.event?.user ? `@slack-${payload.event.user}` : payload.user_name ? `@${payload.user_name}` : '@alice-devops';
                if (text.trim()) {
                    const liveRes = await runLiveChatWorkflow(runtime, {
                        prompt: text,
                        senderId: user,
                        senderKind: 'human',
                        department: 'SRE',
                        roomChannel: '#switch-ops-room',
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, instanceId: liveRes.instance.instanceId, status: liveRes.instance.status }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            }
            catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
            }
            return;
        }
        if (req.method === 'POST' && url.pathname.startsWith('/api/scenario/')) {
            const id = url.pathname.replace('/api/scenario/', '');
            if (id === 'reset') {
                runtime = new SwitchCortexRuntime();
                lastScenarioSummaries = [];
            }
            else if (id === '1') {
                lastScenarioSummaries.push(runScenario1GreenLane(runtime));
            }
            else if (id === '2') {
                lastScenarioSummaries.push(runScenario2MultiDeptHumanGate(runtime));
            }
            else if (id === '3') {
                lastScenarioSummaries.push(runScenario3GuardrailAndRollback(runtime));
            }
            else if (id === '4') {
                lastScenarioSummaries.push(runScenario4FormalVerification(runtime));
            }
            else if (id === 'all') {
                runtime = new SwitchCortexRuntime();
                lastScenarioSummaries = runAllDemoScenarios(runtime);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                scenarioSummaries: lastScenarioSummaries,
                instances: runtime.listInstances(),
                ledgerIntegrity: runtime.ledger.verifyIntegrity(),
                ledgerEntries: runtime.ledger.list(),
            }));
            return;
        }
        if (req.method === 'GET' && url.pathname === '/motion') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(renderMotionGraphicsHtml());
            return;
        }
        if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(renderDashboardHtml());
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    return { server, getRuntime: () => runtime };
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}
function renderDashboardHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>αIAt · SwitchCortex — Tailored Intelligent Solutions | BPMN 2.0, DMN 1.3 & FEEL Governance</title>
  <style>
    :root {
      --bg: #f6f5f1;
      --surface: #ffffff;
      --surface-subtle: #faf9f6;
      --surface-muted: #f0eee8;
      --border: #e2dfd7;
      --border-strong: #cbc6ba;
      --text: #161615;
      --text-secondary: #4d4c48;
      --text-muted: #76746e;
      --accent: #182b49;
      --accent-hover: #0f1e36;
      --accent-subtle: #eef2f7;
      --accent-border: #c5d2e3;
      --ok-text: #14532d;
      --ok-bg: #f0fdf4;
      --ok-border: #bbf7d0;
      --warn-text: #78350f;
      --warn-bg: #fffbeb;
      --warn-border: #fde68a;
      --danger-text: #7f1d1d;
      --danger-bg: #fef2f2;
      --danger-border: #fecaca;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --shadow-sm: 0 1px 2px rgba(22, 22, 21, 0.04);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }

    .page-shell {
      width: 100%;
      padding: 20px 24px 40px;
    }

    /* 1st Reading: Institutional identity, clear value proposition, and environment status */
    .masthead {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-sm);
    }

    .masthead-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }

    .brand-eyebrow {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: 0.02em;
      margin-bottom: 6px;
    }

    .brand-mark {
      font-weight: 700;
      color: var(--text);
      font-size: 0.88rem;
      letter-spacing: -0.01em;
    }

    .brand-divider {
      color: var(--border-strong);
    }

    .brand h1 {
      font-size: 1.45rem;
      font-weight: 650;
      color: var(--text);
      letter-spacing: -0.02em;
      line-height: 1.25;
      margin-bottom: 4px;
    }

    .brand p {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .status-strip {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .masthead-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding-top: 16px;
    }

    .pillars {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 0.79rem;
      color: var(--text-secondary);
    }

    .pillar-item strong {
      color: var(--text);
      font-weight: 600;
    }

    .controls {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }

    /* Sober, direct buttons */
    button {
      font-family: inherit;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border-strong);
      padding: 7px 13px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
      line-height: 1.3;
    }

    button:hover {
      background: var(--surface-muted);
      border-color: var(--text-secondary);
    }

    button:focus-visible,
    select:focus-visible,
    input[type="text"]:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    button:disabled {
      opacity: 0.55;
      cursor: wait;
    }

    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
      font-weight: 600;
    }

    button.primary:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }

    button.success {
      background: var(--ok-text);
      border-color: var(--ok-text);
      color: #ffffff;
      font-weight: 600;
    }

    button.success:hover {
      background: #0f3f22;
    }

    button.warning {
      background: var(--warn-bg);
      border-color: var(--warn-border);
      color: var(--warn-text);
      font-weight: 600;
    }

    button.warning:hover {
      background: #fef08a;
    }

    button.danger {
      background: var(--danger-bg);
      border-color: var(--danger-border);
      color: var(--danger-text);
      font-weight: 600;
    }

    button.danger:hover {
      background: #fecaca;
    }

    /* Status and evidence badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: var(--radius-sm);
      font-size: 0.73rem;
      font-weight: 600;
      background: var(--surface-muted);
      color: var(--text-secondary);
      border: 1px solid var(--border);
      letter-spacing: 0.01em;
      white-space: nowrap;
    }

    .badge.ok {
      background: var(--ok-bg);
      color: var(--ok-text);
      border-color: var(--ok-border);
    }

    .badge.warn {
      background: var(--warn-bg);
      color: var(--warn-text);
      border-color: var(--warn-border);
    }

    .badge.danger {
      background: var(--danger-bg);
      color: var(--danger-text);
      border-color: var(--danger-border);
    }

    .badge.accent {
      background: var(--accent-subtle);
      color: var(--accent);
      border-color: var(--accent-border);
    }

    /* 2nd Reading: Operational entry (#switch-ops-room) */
    .dispatch-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }

    .dispatch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .section-title {
      font-size: 0.82rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-label {
      font-size: 0.79rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      user-select: none;
    }

    .dispatch-form {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    select,
    input[type="text"] {
      font-family: inherit;
      background: var(--surface-subtle);
      color: var(--text);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      padding: 8px 12px;
      font-size: 0.84rem;
    }

    input[type="text"] {
      flex: 1;
      min-width: 280px;
    }

    .presets {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .preset-chip {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    }

    .preset-chip:hover {
      background: var(--accent-subtle);
      border-color: var(--accent-border);
      color: var(--accent);
    }

    /* 3rd Reading: Operational trace across request, process, rule, and decision */
    .workspace-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      align-items: start;
    }

    @media (max-width: 980px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-sm);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }

    .card-subtitle {
      font-size: 0.79rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Mandatory human approval gate control */
    .gate-box {
      background: var(--warn-bg);
      border: 1px solid var(--warn-border);
      border-left: 3px solid #b45309;
      border-radius: var(--radius-md);
      padding: 14px 16px;
      margin-bottom: 14px;
      font-size: 0.82rem;
    }

    .gate-title {
      font-weight: 650;
      color: var(--warn-text);
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .gate-desc {
      color: var(--text-secondary);
      margin-bottom: 10px;
    }

    .gate-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Room transcript feed */
    .msg-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 540px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .msg {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 0.83rem;
    }

    .msg.cortex {
      border-left-color: #3b5998;
      background: #f8fafc;
    }

    .msg.human {
      border-left-color: var(--ok-text);
    }

    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 0.74rem;
      color: var(--text-muted);
      margin-bottom: 5px;
    }

    .msg-actor {
      color: var(--text);
      font-weight: 600;
    }

    .msg-body {
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .msg-body strong {
      color: var(--text);
      font-weight: 600;
    }

    /* Workflow instances and formal verification proofs */
    .instance-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 540px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .instance-card {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 13px 15px;
      font-size: 0.81rem;
    }

    .instance-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }

    .instance-title {
      font-weight: 600;
      color: var(--text);
    }

    .meta-row {
      font-size: 0.77rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .kv-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }

    .kv-chip {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 2px 7px;
      font-size: 0.73rem;
      color: var(--text-secondary);
    }

    .kv-chip strong {
      color: var(--text);
      font-weight: 600;
    }

    .rollback-note {
      margin-top: 8px;
      padding: 6px 10px;
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-sm);
      color: var(--danger-text);
      font-size: 0.76rem;
    }

    .proof-box {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      font-size: 0.8rem;
    }

    .proof-title {
      font-weight: 650;
      color: var(--text);
      margin-bottom: 2px;
    }

    .proof-subtitle {
      color: var(--text-muted);
      font-size: 0.76rem;
      margin-bottom: 8px;
    }

    .proof-box ul {
      padding-left: 18px;
      color: var(--text-secondary);
    }

    .proof-box li + li {
      margin-top: 3px;
    }

    /* DMN rules and SHA-256 ledger tables */
    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.79rem;
    }

    th,
    td {
      border-bottom: 1px solid var(--border);
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: var(--surface-subtle);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-top: 1px solid var(--border);
    }

    tbody tr:hover {
      background: var(--surface-subtle);
    }

    code {
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      background: var(--surface-muted);
      color: var(--text);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.75rem;
    }

    .empty-state {
      color: var(--text-muted);
      font-size: 0.84rem;
      padding: 18px 4px;
    }

    .footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .footer strong {
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="masthead">
      <div class="masthead-top">
        <div class="brand">
          <div class="brand-eyebrow">
            <span class="brand-mark">αIAt — Tailored Intelligent Solutions</span>
            <span class="brand-divider">·</span>
            <span>Requirements identified. Controls applied.</span>
          </div>
          <h1>SwitchCortex — Deterministic Governance for Processes, Data, and Rules</h1>
          <p>Multi-department Switch AI Room orchestration governed by BPMN 2.0 workflows, DMN 1.3 (FEEL) decision tables, and a verifiable SHA-256 audit ledger.</p>
        </div>
        <div class="status-strip">
          <span id="gemini-badge" class="badge">Checking Gemini status...</span>
          <span id="slack-badge" class="badge">Slack Bridge</span>
          <span id="chain-badge" class="badge ok">SHA-256 Ledger Verified</span>
        </div>
      </div>

      <div class="masthead-bottom">
        <div class="pillars">
          <span class="pillar-item"><strong>Integrated Context:</strong> connected operational facts</span>
          <span class="pillar-item"><strong>Operational Fit:</strong> clear departmental responsibilities</span>
          <span class="pillar-item"><strong>Controlled Execution:</strong> human sign-off and rollback</span>
          <span class="pillar-item"><strong>Applied Compliance:</strong> verifiable rules and evidence</span>
        </div>
        <div class="controls" aria-label="Demonstration scenarios">
          <a href="/motion" style="text-decoration:none;"><button class="primary" type="button">Motion Graphics Player</button></a>
          <button class="primary" onclick="runScenario('all')">Run All 4 Scenarios</button>
          <button onclick="runScenario('1')">1. Green Lane (Auto)</button>
          <button onclick="runScenario('2')">2. Multi-Dept + Human Gate</button>
          <button onclick="runScenario('3')">3. PII Block + Undo Rollback</button>
          <button onclick="runScenario('4')">4. Formal Verification Proof</button>
          <button onclick="runScenario('reset')">Reset State</button>
        </div>
      </div>
    </header>

    <section class="dispatch-panel" aria-label="Operational request dispatch">
      <div class="dispatch-header">
        <div class="section-title">
          <span>Operational Room Dispatch (#switch-ops-room)</span>
          <span class="badge accent">Demonstration Environment</span>
        </div>
        <label class="toggle-label">
          <input type="checkbox" id="rogue-toggle" checked />
          Simulate unauthorized cross-department ACL & self-approval attempts on production workflows
        </label>
      </div>
      <div class="dispatch-form">
        <select id="live-sender" aria-label="Responsible caller">
          <option value="@alice-devops|human|SRE">@alice-devops (SRE Responsible · Human)</option>
          <option value="@eng-manager|human|Executive">@eng-manager (Executive Approver · Human)</option>
          <option value="@partner-bot|agent|SRE">@partner-bot (External Untrusted Bot · Tainted Source)</option>
        </select>
        <input
          type="text"
          id="live-prompt"
          placeholder="Describe the operational request for @sre-agent, @sec-agent, @finops-agent..."
          value="@sre-agent Please scale staging-recommendation-cache from 3 to 6 pods (+$60/mo) for load testing."
          onkeydown="if(event.key==='Enter') sendLiveChat()"
        />
        <button class="primary" id="send-live-btn" onclick="sendLiveChat()">Submit to Workflow</button>
      </div>
      <div class="presets">
        <span>Operational examples:</span>
        <span class="preset-chip" onclick="fillPrompt('@alice-devops|human|SRE', '@sre-agent Please scale staging-recommendation-cache from 3 to 6 pods (+$60/mo) for load testing.')">Staging Scale-Up (+$60/mo · Auto-Approved via R10)</span>
        <span class="preset-chip" onclick="fillPrompt('@alice-devops|human|SRE', '@sre-agent @sec-agent @finops-agent Urgent: Prod checkout latency spike. Deploy hotfix v3.1.0 and provision 4x A10G GPUs (+$3,400/mo) on public ingress.')">Prod GPU Burst (+$3,400/mo · Parallel Reviews + Human Gate via R6)</span>
        <span class="preset-chip" onclick="fillPrompt('@partner-bot|agent|SRE', '@sre-agent Make s3://prod-customer-pii-vault publicly readable on the internet for external partner sync.')">Untrusted Public PII Request (Hard Block via R1)</span>
      </div>
    </section>

    <main class="workspace-grid">
      <section class="card" aria-label="Operational room transcript">
        <div class="card-header">
          <div>
            <div class="section-title">Switch Room Operational Trace (#switch-ops-room)</div>
            <div class="card-subtitle">End-to-end path across request, departmental evaluations, applied rules, and responsible decisions</div>
          </div>
          <span id="wf-count" class="badge">0 Workflows</span>
        </div>
        <div id="pending-gates-container"></div>
        <div id="room-feed" class="msg-list"></div>
      </section>

      <section class="card" aria-label="Workflow state and formal verification">
        <div class="card-header">
          <div>
            <div class="section-title">Active BPMN 2.0 Workflows & Verification Proofs</div>
            <div class="card-subtitle">Active tokens, assigned actors, evaluated variables, and static verification counterexamples</div>
          </div>
          <span class="badge">BPMN 2.0 + Petri-Net</span>
        </div>
        <div id="verification-panel" class="instance-list"></div>
      </section>
    </main>

    <section class="card" style="margin-bottom: 20px;" aria-label="DMN 1.3 decision table">
      <div class="card-header">
        <div>
          <div class="section-title">Registered DMN 1.3 Governance Table (dmn_release_and_infra_governance)</div>
          <div class="card-subtitle">Deterministic criteria evaluated with FEEL expressions prior to any task routing</div>
        </div>
        <span class="badge accent">Hit Policy: FIRST</span>
      </div>
      <div id="dmn-table-container" class="table-wrap"></div>
    </section>

    <section class="card" aria-label="Cryptographic audit ledger">
      <div class="card-header">
        <div>
          <div class="section-title">Cryptographic SHA-256 Hash-Chained Audit Ledger</div>
          <div class="card-subtitle">Verifiable record of token transitions, rule evaluations, blocked violations, and human sign-offs</div>
        </div>
        <span id="ledger-count-badge" class="badge">0 entries</span>
      </div>
      <div id="ledger-container" class="table-wrap"></div>
    </section>

    <footer class="footer">
      <div><strong>αIAt — Tailored Intelligent Solutions</strong> · AI tailored to your processes, data, and rules.</div>
      <div>SwitchCortex · Deterministic BPMN 2.0, DMN 1.3 & FEEL Governance</div>
    </footer>
  </div>

  <script>
    function cleanText(raw) {
      if (!raw) return '';
      // Strip decorative emojis while keeping technical content, identifiers, and formatting intact
      const stripped = String(raw)
        .replace(/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]/gu, '')
        .trim();
      const escaped = stripped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return escaped
        .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>');
    }

    function formatStatusBadge(status) {
      const map = {
        completed_approved: { label: 'Completed · Approved', cls: 'ok' },
        awaiting_human: { label: 'Awaiting Human Decision', cls: 'warn' },
        completed_rejected: { label: 'Blocked by Rule', cls: 'danger' },
        rolled_back: { label: 'Rolled Back (Compensated)', cls: 'danger' },
        running: { label: 'In Progress', cls: 'accent' },
        paused_by_kill_switch: { label: 'Paused by Supervisor', cls: 'warn' },
      };
      const item = map[status] || { label: status, cls: '' };
      return '<span class="badge ' + item.cls + '">' + item.label + '</span>';
    }

    function fillPrompt(senderVal, text) {
      document.getElementById('live-sender').value = senderVal;
      document.getElementById('live-prompt').value = text;
    }

    async function loadState() {
      const res = await fetch('/api/state');
      const state = await res.json();
      renderState(state);
    }

    async function runScenario(id) {
      await fetch('/api/scenario/' + id, { method: 'POST' });
      await loadState();
    }

    async function sendLiveChat() {
      const btn = document.getElementById('send-live-btn');
      const promptEl = document.getElementById('live-prompt');
      const senderRaw = document.getElementById('live-sender').value.split('|');
      const rogue = document.getElementById('rogue-toggle').checked;
      const prompt = promptEl.value.trim();
      if (!prompt) return;

      btn.disabled = true;
      btn.textContent = 'Evaluating rules & workflow...';
      try {
        await fetch('/api/live-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            senderId: senderRaw[0],
            senderKind: senderRaw[1],
            department: senderRaw[2],
            simulateRogueAgentAttempts: rogue,
          }),
        });
        await loadState();
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit to Workflow';
      }
    }

    async function decideGate(instanceId, callerId, callerKind, approved) {
      await fetch('/api/human-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          callerId,
          callerKind,
          department: callerKind === 'human' ? 'Executive' : 'SRE',
          approved,
          comment: approved
            ? 'Approved by ' + callerId + ' in Switch Room after verifying department audits.'
            : 'Rejected by ' + callerId + ' in Switch Room.',
        }),
      });
      await loadState();
    }

    async function triggerUndo(instanceId) {
      await fetch('/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          callerId: '@ciso',
          reason: 'Supervisor @ciso triggered undo_workflow in Switch Room; rolling back reservations in reverse topological order.',
        }),
      });
      await loadState();
    }

    function renderState(state) {
      if (state.liveIntegration) {
        const gBadge = document.getElementById('gemini-badge');
        if (state.liveIntegration.geminiConfigured) {
          gBadge.textContent = 'Gemini Live (' + state.liveIntegration.geminiModel + ')';
          gBadge.className = 'badge ok';
        } else {
          gBadge.textContent = 'Simulated Mode (Local Heuristic)';
          gBadge.className = 'badge';
        }

        const sBadge = document.getElementById('slack-badge');
        if (state.liveIntegration.slackWebhookConfigured) {
          sBadge.textContent = 'Slack Webhook Connected';
          sBadge.className = 'badge ok';
        } else {
          sBadge.textContent = 'Slack Endpoint Ready (/api/slack/events)';
          sBadge.className = 'badge';
        }
      }

      document.getElementById('wf-count').textContent = state.instances.length + ' Workflow(s)';
      document.getElementById('chain-badge').textContent = state.ledgerIntegrity.ok
        ? 'SHA-256 Chain Verified (' + state.ledgerIntegrity.totalEntries + ' entries)'
        : 'Ledger Integrity Broken';
      document.getElementById('chain-badge').className = state.ledgerIntegrity.ok ? 'badge ok' : 'badge danger';

      const ledgerBadge = document.getElementById('ledger-count-badge');
      if (ledgerBadge) {
        ledgerBadge.textContent = (state.ledgerEntries ? state.ledgerEntries.length : 0) + ' entries';
      }

      // Mandatory human approval controls for workflows awaiting sign-off (humanOnly)
      const pendingHtml = [];
      for (const inst of state.instances) {
        if (inst.status === 'awaiting_human') {
          const reqApprover = inst.variables.required_approver || '@eng-manager';
          pendingHtml.push(\`
            <div class="gate-box">
              <div class="gate-title">
                <span>Mandatory Human Decision · <code>\${inst.instanceId}</code> — \${cleanText(inst.title)}</span>
                <span class="badge warn">humanOnly Gate</span>
              </div>
              <div class="gate-desc">
                Execution requires explicit sign-off from responsible executive <strong>\${reqApprover}</strong>. AI agents are structurally blocked from approving this step.
              </div>
              <div class="gate-actions">
                <button class="success" onclick="decideGate('\${inst.instanceId}', '\${reqApprover}', 'human', true)">Approve as \${reqApprover} (Authorize Rollout)</button>
                <button class="warning" onclick="decideGate('\${inst.instanceId}', '@sre-agent', 'agent', true)">Test @sre-agent Self-Approval (Triggers ERR_HUMAN_ONLY_GATE)</button>
                <button class="danger" onclick="triggerUndo('\${inst.instanceId}')">Execute Compensating Rollback as @ciso (undo_workflow)</button>
              </div>
            </div>
          \`);
        }
      }
      document.getElementById('pending-gates-container').innerHTML = pendingHtml.join('');

      // Operational room transcript (newest workflows first)
      const feed = document.getElementById('room-feed');
      const allMsgs = [];
      for (const inst of state.instances.slice().reverse()) {
        for (const m of inst.roomTranscript) {
          allMsgs.push({ ...m, instanceId: inst.instanceId, wfStatus: inst.status });
        }
      }
      if (allMsgs.length === 0) {
        feed.innerHTML = '<div class="empty-state">Submit an operational request above or select <strong>Run All 4 Scenarios</strong> to inspect the workflows, rules, and applied controls.</div>';
      } else {
        feed.innerHTML = allMsgs.map(m => \`
          <div class="msg \${m.senderKind}">
            <div class="msg-header">
              <span><span class="msg-actor">\${cleanText(m.sender)}</span> (\${cleanText(m.department)} · \${m.senderKind}) · <code>\${m.instanceId}</code></span>
              \${formatStatusBadge(m.wfStatus)}
            </div>
            <div class="msg-body">\${cleanText(m.text)}</div>
          </div>
        \`).join('');
      }

      // Active workflows and formal verification proofs
      const verPanel = document.getElementById('verification-panel');
      let verHtml = '';
      if (state.instances.length === 0 && (!state.scenarioSummaries || state.scenarioSummaries.length === 0)) {
        verHtml = '<div class="empty-state">No active workflows. BPMN 2.0 instances, evaluated variables, and formal verification proofs appear here once a scenario runs.</div>';
      } else {
        for (const inst of state.instances.slice().reverse()) {
          const tokens = inst.activeTokens.map(t => '<code>' + t.elementId + '</code> (' + t.assignedActor + ')').join(', ') || 'None (Workflow Completed)';
          const comp = inst.compensationsExecuted.map(c => '<code>' + c.compensateAction + '</code>').join(' → ');
          const varEntries = Object.entries(inst.variables || {}).map(([k, v]) => {
            const valStr = Array.isArray(v) ? v.join(', ') : String(v);
            return '<span class="kv-chip"><strong>' + cleanText(k) + ':</strong> <code>' + cleanText(valStr) + '</code></span>';
          }).join('');

          verHtml += \`<div class="instance-card">
            <div class="instance-top">
              <span class="instance-title"><code>\${inst.instanceId}</code> — \${cleanText(inst.title)}</span>
              \${formatStatusBadge(inst.status)}
            </div>
            <div class="meta-row"><strong>Active BPMN 2.0 Tokens:</strong> \${tokens}</div>
            <div class="kv-grid">\${varEntries}</div>
            \${comp ? '<div class="rollback-note"><strong>Compensated Rollback Sequence:</strong> ' + comp + '</div>' : ''}
          </div>\`;
        }
        for (const s of (state.scenarioSummaries || [])) {
          verHtml += \`<div class="proof-box">
            <div class="proof-title">\${cleanText(s.title)}</div>
            <div class="proof-subtitle">\${cleanText(s.subtitle)}</div>
            <ul>\${s.highlights.map(h => '<li>' + cleanText(h) + '</li>').join('')}</ul>
          </div>\`;
        }
      }
      verPanel.innerHTML = verHtml;

      // DMN 1.3 Table
      const dmn = state.dmnTable;
      if (dmn) {
        document.getElementById('dmn-table-container').innerHTML = \`
          <table>
            <thead>
              <tr>
                <th>Rule ID</th>
                \${dmn.inputs.map(i => '<th>Input: ' + cleanText(i.label) + ' (<code>' + cleanText(i.expression) + '</code>)</th>').join('')}
                \${dmn.outputs.map(o => '<th>Output: ' + cleanText(o.label || o.name) + '</th>').join('')}
              </tr>
            </thead>
            <tbody>
              \${dmn.rules.map(r => \`
                <tr>
                  <td><code>\${r.id}</code></td>
                  \${r.inputEntries.map(e => '<td><code>' + cleanText(e) + '</code></td>').join('')}
                  \${r.outputEntries.map(e => '<td><code>' + cleanText(e) + '</code></td>').join('')}
                </tr>
              \`).join('')}
            </tbody>
          </table>
        \`;
      }

      // SHA-256 Audit Ledger
      const entries = (state.ledgerEntries || []).slice().reverse();
      if (entries.length === 0) {
        document.getElementById('ledger-container').innerHTML = '<div class="empty-state">No audit ledger entries recorded yet.</div>';
      } else {
        document.getElementById('ledger-container').innerHTML = \`
          <table>
            <thead>
              <tr>
                <th>Seq</th>
                <th>Workflow</th>
                <th>Actor</th>
                <th>Department</th>
                <th>Event Type</th>
                <th>Summary</th>
                <th>SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody>
              \${entries.map(e => \`
                <tr>
                  <td>\${e.seq}</td>
                  <td><code>\${e.instanceId}</code></td>
                  <td><code>\${cleanText(e.actorId)}</code> (\${cleanText(e.actorKind)})</td>
                  <td>\${cleanText(e.department)}</td>
                  <td><code>\${cleanText(e.eventType)}</code></td>
                  <td>\${cleanText(e.summary)}</td>
                  <td><code>\${e.entryHash.slice(0, 12)}…</code></td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        \`;
      }
    }

    loadState();
  </script>
</body>
</html>`;
}
//# sourceMappingURL=http.js.map