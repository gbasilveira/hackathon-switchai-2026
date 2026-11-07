/**
 * SwitchCortex — 4 End-to-End Hackathon Demo Scenarios
 *
 * Drives the real SwitchCortexRuntime and MCP tools through:
 * 1. Scenario 1: Green Lane 100% Automatic Approval (Dev/Staging fast-track)
 * 2. Scenario 2: Multi-Department Parallel Escalation (@sec-agent || @finops-agent) + Human-Only Gate + Blocked Agent Self-Approval
 * 3. Scenario 3: Hard PII Guardrail Rejection + Supervision Compensating Rollback (undo_workflow)
 * 4. Scenario 4: Live Design-Time Formal Verification in Switch Room (DMN Overlap Counterexample + BPMN Petri-Net Deadlock Proof)
 */

import {
  FLAWED_BPMN_DEADLOCK_PROPOSAL,
  FLAWED_DMN_OVERLAP_PROPOSAL,
} from '../blueprints/defaults.js';
import { DmnAnalysisReport } from '../dmn/engine.js';
import { BpmnVerificationReport } from '../bpmn/engine.js';
import { SwitchCortexRuntime, WorkflowInstance } from '../governance/runtime.js';

export interface ScenarioRunSummary {
  readonly scenarioId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly highlights: readonly string[];
  readonly instances: readonly WorkflowInstance[];
  readonly verificationRejections?: {
    readonly dmnReport: DmnAnalysisReport;
    readonly bpmnReport: BpmnVerificationReport;
  };
}

export function runScenario1GreenLane(runtime: SwitchCortexRuntime): ScenarioRunSummary {
  const start = runtime.startWorkflow({
    title: 'Scale staging-search-indexer replicas (2 -> 4 pods)',
    roomChannel: '#switch-ops-room',
    caller: { id: '@alice-devops', kind: 'human', department: 'SRE' },
    initialRoomMessage:
      '@sre-agent Please scale `staging-search-indexer` from 2 to 4 replicas for load testing.',
  });
  const wf = start.data!;

  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_sre_triage',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: {
      env: 'staging',
      cost_delta: 45,
      touches_pii: false,
      public_exposure: false,
      confidence: 0.96,
    },
    justification:
      'Staging-only replica bump (+$45/mo), isolated VPC subnet, zero PII tables mounted, high telemetry confidence (0.96).',
    roomMessage:
      '🔍 **SRE Triage Complete**: Target=`staging`, Cost Delta=`+$45/mo`, Touches PII=`false`, Public Exposure=`false`, Confidence=`0.96`. Submitting to DMN 1.3 Governance Gate.',
  });

  // DMN Rule R10_GREEN_LANE_AUTO_APPROVE automatically matched and routed to task_sre_execute!
  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_sre_execute',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: {
      deployment_id: 'deploy-stg-8821',
      rollout_status: 'healthy_4_of_4_pods_ready',
    },
    justification: 'Applied Kubernetes HPA patch in staging; 4/4 pods ready in 1.8s.',
    roomMessage:
      '🚀 **Green-Lane Rollout Complete (`deploy-stg-8821`)**: Auto-approved via DMN Rule `R10_GREEN_LANE_AUTO_APPROVE`. All 4 staging pods healthy.',
  });

  return {
    scenarioId: 'scenario-1-green-lane',
    title: 'Scenario 1 — Green Lane: 100% Automatic Approval',
    subtitle: 'Low-risk staging change evaluated by DMN 1.3 & FEEL and deployed without human interruption',
    highlights: [
      '@sre-agent extracts telemetry facts: env="staging", cost_delta=$45, touches_pii=false, confidence=0.96',
      'DMN 1.3 table matches R10_GREEN_LANE_AUTO_APPROVE -> verdict="auto_approve"',
      'BPMN exclusiveGateway routes directly to task_sre_execute, bypassing multi-department & human gates',
      'Completed end-to-end in <1s with full SHA-256 audit hash chain',
    ],
    instances: [wf],
  };
}

