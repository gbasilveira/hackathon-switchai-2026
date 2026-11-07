/**
 * SwitchCortex — Model Context Protocol (MCP) Server (stdio & HTTP JSON-RPC 2.0)
 *
 * Exposes 12 deterministic governance, BPMN 2.0 workflow, DMN 1.3 decision,
 * formal verification, human-only inbox, and supervision tools to Switch AI Room agents.
 */

import { classifyIntent } from '../agents/intent.js';
import * as readline from 'node:readline';
import {
  BpmnProcessDefinition,
  exportBpmnToXml,
  verifyBpmnSoundness,
} from '../bpmn/engine.js';
import {
  DEFAULT_BPMN_PROCESS,
  DEFAULT_DMN_TABLE,
} from '../blueprints/defaults.js';
import {
  analyzeDecisionTable,
  DmnDecisionTable,
  evaluateDecisionTable,
  exportDmnToXml,
} from '../dmn/engine.js';
import { FeelContext, FeelValue } from '../feel/engine.js';
import { CallerPrincipal, SwitchCortexRuntime } from '../governance/runtime.js';

export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const CORTEX_MCP_TOOLS: readonly McpToolDescriptor[] = [
  {
    name: 'cortex_list_blueprints',
    description:
      'List all registered BPMN 2.0 processes and DMN 1.3 decision tables with their SHA-256 digests and formal verification status.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_start_workflow',
    description:
      'Start a new multi-department BPMN 2.0 workflow instance in a Switch AI Room. Pass the user\'s original words as initialMessage; questions, greetings or requests without an explicit action, target and environment are refused (ERR_INTENT_NOT_EXECUTABLE).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short operational title of the Switch Room request' },
        roomChannel: { type: 'string', description: 'Switch Room channel name (e.g. #ops-command-room)' },
        callerId: { type: 'string', description: 'Actor ID (e.g. @sre-agent or @alice-devops)' },
        callerKind: { type: 'string', enum: ['agent', 'human'] },
        department: { type: 'string', description: 'Department name (SRE, Security, FinOps, Executive)' },
        tainted: {
          type: 'boolean',
          description: 'True if triggered by an untrusted external webhook or unverified source',
        },
        initialMessage: { type: 'string', description: 'Initial message posted in the Switch Room' },
      },
      required: ['title', 'callerId', 'callerKind', 'department'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_get_instance',
    description:
      'Inspect live BPMN token positions, active department tasks, variables, DMN evaluations, and room transcript for a workflow instance.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Workflow instance ID (e.g. WF-101)' },
      },
      required: ['instanceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_submit_agent_task',
    description:
      'Submit structured outputs and justification for an assigned BPMN serviceTask as a Switch Room AI agent (@sre-agent, @sec-agent, @finops-agent), advancing the workflow through downstream DMN rules and gateways.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Workflow instance ID (e.g. WF-101)' },
        elementId: {
          type: 'string',
          description: 'BPMN element ID (e.g. task_sre_triage, task_sec_audit, task_finops_audit, task_sre_execute)',
        },
        agentId: { type: 'string', description: 'Agent handle in the Switch Room (e.g. @sre-agent)' },
        department: { type: 'string', description: 'Agent department (SRE, Security, FinOps)' },
        outputs: {
          type: 'object',
          description: 'Structured facts/variables produced by the agent task',
        },
        justification: { type: 'string', description: 'Concise engineering justification for the audit trail' },
        roomMessage: { type: 'string', description: 'Formatted message posted by the agent in the Switch Room' },
      },
      required: ['instanceId', 'elementId', 'agentId', 'department', 'outputs', 'justification'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_evaluate_dmn',
    description:
      'Deterministically evaluate a registered DMN 1.3 decision table with FEEL trace without mutating workflow state.',
    inputSchema: {
      type: 'object',
      properties: {
        tableId: { type: 'string', description: 'DMN decision table ID (defaults to dmn_release_and_infra_governance)' },
        context: {
          type: 'object',
          description: 'Input variables (env, cost_delta, touches_pii, public_exposure, confidence)',
        },
      },
      required: ['context'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_verify_dmn',
    description:
      'Run formal static verification on a DMN 1.3 decision table to detect conflicting rule overlaps, coverage gaps, shadowed rules, and null hazards with concrete counterexamples.',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'object', description: 'Full DMN 1.3 decision table JSON definition to verify' },
      },
      required: ['table'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_verify_bpmn',
    description:
      'Run formal Petri-net soundness verification on a BPMN 2.0 process definition to detect deadlocks, lack-of-synchronization at parallel joins, unreachable nodes, and stranded tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        process: { type: 'object', description: 'Full BPMN 2.0 process JSON definition to verify' },
      },
      required: ['process'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_register_policy',
    description:
      'Register or update a DMN 1.3 decision table or BPMN 2.0 process in the Switch Room ONLY IF formal verification passes with zero errors.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['dmn', 'bpmn'] },
        callerId: { type: 'string', description: 'Actor proposing the policy update (e.g. @policy-agent)' },
        callerKind: { type: 'string', enum: ['agent', 'human'] },
        department: { type: 'string' },
        definition: { type: 'object', description: 'The DMN table or BPMN process JSON definition' },
      },
      required: ['kind', 'callerId', 'callerKind', 'department', 'definition'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_list_inbox',
    description:
      'List all active department tasks and pending humanOnly approval gates across running Switch Room workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        actor: { type: 'string', description: 'Optional filter by assigned actor (e.g. @eng-manager, @sec-agent)' },
        department: { type: 'string', description: 'Optional filter by department' },
        kind: { type: 'string', enum: ['agent', 'human'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_decide_human_gate',
    description:
      'Approve or reject a pending humanOnly userTask in the Switch Room. Strictly rejects AI agent callers (ERR_HUMAN_ONLY_GATE) and enforces hard compliance guardrails.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Workflow instance ID' },
        elementId: { type: 'string', description: 'Optional userTask element ID (defaults to active userTask)' },
        callerId: { type: 'string', description: 'Caller ID (e.g. @eng-manager, @ciso, or an agent attempting bypass)' },
        callerKind: { type: 'string', enum: ['agent', 'human'] },
        department: { type: 'string', description: 'Caller department' },
        approved: { type: 'boolean', description: 'True to approve, false to reject' },
        comment: { type: 'string', description: 'Decision rationale posted to the Switch Room' },
      },
      required: ['instanceId', 'callerId', 'callerKind', 'department', 'approved', 'comment'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_supervise_control',
    description:
      'Execute operator supervision controls: engage_kill_switch, release_kill_switch (human-only), pause_agent, resume_agent, or undo_workflow (runs compensating rollback actions in reverse order).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'engage_kill_switch',
            'release_kill_switch',
            'pause_agent',
            'resume_agent',
            'undo_workflow',
          ],
        },
        callerId: { type: 'string' },
        callerKind: { type: 'string', enum: ['agent', 'human'] },
        department: { type: 'string' },
        targetId: { type: 'string', description: 'Target workflow instanceId (for undo_workflow) or agentId' },
        reason: { type: 'string', description: 'Audit reason for the supervision action' },
      },
      required: ['action', 'callerId', 'callerKind', 'department', 'reason'],
      additionalProperties: false,
    },
  },
  {
    name: 'cortex_verify_audit_chain',
    description:
      'Verify the cryptographic SHA-256 hash chain of the audit ledger and generate a formatted Markdown audit report for the Switch Room.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Optional workflow instance ID filter' },
      },
      additionalProperties: false,
    },
  },
];

