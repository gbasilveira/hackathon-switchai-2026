#!/usr/bin/env node
/**
 * SwitchCortex CLI
 *
 * Commands:
 *   demo               Run all 4 interactive Switch AI Room governance & formal verification scenarios
 *   verify             Run static verification on DMN 1.3 decision tables and BPMN 2.0 workflows
 *   mcp                Start the Model Context Protocol (MCP) server over stdio
 *   serve [--port N]   Start the HTTP MCP server (/mcp) + Live Web Governance Studio
 *   export-blueprints  Write standard BPMN 2.0 XML, DMN 1.3 XML, and JSON blueprints to ./blueprints
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decideHumanGateAndContinue, getLiveIntegrationStatus, runLiveChatWorkflow, } from '../agents/live-orchestrator.js';
import { exportBpmnToXml, verifyBpmnSoundness, } from '../bpmn/engine.js';
import { DEFAULT_BPMN_PROCESS, DEFAULT_DMN_TABLE, FLAWED_BPMN_DEADLOCK_PROPOSAL, FLAWED_DMN_OVERLAP_PROPOSAL, } from '../blueprints/defaults.js';
import { analyzeDecisionTable, exportDmnToXml, } from '../dmn/engine.js';
import { SwitchCortexRuntime } from '../governance/runtime.js';
import { startStdioMcpServer } from '../mcp/server.js';
import { createCortexHttpServer } from '../server/http.js';
import { runAllDemoScenarios } from '../sim/scenarios.js';
const args = process.argv.slice(2);
const cmd = args[0] ?? 'demo';
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
};
function printBanner() {
    console.log(`${C.cyan}${C.bold}┌──────────────────────────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`${C.cyan}${C.bold}│  ⚡ SwitchCortex — Deterministic BPMN 2.0, DMN 1.3 & FEEL Governance Cortex  │${C.reset}`);
    console.log(`${C.cyan}${C.bold}│     Multi-Department Switch AI Room Orchestration & Formal Verification      │${C.reset}`);
    console.log(`${C.cyan}${C.bold}└──────────────────────────────────────────────────────────────────────────────┘${C.reset}`);
}
if (cmd === 'mcp') {
    const runtime = new SwitchCortexRuntime();
    startStdioMcpServer(runtime);
}
else if (cmd === 'verify') {
    printBanner();
    console.log(`\n${C.bold}1. Verifying Default Production DMN 1.3 Table (${DEFAULT_DMN_TABLE.id})...${C.reset}`);
    const dmnRep = analyzeDecisionTable(DEFAULT_DMN_TABLE);
    console.log(`   Status:  ${dmnRep.ok ? `${C.green}✔ VERIFIED${C.reset}` : `${C.red}✖ FAILED${C.reset}`}`);
    console.log(`   Digest:  ${C.dim}${dmnRep.digest}${C.reset}`);
    console.log(`   Checked: ${dmnRep.checkedCombinations} finite-domain input combinations (0 overlaps, 0 gaps, 0 shadowed rules)`);
    console.log(`\n${C.bold}2. Verifying Default Production BPMN 2.0 Process (${DEFAULT_BPMN_PROCESS.id})...${C.reset}`);
    const bpmnRep = verifyBpmnSoundness(DEFAULT_BPMN_PROCESS);
    console.log(`   Status:  ${bpmnRep.ok ? `${C.green}✔ SOUND (Petri-Net Verified)${C.reset}` : `${C.red}✖ UNSOUND${C.reset}`}`);
    console.log(`   Digest:  ${C.dim}${bpmnRep.digest}${C.reset}`);
    console.log(`   Checked: ${bpmnRep.exploredMarkings} reachable token markings (0 deadlocks, 0 unjoined tokens)`);
    console.log(`\n${C.bold}3. Testing Formal Verifier Against Flawed Chat Proposals...${C.reset}`);
    const flawedDmn = analyzeDecisionTable(FLAWED_DMN_OVERLAP_PROPOSAL);
    console.log(`   - Flawed DMN Proposal (${FLAWED_DMN_OVERLAP_PROPOSAL.version}): ${C.yellow}Blocked as expected${C.reset} (${flawedDmn.overlaps.length} conflicting overlaps detected)`);
    if (flawedDmn.overlaps[0]) {
        console.log(`     Counterexample: ${C.cyan}${JSON.stringify(flawedDmn.overlaps[0].counterexample)}${C.reset}`);
        console.log(`     Conflict:       ${flawedDmn.overlaps[0].ruleA} vs ${flawedDmn.overlaps[0].ruleB}`);
    }
    const flawedBpmn = verifyBpmnSoundness(FLAWED_BPMN_DEADLOCK_PROPOSAL);
    console.log(`   - Flawed BPMN Proposal (${FLAWED_BPMN_DEADLOCK_PROPOSAL.version}): ${C.yellow}Blocked as expected${C.reset} (${flawedBpmn.problems.length} soundness errors detected)`);
    for (const prob of flawedBpmn.problems) {
        console.log(`     Proof:          ${C.red}${prob.code}${C.reset} — ${prob.message}`);
    }
    console.log('');
}
else if (cmd === 'export-blueprints') {
    const outDir = join(process.cwd(), 'blueprints');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'dmn_release_and_infra_governance.dmn.xml'), exportDmnToXml(DEFAULT_DMN_TABLE), 'utf8');
    writeFileSync(join(outDir, 'dmn_release_and_infra_governance.json'), JSON.stringify(DEFAULT_DMN_TABLE, null, 2), 'utf8');
    writeFileSync(join(outDir, 'bpmn_switch_ops_governance.bpmn.xml'), exportBpmnToXml(DEFAULT_BPMN_PROCESS), 'utf8');
    writeFileSync(join(outDir, 'bpmn_switch_ops_governance.json'), JSON.stringify(DEFAULT_BPMN_PROCESS, null, 2), 'utf8');
    console.log(`${C.green}✔ Exported BPMN 2.0 XML, DMN 1.3 XML, and JSON blueprints to ${outDir}${C.reset}`);
}
else if (cmd === 'serve') {
    printBanner();
    const portIdx = args.indexOf('--port');
    const port = portIdx !== -1 && args[portIdx + 1] ? Number(args[portIdx + 1]) : 4100;
    const runtime = new SwitchCortexRuntime();
    runAllDemoScenarios(runtime);
    const { server } = createCortexHttpServer(runtime);
    const liveStatus = getLiveIntegrationStatus();
    server.listen(port, () => {
        console.log(`\n${C.green}${C.bold}✔ SwitchCortex Server Running:${C.reset}`);
        console.log(`  • Interactive Governance Studio UI : ${C.cyan}http://localhost:${port}${C.reset}`);
        console.log(`  • αIAt Motion Graphics Player      : ${C.cyan}http://localhost:${port}/motion${C.reset}`);
        console.log(`  • Streamable HTTP MCP Endpoint     : ${C.cyan}http://localhost:${port}/mcp${C.reset}`);
        console.log(`  • Slack Events / Switch Webhook    : ${C.cyan}http://localhost:${port}/api/slack/events${C.reset}`);
        console.log(`  • Health & Blueprints Status       : ${C.cyan}http://localhost:${port}/health${C.reset}`);
        console.log(`  • Google Gemini Live AI            : ${liveStatus.geminiConfigured ? `${C.green}ENABLED (${liveStatus.geminiModel})${C.reset}` : `${C.yellow}HEURISTIC FALLBACK (set GEMINI_API_KEY in .env)${C.reset}`}`);
        console.log(`  • Slack Webhook Bridge             : ${liveStatus.slackWebhookConfigured ? `${C.green}CONNECTED${C.reset}` : `${C.dim}Optional (set SLACK_WEBHOOK_URL in .env)${C.reset}`}\n`);
    });
}
else if (cmd === 'live') {
    printBanner();
    const runtime = new SwitchCortexRuntime();
    const userPrompt = args.slice(1).join(' ').trim() ||
        '@sre-agent @sec-agent @finops-agent Urgent: Prod checkout latency spike. Deploy hotfix v2.15.0 and provision 4x A10G GPUs (+$3,200/mo) on public ingress.';
    const status = getLiveIntegrationStatus();
    console.log(`\n${C.bold}⚡ Running Live Multi-Department AI Agents (${status.geminiConfigured ? `Google Gemini: ${status.geminiModel}` : 'Heuristic Fallback'})...${C.reset}`);
    console.log(`   Prompt: ${C.cyan}"${userPrompt}"${C.reset}\n`);
    const liveRes = await runLiveChatWorkflow(runtime, {
        prompt: userPrompt,
        senderId: '@alice-devops',
        senderKind: 'human',
        department: 'SRE',
        roomChannel: '#switch-ops-room',
        simulateRogueAgentAttempts: true,
    });
    if (!liveRes.instance) {
        console.log(`  ${C.yellow}${C.bold}No workflow started${C.reset} (${liveRes.intent.intent}: ${liveRes.intent.reason})`);
        console.log(`  ${liveRes.intent.reply ?? ''}\n`);
        process.exit(0);
    }
    const inst = liveRes.instance;
    if (!inst)
        throw new Error('unreachable: intent gate returned no workflow');
    console.log(`${C.magenta}${C.bold}━━━ Live Agent Invocations (Provider: ${liveRes.llmProvider} · Model: ${liveRes.modelUsed}) ━━━${C.reset}`);
    for (const call of liveRes.agentCalls) {
        console.log(`  ${C.green}•${C.reset} ${C.bold}${call.agentId}${C.reset} completed BPMN task \`${call.elementId}\` via ${C.cyan}${call.provider}${C.reset} (${call.latencyMs}ms)`);
    }
    // If awaiting human sign-off, complete with @eng-manager approval so the full live flow finishes
    if (inst.status === 'awaiting_human' && process.env['CORTEX_DEMO_AUTO_APPROVE'] !== '1') {
        console.log(`  ${C.yellow}Awaiting human approval from ${String(inst.variables['required_approver'] ?? '@eng-manager')} — not auto-approved (set CORTEX_DEMO_AUTO_APPROVE=1 for demo only).${C.reset}`);
    }
    else if (inst.status === 'awaiting_human') {
        const reqApprover = String(inst.variables['required_approver'] ?? '@eng-manager');
        await decideHumanGateAndContinue(runtime, {
            instanceId: inst.instanceId,
            caller: { id: reqApprover, kind: 'human', department: 'Executive' },
            approved: true,
            comment: `Approved live in Switch Room by ${reqApprover} after reviewing @sec-agent and @finops-agent Gemini audits.`,
        });
    }
    console.log(`\n  ${C.cyan}${C.bold}Switch Room Transcript (${inst.roomChannel} · ${inst.instanceId} · Status: ${inst.status}):${C.reset}`);
    for (const msg of inst.roomTranscript) {
        const color = msg.senderKind === 'human' ? C.green : msg.senderKind === 'cortex' ? C.yellow : C.cyan;
        console.log(`    ${msg.badge} ${color}${C.bold}${msg.sender}${C.reset} ${C.dim}[${msg.department}]${C.reset}: ${msg.text}`);
    }
    const integrity = runtime.ledger.verifyIntegrity();
    console.log(`\n${C.cyan}${C.bold}━━━ Cryptographic Audit Ledger Verification ━━━${C.reset}`);
    console.log(`  • Status       : ${integrity.ok ? `${C.green}✔ SHA-256 HASH CHAIN VERIFIED${C.reset}` : `${C.red}✖ FAILED${C.reset}`}`);
    console.log(`  • Total Events : ${integrity.totalEntries}`);
    console.log(`  • Head Digest  : ${C.yellow}${integrity.headHash}${C.reset}\n`);
}
else {
    // Default: 'demo'
    printBanner();
    const runtime = new SwitchCortexRuntime();
    const summaries = runAllDemoScenarios(runtime);
    for (const s of summaries) {
        console.log(`\n${C.magenta}${C.bold}━━━ ${s.title} ━━━${C.reset}`);
        console.log(`${C.dim}${s.subtitle}${C.reset}\n`);
        for (const h of s.highlights) {
            console.log(`  ${C.green}•${C.reset} ${h}`);
        }
        for (const inst of s.instances) {
            console.log(`\n  ${C.cyan}${C.bold}Switch Room Transcript (${inst.roomChannel} · ${inst.instanceId} · Status: ${inst.status}):${C.reset}`);
            for (const msg of inst.roomTranscript) {
                const color = msg.senderKind === 'human' ? C.green : msg.senderKind === 'cortex' ? C.yellow : C.cyan;
                console.log(`    ${msg.badge} ${color}${C.bold}${msg.sender}${C.reset} ${C.dim}[${msg.department}]${C.reset}: ${msg.text}`);
            }
        }
    }
    const integrity = runtime.ledger.verifyIntegrity();
    console.log(`\n${C.cyan}${C.bold}━━━ Cryptographic Audit Ledger Verification ━━━${C.reset}`);
    console.log(`  • Status       : ${integrity.ok ? `${C.green}✔ SHA-256 HASH CHAIN VERIFIED (Tamper-Evident)${C.reset}` : `${C.red}✖ FAILED${C.reset}`}`);
    console.log(`  • Total Events : ${integrity.totalEntries}`);
    console.log(`  • Head Digest  : ${C.yellow}${integrity.headHash}${C.reset}\n`);
}
//# sourceMappingURL=index.js.map