export function runScenario2MultiDeptHumanGate(runtime: SwitchCortexRuntime): ScenarioRunSummary {
  const start = runtime.startWorkflow({
    title: 'Prod Hotfix v2.14.1 + 4x A10G GPU Burst for Checkout Inference',
    roomChannel: '#switch-ops-room',
    caller: { id: '@alice-devops', kind: 'human', department: 'SRE' },
    initialRoomMessage:
      '@sre-agent @sec-agent @finops-agent Urgent: Checkout latency spike in `prod`. Deploy hotfix `v2.14.1` and provision 4x A10G GPU nodes (+$3,200/mo).',
  });
  const wf = start.data!;

  // Step 1: @sre-agent performs triage
  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_sre_triage',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: {
      env: 'prod',
      cost_delta: 3200,
      touches_pii: false,
      public_exposure: true,
      confidence: 0.94,
    },
    justification:
      'Production rollout with +$3,200/mo GPU burst on public ingress controller; zero PII schema changes.',
    roomMessage:
      '🔍 **SRE Triage Complete**: Target=`prod`, Cost Delta=`+$3,200/mo`, Touches PII=`false`, Public Exposure=`true`, Confidence=`0.94`.',
  });

  // DMN Rule R6_PROD_STANDARD_MULTI_DEPT fires -> BPMN parallelGateway forks to @sec-agent AND @finops-agent!
  // Demonstrate Cross-Department ACL protection: @sre-agent tries to submit @sec-agent's security audit
  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_sec_audit',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: { sec_approved: true, sec_notes: 'Self-signed by SRE' },
    justification: 'Trying to speed up security audit from SRE agent',
  });

  // Step 2a: @sec-agent completes Security branch
  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_sec_audit',
    caller: { id: '@sec-agent', kind: 'agent', department: 'Security' },
    outputs: {
      sec_approved: true,
      sec_notes: 'Container image signed, 0 critical CVEs, WAF rate-limiting active on ingress.',
    },
    justification: 'Verified cosign attestation and zero critical CVEs on v2.14.1.',
    roomMessage:
      '🔐 **Security Audit Passed (`@sec-agent`)**: Cosign signature valid, 0 critical CVEs, WAF rules verified.',
  });

  // Step 2b: @finops-agent completes FinOps branch -> Parallel Join fires and opens Human Gate!
  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_finops_audit',
    caller: { id: '@finops-agent', kind: 'agent', department: 'FinOps' },
    outputs: {
      finops_approved: true,
      finops_notes: 'Allocated $3,200/mo from Q4 Production Elastic Reserve (72% utilization).',
    },
    justification: 'Confirmed Q4 cloud reserve covers +$3,200/mo GPU burst.',
    roomMessage:
      '💰 **FinOps Audit Passed (`@finops-agent`)**: +$3,200/mo fits within Q4 Production Elastic Reserve. Reserved GPU quota.',
  });

  // Guardrail test: @sre-agent attempts to self-approve the human-only gate!
  runtime.decideHumanGate({
    instanceId: wf.instanceId,
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    approved: true,
    comment: 'Both departments passed, auto-approving human gate to save time!',
  });

  // Step 3: Human @eng-manager approves the userTask in the Switch Room
  runtime.decideHumanGate({
    instanceId: wf.instanceId,
    caller: { id: '@eng-manager', kind: 'human', department: 'Executive' },
    approved: true,
    comment: 'Approved after reviewing @sec-agent and @finops-agent sign-offs. Proceed with prod rollout.',
  });

  // Step 4: @sre-agent executes production deployment
  runtime.submitAgentTask({
    instanceId: wf.instanceId,
    elementId: 'task_sre_execute',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: {
      deployment_id: 'deploy-prod-9904',
      rollout_status: 'canary_100_percent_p99_42ms',
    },
    justification: 'Production rollout v2.14.1 complete; checkout p99 latency dropped from 640ms to 42ms.',
    roomMessage:
      '✅ **Production Rollout Complete (`deploy-prod-9904`)**: Hotfix `v2.14.1` live across 4x A10G nodes; checkout p99 latency down to 42ms.',
  });

  return {
    scenarioId: 'scenario-2-multi-dept',
    title: 'Scenario 2 — Multi-Department Parallel Review & Human-Only Gate',
    subtitle: 'Parallel BPMN fork (@sec-agent + @finops-agent), blocked agent self-approval, and human executive sign-off',
    highlights: [
      'DMN Rule R6_PROD_STANDARD_MULTI_DEPT triggers parallelGateway fork to Security and FinOps departments',
      'Cross-department ACL blocks @sre-agent from forging @sec-agent security sign-off (ERR_DEPARTMENT_ACL_DENIED)',
      'Parallel Join waits until BOTH @sec-agent and @finops-agent complete before opening human gate',
      'Human-Only Gate blocks @sre-agent from self-approving (ERR_HUMAN_ONLY_GATE) before @eng-manager approves',
    ],
    instances: [wf],
  };
}

