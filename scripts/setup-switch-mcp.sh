#!/usr/bin/env bash
set -euo pipefail

# SwitchCortex — One-Command Switch AI + MCP Setup Script
# Registers both the local SwitchCortex MCP server and the official Switch AI Docs MCP server.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "⚡ Setting up SwitchCortex for Switch AI Rooms..."
echo "   Project root: ${PROJECT_ROOT}"

if command -v claude >/dev/null 2>&1; then
  echo "→ Registering MCP servers with Claude Code..."
  claude mcp add switch-docs --transport http https://docs.switchagents.ai/mcp || true
  claude mcp add switch-cortex -- node "${PROJECT_ROOT}/dist/src/cli/index.js" mcp || true
fi

if command -v codex >/dev/null 2>&1; then
  echo "→ Registering MCP servers with OpenAI Codex..."
  codex mcp add switch-docs --url https://docs.switchagents.ai/mcp || true
fi

echo "✔ MCP registration complete."
echo "  • Run 'npm run demo' to execute the 4 Switch Room scenarios in terminal."
echo "  • Run 'npm run serve' to launch the HTTP MCP Server + Live Web Studio on http://localhost:4100"
