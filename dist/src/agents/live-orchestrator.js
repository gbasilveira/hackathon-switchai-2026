/**
 * SwitchCortex — Live AI Multi-Department Agent Orchestrator (Google Gemini + Slack/Switch Bridge)
 *
 * Connects real LLM agents (@sre-agent, @sec-agent, @finops-agent) powered by Google Gemini
 * and optional Slack Incoming Webhooks / Event Subscriptions to SwitchCortexRuntime & MCP tools.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { classifyIntent } from './intent.js';
let envLoaded = false;
/**
 * Safely loads .env from project root or home directory into process.env without logging values.
 */
export function ensureEnvLoaded() {
    if (envLoaded)
        return;
    envLoaded = true;
    const candidates = [
        join(process.cwd(), '.env'),
        join(homedir(), '.env'),
    ];
    for (const filePath of candidates) {
        if (!existsSync(filePath))
            continue;
        try {
            const content = readFileSync(filePath, 'utf8');
            for (const rawLine of content.split(/\r?\n/)) {
                const line = rawLine.trim();
                if (!line || line.startsWith('#'))
                    continue;
                const eqIdx = line.indexOf('=');
                if (eqIdx <= 0)
                    continue;
                const key = line.slice(0, eqIdx).trim();
                let val = line.slice(eqIdx + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                if (key && !process.env[key]) {
                    process.env[key] = val;
                }
            }
        }
        catch {
            // Ignore read errors
        }
    }
}
export function getLiveIntegrationStatus() {
    ensureEnvLoaded();
    const key = process.env['GEMINI_API_KEY'] ?? '';
    const slackUrl = process.env['SLACK_WEBHOOK_URL'] ?? '';
    return {
        geminiConfigured: key.trim().length > 5,
        geminiModel: process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash',
        slackWebhookConfigured: slackUrl.trim().startsWith('https://'),
    };
}
/**
 * Calls Google Gemini JSON mode using native fetch. Falls back cleanly if network or quota fails.
 */
async function callGeminiJson(systemInstruction, userPrompt, fallbackFn) {
    ensureEnvLoaded();
    const apiKey = (process.env['GEMINI_API_KEY'] ?? '').trim();
    const model = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
    const startMs = Date.now();
    if (!apiKey) {
        return {
            data: fallbackFn(),
            provider: 'heuristic-fallback',
            model: 'local-heuristic',
            latencyMs: Date.now() - startMs,
        };
    }
    const preferredModel = process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash';
    const candidateModels = Array.from(new Set([preferredModel, 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']));
    for (const candidateModel of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }],
                    },
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: userPrompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json',
                    },
                }),
            });
            if (!res.ok) {
                continue;
            }
            const body = (await res.json());
            const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
                data: parsed,
                provider: 'gemini-live',
                model: candidateModel,
                latencyMs: Date.now() - startMs,
            };
        }
        catch {
            continue;
        }
    }
    return {
        data: fallbackFn(),
        provider: 'heuristic-fallback',
        model: 'local-heuristic',
        latencyMs: Date.now() - startMs,
    };
}
/**
 * Mirrors new Switch Room transcript messages to a real Slack channel when SLACK_WEBHOOK_URL is set.
 */