export function runScenario3GuardrailAndRollback(runtime: SwitchCortexRuntime): ScenarioRunSummary {
  // Part A: Hard Compliance Block (Public PII Exposure)
  const startBlocked = runtime.startWorkflow({
    title: 'Expose Customer PII Analytics S3 Bucket for Partner Export',
    roomChannel: '#switch-ops-room',
    caller: { id: '@partner-bot', kind: 'agent', department: 'SRE' },
    tainted: true,
    initialRoomMessage:
      '@sre-agent Make `s3://prod-customer-pii-export` publicly readable so external analytics partner can pull CSVs.',
  });
  const wfBlocked = startBlocked.data!;

  runtime.submitAgentTask({
    instanceId: wfBlocked.instanceId,
    elementId: 'task_sre_triage',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: {
      env: 'prod',
      cost_delta: 15,
      touches_pii: true,
      public_exposure: true,
      confidence: 0.91,
    },
    justification: 'Bucket contains customer SSN/email columns and request asks for public ACL.',
    roomMessage:
      '⚠️ **SRE Triage Alert**: Target bucket contains `touches_pii=true` and requests `public_exposure=true` (tainted external trigger).',
  });
  // DMN Rule R1_BLOCK_PUBLIC_PII immediately halts and transitions to end_rejected!

  // Part B: Workflow with Supervision Compensating Rollback (undo_workflow)
  const startRollback = runtime.startWorkflow({
    title: 'Canary Schema Migration on Prod Payment Ledger',
    roomChannel: '#switch-ops-room',
    caller: { id: '@alice-devops', kind: 'human', department: 'SRE' },
    initialRoomMessage: '@sre-agent Start canary schema migration on prod payment ledger.',
  });
  const wfRollback = startRollback.data!;

  runtime.submitAgentTask({
    instanceId: wfRollback.instanceId,
    elementId: 'task_sre_triage',
    caller: { id: '@sre-agent', kind: 'agent', department: 'SRE' },
    outputs: {
      env: 'prod',
      cost_delta: 450,
      touches_pii: true,
      public_exposure: false,
      confidence: 0.88,
    },
    justification: 'Internal prod payment schema migration (+$450/mo replica overhead).',
  });

  runtime.submitAgentTask({
    instanceId: wfRollback.instanceId,
    elementId: 'task_sec_audit',
    caller: { id: '@sec-agent', kind: 'agent', department: 'Security' },
    outputs: {
      sec_approved: true,
      sec_notes: 'KMS encryption verified for internal migration.',
    },
    justification: 'KMS key rotation and column encryption verified.',
  });

  runtime.submitAgentTask({
    instanceId: wfRollback.instanceId,
    elementId: 'task_finops_audit',
    caller: { id: '@finops-agent', kind: 'agent', department: 'FinOps' },
    outputs: {
      finops_approved: true,
      finops_notes: 'Reserved $450/mo shadow replica budget.',
    },
    justification: 'Reserved shadow replica budget.',
  });

  // Supervisor @ciso triggers instant compensating rollback!
  runtime.superviseControl({
    action: 'undo_workflow',
    caller: { id: '@ciso', kind: 'human', department: 'Executive' },
    targetId: wfRollback.instanceId,
    reason: 'Upstream payment gateway reported lock contention; aborting and rolling back reservations.',
    roomChannel: '#switch-ops-room',
  });

  return {
    scenarioId: 'scenario-3-guardrail-rollback',
    title: 'Scenario 3 — Hard Compliance Block, Sticky Taint & Compensating Rollback',
    subtitle: 'Deterministic PII protection + sticky taint confidence capping + reverse-topological undo',
    highlights: [
      'Sticky taint automatically caps agent confidence to 0.65 when triggered from untrusted external source',
      'DMN Rule R1_BLOCK_PUBLIC_PII deterministically halts public PII bucket exposure -> completed_rejected',
      'Supervisor @ciso triggers undo_workflow -> executes 3 compensating rollback actions in reverse topological order',
    ],
    instances: [wfBlocked, wfRollback],
  };
}

export function runScenario4FormalVerification(runtime: SwitchCortexRuntime): ScenarioRunSummary {
  const caller = { id: '@policy-agent', kind: 'agent' as const, department: 'Governance' };

  const dmnAttempt = runtime.registerDmnTable(caller, FLAWED_DMN_OVERLAP_PROPOSAL, '#switch-ops-room');
  const bpmnAttempt = runtime.registerBpmnProcess(caller, FLAWED_BPMN_DEADLOCK_PROPOSAL, '#switch-ops-room');

  const dmnReport = dmnAttempt.data!.report;
  const bpmnReport = bpmnAttempt.data!.report;

  return {
    scenarioId: 'scenario-4-formal-verification',
    title: 'Scenario 4 — Design-Time Formal Verification in Chat ("The Wow Moment")',
    subtitle: 'Mathematical rejection of a flawed DMN rule overlap and an unsound BPMN parallel deadlock proposed in chat',
    highlights: [
      `@policy-agent proposes rule R11_NAIVE_HOTFIX_BYPASS ("auto-approve when confidence >= 0.90")`,
      `DMN Static Verifier blocks registration: detects ${dmnReport.overlaps.length} conflicting overlaps (e.g. counterexample ${JSON.stringify(dmnReport.overlaps[0]?.counterexample ?? {})} collides with R1_BLOCK_PUBLIC_PII)`,
      `@policy-agent proposes bypassing @sec-agent directly to @finops-agent before parallel join gw_dept_join`,
      `BPMN Petri-Net Soundness Verifier blocks registration: proves ${bpmnReport.problems.map((p) => `${p.code}@${p.elementId}`).join(', ')} (${bpmnReport.problems.find((p) => p.code === 'ERR_LACK_OF_SYNCHRONIZATION')?.message ?? bpmnReport.problems[0]?.message})`,
    ],
    instances: [],
    verificationRejections: {
      dmnReport,
      bpmnReport,
    },
  };
}

export function runAllDemoScenarios(runtime: SwitchCortexRuntime): ScenarioRunSummary[] {
  return [
    runScenario1GreenLane(runtime),
    runScenario2MultiDeptHumanGate(runtime),
    runScenario3GuardrailAndRollback(runtime),
    runScenario4FormalVerification(runtime),
  ];
}
