# αIAt · SwitchCortex — Hackathon Decision Guide, Presentation Script & Motion Graphics Specification

> **Organization:** **αIAt** — *Tailored Intelligent Solutions* (`aiat.pt`)  
> **Supporting Value Proposition:** *AI tailored to your processes, data, and rules.*  
> **Public Compliance Signature:** *Requirements identified. Controls applied.*  
> **Project:** **SwitchCortex** — *Deterministic BPMN 2.0, DMN 1.3 & FEEL Governance Cortex for Multi-Agent Switch AI Rooms*  
> **Hackathon:** WeMakeDevs × DevTools Academy × Switch AI — *"Flip the Switch"* (`https://www.wemakedevs.org/hackathons/switch#judging`)

---

## 1. Hackathon Decision Documentation (`#judging`)

### 1.1. Strategic Track Selection

| Official Track | Track Scope | Alignment with αIAt · SwitchCortex | Decision |
|---|---|---|---|
| **1. Best Business Workflow** *(Primary Track)* | Build a practical workflow that helps people and AI agents get real work done together (triage, reviews, approvals, deployments). | **100% Fit.** Connects SRE, Security, FinOps, Governance AI agents and human executives inside a shared Switch AI Room (`#switch-ops-room`) with explicit responsibilities, rules, and auditability. | **Primary Submission Track** |
| **2. Best Core Contribution** *(Secondary Track)* | Improve Switch's ecosystem with reusable capabilities, integrations, or developer tools. | **High Fit.** Provides a zero-dependency **Model Context Protocol (MCP)** server (`stdio` and Streamable HTTP `/mcp`) exposing 12 formal verification and governance tools for any Switch Room. | **Highlight in README & Video** |
| **3. Best Personal or Creative Workflow** | Simplify everyday personal or creative tasks. | Outside core scope (SwitchCortex targets operational and compliance workflows). | Do not prioritize |

---

### 1.2. Alignment with the 4 Official Judging Criteria

| Judging Criterion | What Judges Evaluate | How αIAt · SwitchCortex Demonstrates Evidence |
|---|---|---|
| **1. Use of Switch** | How centrally Switch AI connects coding/ops agents (*Claude Code, Antigravity, Codex, Cursor*) and humans inside shared chat rooms (*Slack, Mattermost, Discord*). | • 4 custom department agents (`@sre-agent`, `@sec-agent`, `@finops-agent`, `@policy-agent`) configured in `switch-workspace/`.<br>• Live **Google Gemini** multi-agent orchestration + `/api/slack/events` webhook bridge.<br>• 12 MCP tools coordinating every turn in `#switch-ops-room`. |
| **2. Technical Execution** | Functional quality, reliability, stability, and edge-case handling. | • Zero external runtime dependencies, strict TypeScript, 18 automated tests (`npm test`).<br>• Clean-room **FEEL** evaluator (zero `eval()`, step-budgeted), **DMN 1.3** decision engine with static overlap/gap analyzer, and **BPMN 2.0** Petri-net token engine with soundness/deadlock verifier.<br>• Tamper-evident **SHA-256 hash-chained audit ledger**. |
| **3. Creativity & Impact** | Originality of the idea and real-world operational utility. | • Solves the core operational failure mode of multi-agent chat rooms: prevents AI agents from acting out of turn, forging cross-department approvals, self-approving human gates, exposing PII, or introducing conflicting rules and workflow deadlocks. |
| **4. Presentation** | Clarity of the repository, setup instructions, and the 3-minute demonstration video. | • Unified **αIAt** editorial identity across both the **Live Motion Graphics Player (`http://localhost:4100/motion`)** and the **Live Governance Studio (`http://localhost:4100/`)**. |

---

## 2. αIAt Brand & Visual Criteria Applied to Motion Graphics

In accordance with the **αIAt Identity & Communication Manual** (`AIAT-MANUAL-DE-IDENTIDADE-E-COMUNICACAO.md`):

1. **First Reading Hierarchy (Section 14.1):**
   - **Brand:** `αIAt` (never written as `AIAT`, `Aiat`, or `A.I.A.T.`).
   - **Slogan:** *Tailored Intelligent Solutions* (*Soluções Inteligentes à medida*).
   - **Explanatory Line:** *AI tailored to your processes, data, and rules.*
   - **Compliance Signature:** *Requirements identified. Controls applied.*
