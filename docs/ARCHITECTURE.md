# SwitchCortex — Technical Architecture & Formal Verification Internals

## 1. Design Philosophy: "Agents Propose, Formal Models Decide"

In multi-agent chat environments like **Switch AI Rooms**, LLMs excel at unstructured analysis: reading logs, summarizing code diffs, inspecting container posture, and communicating findings to human teammates. Conversely, LLMs are unreliable at enforcing multi-department state machines, budget thresholds, and security invariants through natural language alone.

**SwitchCortex** separates these responsibilities into two distinct planes connected over the **Model Context Protocol (MCP)**:

1. **The Conversational Plane (Switch AI Room):**
   - Humans and specialized agents (`@sre-agent`, `@sec-agent`, `@finops-agent`, `@policy-agent`) collaborate inside a shared Switch Room (`#switch-ops-room`).
   - Agents gather telemetry and submit structured proposals (`cortex_submit_agent_task`).
2. **The Deterministic Cortex Plane (SwitchCortex Engine):**
   - **FEEL (`src/feel/engine.ts`)** evaluates all expressions without `eval()`, with strict step budgets (`maxSteps`), prototype-pollution guards, and three-valued boolean logic (`true`, `false`, `null`).
   - **DMN 1.3 (`src/dmn/engine.ts`)** evaluates structured proposals against verified decision tables (`UNIQUE`, `FIRST`, `PRIORITY`, `RULE ORDER`, `COLLECT`) and produces deterministic verdicts (`auto_approve`, `require_dept_signoff`, `require_exec_and_dept_signoff`, `reject`).
   - **BPMN 2.0 (`src/bpmn/engine.ts`)** advances Petri-net tokens across sequential tasks, conditional `exclusiveGateway` splits, concurrent `parallelGateway` department forks/joins, and `humanOnly` executive `userTask` gates.

---

## 2. Static Verification of DMN 1.3 Decision Tables (`analyzeDecisionTable`)

When an operator or `@policy-agent` proposes a new or modified DMN 1.3 decision table via `cortex_verify_dmn` or `cortex_register_policy`, SwitchCortex runs a four-stage static analysis before allowing registration:

1. **AST & Allowed-Values Validation:**
   Every input cell is parsed as a FEEL unary test list (`parseUnaryTests`), and every output expression is checked against the column's declared `allowedValues`.
2. **Null-Safety Hazard Detection:**
   Flags negated unary tests (`not(...)`) on optional columns that unintentionally evaluate to `true` when the input is `null`.
3. **Equivalence-Class Boundary Extraction (`extractDomainSamplePoints`):**
   For numeric columns, SwitchCortex extracts all literal thresholds $t_1 < t_2 < \dots < t_k$ across all rules and constructs a complete set of boundary and interior sample points $\{t_i - 1, t_i, t_i + 1, \lfloor(t_i + t_{i+1})/2\rfloor\}$. Combined with boolean domains $\{ \text{true}, \text{false} \}$ and string enumeration domains (plus an out-of-domain sentinel `"__other__"`), this yields a finite Cartesian test grid covering every equivalence class of the table.
4. **Pairwise Overlap, Shadowing & Gap Proof Generation:**
   - **Conflicting Overlaps:** Identifies any input vector $\vec{x}$ that satisfies two rules $R_a$ and $R_b$ simultaneously with conflicting verdicts (e.g., an LLM-proposed fast-track rule `auto_approve` colliding with a hard `reject` PII rule) and returns $\vec{x}$ as a concrete counterexample.
   - **Shadowed / Unreachable Rules:** Identifies any rule $R_k$ that never wins on any equivalence class because higher-priority or earlier rules completely subsume its domain.
   - **Coverage Gaps:** Identifies any input vector $\vec{x}$ where zero rules match, proving the table is incomplete.

---

## 3. Petri-Net Soundness Verification of BPMN 2.0 Workflows (`verifyBpmnSoundness`)

Before a BPMN 2.0 workflow can be registered in SwitchCortex, `verifyBpmnSoundness` verifies both structural graph properties and dynamic Petri-net token markings:

1. **Bidirectional Graph Reachability:**
   Verifies via forward BFS from `startEvent` and backward BFS from all `endEvent` nodes that every element lies on a valid start-to-end path (`ERR_UNREACHABLE_NODE`, `ERR_DEADEND_NODE`).
2. **Bounded State-Space Marking Exploration:**
   Models active tokens as multisets over sequence flows $M: F \to \mathbb{N}_0$ and explores reachable markings across all `exclusiveGateway` branches and `parallelGateway` forks/joins:
   - **`ERR_LACK_OF_SYNCHRONIZATION` / Deadlock at Parallel Joins:** A `parallelGateway` join requires at least one token on **every** incoming sequence flow to fire. If a workflow modification bypasses one branch of a parallel split (for example, routing directly to `@finops-agent` while skipping `@sec-agent`), the join gateway waits forever for the missing branch token. SwitchCortex detects this terminal non-empty marking and reports the exact incoming branches present vs. missing.
   - **`ERR_END_WITH_REMAINING_TOKENS`:** Detects workflows that reach an `endEvent` while orphan tokens remain active on unjoined parallel branches.

---

## 4. Runtime Security & Supervision Invariants

1. **Cross-Department ACL (`ERR_DEPARTMENT_ACL_DENIED`):**
   Every BPMN `serviceTask` is bound to a specific agent handle and department (`@sre-agent` in `SRE`, `@sec-agent` in `Security`, `@finops-agent` in `FinOps`). An agent cannot submit outputs for another department's active token.
2. **Structural Human-Only Gates (`ERR_HUMAN_ONLY_GATE`):**
   Every BPMN `userTask` enforces `caller.kind === 'human'`. If any AI agent calls `cortex_decide_human_gate`, the call is rejected before state mutation and recorded as a `SECURITY_VIOLATION_BLOCKED` entry in the audit ledger.
3. **Sticky Taint Confidence Capping:**
   When a workflow is triggered by an untrusted external source (`tainted: true`), SwitchCortex caps the effective agent `confidence` to `0.65` before DMN evaluation, guaranteeing that `R3_LOW_CONFIDENCE_ESCALATION` forces multi-department + human review.
4. **Reverse-Topological Compensating Rollback (`undo_workflow`):**
   Each BPMN `serviceTask` declares a `compensateAction`. When a supervisor triggers `undo_workflow`, SwitchCortex iterates backward through `completedSteps` and executes each compensation action in reverse topological order.
5. **SHA-256 Hash-Chained Audit Ledger (`src/storage/ledger.ts`):**
   Every state transition computes `entryHash = SHA256(canonicalJson({ seq, timestamp, instanceId, roomChannel, actorId, actorKind, department, eventType, summary, payload, prevHash }))`. Calling `cortex_verify_audit_chain` recomputes the entire chain from genesis (`0000...0000`) to detect any tampering.
