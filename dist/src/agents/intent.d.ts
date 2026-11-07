/**
 * SwitchCortex — deterministic intent gate (fail-closed).
 *
 * Nothing reaches the BPMN/DMN execution path unless the message is an explicit
 * operational request: imperative action verb + concrete target + explicit environment.
 * Questions, greetings and ambiguous text never start a workflow. The LLM cannot
 * widen this gate; it only extracts facts after the gate has passed.
 */
export type Intent = 'ops_request' | 'conversation' | 'needs_clarification';
export interface IntentVerdict {
    readonly intent: Intent;
    readonly reason: string;
    readonly action?: string;
    readonly env?: 'dev' | 'staging' | 'prod';
    readonly costStated: boolean;
    /** Message to post in the room when no workflow is started. */
    readonly reply?: string;
}
export declare function classifyIntent(rawPrompt: string): IntentVerdict;
