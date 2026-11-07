/**
 * SwitchCortex — Default Verified BPMN 2.0 & DMN 1.3 Blueprints
 * plus Flawed Blueprint Proposals for Live Design-Time Verification Demos.
 */

import { BpmnProcessDefinition } from '../bpmn/engine.js';
import { DmnDecisionTable } from '../dmn/engine.js';

export const DEFAULT_DMN_TABLE: DmnDecisionTable = {
  id: 'dmn_release_and_infra_governance',
  version: '1.0.0',
  name: 'Multi-Department Release & Cloud Infrastructure Governance',
  description:
    'Deterministic DMN 1.3 decision table governing automatic vs. multi-department human-gated operations in Switch AI rooms.',
  hitPolicy: 'PRIORITY',
  inputs: [
    {
      id: 'in_env',
      label: 'Target Environment',
      expression: 'env',
      type: 'string',
      allowedValues: ['dev', 'staging', 'prod'],
      required: true,
    },
    {
      id: 'in_cost',
      label: 'Monthly Cost Delta ($)',
      expression: 'cost_delta',
      type: 'number',
      required: true,
    },
    {
      id: 'in_pii',
      label: 'Touches Customer PII',
      expression: 'touches_pii',
      type: 'boolean',
      required: true,
    },
    {
      id: 'in_public',
      label: 'Public Network Exposure',
      expression: 'public_exposure',
      type: 'boolean',
      required: true,
    },
    {
      id: 'in_conf',
      label: 'Agent Proposal Confidence',
      expression: 'confidence',
      type: 'number',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'out_verdict',
      name: 'verdict',
      label: 'Governance Verdict',
      type: 'string',
      allowedValues: [
        'reject',
        'require_exec_and_dept_signoff',
        'require_dept_signoff',
        'auto_approve',
      ],
    },
    {
      id: 'out_approver',
      name: 'required_approver',
      label: 'Required Human Approver',
      type: 'string',
      allowedValues: ['none', '@eng-manager', '@ciso'],
    },
    {
      id: 'out_note',
      name: 'policy_note',
      label: 'Policy Justification',
      type: 'string',
    },
  ],
  rules: [
    {
      id: 'R1_BLOCK_PUBLIC_PII',
      description: 'Hard invariant: Never allow public exposure when touching customer PII',
      inputEntries: ['-', '-', 'true', 'true', '-'],
      outputEntries: [
        '"reject"',
        '"none"',
        '"Hard compliance invariant violated: PII workload cannot have public network exposure"',
      ],
    },
    {
      id: 'R2_BLOCK_EXCESSIVE_COST',
      description: 'Hard budget cap: Reject any single tactical request exceeding $10,000/mo',
      inputEntries: ['-', '> 10000', '-', '-', '-'],
      outputEntries: [
        '"reject"',
        '"none"',
        '"Tactical cost ceiling exceeded (> $10,000/mo); requires quarterly architecture board"',
      ],
    },
    {
      id: 'R3_LOW_CONFIDENCE_ESCALATION',
      description: 'Conservative AI guardrail: Below 0.80 confidence always escalates to human + departments',
      inputEntries: ['-', '<= 10000', '-', 'false', '< 0.80'],
      outputEntries: [
        '"require_dept_signoff"',
        '"@eng-manager"',
        '"Agent confidence below 0.80 threshold; escalated to Security, FinOps & Engineering Manager"',
      ],
    },
    {
      id: 'R4_LOW_CONFIDENCE_PUBLIC_NON_PII',
      description: 'Low confidence on non-PII public endpoint also escalates to CISO',
      inputEntries: ['-', '<= 10000', 'false', 'true', '< 0.80'],
      outputEntries: [
        '"require_exec_and_dept_signoff"',
        '"@ciso"',
        '"Low-confidence public endpoint change requires Security, FinOps & CISO approval"',
      ],
    },
    {
      id: 'R5_PROD_PII_CISO_GATE',
      description: 'Production changes touching internal PII require multi-department review + CISO sign-off',
      inputEntries: ['"prod"', '<= 10000', 'true', 'false', '>= 0.80'],
      outputEntries: [
        '"require_exec_and_dept_signoff"',
        '"@ciso"',
        '"Production PII access requires parallel Security + FinOps review and CISO human sign-off"',
      ],
    },
    {
      id: 'R6_PROD_STANDARD_MULTI_DEPT',
      description: 'All production changes or medium-cost changes ($101..$10,000) require Security + FinOps + Eng Manager',
      inputEntries: ['"prod"', '<= 10000', 'false', '-', '>= 0.80'],
      outputEntries: [
        '"require_dept_signoff"',
        '"@eng-manager"',
        '"Production operation requires parallel @sec-agent + @finops-agent audit and @eng-manager sign-off"',
      ],
    },
    {
      id: 'R7_NON_PROD_HIGH_COST_OR_PII',
      description: 'Staging/Dev changes over $100/mo or touching internal PII require multi-department review',
      inputEntries: ['"dev", "staging"', '[101..10000]', '-', 'false', '>= 0.80'],
      outputEntries: [
        '"require_dept_signoff"',
        '"@eng-manager"',
        '"Non-prod spend > $100/mo requires @finops-agent + @sec-agent review and @eng-manager approval"',
      ],
    },
    {
      id: 'R8_NON_PROD_PII_INTERNAL',
      description: 'Staging/Dev changes touching internal PII even at low cost require multi-department review',
      inputEntries: ['"dev", "staging"', '<= 100', 'true', 'false', '>= 0.80'],
      outputEntries: [
        '"require_dept_signoff"',
        '"@eng-manager"',
        '"Internal PII dataset usage in non-prod requires Security + FinOps review"',
      ],
    },
    {
      id: 'R9_NON_PROD_PUBLIC_LOW_COST',
      description: 'Staging/Dev public exposure without PII over $100/mo requires department review',
      inputEntries: ['"dev", "staging"', '[101..10000]', 'false', 'true', '>= 0.80'],
      outputEntries: [
        '"require_dept_signoff"',
        '"@eng-manager"',
        '"Public non-prod endpoint > $100/mo requires Security + FinOps sign-off"',
      ],
    },
    {
      id: 'R10_GREEN_LANE_AUTO_APPROVE',
      description: 'Green Lane: Dev/Staging, cost <= $100/mo, no PII, confidence >= 0.80 -> 100% Automatic Approval',
      inputEntries: ['"dev", "staging"', '<= 100', 'false', '-', '>= 0.80'],
      outputEntries: [
        '"auto_approve"',
        '"none"',
        '"Green Lane Fast-Track: Low-cost non-prod change with high confidence and zero PII"',
      ],
    },
  ],
};