export function executeMcpTool(
  runtime: SwitchCortexRuntime,
  toolName: string,
  args: Record<string, unknown>
): { isError: boolean; result: unknown } {
  try {
    switch (toolName) {
      case 'cortex_list_blueprints': {
        return { isError: false, result: runtime.listBlueprints() };
      }

      case 'cortex_start_workflow': {
        // Fail-closed intent gate: pass the user's ORIGINAL words as initialMessage.
        const userText = typeof args['initialMessage'] === 'string' && args['initialMessage'].trim()
          ? args['initialMessage']
          : String(args['title'] ?? '');
        const gate = classifyIntent(userText);
        if (gate.intent !== 'ops_request') {
          return {
            isError: true,
            result: {
              ok: false,
              code: 'ERR_INTENT_NOT_EXECUTABLE',
              message: `No workflow started (${gate.intent}: ${gate.reason}). Provide the user's original request as initialMessage with an explicit action, target and environment.`,
              reply: gate.reply,
            },
          };
        }
        const caller: CallerPrincipal = {
          id: String(args['callerId'] ?? '@alice-devops'),
          kind: args['callerKind'] === 'agent' ? 'agent' : 'human',
          department: String(args['department'] ?? 'SRE'),
        };
        const out = runtime.startWorkflow({
          title: String(args['title'] ?? 'Untitled Switch Room Operation'),
          roomChannel: typeof args['roomChannel'] === 'string' ? args['roomChannel'] : '#ops-command-room',
          caller,
          tainted: Boolean(args['tainted'] ?? false),
          initialRoomMessage: typeof args['initialMessage'] === 'string' ? args['initialMessage'] : undefined,
        });
        return { isError: !out.ok, result: out };
      }

      case 'cortex_get_instance': {
        const inst = runtime.getInstance(String(args['instanceId'] ?? ''));
        if (!inst) {
          return {
            isError: true,
            result: { ok: false, code: 'ERR_INSTANCE_NOT_FOUND', message: 'Instance not found' },
          };
        }
        return { isError: false, result: { ok: true, instance: inst } };
      }

      case 'cortex_submit_agent_task': {
        const caller: CallerPrincipal = {
          id: String(args['agentId'] ?? '@sre-agent'),
          kind: 'agent',
          department: String(args['department'] ?? 'SRE'),
        };
        const out = runtime.submitAgentTask({
          instanceId: String(args['instanceId'] ?? ''),
          elementId: String(args['elementId'] ?? ''),
          caller,
          outputs: (args['outputs'] as Record<string, FeelValue>) ?? {},
          justification: String(args['justification'] ?? ''),
          roomMessage: typeof args['roomMessage'] === 'string' ? args['roomMessage'] : undefined,
        });
        return { isError: !out.ok, result: out };
      }

      case 'cortex_evaluate_dmn': {
        const tableId = String(args['tableId'] ?? DEFAULT_DMN_TABLE.id);
        const table = runtime.getDmnTable(tableId) ?? DEFAULT_DMN_TABLE;
        const evalRes = evaluateDecisionTable(table, (args['context'] as FeelContext) ?? {});
        return { isError: !evalRes.ok, result: evalRes };
      }

      case 'cortex_verify_dmn': {
        const table = args['table'] as DmnDecisionTable;
        const report = analyzeDecisionTable(table);
        return { isError: !report.ok, result: report };
      }

      case 'cortex_verify_bpmn': {
        const process = args['process'] as BpmnProcessDefinition;
        const report = verifyBpmnSoundness(process);
        return { isError: !report.ok, result: report };
      }

      case 'cortex_register_policy': {
        const caller: CallerPrincipal = {
          id: String(args['callerId'] ?? '@policy-agent'),
          kind: args['callerKind'] === 'human' ? 'human' : 'agent',
          department: String(args['department'] ?? 'Governance'),
        };
        if (args['kind'] === 'dmn') {
          const out = runtime.registerDmnTable(caller, args['definition'] as DmnDecisionTable);
          return { isError: !out.ok, result: out };
        }
        const out = runtime.registerBpmnProcess(caller, args['definition'] as BpmnProcessDefinition);
        return { isError: !out.ok, result: out };
      }

      case 'cortex_list_inbox': {
        const items = runtime.listInbox({
          actor: typeof args['actor'] === 'string' ? args['actor'] : undefined,
          department: typeof args['department'] === 'string' ? args['department'] : undefined,
          kind: args['kind'] === 'agent' || args['kind'] === 'human' ? args['kind'] : undefined,
        });
        return { isError: false, result: { ok: true, count: items.length, items } };
      }

      case 'cortex_decide_human_gate': {
        const caller: CallerPrincipal = {
          id: String(args['callerId'] ?? '@eng-manager'),
          kind: args['callerKind'] === 'human' ? 'human' : 'agent',
          department: String(args['department'] ?? 'Executive'),
        };
        const out = runtime.decideHumanGate({
          instanceId: String(args['instanceId'] ?? ''),
          elementId: typeof args['elementId'] === 'string' ? args['elementId'] : undefined,
          caller,
          approved: Boolean(args['approved']),
          comment: String(args['comment'] ?? ''),
        });
        return { isError: !out.ok, result: out };
      }

      case 'cortex_supervise_control': {
        const caller: CallerPrincipal = {
          id: String(args['callerId'] ?? '@eng-manager'),
          kind: args['callerKind'] === 'human' ? 'human' : 'agent',
          department: String(args['department'] ?? 'Executive'),
        };
        const out = runtime.superviseControl({
          action: args['action'] as
            | 'engage_kill_switch'
            | 'release_kill_switch'
            | 'pause_agent'
            | 'resume_agent'
            | 'undo_workflow',
          caller,
          targetId: typeof args['targetId'] === 'string' ? args['targetId'] : undefined,
          reason: String(args['reason'] ?? ''),
        });
        return { isError: !out.ok, result: out };
      }

      case 'cortex_verify_audit_chain': {
        const instanceId = typeof args['instanceId'] === 'string' ? args['instanceId'] : undefined;
        const integrity = runtime.ledger.verifyIntegrity();
        const markdown = runtime.ledger.formatMarkdownReport(instanceId);
        const entries = runtime.ledger.list(instanceId ? { instanceId } : undefined);
        return {
          isError: !integrity.ok,
          result: {
            ok: integrity.ok,
            integrity,
            entriesCount: entries.length,
            markdownReport: markdown,
            entries,
          },
        };
      }

      default:
        return {
          isError: true,
          result: { ok: false, code: 'ERR_UNKNOWN_TOOL', message: `Unknown MCP tool '${toolName}'` },
        };
    }
  } catch (err) {
    return {
      isError: true,
      result: {
        ok: false,
        code: 'ERR_TOOL_EXECUTION_FAILED',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id?: string | number | null;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: string | number | null;
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

export function handleMcpJsonRpc(
  runtime: SwitchCortexRuntime,
  req: JsonRpcRequest
): JsonRpcResponse | null {
  const id = req.id ?? null;

  switch (req.method) {
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'switch-cortex-mcp',
            version: '1.0.0',
          },
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: CORTEX_MCP_TOOLS,
        },
      };

    case 'tools/call': {
      const toolName = String(req.params?.['name'] ?? '');
      const toolArgs = (req.params?.['arguments'] as Record<string, unknown>) ?? {};
      const { isError, result } = executeMcpTool(runtime, toolName, toolArgs);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          isError,
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    }

    case 'resources/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'cortex://blueprints/bpmn/bpmn_switch_ops_governance.xml',
              name: 'Switch Room Multi-Department BPMN 2.0 Process (XML)',
              mimeType: 'application/xml',
            },
            {
              uri: 'cortex://blueprints/dmn/dmn_release_and_infra_governance.xml',
              name: 'Switch Room Governance DMN 1.3 Decision Table (XML)',
              mimeType: 'application/xml',
            },
            {
              uri: 'cortex://audit/ledger.md',
              name: 'Cryptographic SHA-256 Audit Trail Report',
              mimeType: 'text/markdown',
            },
          ],
        },
      };

    case 'resources/read': {
      const uri = String(req.params?.['uri'] ?? '');
      if (uri.endsWith('.xml') && uri.includes('/bpmn/')) {
        const proc = runtime.getBpmnProcess(DEFAULT_BPMN_PROCESS.id) ?? DEFAULT_BPMN_PROCESS;
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/xml', text: exportBpmnToXml(proc) }],
          },
        };
      }
      if (uri.endsWith('.xml') && uri.includes('/dmn/')) {
        const tab = runtime.getDmnTable(DEFAULT_DMN_TABLE.id) ?? DEFAULT_DMN_TABLE;
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/xml', text: exportDmnToXml(tab) }],
          },
        };
      }
      if (uri === 'cortex://audit/ledger.md') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              { uri, mimeType: 'text/markdown', text: runtime.ledger.formatMarkdownReport() },
            ],
          },
        };
      }
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown resource URI: ${uri}` },
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${req.method}` },
      };
  }
}

/**
 * Starts the MCP server over standard input/output (stdio) for Switch Console / Claude Code / Codex / Antigravity.
 */
export function startStdioMcpServer(runtime: SwitchCortexRuntime): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const req = JSON.parse(trimmed) as JsonRpcRequest;
      const res = handleMcpJsonRpc(runtime, req);
      if (res) {
        process.stdout.write(JSON.stringify(res) + '\n');
      }
    } catch (err) {
      const errRes: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
      process.stdout.write(JSON.stringify(errRes) + '\n');
    }
  });
}