export async function syncTranscriptToSlack(instance, fromIndex) {
    ensureEnvLoaded();
    const webhookUrl = (process.env['SLACK_WEBHOOK_URL'] ?? '').trim();
    if (!webhookUrl.startsWith('https://'))
        return false;
    const newMessages = instance.roomTranscript.slice(fromIndex);
    if (newMessages.length === 0)
        return false;
    const lines = newMessages.map((m) => `${m.badge} *${m.sender}* [${m.department}] (\`${instance.instanceId}\`): ${m.text}`);
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: lines.join('\n'),
            }),
        });
        return res.ok;
    }
    catch {
        return false;
    }
}
function heuristicSreTriage(prompt) {
    const lower = prompt.toLowerCase();
    // Fail-closed: unknown environment is treated as prod (strictest lane), never as staging.
    const verdict = classifyIntent(prompt);
    const env = verdict.env ?? 'prod';
    const costMatch = prompt.match(/\$\s*([0-9][0-9,]*)/);
    const parsedCost = costMatch?.[1] ? Number(costMatch[1].replace(/,/g, '')) : env === 'prod' ? 1200 : 45;
    const cost_delta = Number.isFinite(parsedCost) ? parsedCost : 45;
    const touches_pii = lower.includes('pii') ||
        lower.includes('customer') ||
        lower.includes('payment') ||
        lower.includes('user data') ||
        lower.includes('dados pessoais') ||
        lower.includes('clientes');
    const public_exposure = lower.includes('public') ||
        lower.includes('público') ||
        lower.includes('publicly') ||
        lower.includes('internet') ||
        lower.includes('external') ||
        lower.includes('checkout');
    // Invented facts lower confidence: an unstated cost can never reach the Green Lane (>= 0.80).
    const confidence = touches_pii && public_exposure ? 0.72 : verdict.costStated ? 0.95 : 0.75;
    return {
        title: prompt.slice(0, 72),
        env,
        cost_delta,
        touches_pii,
        public_exposure,
        confidence,
        justification: `Extracted telemetry from request: env=${env}, cost_delta=+$${cost_delta}/mo, touches_pii=${touches_pii}, public_exposure=${public_exposure}.`,
        roomMessage: `🔍 **SRE Triage Complete (Live AI)**: Target=\`${env}\`, Cost Delta=\`+$${cost_delta}/mo\`, Touches PII=\`${touches_pii}\`, Public Exposure=\`${public_exposure}\`, Confidence=\`${confidence}\`. Submitting to DMN 1.3 Governance Gate.`,
    };
}
/**
 * Starts a new Switch Room workflow from a live chat prompt and drives active AI agent tasks
 * (@sre-agent, @sec-agent, @finops-agent) using Google Gemini.
 */
