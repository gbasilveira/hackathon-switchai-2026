/**
 * SwitchCortex — Deterministic Multi-Department Governance Runtime
 *
 * Connects Switch AI Rooms (Humans + @sre-agent, @sec-agent, @finops-agent, @policy-agent)
 * to the BPMN 2.0 state machine, DMN 1.3 decision engine, FEEL evaluator,
 * Smart-Decision guardrails, Supervision controls, and SHA-256 Audit Ledger.
 */
import { BpmnElement, BpmnProcessDefinition, BpmnVerificationReport } from '../bpmn/engine.js';
import { DmnAnalysisReport, DmnDecisionTable, DmnEvaluationResult } from '../dmn/engine.js';
import { FeelValue } from '../feel/engine.js';
import { AuditLedger } from '../storage/ledger.js';
export interface CallerPrincipal {
    readonly id: string;
    readonly kind: 'agent' | 'human';
    readonly department: string;
}
export interface ActiveToken {
    readonly tokenId: string;
    readonly elementId: string;
    readonly elementKind: BpmnElement['kind'];
    readonly elementName: string;
    readonly assignedActor: string;
    readonly assignedKind: 'agent' | 'human' | 'system';
    readonly department: string;
    readonly requiredOutputs: readonly string[];
    readonly arrivedViaFlowId: string;
    readonly createdAt: string;
}
export interface CompletedStepRecord {
    readonly stepSeq: number;
    readonly elementId: string;
    readonly elementName: string;
    readonly actorId: string;
    readonly actorKind: 'agent' | 'human' | 'system';
    readonly department: string;
    readonly outputs: Record<string, FeelValue>;
    readonly justification?: string;
    readonly compensateAction?: string;
    readonly completedAt: string;
}
export interface RoomMessage {
    readonly id: string;
    readonly timestamp: string;
    readonly sender: string;
    readonly senderKind: 'agent' | 'human' | 'cortex';
    readonly department: string;
    readonly badge: string;
    readonly text: string;
}
export interface WorkflowInstance {
    readonly instanceId: string;
    readonly title: string;
    readonly roomChannel: string;
    readonly processId: string;
    readonly processVersion: string;
    readonly processDigest: string;
    readonly initiatedBy: string;
    readonly createdAt: string;
    updatedAt: string;
    status: 'running' | 'awaiting_human' | 'paused_by_kill_switch' | 'completed_approved' | 'completed_rejected' | 'rolled_back';
    variables: Record<string, FeelValue>;
    tainted: boolean;
    activeTokens: ActiveToken[];
    /** Tracks incoming sequence flow IDs that have delivered a token to a parallelGateway join */
    parallelJoinBuffer: Record<string, string[]>;
    completedSteps: CompletedStepRecord[];
    compensationsExecuted: {
        readonly stepSeq: number;
        readonly elementId: string;
        readonly compensateAction: string;
        readonly executedAt: string;
    }[];
    dmnEvaluations: DmnEvaluationResult[];
    roomTranscript: RoomMessage[];
}
export interface OperationOutcome<T = unknown> {
    readonly ok: boolean;
    readonly code: string;
    readonly message: string;
    readonly data?: T;
}
export declare class SwitchCortexRuntime {
    readonly ledger: AuditLedger;
    private readonly dmnRegistry;
    private readonly bpmnRegistry;
    private readonly instances;
    private readonly pausedAgents;
    private globalKillSwitchEngaged;
    private instanceCounter;
    private tokenCounter;
    private msgCounter;
    constructor(ledgerPath?: string);
    listBlueprints(): {
        dmnTables: {
            id: string;
            version: string;
            name: string;
            hitPolicy: string;
            digest: string;
            rulesCount: number;
            verified: boolean;
        }[];
        bpmnProcesses: {
            id: string;
            version: string;
            name: string;
            digest: string;
            elementsCount: number;
            flowsCount: number;
            sound: boolean;
        }[];
    };
    getDmnTable(id: string): DmnDecisionTable | undefined;
    getBpmnProcess(id: string): BpmnProcessDefinition | undefined;
    /**
     * Registers or updates a DMN 1.3 decision table ONLY if formal verification passes.
     */
    registerDmnTable(caller: CallerPrincipal, table: DmnDecisionTable, roomChannel?: string): OperationOutcome<{
        report: DmnAnalysisReport;
    }>;
    /**
     * Registers or updates a BPMN 2.0 process ONLY if Petri-net soundness verification passes.
     */
    registerBpmnProcess(caller: CallerPrincipal, process: BpmnProcessDefinition, roomChannel?: string): OperationOutcome<{
        report: BpmnVerificationReport;
    }>;
    /**
     * Starts a new multi-department workflow instance from a Switch Room request.
     */
    startWorkflow(params: {
        processId?: string;
        title: string;
        roomChannel?: string;
        caller: CallerPrincipal;
        initialVariables?: Record<string, FeelValue>;
        tainted?: boolean;
        initialRoomMessage?: string;
    }): OperationOutcome<WorkflowInstance>;
    /**
     * Used by an AI Agent in the Switch Room (@sre-agent, @sec-agent, @finops-agent)
     * to submit structured outputs/proposals for its assigned BPMN serviceTask.
     */
    submitAgentTask(params: {
        instanceId: string;
        elementId: string;
        caller: CallerPrincipal;
        outputs: Record<string, FeelValue>;
        justification: string;
        roomMessage?: string;
    }): OperationOutcome<WorkflowInstance>;
    /**
     * Approves or rejects a pending humanOnly userTask in the Switch Room.
     * Strictly enforces caller.kind === 'human' and re-verifies hard compliance guardrails.
     */
    decideHumanGate(params: {
        instanceId: string;
        elementId?: string;
        caller: CallerPrincipal;
        approved: boolean;
        comment: string;
    }): OperationOutcome<WorkflowInstance>;
    /**
     * Supervision controls: kill-switch, pause/resume agent role, or compensating undo of a workflow.
     */
    superviseControl(params: {
        action: 'engage_kill_switch' | 'release_kill_switch' | 'pause_agent' | 'resume_agent' | 'undo_workflow';
        caller: CallerPrincipal;
        targetId?: string;
        reason: string;
        roomChannel?: string;
    }): OperationOutcome<unknown>;
    getInstance(instanceId: string): WorkflowInstance | undefined;
    listInstances(): WorkflowInstance[];
    listInbox(filter?: {
        actor?: string;
        department?: string;
        kind?: 'agent' | 'human';
    }): {
        instanceId: string;
        workflowTitle: string;
        roomChannel: string;
        token: ActiveToken;
        variables: Record<string, FeelValue>;
    }[];
    /**
     * Internal BPMN token delivery engine:
     * Automatically traverses businessRuleTask (DMN 1.3), exclusiveGateway (FEEL),
     * parallelGateway (AND fork/join), and halts at serviceTask (agent) or userTask (humanOnly).
     */
    private deliverTokenAlongFlow;
    private appendRoomMessage;
}
