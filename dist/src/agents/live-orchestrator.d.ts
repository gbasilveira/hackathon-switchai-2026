/**
 * SwitchCortex — Live AI Multi-Department Agent Orchestrator (Google Gemini + Slack/Switch Bridge)
 *
 * Connects real LLM agents (@sre-agent, @sec-agent, @finops-agent) powered by Google Gemini
 * and optional Slack Incoming Webhooks / Event Subscriptions to SwitchCortexRuntime & MCP tools.
 */
import { CallerPrincipal, SwitchCortexRuntime, WorkflowInstance } from '../governance/runtime.js';
export interface LiveChatRequest {
    readonly prompt: string;
    readonly senderId?: string;
    readonly senderKind?: 'human' | 'agent';
    readonly department?: string;
    readonly roomChannel?: string;
    readonly tainted?: boolean;
    /** Optional demo toggle: simulate @sre-agent attempting cross-dept ACL & human gate self-approval */
    readonly simulateRogueAgentAttempts?: boolean;
}
export interface LiveChatResult {
    readonly ok: boolean;
    readonly llmProvider: 'gemini-live' | 'heuristic-fallback';
    readonly modelUsed: string;
    readonly slackMirrored: boolean;
    readonly instance: WorkflowInstance;
    readonly agentCalls: {
        readonly agentId: string;
        readonly elementId: string;
        readonly provider: 'gemini-live' | 'heuristic-fallback';
        readonly latencyMs: number;
    }[];
}
/**
 * Safely loads .env from project root or home directory into process.env without logging values.
 */
export declare function ensureEnvLoaded(): void;
export declare function getLiveIntegrationStatus(): {
    geminiConfigured: boolean;
    geminiModel: string;
    slackWebhookConfigured: boolean;
};
/**
 * Mirrors new Switch Room transcript messages to a real Slack channel when SLACK_WEBHOOK_URL is set.
 */
export declare function syncTranscriptToSlack(instance: WorkflowInstance, fromIndex: number): Promise<boolean>;
/**
 * Starts a new Switch Room workflow from a live chat prompt and drives active AI agent tasks
 * (@sre-agent, @sec-agent, @finops-agent) using Google Gemini.
 */
export declare function runLiveChatWorkflow(runtime: SwitchCortexRuntime, req: LiveChatRequest): Promise<LiveChatResult>;
/**
 * Inspects active BPMN tokens on an instance and invokes the corresponding department AI agents via Gemini.
 */
export declare function advanceActiveAgentTokens(runtime: SwitchCortexRuntime, wf: WorkflowInstance, originalPrompt: string, agentCalls: LiveChatResult['agentCalls'], simulateRogueAgentAttempts?: boolean): Promise<void>;
export declare function executeSreRolloutWithAi(runtime: SwitchCortexRuntime, wf: WorkflowInstance, contextPrompt: string, agentCalls?: LiveChatResult['agentCalls']): Promise<void>;
/**
 * Approves or rejects a pending human gate from the Web Studio / Slack interactive action,
 * and if approved, automatically triggers @sre-agent via Gemini to finish the rollout.
 */
export declare function decideHumanGateAndContinue(runtime: SwitchCortexRuntime, params: {
    instanceId: string;
    caller: CallerPrincipal;
    approved: boolean;
    comment: string;
}): Promise<{
    ok: boolean;
    message: string;
    instance?: WorkflowInstance;
    slackMirrored: boolean;
}>;
