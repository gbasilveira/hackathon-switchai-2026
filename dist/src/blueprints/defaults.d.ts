/**
 * SwitchCortex — Default Verified BPMN 2.0 & DMN 1.3 Blueprints
 * plus Flawed Blueprint Proposals for Live Design-Time Verification Demos.
 */
import { BpmnProcessDefinition } from '../bpmn/engine.js';
import { DmnDecisionTable } from '../dmn/engine.js';
export declare const DEFAULT_DMN_TABLE: DmnDecisionTable;
export declare const DEFAULT_BPMN_PROCESS: BpmnProcessDefinition;
/**
 * Scenario 4 Demo Fixture A:
 * A flawed DMN table proposed by an LLM agent in chat ("Auto-approve all high-confidence requests
 * regardless of environment or PII to speed up Friday hotfixes").
 * Formal verification catches the conflicting overlap with R1_BLOCK_PUBLIC_PII and R5_PROD_PII_CISO_GATE.
 */
export declare const FLAWED_DMN_OVERLAP_PROPOSAL: DmnDecisionTable;
/**
 * Scenario 4 Demo Fixture B:
 * A flawed BPMN workflow proposed in chat ("Skip Security audit on escalated requests and jump
 * straight to FinOps audit before joining at gw_dept_join").
 * Formal Petri-net soundness verification catches ERR_LACK_OF_SYNCHRONIZATION deadlock at gw_dept_join.
 */
export declare const FLAWED_BPMN_DEADLOCK_PROPOSAL: BpmnProcessDefinition;
