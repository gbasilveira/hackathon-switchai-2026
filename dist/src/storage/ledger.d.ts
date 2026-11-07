/**
 * SwitchCortex — Append-Only SHA-256 Hash-Chained Audit Ledger
 *
 * Records every BPMN token transition, DMN rule evaluation, agent proposal,
 * human approval, guardrail violation, and supervision rollback in an immutable
 * cryptographic hash chain.
 */
export type AuditEventType = 'WORKFLOW_STARTED' | 'AGENT_TASK_DISPATCHED' | 'AGENT_PROPOSAL_RECORDED' | 'DMN_EVALUATED' | 'SMART_GUARDRAIL_ENFORCED' | 'GATEWAY_TRANSITION' | 'HUMAN_INBOX_CREATED' | 'HUMAN_APPROVAL_DECIDED' | 'SECURITY_VIOLATION_BLOCKED' | 'KILL_SWITCH_ENGAGED' | 'KILL_SWITCH_RELEASED' | 'COMPENSATION_EXECUTED' | 'POLICY_VERIFICATION_REJECTED' | 'POLICY_REGISTERED' | 'WORKFLOW_COMPLETED';
export interface AuditEntry {
    readonly seq: number;
    readonly timestamp: string;
    readonly instanceId: string;
    readonly roomChannel: string;
    readonly actorId: string;
    readonly actorKind: 'agent' | 'human' | 'system';
    readonly department: string;
    readonly eventType: AuditEventType;
    readonly summary: string;
    readonly payload: Record<string, unknown>;
    readonly prevHash: string;
    readonly entryHash: string;
}
export interface LedgerVerificationResult {
    readonly ok: boolean;
    readonly totalEntries: number;
    readonly headHash: string;
    readonly brokenAtSeq?: number;
    readonly reason?: string;
}
export declare function computeEntryHash(seq: number, timestamp: string, instanceId: string, roomChannel: string, actorId: string, actorKind: string, department: string, eventType: string, summary: string, payload: Record<string, unknown>, prevHash: string): string;
export declare class AuditLedger {
    private entries;
    private readonly persistPath?;
    constructor(persistPath?: string);
    append(params: {
        instanceId: string;
        roomChannel?: string;
        actorId: string;
        actorKind: 'agent' | 'human' | 'system';
        department: string;
        eventType: AuditEventType;
        summary: string;
        payload?: Record<string, unknown>;
        timestamp?: string;
    }): AuditEntry;
    list(filter?: {
        instanceId?: string;
        actorId?: string;
        eventType?: AuditEventType;
    }): readonly AuditEntry[];
    verifyIntegrity(): LedgerVerificationResult;
    headHash(): string;
    formatMarkdownReport(instanceId?: string): string;
    private flush;
}
