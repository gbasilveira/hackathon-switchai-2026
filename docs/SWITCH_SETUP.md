# Setting Up SwitchCortex with Switch AI (`sandbox-quantum/switch`)

This guide explains how to connect **SwitchCortex** to a live **Switch AI** workspace (`github.com/sandbox-quantum/switch` / `docs.switchagents.ai`).

---

## 1. Prerequisites

1. **Node.js >= 20** (to run SwitchCortex MCP & Web Studio).
2. **Switch Console** (desktop companion or local Docker stack from [`sandbox-quantum/switch`](https://github.com/sandbox-quantum/switch), which includes Mattermost out-of-the-box for instant local testing).
3. An MCP-compatible coding agent harness configured in Switch Console (**Claude Code**, **Antigravity**, **OpenAI Codex**, **Cursor**, or **OpenCode**).

---

## 2. Build & Verify SwitchCortex

```bash
npm run build
npm run verify
npm test
```

---

## 3. Register MCP Servers with Your Agent Harness

Run the included setup script to register both **SwitchCortex** (`switch-cortex`) and the official **Switch AI Documentation MCP** (`switch-docs`):

```bash
bash ./scripts/setup-switch-mcp.sh
```

Or configure `.mcp.json` directly (already pre-populated in [`switch-workspace/.mcp.json`](../switch-workspace/.mcp.json)):

```json
{
  "mcpServers": {
    "switch-cortex": {
      "command": "node",
      "args": ["./dist/src/cli/index.js", "mcp"],
      "env": {
        "SWITCH_ROOM_CHANNEL": "#switch-ops-room"
      }
    },
    "switch-docs": {
      "type": "http",
      "url": "https://docs.switchagents.ai/mcp"
    }
  }
}
```

If you prefer connecting over **Streamable HTTP** instead of `stdio`, start the SwitchCortex server:

```bash
npm run serve
```
And register `http://localhost:4100/mcp`:
```bash
claude mcp add switch-cortex-http --transport http http://localhost:4100/mcp
```

---

## 4. Add the 4 Department Custom Agents in Switch Console

In **Switch Console** → **Your Agents** → **Add Custom Agent**, register the four teammates using the briefs in [`switch-workspace/agents/`](../switch-workspace/agents/):

| Agent Name | Department | Working Directory | System Brief |
|---|---|---|---|
| `sre-agent` | `SRE` | `switch-workspace/agents/sre-agent` | [`CLAUDE.md`](../switch-workspace/agents/sre-agent/CLAUDE.md) |
| `sec-agent` | `Security` | `switch-workspace/agents/sec-agent` | [`CLAUDE.md`](../switch-workspace/agents/sec-agent/CLAUDE.md) |
| `finops-agent` | `FinOps` | `switch-workspace/agents/finops-agent` | [`CLAUDE.md`](../switch-workspace/agents/finops-agent/CLAUDE.md) |
| `policy-agent` | `Governance` | `switch-workspace/agents/policy-agent` | [`CLAUDE.md`](../switch-workspace/agents/policy-agent/CLAUDE.md) |

Invite all four agents to your `#switch-ops-room` channel in Mattermost, Slack, or Discord. Whenever a request is posted in the room, the agents coordinate through SwitchCortex's BPMN 2.0 tokens and DMN 1.3 decision gates!
