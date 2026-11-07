/**
 * SwitchCortex — Clean-Room BPMN 2.0 Multi-Department Workflow Engine & Soundness Verifier
 *
 * Implements Petri-net token semantics for BPMN 2.0 (startEvent, endEvent, serviceTask,
 * businessRuleTask, userTask, exclusiveGateway, parallelGateway), formal state-space
 * soundness verification (deadlock, lack-of-synchronization, stranded tokens, reachability),
 * and standard BPMN 2.0 XML export.
 */

import { createHash } from 'node:crypto';
import { extractFreeVariables, parseFeelExpression } from '../feel/engine.js';

export type BpmnElementKind =
  | 'startEvent'
  | 'endEvent'
  | 'serviceTask'
  | 'businessRuleTask'
  | 'userTask'
  | 'exclusiveGateway'
  | 'parallelGateway';

export interface BpmnExecutorSpec {
  readonly kind: 'agent' | 'human' | 'system';
  readonly actor: string; // e.g. "@sre-agent", "@sec-agent", "@finops-agent", "@eng-manager"
  readonly department: string; // e.g. "SRE", "Security", "FinOps", "Executive"
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
  readonly code:
    | 'ERR_NO_START'
    | 'ERR_MULTIPLE_START'
    | 'ERR_NO_END'
    | 'ERR_BROKEN_FLOW_REF'
    | 'ERR_INVALID_CONDITION'
    | 'ERR_UNREACHABLE_NODE'
    | 'ERR_DEADEND_NODE'
    | 'ERR_DEADLOCK'
    | 'ERR_LACK_OF_SYNCHRONIZATION'
    | 'ERR_END_WITH_REMAINING_TOKENS';
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

export function computeBpmnDigest(process: BpmnProcessDefinition): string {
  const canonical = JSON.stringify({
    id: process.id,
    version: process.version,
    name: process.name,
    elements: process.elements.map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      executor: e.executor ?? null,
      decisionRef: e.decisionRef ?? null,
      resultVariable: e.resultVariable ?? null,
      outcome: e.outcome ?? null,
    })),
    flows: process.flows.map((f) => ({
      id: f.id,
      from: f.from,
      to: f.to,
      condition: f.condition ?? null,
      isDefault: f.isDefault ?? false,
    })),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

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
export function verifyBpmnSoundness(process: BpmnProcessDefinition): BpmnVerificationReport {
  const digest = computeBpmnDigest(process);
  const problems: BpmnSoundnessProblem[] = [];
  const variablesSet = new Set<string>();
  const decisionRefsSet = new Set<string>();

  const elementMap = new Map<string, BpmnElement>();
  for (const el of process.elements) {
    elementMap.set(el.id, el);
    if (el.kind === 'businessRuleTask' && el.decisionRef) {
      decisionRefsSet.add(el.decisionRef);
    }
  }

  const starts = process.elements.filter((e) => e.kind === 'startEvent');
  const ends = process.elements.filter((e) => e.kind === 'endEvent');

  if (starts.length === 0) {
    problems.push({
      code: 'ERR_NO_START',
      elementId: process.id,
      message: 'Process must have at least one startEvent',
    });
  } else if (starts.length > 1) {
    problems.push({
      code: 'ERR_MULTIPLE_START',
      elementId: starts[1]!.id,
      message: 'Process must have exactly one startEvent',
    });
  }

  if (ends.length === 0) {
    problems.push({
      code: 'ERR_NO_END',
      elementId: process.id,
      message: 'Process must have at least one endEvent',
    });
  }

  const incoming = new Map<string, BpmnSequenceFlow[]>();
  const outgoing = new Map<string, BpmnSequenceFlow[]>();
  for (const el of process.elements) {
    incoming.set(el.id, []);
    outgoing.set(el.id, []);
  }

  for (const flow of process.flows) {
    if (!elementMap.has(flow.from) || !elementMap.has(flow.to)) {
      problems.push({
        code: 'ERR_BROKEN_FLOW_REF',
        elementId: flow.id,
        message: `Sequence flow '${flow.id}' references non-existent node (${flow.from} -> ${flow.to})`,
      });
      continue;
    }
    outgoing.get(flow.from)!.push(flow);
    incoming.get(flow.to)!.push(flow);

    if (flow.condition) {
      try {
        const ast = parseFeelExpression(flow.condition);
        for (const v of extractFreeVariables(ast)) {
          variablesSet.add(v);
        }
      } catch (err) {
        problems.push({
          code: 'ERR_INVALID_CONDITION',
          elementId: flow.id,
          message: `Invalid FEEL condition on flow '${flow.id}': ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  if (problems.length > 0) {
    return {
      ok: false,
      status: 'unsound',
      processId: process.id,
      digest,
      exploredMarkings: 0,
      variablesReferenced: Array.from(variablesSet).sort(),
      decisionRefs: Array.from(decisionRefsSet).sort(),
      problems,
    };
  }

  // Forward reachability from startEvent
  const startNode = starts[0]!;
  const reachableFromStart = new Set<string>();
  const queue: string[] = [startNode.id];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (reachableFromStart.has(curr)) continue;
    reachableFromStart.add(curr);
    for (const f of outgoing.get(curr) ?? []) {
      if (!reachableFromStart.has(f.to)) queue.push(f.to);
    }
  }

  // Backward reachability from endEvents
  const canReachEnd = new Set<string>();
  const backQueue: string[] = ends.map((e) => e.id);
  while (backQueue.length > 0) {
    const curr = backQueue.shift()!;
    if (canReachEnd.has(curr)) continue;
    canReachEnd.add(curr);
    for (const f of incoming.get(curr) ?? []) {
      if (!canReachEnd.has(f.from)) backQueue.push(f.from);
    }
  }

  for (const el of process.elements) {
    if (!reachableFromStart.has(el.id)) {
      problems.push({
        code: 'ERR_UNREACHABLE_NODE',
        elementId: el.id,
        message: `Element '${el.id}' (${el.name}) is unreachable from startEvent '${startNode.id}'`,
      });
    } else if (!canReachEnd.has(el.id)) {
      problems.push({
        code: 'ERR_DEADEND_NODE',
        elementId: el.id,
        message: `Element '${el.id}' (${el.name}) has no path to any endEvent`,
      });
    }
  }

  // Petri-Net / Token Marking State-Space Exploration
  // A marking represents the multiset of active sequence flows (edges) carrying a token,
  // plus a special virtual incoming edge "__start__" into startEvent.
  type Marking = ReadonlyMap<string, number>;

  function serializeMarking(m: Marking): string {
    return Array.from(m.entries())
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
  }

  const initialFlow = outgoing.get(startNode.id) ?? [];
  const initMap = new Map<string, number>();
  for (const f of initialFlow) {
    initMap.set(f.id, 1);
  }

  const visitedMarkings = new Set<string>();
  const bfs: { marking: Map<string, number>; trace: string[] }[] = [
    { marking: initMap, trace: [startNode.id] },
  ];

  const maxMarkings = 2000;
  let exploredMarkings = 0;

  while (bfs.length > 0 && exploredMarkings < maxMarkings) {
    const { marking, trace } = bfs.shift()!;
    const key = serializeMarking(marking);
    if (visitedMarkings.has(key)) continue;
    visitedMarkings.add(key);
    exploredMarkings++;

    const activeFlowIds = Array.from(marking.entries())
      .filter(([, c]) => c > 0)
      .map(([fid]) => fid);

    if (activeFlowIds.length === 0) {
      continue;
    }

    // Check which nodes are enabled in this marking
    let anyNodeFired = false;

    // Group active flows by their target element
    const targetNodes = new Set<string>();
    for (const fid of activeFlowIds) {
      const flow = process.flows.find((f) => f.id === fid);
      if (flow) targetNodes.add(flow.to);
    }

    for (const nodeId of targetNodes) {
      const node = elementMap.get(nodeId)!;
      const inFlows = incoming.get(nodeId) ?? [];
      const outFlows = outgoing.get(nodeId) ?? [];

      if (node.kind === 'parallelGateway' && inFlows.length > 1) {
        // Parallel Join: requires ALL incoming flows to have at least 1 token
        const allPresent = inFlows.every((inf) => (marking.get(inf.id) ?? 0) >= 1);
        if (!allPresent) {
          continue; // Not enabled yet
        }

        anyNodeFired = true;
        const nextMarking = new Map(marking);
        for (const inf of inFlows) {
          const c = (nextMarking.get(inf.id) ?? 0) - 1;
          if (c <= 0) nextMarking.delete(inf.id);
          else nextMarking.set(inf.id, c);
        }
        for (const outf of outFlows) {
          nextMarking.set(outf.id, (nextMarking.get(outf.id) ?? 0) + 1);
        }
        bfs.push({ marking: nextMarking, trace: [...trace, node.id] });
      } else {
        // Any single incoming flow with a token enables this node
        const triggeringFlow = inFlows.find((inf) => (marking.get(inf.id) ?? 0) >= 1);
        if (!triggeringFlow) continue;

        anyNodeFired = true;

        if (node.kind === 'endEvent') {
          const nextMarking = new Map(marking);
          const rem = (nextMarking.get(triggeringFlow.id) ?? 0) - 1;
          if (rem <= 0) nextMarking.delete(triggeringFlow.id);
          else nextMarking.set(triggeringFlow.id, rem);

          // If tokens still remain in the graph when reaching an endEvent, check if they are stranded
          const remainingTokens = Array.from(nextMarking.values()).reduce((a, b) => a + b, 0);
          if (remainingTokens > 0) {
            problems.push({
              code: 'ERR_END_WITH_REMAINING_TOKENS',
              elementId: node.id,
              message: `End event '${node.id}' reached while ${remainingTokens} active token(s) remain unjoined in the workflow`,
              trace: [...trace, node.id],
            });
          }
          bfs.push({ marking: nextMarking, trace: [...trace, node.id] });
        } else if (node.kind === 'exclusiveGateway' && outFlows.length > 1) {
          // Exclusive split: explore EVERY outgoing branch independently
          for (const outf of outFlows) {
            const nextMarking = new Map(marking);
            const rem = (nextMarking.get(triggeringFlow.id) ?? 0) - 1;
            if (rem <= 0) nextMarking.delete(triggeringFlow.id);
            else nextMarking.set(triggeringFlow.id, rem);

            if ((nextMarking.get(outf.id) ?? 0) >= 1) {
              problems.push({
                code: 'ERR_LACK_OF_SYNCHRONIZATION',
                elementId: node.id,
                message: `Unsafe token accumulation on flow '${outf.id}' from '${node.id}'`,
                trace: [...trace, node.id],
              });
            }
            nextMarking.set(outf.id, (nextMarking.get(outf.id) ?? 0) + 1);
            bfs.push({ marking: nextMarking, trace: [...trace, `${node.id}->${outf.to}`] });
          }
        } else {
          // Normal task or parallelGateway fork: consumes 1 incoming token, produces 1 token on ALL outgoing flows
          const nextMarking = new Map(marking);
          const rem = (nextMarking.get(triggeringFlow.id) ?? 0) - 1;
          if (rem <= 0) nextMarking.delete(triggeringFlow.id);
          else nextMarking.set(triggeringFlow.id, rem);

          for (const outf of outFlows) {
            nextMarking.set(outf.id, (nextMarking.get(outf.id) ?? 0) + 1);
          }
          bfs.push({ marking: nextMarking, trace: [...trace, node.id] });
        }
      }
    }

    if (!anyNodeFired && activeFlowIds.length > 0) {
      // Deadlock! Identify which parallel join or node is stuck waiting for missing incoming branches
      for (const nodeId of targetNodes) {
        const node = elementMap.get(nodeId)!;
        const inFlows = incoming.get(nodeId) ?? [];
        if (node.kind === 'parallelGateway' && inFlows.length > 1) {
          const presentFlows = inFlows.filter((inf) => (marking.get(inf.id) ?? 0) >= 1).map((f) => f.from);
          const missingFlows = inFlows.filter((inf) => (marking.get(inf.id) ?? 0) === 0).map((f) => f.from);
          problems.push({
            code: 'ERR_LACK_OF_SYNCHRONIZATION',
            elementId: node.id,
            message: `Deadlock / Lack of Synchronization at parallelGateway join '${node.id}' (${node.name}): received token from [${presentFlows.join(', ')}] but branch [${missingFlows.join(', ')}] was bypassed or never triggered`,
            trace: [...trace, node.id],
          });
        } else {
          problems.push({
            code: 'ERR_DEADLOCK',
            elementId: node.id,
            message: `Deadlock at element '${node.id}' (${node.name}): token cannot advance`,
            trace: [...trace, node.id],
          });
        }
      }
    }
  }

  return {
    ok: problems.length === 0,
    status: problems.length === 0 ? 'sound' : 'unsound',
    processId: process.id,
    digest,
    exploredMarkings,
    variablesReferenced: Array.from(variablesSet).sort(),
    decisionRefs: Array.from(decisionRefsSet).sort(),
    problems,
  };
}

/**
 * Exports a BpmnProcessDefinition to standard OMG BPMN 2.0 XML.
 */
export function exportBpmnToXml(process: BpmnProcessDefinition): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const elementsXml = process.elements
    .map((el) => {
      switch (el.kind) {
        case 'startEvent':
          return `    <startEvent id="${esc(el.id)}" name="${esc(el.name)}" />`;
        case 'endEvent':
          return `    <endEvent id="${esc(el.id)}" name="${esc(el.name)}" />`;
        case 'serviceTask':
          return `    <serviceTask id="${esc(el.id)}" name="${esc(el.name)}" cortex:actor="${esc(el.executor?.actor ?? '')}" cortex:department="${esc(el.executor?.department ?? '')}" />`;
        case 'businessRuleTask':
          return `    <businessRuleTask id="${esc(el.id)}" name="${esc(el.name)}" cortex:decisionRef="${esc(el.decisionRef ?? '')}" cortex:resultVariable="${esc(el.resultVariable ?? 'decision')}" />`;
        case 'userTask':
          return `    <userTask id="${esc(el.id)}" name="${esc(el.name)}" cortex:actor="${esc(el.executor?.actor ?? '')}" cortex:department="${esc(el.executor?.department ?? '')}" cortex:humanOnly="true" />`;
        case 'exclusiveGateway':
          return `    <exclusiveGateway id="${esc(el.id)}" name="${esc(el.name)}" />`;
        case 'parallelGateway':
          return `    <parallelGateway id="${esc(el.id)}" name="${esc(el.name)}" />`;
      }
    })
    .join('\n');

  const flowsXml = process.flows
    .map((f) => {
      if (f.condition) {
        return `    <sequenceFlow id="${esc(f.id)}" sourceRef="${esc(f.from)}" targetRef="${esc(f.to)}"${f.name ? ` name="${esc(f.name)}"` : ''}>
      <conditionExpression xsi:type="tFormalExpression">${esc(f.condition)}</conditionExpression>
    </sequenceFlow>`;
      }
      return `    <sequenceFlow id="${esc(f.id)}" sourceRef="${esc(f.from)}" targetRef="${esc(f.to)}"${f.name ? ` name="${esc(f.name)}"` : ''} />`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:cortex="urn:switch-cortex:bpmn:2.0"
             id="${esc(process.id)}_defs"
             targetNamespace="urn:switch-cortex:bpmn:2.0">
  <process id="${esc(process.id)}" name="${esc(process.name)}" isExecutable="true">
${elementsXml}
${flowsXml}
  </process>
</definitions>
`;
}
