# SwitchCortex — 3-Minute Hackathon Demo Video Script

This guide provides a tight, reproducible 3-minute walkthrough for the **WeMakeDevs × DevTools Academy × Switch AI ("Flip the Switch")** submission video.

---

## Pre-Recording Setup (10 Seconds)

Open two terminal panes and a browser window:
1. **Terminal 1:** Start the SwitchCortex HTTP MCP Server + Web Governance Studio:
   ```bash
   npm run serve
   ```
2. **Browser:** Open `http://localhost:4100`.
3. **Terminal 2:** Ready to run `npm run verify` and `npm run demo`.

---

## Scene-by-Scene Walkthrough (3:00 Total)

### 0:00 – 0:30 | The Hook: Why Multi-Agent Switch Rooms Need a Formal Cortex
* **Show:** The architecture diagram in `README.md` and the Switch Console agent configuration (`switch-workspace/agents/*/CLAUDE.md` and the Switch Console agents list).
* **Say:**
  > *"Switch AI lets us bring specialized coding and ops agents—like `@sre-agent`, `@sec-agent`, and `@finops-agent`—into a shared team chat room. But when multiple agents collaborate in chat using only natural language prompts, they run into race conditions, skip mandatory department reviews, or hallucinate authority to approve high-risk changes. We built **SwitchCortex**: an MCP server that gives Switch AI Rooms a deterministic **BPMN 2.0, DMN 1.3, and FEEL** governance brain."*

### 0:30 – 1:10 | Scene 1 & 2: Auto-Approval vs. Multi-Department Parallel Escalation
* **Action:** In the Web Studio at `http://localhost:4100`, click **`1. Green Lane (Auto)`** and then **`2. Multi-Dept + Human Gate`**.
* **Say:**
  > *"Here in `#switch-ops-room`, our agents never decide policy on their own—they propose structured telemetry facts to SwitchCortex over MCP, and a verified **DMN 1.3 Decision Table** decides the path.*
  > *In Scenario 1, a $45/month staging scale-up hits DMN Rule `R10` and is **100% auto-approved** and deployed in one second.*
  > *In Scenario 2, a production hotfix with a $3,200/month GPU burst hits DMN Rule `R6`. The BPMN 2.0 engine forks a **parallel gateway** to `@sec-agent` and `@finops-agent` simultaneously. Notice two security blocks in the chat transcript: first, `@sre-agent` tries to forge `@sec-agent`'s sign-off and is blocked by department ACL. Second, after both departments sign off, `@sre-agent` tries to self-approve the executive gate and is blocked by `ERR_HUMAN_ONLY_GATE` until human `@eng-manager` approves!"*

### 1:10 – 1:55 | Scene 3: Hard PII Guardrails, Sticky Taint & Instant Undo Rollback
* **Action:** Click **`3. PII Block + Undo Rollback`** in the Web Studio.
* **Say:**
  > *"In Scenario 3, an external bot tries to expose a customer PII S3 bucket publicly. SwitchCortex's sticky taint caps confidence and DMN Rule `R1_BLOCK_PUBLIC_PII` halts the workflow immediately. Next, during a production payment ledger migration, our CISO triggers `undo_workflow`, and SwitchCortex automatically runs compensating rollback actions in reverse topological order across FinOps, Security, and SRE."*

### 1:55 – 2:40 | Scene 4 ("The Wow Moment"): Formal Verification in Chat
* **Action:** Click **`4. Formal Verification Proof`** in the Web Studio and run `npm run verify` in Terminal 2.
* **Say:**
  > *"What happens when someone in the Switch Room asks `@policy-agent` to change the rules—for example, 'auto-approve whenever confidence is at least 0.90' and 'skip the Security branch in the BPMN workflow'?*
  > *Before any rule or workflow can be registered, SwitchCortex runs **formal static verification**. It blocks the DMN update with a concrete mathematical counterexample showing that `confidence = 0.90` on a public PII bucket collides with our hard PII rejection rule. And its Petri-net soundness verifier blocks the BPMN edit, proving it creates an `ERR_LACK_OF_SYNCHRONIZATION` deadlock at the parallel join gateway!"*

### 2:40 – 3:00 | Cryptographic Audit Ledger & Wrap-Up
* **Show:** Scroll down to the **SHA-256 Hash-Chained Audit Ledger** table in the Web Studio.
* **Say:**
  > *"Every token transition, DMN rule evaluation, blocked violation, and human sign-off is recorded in a tamper-evident SHA-256 hash chain that agents can query right inside the Switch Room. With SwitchCortex, Switch AI agents collaborate freely in natural language while executing with mathematical certainty."*
