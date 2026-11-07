/**
 * SwitchCortex — Model Context Protocol (MCP) Server (stdio & HTTP JSON-RPC 2.0)
 *
 * Exposes 12 deterministic governance, BPMN 2.0 workflow, DMN 1.3 decision,
 * formal verification, human-only inbox, and supervision tools to Switch AI Room agents.
 */
import { SwitchCortexRuntime } from '../governance/runtime.js';
export interface McpToolDescriptor {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Record<string, unknown>;
}
export declare const CORTEX_MCP_TOOLS: readonly McpToolDescriptor[];
export declare function executeMcpTool(runtime: SwitchCortexRuntime, toolName: string, args: Record<string, unknown>): {
    isError: boolean;
    result: unknown;
};
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
export declare function handleMcpJsonRpc(runtime: SwitchCortexRuntime, req: JsonRpcRequest): JsonRpcResponse | null;
/**
 * Starts the MCP server over standard input/output (stdio) for Switch Console / Claude Code / Codex / Antigravity.
 */
export declare function startStdioMcpServer(runtime: SwitchCortexRuntime): void;