export const DEFAULT_BPMN_PROCESS: BpmnProcessDefinition = {
  id: 'bpmn_switch_ops_governance',
  version: '1.0.0',
  name: 'Switch Room Multi-Department Release & FinOps/SecOps Workflow',
  description:
    'Orchestrates @sre-agent, @sec-agent, @finops-agent, and human executives inside a Switch AI Room using deterministic BPMN 2.0 tokens and DMN 1.3 gates.',
  elements: [
    {
      id: 'start_request',
      kind: 'startEvent',
      name: 'Switch Room Request Received',
    },
    {
      id: 'task_sre_triage',
      kind: 'serviceTask',
      name: 'SRE Triage & Telemetry Extraction',
      description: '@sre-agent inspects logs, infrastructure diff, and blast radius',
      executor: {
        kind: 'agent',
        actor: '@sre-agent',
        department: 'SRE',
        requiredOutputs: ['env', 'cost_delta', 'touches_pii', 'public_exposure', 'confidence'],
        compensateAction: 'revert_sre_triage_workspace',
      },
    },
    {
      id: 'rule_dmn_gate',
      kind: 'businessRuleTask',
      name: 'DMN 1.3 Governance Policy Gate',
      description: 'Evaluates dmn_release_and_infra_governance deterministically',
      decisionRef: 'dmn_release_and_infra_governance',
      resultVariable: 'governance',
    },
    {
      id: 'gw_verdict_route',
      kind: 'exclusiveGateway',
      name: 'Route by DMN Verdict',
    },
    {
      id: 'gw_dept_fork',
      kind: 'parallelGateway',
      name: 'Fork Parallel Multi-Department Review',
    },
    {
      id: 'task_sec_audit',
      kind: 'serviceTask',
      name: 'Security & Compliance Audit',
      description: '@sec-agent scans IAM diff, CVE posture, and network boundaries',
      executor: {
        kind: 'agent',
        actor: '@sec-agent',
        department: 'Security',
        requiredOutputs: ['sec_approved', 'sec_notes'],
        compensateAction: 'revoke_temporary_security_clearance',
      },
    },
    {
      id: 'task_finops_audit',
      kind: 'serviceTask',
      name: 'FinOps Cloud Cost & Quota Review',
      description: '@finops-agent validates department budget envelope and reserves cloud quota',
      executor: {
        kind: 'agent',
        actor: '@finops-agent',
        department: 'FinOps',
        requiredOutputs: ['finops_approved', 'finops_notes'],
        compensateAction: 'release_reserved_cloud_budget',
      },
    },
    {
      id: 'gw_dept_join',
      kind: 'parallelGateway',
      name: 'Join Multi-Department Sign-Offs',
    },
    {
      id: 'gw_dept_consensus',
      kind: 'exclusiveGateway',
      name: 'Verify Department Consensus',
    },
    {
      id: 'task_human_approval',
      kind: 'userTask',
      name: 'Human Executive Approval Gate (Switch Room)',
      description: 'Mandatory human-only sign-off in Switch Room (@eng-manager or @ciso)',
      executor: {
        kind: 'human',
        actor: '@eng-manager',
        department: 'Executive',
        requiredOutputs: ['human_approved', 'human_comment'],
      },
    },
    {
      id: 'gw_human_decision',
      kind: 'exclusiveGateway',
      name: 'Route by Human Decision',
    },
    {
      id: 'task_sre_execute',
      kind: 'serviceTask',
      name: 'SRE Production Rollout & Verification',
      description: '@sre-agent applies infrastructure/release changes and posts verification metrics',
      executor: {
        kind: 'agent',
        actor: '@sre-agent',
        department: 'SRE',
        requiredOutputs: ['deployment_id', 'rollout_status'],
        compensateAction: 'rollback_deployment_and_restore_snapshot',
      },
    },
    {
      id: 'end_approved',
      kind: 'endEvent',
      name: 'Operation Deployed & Audited',
      outcome: 'approved',
    },
    {
      id: 'end_rejected',
      kind: 'endEvent',
      name: 'Operation Halted by Governance',
      outcome: 'rejected',
    },
  ],
  flows: [
    { id: 'f1', from: 'start_request', to: 'task_sre_triage' },
    { id: 'f2', from: 'task_sre_triage', to: 'rule_dmn_gate' },
    { id: 'f3', from: 'rule_dmn_gate', to: 'gw_verdict_route' },
    {
      id: 'f4_auto',
      from: 'gw_verdict_route',
      to: 'task_sre_execute',
      name: 'Green Lane Auto-Approve',
      condition: 'governance.verdict = "auto_approve"',
    },
    {
      id: 'f4_escalate',
      from: 'gw_verdict_route',
      to: 'gw_dept_fork',
      name: 'Multi-Department Escalation',
      condition:
        'governance.verdict = "require_dept_signoff" or governance.verdict = "require_exec_and_dept_signoff"',
    },
    {
      id: 'f4_reject',
      from: 'gw_verdict_route',
      to: 'end_rejected',
      name: 'Policy Reject',
      isDefault: true,
    },
    { id: 'f5_fork_sec', from: 'gw_dept_fork', to: 'task_sec_audit' },
    { id: 'f5_fork_fin', from: 'gw_dept_fork', to: 'task_finops_audit' },
    { id: 'f6_join_sec', from: 'task_sec_audit', to: 'gw_dept_join' },
    { id: 'f6_join_fin', from: 'task_finops_audit', to: 'gw_dept_join' },
    { id: 'f7', from: 'gw_dept_join', to: 'gw_dept_consensus' },
    {
      id: 'f8_consensus_ok',
      from: 'gw_dept_consensus',
      to: 'task_human_approval',
      name: 'Both Departments Approved',
      condition: 'sec_approved = true and finops_approved = true',
    },
    {
      id: 'f8_consensus_veto',
      from: 'gw_dept_consensus',
      to: 'end_rejected',
      name: 'Department Veto',
      isDefault: true,
    },
    { id: 'f9', from: 'task_human_approval', to: 'gw_human_decision' },
    {
      id: 'f10_human_ok',
      from: 'gw_human_decision',
      to: 'task_sre_execute',
      name: 'Human Executive Approved',
      condition: 'human_approved = true',
    },
    {
      id: 'f10_human_reject',
      from: 'gw_human_decision',
      to: 'end_rejected',
      name: 'Human Executive Rejected',
      isDefault: true,
    },
    { id: 'f11', from: 'task_sre_execute', to: 'end_approved' },
  ],
};

