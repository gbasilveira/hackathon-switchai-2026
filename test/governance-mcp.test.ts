import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SwitchCortexRuntime } from '../src/governance/runtime.js';
import { handleMcpJsonRpc } from '../src/mcp/server.js';
import { createCortexHttpServer } from '../src/server/http.js';
import {
  runAllDemoScenarios,
  runScenario1GreenLane,
  runScenario2MultiDeptHumanGate,
  runScenario3GuardrailAndRollback,
  runScenario4FormalVerification,
} from '../src/sim/scenarios.js';

describe('SwitchCortex Governance Runtime, MCP Protocol & 4 Demo Scenarios', () => {
  it('executes Scenario 1 (Green Lane Automatic Approval) end-to-end', () => {
    const rt = new SwitchCortexRuntime();
    const summary = runScenario1GreenLane(rt);
    const wf = summary.instances[0]!;
    assert.equal(wf.status, 'completed_approved');
    assert.equal(wf.completedSteps.length, 2); // task_sre_triage + task_sre_execute
    assert.equal(rt.ledger.verifyIntegrity().ok, true);
  });

  it('executes Scenario 2 (Parallel Multi-Department + Blocked Agent Self-Approval + Human Gate)', () => {
    const rt = new SwitchCortexRuntime();
    const summary = runScenario2MultiDeptHumanGate(rt);
    const wf = summary.instances[0]!;
    assert.equal(wf.status, 'completed_approved');

    // Verify security violations were blocked and recorded in the SHA-256 ledger
    const violations = rt.ledger.list({ instanceId: wf.instanceId, eventType: 'SECURITY_VIOLATION_BLOCKED' });
    assert.equal(violations.length, 2); // 1 cross-dept ACL block + 1 humanOnly gate block
    assert.equal(rt.ledger.verifyIntegrity().ok, true);
  });

  it('executes Scenario 3 (Hard PII Guardrail Rejection + Compensating Undo Rollback)', () => {
    const rt = new SwitchCortexRuntime();
    const summary = runScenario3GuardrailAndRollback(rt);
    const [wfBlocked, wfRollback] = summary.instances;
    assert.equal(wfBlocked!.status, 'completed_rejected');
    assert.equal(wfRollback!.status, 'rolled_back');
    assert.equal(wfRollback!.compensationsExecuted.length, 3);
    assert.equal(
      wfRollback!.compensationsExecuted[0]!.compensateAction,
      'release_reserved_cloud_budget'
    );
    assert.equal(rt.ledger.verifyIntegrity().ok, true);
  });

  it('executes Scenario 4 (Design-Time Formal Verification Rejections in Chat)', () => {
    const rt = new SwitchCortexRuntime();
    const summary = runScenario4FormalVerification(rt);
    assert.equal(summary.verificationRejections?.dmnReport.ok, false);
    assert.equal(summary.verificationRejections?.bpmnReport.ok, false);

    const policyRejections = rt.ledger.list({ eventType: 'POLICY_VERIFICATION_REJECTED' });
    assert.equal(policyRejections.length, 2);
  });

  it('handles MCP JSON-RPC 2.0 initialize, tools/list, tools/call, and resources/read', () => {
    const rt = new SwitchCortexRuntime();
    runAllDemoScenarios(rt);

    const initRes = handleMcpJsonRpc(rt, { jsonrpc: '2.0', id: 1, method: 'initialize' });
    assert.ok(initRes?.result);

    const listRes = handleMcpJsonRpc(rt, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (listRes?.result as { tools: unknown[] }).tools;
    assert.equal(tools.length, 12);

    const callRes = handleMcpJsonRpc(rt, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'cortex_verify_audit_chain',
        arguments: {},
      },
    });
    const contentText = ((callRes?.result as { content: { text: string }[] }).content[0]!).text;
    const parsed = JSON.parse(contentText) as { ok: boolean; entriesCount: number };
    assert.equal(parsed.ok, true);
    assert.ok(parsed.entriesCount >= 20);
  });

  it('serves Streamable HTTP MCP (/mcp), /health, /api/state, and Live Governance Studio UI', async () => {
    const rt = new SwitchCortexRuntime();
    runAllDemoScenarios(rt);
    const { server } = createCortexHttpServer(rt);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);
      const healthJson = (await healthRes.json()) as { status: string; mcpToolsCount: number };
      assert.equal(healthJson.status, 'ok');
      assert.equal(healthJson.mcpToolsCount, 12);

      const mcpRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/list' }),
      });
      assert.equal(mcpRes.status, 200);
      const mcpJson = (await mcpRes.json()) as { result: { tools: unknown[] } };
      assert.equal(mcpJson.result.tools.length, 12);

      const uiRes = await fetch(`${baseUrl}/`);
      assert.equal(uiRes.status, 200);
      const uiHtml = await uiRes.text();
      assert.ok(uiHtml.includes('SwitchCortex'));

      const motionRes = await fetch(`${baseUrl}/motion`);
      assert.equal(motionRes.status, 200);
      const motionHtml = await motionRes.text();
      assert.ok(motionHtml.includes('SwitchCortex'));
      assert.ok(motionHtml.includes('Tailored Intelligent Solutions'));

      // Verify Slack URL verification handshake
      const slackVerifyRes = await fetch(`${baseUrl}/api/slack/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'url_verification', challenge: 'switch_challenge_123' }),
      });
      assert.equal(slackVerifyRes.status, 200);
      const slackVerifyJson = (await slackVerifyRes.json()) as { challenge: string };
      assert.equal(slackVerifyJson.challenge, 'switch_challenge_123');

      // Verify Live AI Chat endpoint
      const liveChatRes = await fetch(`${baseUrl}/api/live-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '@sre-agent Please scale staging-search from 2 to 3 pods (+$30/mo).',
          senderId: '@alice-devops',
          senderKind: 'human',
          department: 'SRE',
        }),
      });
      assert.equal(liveChatRes.status, 200);
      const liveChatJson = (await liveChatRes.json()) as { ok: boolean; instance: { status: string } };
      assert.equal(liveChatJson.ok, true);
      assert.equal(liveChatJson.instance.status, 'completed_approved');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