2. **Four Foundations Demonstrated Visually (Section 6.2):**
   - **Integrated Knowledge:** Telemetry facts (`env`, `cost_delta`, `touches_pii`, `public_exposure`, `confidence`) linked to the workflow instance, department, and initiating request.
   - **Operational Adaptation:** Distinct responsibilities across `SRE`, `Security`, `FinOps`, and `Executive` roles.
   - **Controlled Execution:** Explicit permissions (`ERR_DEPARTMENT_ACL_DENIED`), structural `humanOnly` gates (`ERR_HUMAN_ONLY_GATE`), and reverse-topological compensating rollback (`undo_workflow`).
   - **Applied Compliance:** Non-compliant operations halted before automation (`R1_BLOCK_PUBLIC_PII` and design-time formal verification).
3. **Visual & Editorial Discipline (Sections 15, 16, 25):**
   - **Tone:** Sober, approachable, precise, and concrete. Short opening sentences, progressive explanation, and verifiable evidence alongside every claim.
   - **Visual Representation of AI (Section 25.2):** Show the concrete effect on work—connected information, an understandable decision table, a clear approval boundary, and an auditable record. **Zero generic robots, glowing brains, or sci-fi neon clichés.**
   - **Subtle Identity (Section 25.3):** **Zero tailoring metaphors** (no scissors, measuring tapes, mannequins, or needles).
   - **Color Palette:**
     - Editorial Warm Canvas: `#F6F5F1`
     - Crisp Card Surface: `#FFFFFF` / Subtle Surface: `#FAF9F6`
     - Borders: `#E2DFD7` / Strong Border: `#CBC6BA`
     - Primary Ink: `#161615` / Secondary Ink: `#4D4C48`
     - Institutional Navy Accent: `#182B49` (Subtle Fill: `#EEF2F7`)
     - Verified / Approved Green: `#14532D` (Fill: `#F0FDF4`, Border: `#86EFAC`)
     - Escalation / Warning Amber: `#78350F` (Fill: `#FFFBEB`, Border: `#FCD34D`)
     - Compliance Block / Error Crimson: `#7F1D1D` (Fill: `#FEF2F2`, Border: `#FCA5A5`)

---

## 3. Complete 3-Minute Presentation Script & Motion Graphics Storyboard (100% English)

> **Interactive Motion Graphics Player Ready:** Run `npm run serve` and open **`http://localhost:4100/motion`** to play all 5 animated acts in real time with the built-in English teleprompter and timeline scrubber.

---

### Act 1 (0:00 – 0:32) | Operational Context: From Dispersed Chat to Controlled Execution

* **What to Present:**
  - Start in the **Motion Graphics Player (`http://localhost:4100/motion` — Act 1)** for `0:00–0:22`, then cut briefly to the **Live Governance Studio (`http://localhost:4100/`)** showing the `αIAt` masthead and active `Gemini Live` badge (`0:22–0:32`).
* **Motion Graphics Specification (`0:00 – 0:22`):**
  - **Left Column (`#FAF9F6` card, `#FEF2F2` crimson header):** Shows the 3 concrete operational failures of prompt-only multi-agent chat rooms:
    1. *Unclear Responsibilities & Skipped Reviews* (`@sre-agent` deploys before `@sec-agent` or `@finops-agent` finishes).
    2. *Unchecked Authority on High-Impact Decisions* (`+$3,200/mo` production GPU burst self-approved by AI).
    3. *Unverified Policy Edits & Scattered Evidence* (conflicting rules, deadlocks, manual audit reconstruction).
  - **Center Bridge (`#182B49` institutional navy block):** Displays **`αIAt`** (*Diagnosis · Implementation · Control → VERIFIED*).
  - **Right Column (`#182B49` framed architecture diagram):** Animated data packet travels across the **Model Context Protocol (MCP)** bus connecting the **Conversational Plane** (`#switch-ops-room`) to the 3 formal engines: **BPMN 2.0 Workflow**, **DMN 1.3 Decisions**, and **FEEL & Guardrails**.
* **English Voiceover Script:**
  > *"Switch AI brings specialized coding and operations agents—`@sre-agent`, `@sec-agent`, and `@finops-agent`—into shared Slack and Mattermost rooms. Yet when multiple agents coordinate production changes through unstructured chat alone, approvals scatter, mandatory reviews are skipped, and agents assume authority they do not hold.*  
  > *Guided by the **αIAt** approach—**Requirements identified. Controls applied.**—**SwitchCortex** governs the Switch Room over MCP using verified **BPMN 2.0 workflows, DMN 1.3 decision tables, and FEEL expressions**."*

---

### Act 2 (0:32 – 1:20) | Operational Adaptation: Green-Lane Automation vs. Parallel Multi-Department Review & Human Gate