/**
 * Scenario 4 Demo Fixture A:
 * A flawed DMN table proposed by an LLM agent in chat ("Auto-approve all high-confidence requests
 * regardless of environment or PII to speed up Friday hotfixes").
 * Formal verification catches the conflicting overlap with R1_BLOCK_PUBLIC_PII and R5_PROD_PII_CISO_GATE.
 */
export const FLAWED_DMN_OVERLAP_PROPOSAL: DmnDecisionTable = {
  ...DEFAULT_DMN_TABLE,
  version: '2.0.0-flawed',
  hitPolicy: 'UNIQUE',
  rules: [
    ...DEFAULT_DMN_TABLE.rules,
    {
      id: 'R11_NAIVE_HOTFIX_BYPASS',
      description: 'LLM-generated rule: Auto-approve any request when agent confidence >= 0.90',
      inputEntries: ['-', '-', '-', '-', '>= 0.90'],
      outputEntries: [
        '"auto_approve"',
        '"none"',
        '"Fast-track hotfix bypass proposed in chat"',
      ],
    },
  ],
};

/**
 * Scenario 4 Demo Fixture B:
 * A flawed BPMN workflow proposed in chat ("Skip Security audit on escalated requests and jump
 * straight to FinOps audit before joining at gw_dept_join").
 * Formal Petri-net soundness verification catches ERR_LACK_OF_SYNCHRONIZATION deadlock at gw_dept_join.
 */
export const FLAWED_BPMN_DEADLOCK_PROPOSAL: BpmnProcessDefinition = {
  ...DEFAULT_BPMN_PROCESS,
  version: '2.0.0-unsound',
  flows: DEFAULT_BPMN_PROCESS.flows.map((f) =>
    f.id === 'f4_escalate'
      ? {
          ...f,
          to: 'task_finops_audit', // Bypasses gw_dept_fork and task_sec_audit, starving gw_dept_join!
          name: 'Bypass Security Directly to FinOps (Unsound)',
        }
      : f
  ),
};
