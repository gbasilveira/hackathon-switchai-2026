/**
 * SwitchCortex — 4 End-to-End Hackathon Demo Scenarios
 *
 * Drives the real SwitchCortexRuntime and MCP tools through:
 * 1. Scenario 1: Green Lane 100% Automatic Approval (Dev/Staging fast-track)
 * 2. Scenario 2: Multi-Department Parallel Escalation (@sec-agent || @finops-agent) + Human-Only Gate + Blocked Agent Self-Approval
 * 3. Scenario 3: Hard PII Guardrail Rejection + Supervision Compensating Rollback (undo_workflow)
 * 4. Scenario 4: Live Design-Time Formal Verification in Switch Room (DMN Overlap Counterexample + BPMN Petri-Net Deadlock Proof)
 */
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
export declare function runScenario1GreenLane(runtime: SwitchCortexRuntime): ScenarioRunSummary;
export declare function runScenario2MultiDeptHumanGate(runtime: SwitchCortexRuntime): ScenarioRunSummary;
export declare function runScenario3GuardrailAndRollback(runtime: SwitchCortexRuntime): ScenarioRunSummary;
export declare function runScenario4FormalVerification(runtime: SwitchCortexRuntime): ScenarioRunSummary;
export declare function runAllDemoScenarios(runtime: SwitchCortexRuntime): ScenarioRunSummary[];