* **What to Present:**
  - Play **Act 2 in the Motion Graphics Player (`0:32–0:58`)** to visualize the Petri-net tokens moving through Scenario 1 and Scenario 2, then switch to the **Live Governance Studio (`0:58–1:20`)** to trigger a live **Google Gemini** production GPU request, click **Test `@sre-agent` Self-Approval** (`ERR_HUMAN_ONLY_GATE`), and click **Approve as `@eng-manager`**.
* **Motion Graphics Specification (`0:32 – 0:58`):**
  - **Top Band (Scenario 1 — `WF-101` Green Lane):** A green token (`#14532D`) moves smoothly from `1. task_sre_triage` (`env="staging"`, `cost_delta=+$45/mo`, `touches_pii=false`, `confidence=0.96`) $\rightarrow$ `2. DMN Gate: Rule R10 Matched (verdict = "auto_approve")` $\rightarrow$ `3. task_sre_execute` $\rightarrow$ `COMPLETED` in under 1 second.
  - **Bottom Band (Scenario 2 — `WF-102` Production Multi-Department Escalation):**
    1. `SRE Triage + DMN R6` outputs `require_dept_signoff` (`env="prod"`, `cost_delta=+$3,200/mo`, `public_exposure=true`).
    2. At `gw_dept_fork` (`+`), the token splits into **two concurrent navy tokens** entering `task_sec_audit (@sec-agent)` and `task_finops_audit (@finops)`.
    3. **ACL Enforcement Callout:** A crimson banner (`#FEF2F2` / `#7F1D1D`) appears above `task_sec_audit`: `BLOCKED @sre-agent: ERR_DEPARTMENT_ACL_DENIED`.
    4. **Parallel Join & Human Gate:** Both tokens synchronize at `gw_dept_join (+)` and activate `task_human_approval (humanOnly)`. When `@sre-agent` attempts to approve, a crimson security block appears: `SECURITY BLOCK: ERR_HUMAN_ONLY_GATE`. Finally, `@eng-manager` approves, turning the node green (`#F0FDF4`) and advancing the token to `PROD DEPLOYED`.
* **English Voiceover Script:**
  > *"Routine low-risk work moves without friction: in Scenario 1, a $45 staging scale-up matches DMN Rule `R10_GREEN_LANE_AUTO_APPROVE` and deploys in under a second.*  
  > *In Scenario 2, a production hotfix requesting a $3,200/month GPU burst matches DMN Rule `R6` and forks a BPMN **parallel gateway** to Security and FinOps simultaneously. When `@sre-agent` attempts to submit Security sign-off, cross-department ACL blocks the action (`ERR_DEPARTMENT_ACL_DENIED`). Once both departments synchronize at the parallel join, a **Human-Only Gate** opens—blocking AI self-approval (`ERR_HUMAN_ONLY_GATE`) until human `@eng-manager` approves."*

---

### Act 3 (1:20 – 1:55) | Applied Compliance: Sticky Taint, Hard PII Block & Reverse-Topological Undo

* **What to Present:**
  - Play **Act 3 in the Motion Graphics Player (`1:20–1:42`)**, then show Scenario 3's `Compensated Rollback Chain` in the **Live Governance Studio (`1:42–1:55`)**.
* **Motion Graphics Specification (`1:20 – 1:42`):**
  - **Left Panel (`WF-103` — Sticky Taint & Hard PII Block):**
    - Shows untrusted external trigger `@partner-bot (tainted = true)` requesting public internet access for `s3://prod-customer-pii-export`.
    - An amber progress gauge (`#FFFBEB` / `#78350F`) shows raw confidence clamped against a crimson vertical stop bar at **`0.65 maximum`**.
    - Below it, the crimson compliance block (`#FEF2F2` / `#7F1D1D`) locks in: `DMN RULE R1_BLOCK_PUBLIC_PII MATCHED → VERDICT: REJECT (completed_rejected)`.
  - **Right Panel (`WF-104` — Reverse-Topological Compensating Rollback):**
    - Displays Completed Steps `#3 (FinOps)`, `#2 (Security)`, and `#1 (SRE)` stacked vertically.
    - As `@ciso` triggers `undo_workflow`, an amber highlight steps sequentially from top to bottom (`Step #3 → Step #2 → Step #1`):
      1. `⏪ COMPENSATED [1st]: release_reserved_cloud_budget ($450/mo released)`
      2. `⏪ COMPENSATED [2nd]: revoke_temporary_security_clearance`
      3. `⏪ COMPENSATED [3rd]: revert_sre_triage_workspace`
