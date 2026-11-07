/**
 * SwitchCortex — Streamable HTTP MCP Server + Interactive Live Governance Studio UI
 *
 * Endpoints:
 * - POST /mcp              -> Standard MCP JSON-RPC 2.0 endpoint (HTTP transport)
 * - GET  /health           -> Health and formal verification status
 * - GET  /api/state        -> Live runtime state, instances, blueprints, and SHA-256 ledger
 * - POST /api/scenario/:id -> Run demo scenario (1, 2, 3, 4, all, reset)
 * - POST /api/live-chat    -> Trigger real Google Gemini multi-department AI agents on a chat prompt
 * - POST /api/human-gate   -> Approve/reject a humanOnly gate (or test agent self-approval block)
 * - POST /api/undo         -> Trigger reverse-topological compensating rollback (undo_workflow)
 * - POST /api/slack/events -> Slack Event Subscriptions & Switch AI Room webhook bridge
 * - GET  /                 -> Interactive Switch Room + BPMN 2.0 + DMN 1.3 Web Studio
 */
import * as http from 'node:http';
import { SwitchCortexRuntime } from '../governance/runtime.js';
export declare function createCortexHttpServer(initialRuntime?: SwitchCortexRuntime): {
    server: http.Server;
    getRuntime: () => SwitchCortexRuntime;
};