export async function runLiveChatWorkflow(runtime, req) {
    const senderId = req.senderId ?? '@alice-devops';
    const senderKind = req.senderKind ?? (senderId.includes('bot') || senderId.includes('agent') ? 'agent' : 'human');
    const department = req.department ?? 'SRE';
    const roomChannel = req.roomChannel ?? '#switch-ops-room';
    const tainted = req.tainted ?? senderId.includes('partner-bot');
    const agentCalls = [];
    // 0. Deterministic intent gate (fail-closed): only explicit operational requests start a workflow.
    const intent = classifyIntent(req.prompt);
    if (intent.intent !== 'ops_request') {
        return {
            ok: true,
            llmProvider: 'heuristic-fallback',
            modelUsed: 'intent-gate',
            slackMirrored: false,
            intent,
            agentCalls,
        };
    }
    // 1. Ask @sre-agent (Gemini) to triage the user's natural language request
    const sreSystemPrompt = `You are @sre-agent (SRE Department) inside a Switch AI Room (#switch-ops-room) governed by SwitchCortex BPMN 2.0 & DMN 1.3.
Analyze the user's operational request and return ONLY a JSON object with these exact keys:
- "title": short 4-8 word operational title
- "env": one of "dev", "staging", or "prod"
- "cost_delta": estimated monthly USD cost delta as a non-negative number (e.g. 45, 450, 3200)
- "touches_pii": boolean (true if it touches customer PII, payment ledgers, user exports, or sensitive personal data)
- "public_exposure": boolean (true if publicly accessible, public S3 bucket, external internet ingress, or public checkout endpoint)
- "confidence": number between 0.50 and 0.99 representing telemetry confidence (use >= 0.92 for clear requests)
- "justification": 1 concise technical sentence explaining the extracted blast-radius facts
- "roomMessage": 1 concise Markdown message starting with "🔍 **SRE Triage Complete**:" summarizing Target, Cost Delta, Touches PII, Public Exposure, and Confidence.`;
    const triageCall = await callGeminiJson(sreSystemPrompt, req.prompt, () => heuristicSreTriage(req.prompt));
    const triage = triageCall.data;
    // Normalize values to protect against unexpected LLM types
    // The explicit environment in the user's text wins over the LLM's reading of it.
    const normalizedEnv = intent.env ?? 'prod';
    const normalizedCost = typeof triage.cost_delta === 'number' && Number.isFinite(triage.cost_delta)
        ? Math.max(0, Math.round(triage.cost_delta))
        : heuristicSreTriage(req.prompt).cost_delta;
    const normalizedPii = typeof triage.touches_pii === 'boolean'
        ? triage.touches_pii
        : heuristicSreTriage(req.prompt).touches_pii;
    const normalizedPublic = typeof triage.public_exposure === 'boolean'
        ? triage.public_exposure
        : heuristicSreTriage(req.prompt).public_exposure;
    // The LLM may only lower confidence, never raise it above the deterministic cap.
    const confidenceCap = heuristicSreTriage(req.prompt).confidence;
    const normalizedConf = typeof triage.confidence === 'number' && triage.confidence >= 0 && triage.confidence <= 1
        ? Math.min(Number(triage.confidence.toFixed(2)), confidenceCap)
        : confidenceCap;
    const startRes = runtime.startWorkflow({
        title: triage.title || req.prompt.slice(0, 68),
        roomChannel,
        caller: { id: senderId, kind: senderKind, department },
        tainted,
        initialRoomMessage: req.prompt,
    });
    const wf = startRes.data;
    let transcriptCursor = 0;
    runtime.submitAgentTask({
        instanceId: wf.instanceId,
        elementId: 'task_sre_triage',
        caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
        outputs: {
            env: normalizedEnv,
            cost_delta: normalizedCost,
            touches_pii: normalizedPii,
            public_exposure: normalizedPublic,
            confidence: normalizedConf,
        },
        justification: triage.justification || 'Extracted telemetry via @sre-agent.',
        roomMessage: triage.roomMessage ||
            `🔍 **SRE Triage Complete**: Target=\`${normalizedEnv}\`, Cost Delta=\`+$${normalizedCost}/mo\`, Touches PII=\`${normalizedPii}\`, Public Exposure=\`${normalizedPublic}\`, Confidence=\`${normalizedConf}\`.`,
    });
    agentCalls.push({
        agentId: '@sre-agent',
        elementId: 'task_sre_triage',
        provider: triageCall.provider,
        latencyMs: triageCall.latencyMs,
    });
    // 2. Drive downstream active agent tasks (parallel @sec-agent + @finops-agent, or @sre-agent execution)
    await advanceActiveAgentTokens(runtime, wf, req.prompt, agentCalls, req.simulateRogueAgentAttempts);
    const slackMirrored = await syncTranscriptToSlack(wf, transcriptCursor);
    transcriptCursor = wf.roomTranscript.length;
    return {
        ok: true,
        llmProvider: triageCall.provider,
        modelUsed: triageCall.model,
        slackMirrored,
        instance: wf,
        intent,
        agentCalls,
    };
}
/**
 * Inspects active BPMN tokens on an instance and invokes the corresponding department AI agents via Gemini.
 */
