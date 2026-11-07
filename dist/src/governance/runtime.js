/**
 * SwitchCortex — Deterministic Multi-Department Governance Runtime
 *
 * Connects Switch AI Rooms (Humans + @sre-agent, @sec-agent, @finops-agent, @policy-agent)
 * to the BPMN 2.0 state machine, DMN 1.3 decision engine, FEEL evaluator,
 * Smart-Decision guardrails, Supervision controls, and SHA-256 Audit Ledger.
 */
import { computeBpmnDigest, verifyBpmnSoundness, } from '../bpmn/engine.js';
import { DEFAULT_BPMN_PROCESS, DEFAULT_DMN_TABLE, } from '../blueprints/defaults.js';
import { analyzeDecisionTable, computeDmnDigest, evaluateDecisionTable, } from '../dmn/engine.js';
import { evaluateFeel, parseFeelExpression } from '../feel/engine.js';
import { AuditLedger } from '../storage/ledger.js';
export class SwitchCortexRuntime {
    ledger;
    dmnRegistry = new Map();
    bpmnRegistry = new Map();
    instances = new Map();
    pausedAgents = new Set();
    globalKillSwitchEngaged = false;
    instanceCounter = 100;
    tokenCounter = 1;
    msgCounter = 1;
    constructor(ledgerPath) {
        this.ledger = new AuditLedger(ledgerPath);
        // Register and verify default blueprints at initialization
        this.dmnRegistry.set(DEFAULT_DMN_TABLE.id, DEFAULT_DMN_TABLE);
        this.bpmnRegistry.set(DEFAULT_BPMN_PROCESS.id, DEFAULT_BPMN_PROCESS);
    }
    listBlueprints() {
        const dmnTables = Array.from(this.dmnRegistry.values()).map((t) => {
            const report = analyzeDecisionTable(t);
            return {
                id: t.id,
                version: t.version,
                name: t.name,
                hitPolicy: t.hitPolicy,
                digest: computeDmnDigest(t),
                rulesCount: t.rules.length,
                verified: report.ok,
            };
        });
        const bpmnProcesses = Array.from(this.bpmnRegistry.values()).map((p) => {
            const report = verifyBpmnSoundness(p);
            return {
                id: p.id,
                version: p.version,
                name: p.name,
                digest: computeBpmnDigest(p),
                elementsCount: p.elements.length,
                flowsCount: p.flows.length,
                sound: report.ok,
            };
        });
        return { dmnTables, bpmnProcesses };
    }
    getDmnTable(id) {
        return this.dmnRegistry.get(id);
    }
    getBpmnProcess(id) {
        return this.bpmnRegistry.get(id);
    }
    /**
     * Registers or updates a DMN 1.3 decision table ONLY if formal verification passes.
     */
    registerDmnTable(caller, table, roomChannel = '#ops-command-room') {
        const report = analyzeDecisionTable(table);
        if (!report.ok) {
            this.ledger.append({
                instanceId: 'system',
                roomChannel,
                actorId: caller.id,
                actorKind: caller.kind,
                department: caller.department,
                eventType: 'POLICY_VERIFICATION_REJECTED',
                summary: `Rejected DMN table '${table.id}@${table.version}': ${report.overlaps.length} overlap(s), ${report.gaps.length} gap(s), ${report.shadowedRules.length} shadowed rule(s)`,
                payload: {
                    tableId: table.id,
                    version: table.version,
                    overlaps: report.overlaps,
                    gaps: report.gaps,
                    shadowedRules: report.shadowedRules,
                },
            });
            return {
                ok: false,
                code: 'ERR_DMN_FORMAL_VERIFICATION_FAILED',
                message: `DMN table '${table.id}' failed formal static verification (${report.overlaps.length} conflicting overlap(s), ${report.gaps.length} coverage gap(s)). Registration blocked.`,
                data: { report },
            };
        }
        this.dmnRegistry.set(table.id, table);
        this.ledger.append({
            instanceId: 'system',
            roomChannel,
            actorId: caller.id,
            actorKind: caller.kind,
            department: caller.department,
            eventType: 'POLICY_REGISTERED',
            summary: `Verified and registered DMN table '${table.id}@${table.version}' (digest ${report.digest.slice(0, 12)})`,
            payload: { tableId: table.id, version: table.version, digest: report.digest },
        });
        return {
            ok: true,
            code: 'OK_DMN_REGISTERED',
            message: `DMN table '${table.id}@${table.version}' verified (${report.checkedCombinations} combinations checked) and registered.`,
            data: { report },
        };
    }
    /**
     * Registers or updates a BPMN 2.0 process ONLY if Petri-net soundness verification passes.
     */
    registerBpmnProcess(caller, process, roomChannel = '#ops-command-room') {
        const report = verifyBpmnSoundness(process);
        if (!report.ok) {
            this.ledger.append({
                instanceId: 'system',
                roomChannel,
                actorId: caller.id,
                actorKind: caller.kind,
                department: caller.department,
                eventType: 'POLICY_VERIFICATION_REJECTED',
                summary: `Rejected unsound BPMN process '${process.id}@${process.version}': ${report.problems.map((p) => p.code).join(', ')}`,
                payload: {
                    processId: process.id,
                    version: process.version,
                    problems: report.problems,
                },
            });
            return {
                ok: false,
                code: 'ERR_BPMN_SOUNDNESS_FAILED',
                message: `BPMN process '${process.id}' failed Petri-net soundness verification: ${report.problems.map((p) => `${p.code} at ${p.elementId} (${p.message})`).join('; ')}`,
                data: { report },
            };
        }
        this.bpmnRegistry.set(process.id, process);
        this.ledger.append({
            instanceId: 'system',
            roomChannel,
            actorId: caller.id,
            actorKind: caller.kind,
            department: caller.department,
            eventType: 'POLICY_REGISTERED',
            summary: `Verified and registered sound BPMN process '${process.id}@${process.version}' (digest ${report.digest.slice(0, 12)})`,
            payload: { processId: process.id, version: process.version, digest: report.digest },
        });
        return {
            ok: true,
            code: 'OK_BPMN_REGISTERED',
            message: `BPMN process '${process.id}@${process.version}' verified (${report.exploredMarkings} reachable markings sound) and registered.`,
            data: { report },
        };
    }
    /**
     * Starts a new multi-department workflow instance from a Switch Room request.
     */
    startWorkflow(params) {
        if (this.globalKillSwitchEngaged) {
            return {
                ok: false,
                code: 'ERR_KILL_SWITCH_ENGAGED',
                message: 'Global Supervision Kill-Switch is engaged. No new workflows may start until a human supervisor releases it.',
            };
        }
        const processId = params.processId ?? DEFAULT_BPMN_PROCESS.id;
        const process = this.bpmnRegistry.get(processId);
        if (!process) {
            return {
                ok: false,
                code: 'ERR_PROCESS_NOT_FOUND',
                message: `BPMN process '${processId}' is not registered.`,
            };
        }
        this.instanceCounter++;
        const instanceId = `WF-${this.instanceCounter}`;
        const now = new Date().toISOString();
        const roomChannel = params.roomChannel ?? '#ops-command-room';
        const digest = computeBpmnDigest(process);
        const instance = {
            instanceId,
            title: params.title,
            roomChannel,
            processId: process.id,
            processVersion: process.version,
            processDigest: digest,
            initiatedBy: params.caller.id,
            createdAt: now,
            updatedAt: now,
            status: 'running',
            variables: { ...(params.initialVariables ?? {}) },
            tainted: params.tainted ?? false,
            activeTokens: [],
            parallelJoinBuffer: {},
            completedSteps: [],
            compensationsExecuted: [],
            dmnEvaluations: [],
            roomTranscript: [],
        };
        if (params.initialRoomMessage) {
            this.appendRoomMessage(instance, {
                sender: params.caller.id,
                senderKind: params.caller.kind,
                department: params.caller.department,
                badge: params.caller.kind === 'human' ? '👤' : '🤖',
                text: params.initialRoomMessage,
            });
        }
        this.ledger.append({
            instanceId,
            roomChannel,
            actorId: params.caller.id,
            actorKind: params.caller.kind,
            department: params.caller.department,
            eventType: 'WORKFLOW_STARTED',
            summary: `Started workflow '${params.title}' (${process.id}@${process.version})`,
            payload: {
                processId: process.id,
                processDigest: digest,
                tainted: instance.tainted,
                initialVariables: instance.variables,
            },
        });
        this.instances.set(instanceId, instance);
        // Advance from startEvent
        const startEl = process.elements.find((e) => e.kind === 'startEvent');
        const outFlows = process.flows.filter((f) => f.from === startEl.id);
        for (const f of outFlows) {
            this.deliverTokenAlongFlow(instance, process, f.id);
        }
        return {
            ok: true,
            code: 'OK_WORKFLOW_STARTED',
            message: `Workflow '${instanceId}' started in ${roomChannel}. Active tokens: ${instance.activeTokens.map((t) => `${t.elementId} (${t.assignedActor})`).join(', ')}`,
            data: instance,
        };
    }
    /**
     * Used by an AI Agent in the Switch Room (@sre-agent, @sec-agent, @finops-agent)
     * to submit structured outputs/proposals for its assigned BPMN serviceTask.
     */
    submitAgentTask(params) {
        const instance = this.instances.get(params.instanceId);
        if (!instance) {
            return {
                ok: false,
                code: 'ERR_INSTANCE_NOT_FOUND',
                message: `Workflow instance '${params.instanceId}' not found.`,
            };
        }
        if (this.globalKillSwitchEngaged || instance.status === 'paused_by_kill_switch') {
            return {
                ok: false,
                code: 'ERR_KILL_SWITCH_ENGAGED',
                message: `Workflow '${params.instanceId}' is frozen by Supervision Kill-Switch.`,
            };
        }
        if (this.pausedAgents.has(params.caller.id)) {
            return {
                ok: false,
                code: 'ERR_AGENT_ROLE_PAUSED',
                message: `Agent role '${params.caller.id}' is currently paused by human supervision.`,
            };
        }
        const tokenIdx = instance.activeTokens.findIndex((t) => t.elementId === params.elementId);
        if (tokenIdx === -1) {
            return {
                ok: false,
                code: 'ERR_NO_ACTIVE_TOKEN',
                message: `Element '${params.elementId}' does not have an active token in workflow '${params.instanceId}'. Active elements: [${instance.activeTokens.map((t) => t.elementId).join(', ')}]`,
            };
        }
        const token = instance.activeTokens[tokenIdx];
        if (token.elementKind === 'userTask' || token.assignedKind === 'human') {
            this.ledger.append({
                instanceId: instance.instanceId,
                roomChannel: instance.roomChannel,
                actorId: params.caller.id,
                actorKind: params.caller.kind,
                department: params.caller.department,
                eventType: 'SECURITY_VIOLATION_BLOCKED',
                summary: `Blocked agent '${params.caller.id}' from executing human-only userTask '${token.elementId}'`,
                payload: { elementId: token.elementId, assignedActor: token.assignedActor },
            });
            return {
                ok: false,
                code: 'ERR_HUMAN_ONLY_GATE',
                message: `Security Violation: '${token.elementId}' is a human-only gate assigned to '${token.assignedActor}'. AI agents cannot execute or approve human gates.`,
            };
        }
        if (token.assignedActor !== params.caller.id) {
            this.ledger.append({
                instanceId: instance.instanceId,
                roomChannel: instance.roomChannel,
                actorId: params.caller.id,
                actorKind: params.caller.kind,
                department: params.caller.department,
                eventType: 'SECURITY_VIOLATION_BLOCKED',
                summary: `Cross-department boundary violation: '${params.caller.id}' (${params.caller.department}) attempted to execute '${token.elementId}' owned by '${token.assignedActor}' (${token.department})`,
                payload: { elementId: token.elementId, expectedActor: token.assignedActor, actualActor: params.caller.id },
            });
            return {
                ok: false,
                code: 'ERR_DEPARTMENT_ACL_DENIED',
                message: `Department ACL Denied: Task '${token.elementId}' belongs to '${token.assignedActor}' (${token.department}), not '${params.caller.id}' (${params.caller.department}).`,
            };
        }
        for (const reqKey of token.requiredOutputs) {
            if (!(reqKey in params.outputs) || params.outputs[reqKey] === undefined) {
                return {
                    ok: false,
                    code: 'ERR_MISSING_REQUIRED_OUTPUT',
                    message: `Task '${token.elementId}' requires output variable '${reqKey}'.`,
                };
            }
        }
        const process = this.bpmnRegistry.get(instance.processId);
        const element = process.elements.find((e) => e.id === params.elementId);
        // Consume active token
        instance.activeTokens.splice(tokenIdx, 1);
        // Merge outputs into workflow context
        for (const [k, v] of Object.entries(params.outputs)) {
            instance.variables[k] = v;
        }
        // If workflow context is tainted (e.g. untrusted external webhook/prompt), cap confidence at 0.65 so DMN escalates!
        if (instance.tainted && typeof instance.variables['confidence'] === 'number' && instance.variables['confidence'] > 0.65) {
            instance.variables['raw_agent_confidence'] = instance.variables['confidence'];
            instance.variables['confidence'] = 0.65;
            this.ledger.append({
                instanceId: instance.instanceId,
                roomChannel: instance.roomChannel,
                actorId: 'cortex:smart-guardrail',
                actorKind: 'system',
                department: 'Governance',
                eventType: 'SMART_GUARDRAIL_ENFORCED',
                summary: `Sticky taint active on workflow '${instance.instanceId}': capped effective confidence from ${String(instance.variables['raw_agent_confidence'])} to 0.65 to force multi-department + human escalation`,
                payload: {
                    rawConfidence: instance.variables['raw_agent_confidence'],
                    effectiveConfidence: 0.65,
                },
            });
        }
        const stepRecord = {
            stepSeq: instance.completedSteps.length + 1,
            elementId: element.id,
            elementName: element.name,
            actorId: params.caller.id,
            actorKind: params.caller.kind,
            department: params.caller.department,
            outputs: { ...params.outputs },
            justification: params.justification,
            compensateAction: element.executor?.compensateAction,
            completedAt: new Date().toISOString(),
        };
        instance.completedSteps.push(stepRecord);
        instance.updatedAt = stepRecord.completedAt;
        this.appendRoomMessage(instance, {
            sender: params.caller.id,
            senderKind: 'agent',
            department: params.caller.department,
            badge: '🤖',
            text: params.roomMessage ??
                `Completed **${element.name}**: ${params.justification} \`${JSON.stringify(params.outputs)}\``,
        });
        this.ledger.append({
            instanceId: instance.instanceId,
            roomChannel: instance.roomChannel,
            actorId: params.caller.id,
            actorKind: params.caller.kind,
            department: params.caller.department,
            eventType: 'AGENT_PROPOSAL_RECORDED',
            summary: `${params.caller.id} completed '${element.name}' (${element.id}): ${params.justification}`,
            payload: {
                elementId: element.id,
                outputs: params.outputs,
                justification: params.justification,
            },
        });
        // Advance along outgoing sequence flows
        const outFlows = process.flows.filter((f) => f.from === element.id);
        for (const f of outFlows) {
            this.deliverTokenAlongFlow(instance, process, f.id);
        }
        return {
            ok: true,
            code: 'OK_STEP_COMPLETED',
            message: `Completed '${element.name}'. Workflow status: ${instance.status}.`,
            data: instance,
        };
    }
    /**
     * Approves or rejects a pending humanOnly userTask in the Switch Room.
     * Strictly enforces caller.kind === 'human' and re-verifies hard compliance guardrails.
     */
    decideHumanGate(params) {
        const instance = this.instances.get(params.instanceId);
        if (!instance) {
            return {
                ok: false,
                code: 'ERR_INSTANCE_NOT_FOUND',
                message: `Workflow instance '${params.instanceId}' not found.`,
            };
        }
        const targetElementId = params.elementId ?? instance.activeTokens.find((t) => t.elementKind === 'userTask')?.elementId;
        if (!targetElementId) {
            return {
                ok: false,
                code: 'ERR_NO_HUMAN_GATE_PENDING',
                message: `Workflow '${params.instanceId}' has no pending human approval gate.`,
            };
        }
        // CRITICAL INVARIANT: Agents can NEVER approve or reject a human gate (`humanOnly`)
        if (params.caller.kind !== 'human') {
            this.appendRoomMessage(instance, {
                sender: '@switch-cortex',
                senderKind: 'cortex',
                department: 'Governance',
                badge: '🛡️',
                text: `🚨 **SECURITY BLOCK (\`ERR_HUMAN_ONLY_GATE\`)**: Agent \`${params.caller.id}\` attempted to ${params.approved ? 'approve' : 'reject'} human executive gate \`${targetElementId}\`. Action denied and logged to SHA-256 audit ledger.`,
            });
            this.ledger.append({
                instanceId: instance.instanceId,
                roomChannel: instance.roomChannel,
                actorId: params.caller.id,
                actorKind: params.caller.kind,
                department: params.caller.department,
                eventType: 'SECURITY_VIOLATION_BLOCKED',
                summary: `Blocked AI agent '${params.caller.id}' from deciding human-only approval gate '${targetElementId}'`,
                payload: {
                    elementId: targetElementId,
                    attemptedDecision: params.approved,
                    comment: params.comment,
                },
            });
            return {
                ok: false,
                code: 'ERR_HUMAN_ONLY_GATE',
                message: `Access Denied: '${targetElementId}' is strictly humanOnly. Agent '${params.caller.id}' is structurally prohibited from deciding human approval gates.`,
                data: instance,
            };
        }
        // Even when a human approves, check hard non-overridable corporate guardrails
        if (params.approved &&
            instance.variables['touches_pii'] === true &&
            instance.variables['public_exposure'] === true) {
            this.ledger.append({
                instanceId: instance.instanceId,
                roomChannel: instance.roomChannel,
                actorId: params.caller.id,
                actorKind: 'human',
                department: params.caller.department,
                eventType: 'SMART_GUARDRAIL_ENFORCED',
                summary: `Blocked human override on '${instance.instanceId}': hard compliance guardrail forbids public exposure of PII`,
                payload: { elementId: targetElementId, caller: params.caller.id },
            });
            return {
                ok: false,
                code: 'ERR_HARD_GUARDRAIL_VIOLATION',
                message: `Hard Compliance Guardrail Violation: Even human approval cannot authorize public exposure of customer PII.`,
                data: instance,
            };
        }
        const tokenIdx = instance.activeTokens.findIndex((t) => t.elementId === targetElementId);
        if (tokenIdx === -1) {
            return {
                ok: false,
                code: 'ERR_NO_ACTIVE_TOKEN',
                message: `Gate '${targetElementId}' is not active.`,
            };
        }
        const process = this.bpmnRegistry.get(instance.processId);
        const element = process.elements.find((e) => e.id === targetElementId);
        instance.activeTokens.splice(tokenIdx, 1);
        instance.variables['human_approved'] = params.approved;
        instance.variables['human_comment'] = params.comment;
        instance.variables['approved_by'] = params.caller.id;
        instance.status = 'running';
        instance.completedSteps.push({
            stepSeq: instance.completedSteps.length + 1,
            elementId: element.id,
            elementName: element.name,
            actorId: params.caller.id,
            actorKind: 'human',
            department: params.caller.department,
            outputs: {
                human_approved: params.approved,
                human_comment: params.comment,
            },
            justification: params.comment,
            completedAt: new Date().toISOString(),
        });
        this.appendRoomMessage(instance, {
            sender: params.caller.id,
            senderKind: 'human',
            department: params.caller.department,
            badge: '👤',
            text: `${params.approved ? '✅ **APPROVED**' : '❌ **REJECTED**'} gate \`${element.name}\`: "${params.comment}"`,
        });
        this.ledger.append({
            instanceId: instance.instanceId,
            roomChannel: instance.roomChannel,
            actorId: params.caller.id,
            actorKind: 'human',
            department: params.caller.department,
            eventType: 'HUMAN_APPROVAL_DECIDED',
            summary: `Human '${params.caller.id}' ${params.approved ? 'APPROVED' : 'REJECTED'} gate '${element.id}': ${params.comment}`,
            payload: {
                elementId: element.id,
                approved: params.approved,
                comment: params.comment,
            },
        });
        const outFlows = process.flows.filter((f) => f.from === element.id);
        for (const f of outFlows) {
            this.deliverTokenAlongFlow(instance, process, f.id);
        }
        return {
            ok: true,
            code: params.approved ? 'OK_HUMAN_APPROVED' : 'OK_HUMAN_REJECTED',
            message: `Human decision (${params.approved ? 'APPROVED' : 'REJECTED'}) recorded. Workflow status: ${instance.status}.`,
            data: instance,
        };
    }
    /**
     * Supervision controls: kill-switch, pause/resume agent role, or compensating undo of a workflow.
     */
    superviseControl(params) {
        const roomChannel = params.roomChannel ?? '#ops-command-room';
        if (params.action === 'release_kill_switch' && params.caller.kind !== 'human') {
            this.ledger.append({
                instanceId: 'system',
                roomChannel,
                actorId: params.caller.id,
                actorKind: params.caller.kind,
                department: params.caller.department,
                eventType: 'SECURITY_VIOLATION_BLOCKED',
                summary: `Blocked agent '${params.caller.id}' from releasing supervision kill-switch`,
                payload: { reason: params.reason },
            });
            return {
                ok: false,
                code: 'ERR_HUMAN_ONLY_KILL_RELEASE',
                message: `Supervision Violation: Only a human supervisor can release an engaged Kill-Switch.`,
            };
        }
        switch (params.action) {
            case 'engage_kill_switch': {
                this.globalKillSwitchEngaged = true;
                for (const inst of this.instances.values()) {
                    if (inst.status === 'running' || inst.status === 'awaiting_human') {
                        inst.status = 'paused_by_kill_switch';
                    }
                }
                this.ledger.append({
                    instanceId: params.targetId ?? 'system',
                    roomChannel,
                    actorId: params.caller.id,
                    actorKind: params.caller.kind,
                    department: params.caller.department,
                    eventType: 'KILL_SWITCH_ENGAGED',
                    summary: `Kill-Switch engaged by '${params.caller.id}': ${params.reason}`,
                    payload: { reason: params.reason },
                });
                return {
                    ok: true,
                    code: 'OK_KILL_SWITCH_ENGAGED',
                    message: `Global Supervision Kill-Switch engaged. All active workflows frozen.`,
                };
            }
            case 'release_kill_switch': {
                this.globalKillSwitchEngaged = false;
                for (const inst of this.instances.values()) {
                    if (inst.status === 'paused_by_kill_switch') {
                        const hasHumanGate = inst.activeTokens.some((t) => t.elementKind === 'userTask');
                        inst.status = hasHumanGate ? 'awaiting_human' : 'running';
                    }
                }
                this.ledger.append({
                    instanceId: params.targetId ?? 'system',
                    roomChannel,
                    actorId: params.caller.id,
                    actorKind: params.caller.kind,
                    department: params.caller.department,
                    eventType: 'KILL_SWITCH_RELEASED',
                    summary: `Kill-Switch released by human supervisor '${params.caller.id}': ${params.reason}`,
                    payload: { reason: params.reason },
                });
                return {
                    ok: true,
                    code: 'OK_KILL_SWITCH_RELEASED',
                    message: `Global Supervision Kill-Switch released by '${params.caller.id}'.`,
                };
            }
            case 'pause_agent': {
                if (!params.targetId) {
                    return { ok: false, code: 'ERR_MISSING_TARGET', message: 'targetId (agent ID) is required' };
                }
                this.pausedAgents.add(params.targetId);
                return {
                    ok: true,
                    code: 'OK_AGENT_PAUSED',
                    message: `Agent role '${params.targetId}' paused.`,
                };
            }
            case 'resume_agent': {
                if (!params.targetId) {
                    return { ok: false, code: 'ERR_MISSING_TARGET', message: 'targetId (agent ID) is required' };
                }
                this.pausedAgents.delete(params.targetId);
                return {
                    ok: true,
                    code: 'OK_AGENT_RESUMED',
                    message: `Agent role '${params.targetId}' resumed.`,
                };
            }
            case 'undo_workflow': {
                const instanceId = params.targetId;
                if (!instanceId || !this.instances.has(instanceId)) {
                    return {
                        ok: false,
                        code: 'ERR_INSTANCE_NOT_FOUND',
                        message: `Workflow instance '${String(instanceId)}' not found for undo.`,
                    };
                }
                const instance = this.instances.get(instanceId);
                const compensations = [];
                // Execute compensating actions in reverse topological order
                for (let i = instance.completedSteps.length - 1; i >= 0; i--) {
                    const step = instance.completedSteps[i];
                    if (step.compensateAction) {
                        const comp = {
                            stepSeq: step.stepSeq,
                            elementId: step.elementId,
                            compensateAction: step.compensateAction,
                            executedAt: new Date().toISOString(),
                        };
                        compensations.push(comp);
                        instance.compensationsExecuted.push(comp);
                    }
                }
                instance.activeTokens = [];
                instance.status = 'rolled_back';
                instance.updatedAt = new Date().toISOString();
                this.appendRoomMessage(instance, {
                    sender: '@switch-cortex',
                    senderKind: 'cortex',
                    department: 'Supervision',
                    badge: '⏪',
                    text: `**SUPERVISION ROLLBACK EXECUTED** by \`${params.caller.id}\` (${params.reason}). Compensated ${compensations.length} step(s) in reverse order: ${compensations.map((c) => `\`${c.compensateAction}\``).join(' → ')}`,
                });
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: params.caller.id,
                    actorKind: params.caller.kind,
                    department: params.caller.department,
                    eventType: 'COMPENSATION_EXECUTED',
                    summary: `Rolled back workflow '${instance.instanceId}' (${compensations.length} compensating actions: ${compensations.map((c) => c.compensateAction).join(', ')})`,
                    payload: {
                        reason: params.reason,
                        compensations,
                    },
                });
                return {
                    ok: true,
                    code: 'OK_WORKFLOW_ROLLED_BACK',
                    message: `Workflow '${instance.instanceId}' rolled back with ${compensations.length} compensating action(s).`,
                    data: { instance, compensations },
                };
            }
        }
    }
    getInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    listInstances() {
        return Array.from(this.instances.values());
    }
    listInbox(filter) {
        const items = [];
        for (const inst of this.instances.values()) {
            if (inst.status !== 'running' && inst.status !== 'awaiting_human')
                continue;
            for (const tok of inst.activeTokens) {
                if (filter?.actor && tok.assignedActor !== filter.actor)
                    continue;
                if (filter?.department && tok.department !== filter.department)
                    continue;
                if (filter?.kind && tok.assignedKind !== filter.kind)
                    continue;
                items.push({
                    instanceId: inst.instanceId,
                    workflowTitle: inst.title,
                    roomChannel: inst.roomChannel,
                    token: tok,
                    variables: { ...inst.variables },
                });
            }
        }
        return items;
    }
    /**
     * Internal BPMN token delivery engine:
     * Automatically traverses businessRuleTask (DMN 1.3), exclusiveGateway (FEEL),
     * parallelGateway (AND fork/join), and halts at serviceTask (agent) or userTask (humanOnly).
     */
    deliverTokenAlongFlow(instance, process, flowId) {
        const flow = process.flows.find((f) => f.id === flowId);
        if (!flow)
            return;
        const target = process.elements.find((e) => e.id === flow.to);
        if (!target)
            return;
        switch (target.kind) {
            case 'serviceTask': {
                this.tokenCounter++;
                const token = {
                    tokenId: `tok-${this.tokenCounter}`,
                    elementId: target.id,
                    elementKind: 'serviceTask',
                    elementName: target.name,
                    assignedActor: target.executor?.actor ?? '@sre-agent',
                    assignedKind: 'agent',
                    department: target.executor?.department ?? 'SRE',
                    requiredOutputs: target.executor?.requiredOutputs ?? [],
                    arrivedViaFlowId: flow.id,
                    createdAt: new Date().toISOString(),
                };
                instance.activeTokens.push(token);
                this.appendRoomMessage(instance, {
                    sender: '@switch-cortex',
                    senderKind: 'cortex',
                    department: 'Governance',
                    badge: '📋',
                    text: `Dispatched BPMN task **${target.name}** (\`${target.id}\`) to ${token.assignedActor} (**${token.department}** department).`,
                });
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: token.assignedActor,
                    actorKind: 'agent',
                    department: token.department,
                    eventType: 'AGENT_TASK_DISPATCHED',
                    summary: `Dispatched serviceTask '${target.name}' (${target.id}) to ${token.assignedActor}`,
                    payload: { elementId: target.id, assignedActor: token.assignedActor, requiredOutputs: token.requiredOutputs },
                });
                return;
            }
            case 'userTask': {
                this.tokenCounter++;
                // Dynamic approver override from DMN governance output if present
                const gov = instance.variables['governance'];
                const dynamicApprover = gov && typeof gov['required_approver'] === 'string' && gov['required_approver'] !== 'none'
                    ? gov['required_approver']
                    : target.executor?.actor ?? '@eng-manager';
                const token = {
                    tokenId: `tok-${this.tokenCounter}`,
                    elementId: target.id,
                    elementKind: 'userTask',
                    elementName: target.name,
                    assignedActor: dynamicApprover,
                    assignedKind: 'human',
                    department: target.executor?.department ?? 'Executive',
                    requiredOutputs: target.executor?.requiredOutputs ?? ['human_approved', 'human_comment'],
                    arrivedViaFlowId: flow.id,
                    createdAt: new Date().toISOString(),
                };
                instance.activeTokens.push(token);
                instance.status = 'awaiting_human';
                this.appendRoomMessage(instance, {
                    sender: '@switch-cortex',
                    senderKind: 'cortex',
                    department: 'Governance',
                    badge: '🔒',
                    text: `**HUMAN-ONLY GATE OPENED (\`${target.id}\`)**: Awaiting explicit approval from human executive **${dynamicApprover}** in Switch Room. *(AI agents are structurally blocked from approving this gate)*`,
                });
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: dynamicApprover,
                    actorKind: 'human',
                    department: token.department,
                    eventType: 'HUMAN_INBOX_CREATED',
                    summary: `Opened humanOnly userTask '${target.name}' (${target.id}) assigned to ${dynamicApprover}`,
                    payload: { elementId: target.id, assignedActor: dynamicApprover },
                });
                return;
            }
            case 'businessRuleTask': {
                const dmnId = target.decisionRef ?? DEFAULT_DMN_TABLE.id;
                const table = this.dmnRegistry.get(dmnId);
                if (!table) {
                    throw new Error(`DMN table '${dmnId}' not found for businessRuleTask '${target.id}'`);
                }
                const evalResult = evaluateDecisionTable(table, instance.variables);
                instance.dmnEvaluations.push(evalResult);
                const resultVar = target.resultVariable ?? 'decision';
                if (evalResult.outputs && !Array.isArray(evalResult.outputs)) {
                    instance.variables[resultVar] = evalResult.outputs;
                }
                const winningRule = evalResult.selectedRuleIds[0] ?? 'none';
                const verdictObj = evalResult.outputs ?? {};
                const verdictStr = String(verdictObj['verdict'] ?? evalResult.status);
                const policyNote = String(verdictObj['policy_note'] ?? '');
                this.appendRoomMessage(instance, {
                    sender: '@switch-cortex',
                    senderKind: 'cortex',
                    department: 'Governance',
                    badge: '⚖️',
                    text: `**DMN 1.3 Gate Evaluated (\`${table.id}\`)** → Rule \`${winningRule}\` matched → Verdict: **\`${verdictStr}\`** (${policyNote})`,
                });
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: 'cortex:dmn-engine',
                    actorKind: 'system',
                    department: 'Governance',
                    eventType: 'DMN_EVALUATED',
                    summary: `DMN '${table.id}' matched rule [${evalResult.selectedRuleIds.join(', ')}] -> verdict='${verdictStr}'`,
                    payload: {
                        tableId: table.id,
                        digest: evalResult.digest,
                        selectedRules: evalResult.selectedRuleIds,
                        outputs: evalResult.outputs,
                    },
                });
                const outFlows = process.flows.filter((f) => f.from === target.id);
                for (const outf of outFlows) {
                    this.deliverTokenAlongFlow(instance, process, outf.id);
                }
                return;
            }
            case 'exclusiveGateway': {
                const outFlows = process.flows.filter((f) => f.from === target.id);
                let chosenFlow = outFlows.find((f) => {
                    if (!f.condition)
                        return false;
                    const ast = parseFeelExpression(f.condition);
                    return evaluateFeel(ast, instance.variables) === true;
                });
                if (!chosenFlow) {
                    chosenFlow = outFlows.find((f) => f.isDefault);
                }
                if (!chosenFlow) {
                    throw new Error(`Exclusive gateway '${target.id}' stuck: no outgoing branch matched and no default branch defined.`);
                }
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: 'cortex:bpmn-engine',
                    actorKind: 'system',
                    department: 'Governance',
                    eventType: 'GATEWAY_TRANSITION',
                    summary: `Exclusive gateway '${target.name}' (${target.id}) selected flow '${chosenFlow.name ?? chosenFlow.id}' -> '${chosenFlow.to}'`,
                    payload: {
                        gatewayId: target.id,
                        flowId: chosenFlow.id,
                        targetElementId: chosenFlow.to,
                        condition: chosenFlow.condition ?? 'default',
                    },
                });
                this.deliverTokenAlongFlow(instance, process, chosenFlow.id);
                return;
            }
            case 'parallelGateway': {
                const inFlows = process.flows.filter((f) => f.to === target.id);
                const outFlows = process.flows.filter((f) => f.from === target.id);
                if (inFlows.length > 1) {
                    // Parallel Join: buffer incoming flow and wait until ALL incoming flows have arrived
                    const arrived = instance.parallelJoinBuffer[target.id] ?? [];
                    if (!arrived.includes(flow.id)) {
                        arrived.push(flow.id);
                    }
                    instance.parallelJoinBuffer[target.id] = arrived;
                    const allArrived = inFlows.every((inf) => arrived.includes(inf.id));
                    if (!allArrived) {
                        return; // Wait for remaining parallel department branches
                    }
                    // All branches synchronized! Clear buffer and fire outgoing flows
                    instance.parallelJoinBuffer[target.id] = [];
                    this.appendRoomMessage(instance, {
                        sender: '@switch-cortex',
                        senderKind: 'cortex',
                        department: 'Governance',
                        badge: '🔀',
                        text: `**Parallel Gateway Synchronized (\`${target.name}\`)**: All parallel department reviews completed and joined.`,
                    });
                }
                else {
                    this.appendRoomMessage(instance, {
                        sender: '@switch-cortex',
                        senderKind: 'cortex',
                        department: 'Governance',
                        badge: '🔀',
                        text: `**Parallel Gateway Forked (\`${target.name}\`)**: Dispatched concurrent department reviews across ${outFlows.length} branches.`,
                    });
                }
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: 'cortex:bpmn-engine',
                    actorKind: 'system',
                    department: 'Governance',
                    eventType: 'GATEWAY_TRANSITION',
                    summary: `Parallel gateway '${target.name}' (${target.id}) fired -> [${outFlows.map((f) => f.to).join(', ')}]`,
                    payload: {
                        gatewayId: target.id,
                        outgoingTargets: outFlows.map((f) => f.to),
                    },
                });
                for (const outf of outFlows) {
                    this.deliverTokenAlongFlow(instance, process, outf.id);
                }
                return;
            }
            case 'endEvent': {
                if (instance.activeTokens.length === 0) {
                    instance.status = target.outcome === 'approved' ? 'completed_approved' : 'completed_rejected';
                }
                instance.updatedAt = new Date().toISOString();
                this.appendRoomMessage(instance, {
                    sender: '@switch-cortex',
                    senderKind: 'cortex',
                    department: 'Governance',
                    badge: target.outcome === 'approved' ? '🏁' : '🛑',
                    text: `**Workflow Completed (\`${target.name}\`)** — Final Status: **\`${instance.status}\`**. Audit chain head: \`${this.ledger.headHash().slice(0, 12)}\`.`,
                });
                this.ledger.append({
                    instanceId: instance.instanceId,
                    roomChannel: instance.roomChannel,
                    actorId: 'cortex:bpmn-engine',
                    actorKind: 'system',
                    department: 'Governance',
                    eventType: 'WORKFLOW_COMPLETED',
                    summary: `Workflow '${instance.instanceId}' reached endEvent '${target.name}' (${target.id}) with status '${instance.status}'`,
                    payload: {
                        endEventId: target.id,
                        outcome: target.outcome,
                        finalStatus: instance.status,
                    },
                });
                return;
            }
            case 'startEvent':
                return;
        }
    }
    appendRoomMessage(instance, msg) {
        this.msgCounter++;
        instance.roomTranscript.push({
            id: `msg-${this.msgCounter}`,
            timestamp: new Date().toISOString(),
            ...msg,
        });
    }
}
//# sourceMappingURL=runtime.js.map