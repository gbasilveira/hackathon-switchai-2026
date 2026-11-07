/**
 * SwitchCortex — Clean-Room BPMN 2.0 Multi-Department Workflow Engine & Soundness Verifier
 *
 * Implements Petri-net token semantics for BPMN 2.0 (startEvent, endEvent, serviceTask,
 * businessRuleTask, userTask, exclusiveGateway, parallelGateway), formal state-space
 * soundness verification (deadlock, lack-of-synchronization, stranded tokens, reachability),
 * and standard BPMN 2.0 XML export.
 */
export type BpmnElementKind = 'startEvent' | 'endEvent' | 'serviceTask' | 'businessRuleTask' | 'userTask' | 'exclusiveGateway' | 'parallelGateway';
export interface BpmnExecutorSpec {
    readonly kind: 'agent' | 'human' | 'system';
    readonly actor: string;
    readonly department: string;
    readonly requiredOutputs?: readonly string[];
    readonly compensateAction?: string;
}
export interface BpmnElement {
    readonly id: string;
    readonly kind: BpmnElementKind;
    readonly name: string;
    readonly description?: string;
    readonly executor?: BpmnExecutorSpec;
    readonly decisionRef?: string;
    readonly resultVariable?: string;
    readonly outcome?: 'approved' | 'rejected' | 'aborted';
}
export interface BpmnSequenceFlow {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly name?: string;
    readonly condition?: string;
    readonly isDefault?: boolean;
}
export interface BpmnProcessDefinition {
    readonly id: string;
    readonly version: string;
    readonly name: string;
    readonly description?: string;
    readonly elements: readonly BpmnElement[];
    readonly flows: readonly BpmnSequenceFlow[];
}
export interface BpmnSoundnessProblem {
    readonly code: 'ERR_NO_START' | 'ERR_MULTIPLE_START' | 'ERR_NO_END' | 'ERR_BROKEN_FLOW_REF' | 'ERR_INVALID_CONDITION' | 'ERR_UNREACHABLE_NODE' | 'ERR_DEADEND_NODE' | 'ERR_DEADLOCK' | 'ERR_LACK_OF_SYNCHRONIZATION' | 'ERR_END_WITH_REMAINING_TOKENS';
    readonly elementId: string;
    readonly message: string;
    readonly trace?: readonly string[];
}
export interface BpmnVerificationReport {
    readonly ok: boolean;
    readonly status: 'sound' | 'unsound';
    readonly processId: string;
    readonly digest: string;
    readonly exploredMarkings: number;
    readonly variablesReferenced: readonly string[];
    readonly decisionRefs: readonly string[];
    readonly problems: readonly BpmnSoundnessProblem[];
}
export declare function computeBpmnDigest(process: BpmnProcessDefinition): string;
/**
 * Performs structural validation and Petri-net state-space soundness analysis
 * on a BPMN 2.0 process definition.
 *
 * Detects:
 * - Unreachable elements or elements that cannot reach an endEvent
 * - Invalid FEEL expressions on sequence flows
 * - Deadlocks (e.g. a parallelGateway join waiting forever because one branch was bypassed)
 * - Lack of synchronization (parallel branches not properly joined or racing into a join)
 * - End events reached while tokens remain active elsewhere in the workflow
 */
export declare function verifyBpmnSoundness(process: BpmnProcessDefinition): BpmnVerificationReport;
/**
 * Exports a BpmnProcessDefinition to standard OMG BPMN 2.0 XML.
 */
export declare function exportBpmnToXml(process: BpmnProcessDefinition): string;