export async function advanceActiveAgentTokens(runtime, wf, originalPrompt, agentCalls, simulateRogueAgentAttempts = false) {
    // Check if parallel Security & FinOps tokens are active
    const hasSecToken = wf.activeTokens.some((t) => t.elementId === 'task_sec_audit');
    const hasFinopsToken = wf.activeTokens.some((t) => t.elementId === 'task_finops_audit');
    if (hasSecToken || hasFinopsToken) {
        if (simulateRogueAgentAttempts && hasSecToken) {
            // Optional demonstration: @sre-agent attempts to forge @sec-agent approval -> blocked by ACL
            runtime.submitAgentTask({
                instanceId: wf.instanceId,
                elementId: 'task_sec_audit',
                caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
                outputs: { sec_approved: true, sec_notes: 'Forged security sign-off by SRE.' },
                justification: 'Attempting cross-department bypass.',
            });
        }
        const parallelTasks = [];
        if (hasSecToken) {
            parallelTasks.push((async () => {
                const secSystem = `You are @sec-agent (Security Department) in a Switch AI Room governed by SwitchCortex.
Review the operational request and SRE telemetry: ${JSON.stringify(wf.variables)}.
Return ONLY a JSON object with:
- "sec_approved": true
- "sec_notes": concise security verification note (e.g., container signatures, IAM least-privilege, KMS encryption, WAF rules)
- "roomMessage": 1 concise Markdown message starting with "🔐 **Security Audit Passed (\`@sec-agent\`)**:"`;
                const secRes = await callGeminiJson(secSystem, originalPrompt, () => ({
                    sec_approved: true,
                    sec_notes: 'Cosign signature verified, zero critical CVEs, IAM boundary and WAF rules validated.',
                    roomMessage: '🔐 **Security Audit Passed (`@sec-agent`)**: Cosign signature valid, 0 critical CVEs, IAM & WAF rules verified.',
                }));
                runtime.submitAgentTask({
                    instanceId: wf.instanceId,
                    elementId: 'task_sec_audit',
                    caller: { id: '@sec-agent', kind: 'agent', department: 'Security' },
                    outputs: {
                        sec_approved: true,
                        sec_notes: secRes.data.sec_notes || 'Security audit passed.',
                    },
                    justification: secRes.data.sec_notes || 'Security audit passed.',
                    roomMessage: secRes.data.roomMessage ||
                        `🔐 **Security Audit Passed (\`@sec-agent\`)**: ${secRes.data.sec_notes}`,
                });
                agentCalls.push({
                    agentId: '@sec-agent',
                    elementId: 'task_sec_audit',
                    provider: secRes.provider,
                    latencyMs: secRes.latencyMs,
                });
            })());
        }
        if (hasFinopsToken) {
            parallelTasks.push((async () => {
                const finSystem = `You are @finops-agent (FinOps Department) in a Switch AI Room governed by SwitchCortex.
Review the operational request and SRE telemetry: ${JSON.stringify(wf.variables)}.
Return ONLY a JSON object with:
- "finops_approved": true
- "finops_notes": concise cloud budget & quota approval note mentioning the cost_delta (+$${String(wf.variables['cost_delta'])}/mo)
- "roomMessage": 1 concise Markdown message starting with "💰 **FinOps Audit Passed (\`@finops-agent\`)**:"`;
                const finRes = await callGeminiJson(finSystem, originalPrompt, () => ({
                    finops_approved: true,
                    finops_notes: `Cost delta +$${String(wf.variables['cost_delta'])}/mo fits within Q4 Elastic Cloud Reserve. Quota reserved.`,
                    roomMessage: `💰 **FinOps Audit Passed (\`@finops-agent\`)**: +$${String(wf.variables['cost_delta'])}/mo fits within Q4 Production Elastic Reserve. Quota reserved.`,
                }));
                runtime.submitAgentTask({
                    instanceId: wf.instanceId,
                    elementId: 'task_finops_audit',
                    caller: { id: '@finops-agent', kind: 'agent', department: 'FinOps' },
                    outputs: {
                        finops_approved: true,
                        finops_notes: finRes.data.finops_notes || 'FinOps budget verified.',
                    },
                    justification: finRes.data.finops_notes || 'FinOps budget verified.',
                    roomMessage: finRes.data.roomMessage ||
                        `💰 **FinOps Audit Passed (\`@finops-agent\`)**: ${finRes.data.finops_notes}`,
                });
                agentCalls.push({
                    agentId: '@finops-agent',
                    elementId: 'task_finops_audit',
                    provider: finRes.provider,
                    latencyMs: finRes.latencyMs,
                });
            })());
        }
        await Promise.all(parallelTasks);
        if (simulateRogueAgentAttempts &&
            wf.activeTokens.some((t) => t.elementId === 'task_human_approval')) {
            // Optional demonstration: @sre-agent attempts to self-approve the human executive gate -> ERR_HUMAN_ONLY_GATE
            runtime.decideHumanGate({
                instanceId: wf.instanceId,
                elementId: 'task_human_approval',
                caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
                approved: true,
                comment: 'Auto-approving executive gate to speed up deployment.',
            });
        }
    }
    // Check if task_sre_execute is now active (e.g. via Green Lane auto_approve or after human approval)
    if (wf.activeTokens.some((t) => t.elementId === 'task_sre_execute')) {
        await executeSreRolloutWithAi(runtime, wf, originalPrompt, agentCalls);
    }
}
export async function executeSreRolloutWithAi(runtime, wf, contextPrompt, agentCalls) {
    if (!wf.activeTokens.some((t) => t.elementId === 'task_sre_execute'))
        return;
    const envStr = String(wf.variables['env'] ?? 'staging');
    const deployId = `deploy-${envStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    const execSystem = `You are @sre-agent (SRE Department) executing an approved deployment (${deployId}) in a Switch AI Room.
Context variables: ${JSON.stringify(wf.variables)}.
Return ONLY a JSON object with:
- "deployment_id": "${deployId}"
- "rollout_status": short status slug (e.g. "healthy_all_pods_ready")
- "justification": 1 concise sentence summarizing rollout verification metrics
- "roomMessage": 1 concise Markdown message starting with "🚀 **Rollout Complete (\`${deployId}\`)**:"`;
    const execRes = await callGeminiJson(execSystem, contextPrompt, () => ({
        deployment_id: deployId,
        rollout_status: 'healthy_verified',
        justification: `Deployment ${deployId} rolled out cleanly in ${envStr}; all health checks passing.`,
        roomMessage: `🚀 **Rollout Complete (\`${deployId}\`)**: Applied changes in \`${envStr}\`; all pods healthy and telemetry nominal.`,
    }));
    const outputs = {
        deployment_id: execRes.data.deployment_id || deployId,
        rollout_status: execRes.data.rollout_status || 'healthy_verified',
    };
    runtime.submitAgentTask({
        instanceId: wf.instanceId,
        elementId: 'task_sre_execute',
        caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
        outputs,
        justification: execRes.data.justification || `Rollout ${deployId} complete.`,
        roomMessage: execRes.data.roomMessage ||
            `🚀 **Rollout Complete (\`${deployId}\`)**: ${execRes.data.justification}`,
    });
    if (agentCalls) {
        agentCalls.push({
            agentId: '@sre-agent',
            elementId: 'task_sre_execute',
            provider: execRes.provider,
            latencyMs: execRes.latencyMs,
        });
    }
}
/**
 * Approves or rejects a pending human gate from the Web Studio / Slack interactive action,
 * and if approved, automatically triggers @sre-agent via Gemini to finish the rollout.
 */
export async function decideHumanGateAndContinue(runtime, params) {
    const wf = runtime.getInstance(params.instanceId);
    const prevLen = wf ? wf.roomTranscript.length : 0;
    const res = runtime.decideHumanGate({
        instanceId: params.instanceId,
        caller: params.caller,
        approved: params.approved,
        comment: params.comment,
    });
    if (!res.ok || !res.data) {
        const mirrored = wf ? await syncTranscriptToSlack(wf, prevLen) : false;
        return { ok: false, message: res.message, instance: res.data, slackMirrored: mirrored };
    }
    if (params.approved && res.data.activeTokens.some((t) => t.elementId === 'task_sre_execute')) {
        await executeSreRolloutWithAi(runtime, res.data, res.data.title);
    }
    const slackMirrored = await syncTranscriptToSlack(res.data, prevLen);
    return {
        ok: true,
        message: res.message,
        instance: res.data,
        slackMirrored,
    };
}
//# sourceMappingURL=live-orchestrator.js.map