* **English Voiceover Script:**
  > *"At **αIAt**, non-compliant practices are halted before automation can proceed. In Scenario 3, an untrusted external bot requests making a customer PII bucket public. SwitchCortex applies **sticky taint**, capping effective confidence at `0.65`, while DMN Rule `R1_BLOCK_PUBLIC_PII` deterministically rejects the request.*  
  > *And when our CISO aborts an in-flight payment migration due to lock contention, `undo_workflow` executes compensating actions in **reverse topological order**—releasing FinOps budget, revoking temporary security clearance, and reverting the SRE workspace."*

---

### Act 4 (1:55 – 2:38) | Rigor & Design-Time Formal Verification in Chat ("The Wow Moment")

* **What to Present:**
  - Play **Act 4 in the Motion Graphics Player (`1:55–2:22`)**, then run `npm run verify` in the terminal and show the formal verification proof box in the **Live Governance Studio (`2:22–2:38`)**.
* **Motion Graphics Specification (`1:55 – 2:22`):**
  - **Left Panel (DMN 1.3 Static Verifier — `analyzeDecisionTable`):**
    - Displays the pairwise conflict between `R1_BLOCK_PUBLIC_PII` (`reject`) and `@policy-agent`'s proposed `R11_NAIVE_HOTFIX_BYPASS` (`confidence >= 0.90` $\rightarrow$ `auto_approve`).
    - Renders the exact **Mathematical Counterexample Witness** card:
      `{ "env": "dev", "cost_delta": 0, "touches_pii": true, "public_exposure": true, "confidence": 0.90 }` $\rightarrow$ `Registration Blocked: ERR_DMN_FORMAL_VERIFICATION_FAILED`.
  - **Right Panel (BPMN 2.0 Petri-Net Soundness Verifier — `verifyBpmnSoundness`):**
    - Upper branch (`gw_dept_fork` and `task_sec_audit`) is rendered in dashed muted stone (`#F0EEE8`) with crimson tags `UNREACHABLE` and `0 TOKENS (BYPASSED)`.
    - Lower branch (`gw_route_verdict` $\rightarrow$ `task_finops_audit`) delivers `1 TOKEN` to the lower input of `gw_dept_join (+)`, while the upper input remains empty.
    - `gw_dept_join (+)` highlights in crimson (`#FEF2F2` / `#7F1D1D`) with `DEADLOCK — ERR_LACK_OF_SYNCHRONIZATION`.
* **English Voiceover Script:**
  > *"What happens when someone in the Switch Room asks `@policy-agent` to add a shortcut—proposing to auto-approve whenever `confidence >= 0.90` and bypass Security before the parallel join?*  
  > *Before any blueprint is registered, SwitchCortex runs **formal static verification**. Its DMN analyzer checks all finite-domain equivalence classes and blocks the rule with a **concrete counterexample** where `confidence = 0.90` collides with `R1_BLOCK_PUBLIC_PII`. Its **Petri-net soundness verifier** explores reachable token markings and proves that bypassing Security causes an `ERR_LACK_OF_SYNCHRONIZATION` deadlock at the parallel join!"*

---

### Act 5 (2:38 – 3:00) | Continuity, SHA-256 Audit Evidence & Institutional Closing

* **What to Present:**
  - Show the **SHA-256 Hash-Chained Audit Ledger** table in the **Live Governance Studio (`2:38–2:48`)**, then finish on **Act 5 of the Motion Graphics Player (`2:48–3:00`)**.
* **Motion Graphics Specification (`2:48 – 3:00`):**
  - Top row displays 4 linked cryptographic blocks (`SEQ #01 WORKFLOW_STARTED` $\rightarrow$ `SEQ #14 DMN_GATE_EVALUATED` $\rightarrow$ `SEQ #21 SECURITY_VIOLATION` $\rightarrow$ `SEQ #51 LEDGER VERIFIED`), showing each block's `prev` and `hash` digest.
  - Center institutional card (`#FFFFFF` framed in `#182B49`) displays:
    - **`αIAt · SwitchCortex`**
    - **`Tailored Intelligent Solutions — AI tailored to your processes, data, and rules.`**
    - **`"AI agents propose in the Switch Room. Formal BPMN 2.0, DMN 1.3, and FEEL models decide."`**
    - **`Requirements identified. Controls applied. · 12 MCP Tools · aiat.pt`**
* **English Voiceover Script:**
  > *"Instead of reconstructing history manually during an audit, SwitchCortex records every proposal, DMN rule evaluation, blocked violation, rollback, and human decision in a tamper-evident **SHA-256 hash chain**. With **SwitchCortex** by **αIAt**, teams and AI agents collaborate naturally in chat—backed by clear responsibilities, applied compliance, and mathematical rigor."*
