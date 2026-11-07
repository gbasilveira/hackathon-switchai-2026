/**
 * αIAt · SwitchCortex — Motion Graphics Presentation Player (100% English)
 *
 * Strictly adheres to the αIAt Identity & Communication Manual:
 * - Brand Name: αIAt ("Tailored Intelligent Solutions" / "AI tailored to your processes, data, and rules.")
 * - Public Signature: "Requirements identified. Controls applied."
 * - Four Foundations: Integrated Knowledge · Operational Adaptation · Controlled Execution · Applied Compliance
 * - Visual Criteria (Section 25): Sober, approachable, precise, high-contrast editorial legibility (#f6f5f1 / #182b49);
 *   shows the concrete effect of technology on work (connected facts, understandable decisions, explicit rules, and human responsibility).
 *   Zero sci-fi/neon/robot/brain clichés; zero tailoring metaphors.
 */

export function renderMotionGraphicsHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>αIAt · SwitchCortex — Motion Graphics Presentation (BPMN 2.0, DMN 1.3 & FEEL)</title>
  <style>
    :root {
      --bg: #f6f5f1;
      --surface: #ffffff;
      --surface-subtle: #faf9f6;
      --surface-muted: #f0eee8;
      --border: #e2dfd7;
      --border-strong: #cbc6ba;
      --text: #161615;
      --text-secondary: #4d4c48;
      --text-muted: #76746e;
      --accent: #182b49;
      --accent-hover: #0f1e36;
      --accent-subtle: #eef2f7;
      --accent-border: #c5d2e3;
      --ok-text: #14532d;
      --ok-bg: #f0fdf4;
      --ok-border: #86efac;
      --warn-text: #78350f;
      --warn-bg: #fffbeb;
      --warn-border: #fcd34d;
      --danger-text: #7f1d1d;
      --danger-bg: #fef2f2;
      --danger-border: #fca5a5;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --shadow-sm: 0 1px 3px rgba(22, 22, 21, 0.05);
      --shadow-md: 0 4px 12px rgba(24, 43, 73, 0.06);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
      user-select: none;
    }

    /* Top Institutional Masthead */
    .topbar {
      height: 64px;
      padding: 0 28px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      z-index: 20;
    }

    .brand-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .aiat-badge {
      background: var(--accent);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.15rem;
      padding: 5px 13px;
      border-radius: var(--radius-md);
      letter-spacing: -0.02em;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
    }

    .brand-copy .eyebrow {
      font-size: 0.73rem;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    .brand-copy .title {
      font-size: 0.92rem;
      font-weight: 650;
      color: var(--text);
    }

    .scene-tabs {
      display: flex;
      gap: 6px;
    }

    .scene-tab {
      background: var(--surface-subtle);
      color: var(--text-secondary);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: var(--radius-md);
      font-size: 0.76rem;
      font-weight: 550;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .scene-tab:hover {
      background: var(--surface-muted);
      border-color: var(--border-strong);
      color: var(--text);
    }

    .scene-tab.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
      font-weight: 600;
    }

    .top-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border-strong);
      padding: 7px 13px;
      border-radius: var(--radius-md);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.12s ease;
    }

    .btn:hover {
      background: var(--surface-muted);
    }

    .btn.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
    }

    .btn.primary:hover {
      background: var(--accent-hover);
    }

    /* Main Presentation Stage */
    .stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 32px 14px 32px;
      overflow: hidden;
    }

    .scene-header {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .scene-kicker {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      margin-bottom: 2px;
    }

    .scene-title {
      font-size: 1.32rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    .scene-subtitle {
      font-size: 0.84rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .foundation-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .pill {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.73rem;
      font-weight: 600;
      background: var(--accent-subtle);
      border: 1px solid var(--accent-border);
      color: var(--accent);
    }

    .pill.ok {
      background: var(--ok-bg);
      border-color: var(--ok-border);
      color: var(--ok-text);
    }

    /* Central SVG Motion Frame */
    .canvas-wrap {
      flex: 1;
      my: 10px;
      margin: 12px 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 18px;
      position: relative;
      overflow: hidden;
    }

    svg.motion-svg {
      width: 100%;
      height: 100%;
      max-height: 430px;
    }

    /* Synchronized Narration Teleprompter */
    .teleprompter {
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-left: 4px solid var(--accent);
      border-radius: var(--radius-md);
      padding: 11px 18px;
      box-shadow: var(--shadow-sm);
    }

    .tp-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.71rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      margin-bottom: 3px;
    }

    .tp-text {
      font-size: 0.91rem;
      line-height: 1.48;
      color: var(--text);
    }

    .tp-text code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.81rem;
    }

    /* Timeline Scrubber Bar */
    .timeline-bar {
      height: 52px;
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 0 28px;
      display: flex;
      align-items: center;
      gap: 14px;
      z-index: 20;
    }

    .time-readout {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--accent);
      min-width: 105px;
    }

    .scrubber {
      flex: 1;
      height: 8px;
      background: var(--surface-muted);
      border: 1px solid var(--border-strong);
      border-radius: 99px;
      position: relative;
      cursor: pointer;
    }

    .scrubber-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 99px;
      width: 0%;
    }

    .scrubber-markers {
      position: absolute;
      top: -17px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 0.66rem;
      font-weight: 600;
      color: var(--text-muted);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand-left">
      <div class="aiat-badge">&alpha;IAt</div>
      <div class="brand-copy">
        <span class="eyebrow">Tailored Intelligent Solutions · Requirements identified. Controls applied.</span>
        <span class="title">SwitchCortex — Deterministic BPMN 2.0, DMN 1.3 &amp; FEEL Governance for Switch AI Rooms</span>
      </div>
    </div>

    <div class="scene-tabs" role="tablist">
      <button class="scene-tab active" onclick="jumpToScene(0)" id="tab-0">Act 1 · 0:00 Operational Context</button>
      <button class="scene-tab" onclick="jumpToScene(1)" id="tab-1">Act 2 · 0:32 Green Lane vs. Multi-Dept</button>
      <button class="scene-tab" onclick="jumpToScene(2)" id="tab-2">Act 3 · 1:20 Compliance &amp; Rollback</button>
      <button class="scene-tab" onclick="jumpToScene(3)" id="tab-3">Act 4 · 1:55 Formal Proof in Chat</button>
      <button class="scene-tab" onclick="jumpToScene(4)" id="tab-4">Act 5 · 2:38 SHA-256 Audit Evidence</button>
    </div>

    <div class="top-actions">
      <button class="btn primary" id="play-btn" onclick="togglePlay()">Pause Motion</button>
      <button class="btn" onclick="restartCurrentScene()">Replay Act</button>
      <a class="btn" href="/">Open Live Governance Studio</a>
    </div>
  </div>

  <div class="stage">
    <div class="scene-header">
      <div>
        <div class="scene-kicker" id="scene-kicker">ACT 1 · INTEGRATED KNOWLEDGE &amp; CONTROLLED EXECUTION (0:00 – 0:32)</div>
        <div class="scene-title" id="scene-title">AI Tailored to Your Processes, Data, and Rules</div>
        <div class="scene-subtitle" id="scene-subtitle">Agents propose structured operational facts in the Switch Room. Formal BPMN 2.0, DMN 1.3, and FEEL models decide.</div>
      </div>
      <div class="foundation-pills">
        <span class="pill">αIAt · Tailored Intelligent Solutions</span>
        <span class="pill ok" id="active-standard-pill">OMG BPMN 2.0 · DMN 1.3 · FEEL</span>
      </div>
    </div>

    <div class="canvas-wrap" id="canvas-stage"></div>

    <div class="teleprompter">
      <div class="tp-meta">
        <span id="tp-scene-label">ENGLISH VOICEOVER SCRIPT (ACT 1 OF 5)</span>
        <span id="tp-cue-label">MOTION GRAPHIC CUE: DISPERSED CHAT APPROVALS → CONTROLLED MCP GOVERNANCE</span>
      </div>
      <div class="tp-text" id="tp-text"></div>
    </div>
  </div>

  <div class="timeline-bar">
    <button class="btn" onclick="prevScene()">Prev Act</button>
    <button class="btn" onclick="nextScene()">Next Act</button>
    <div class="time-readout" id="time-readout">00:00 / 03:00</div>
    <div class="scrubber" id="scrubber" onclick="scrubTimeline(event)">
      <div class="scrubber-markers">
        <span>0:00 Act 1 · Context</span>
        <span>0:32 Act 2 · Responsibilities</span>
        <span>1:20 Act 3 · Compliance</span>
        <span>1:55 Act 4 · Formal Proof</span>
        <span>2:38 Act 5 · Audit Trail</span>
        <span>3:00</span>
      </div>
      <div class="scrubber-fill" id="scrubber-fill"></div>
    </div>
  </div>

  <script>
    const SCENES = [
      {
        id: 0,
        startSec: 0,
        endSec: 32,
        kicker: 'ACT 1 · INTEGRATED KNOWLEDGE & CONTROLLED EXECUTION (0:00 – 0:32)',
        title: 'AI Tailored to Your Processes, Data, and Rules',
        subtitle: 'αIAt Principle: Understand the operation first. Identify requirements, surface gaps, and incorporate explicit rules and controls.',
        standardPill: 'Switch AI Room + 12 MCP Tools',
        cue: 'MOTION GRAPHIC: UNSTRUCTURED CHAT COORDINATION → STRUCTURED BPMN 2.0 & DMN 1.3 GOVERNANCE',
        narration:
          '"Switch AI brings specialized coding and operations agents—<code>@sre-agent</code>, <code>@sec-agent</code>, and <code>@finops-agent</code>—into shared Slack and Mattermost rooms. Yet when multiple agents coordinate production changes through unstructured chat alone, approvals scatter, mandatory reviews are skipped, and agents assume authority they do not hold. Guided by the <code>αIAt</code> approach—<b>Requirements identified. Controls applied.</b>—<b>SwitchCortex</b> governs the Switch Room over MCP using verified <b>BPMN 2.0 workflows, DMN 1.3 decision tables, and FEEL expressions</b>."',
      },
      {
        id: 1,
        startSec: 32,
        endSec: 80,
        kicker: 'ACT 2 · OPERATIONAL ADAPTATION & CLEAR RESPONSIBILITIES (0:32 – 1:20)',
        title: 'Scenario 1 & 2: Green-Lane Automation vs. Parallel Multi-Department Review & Human Sign-Off',
        subtitle: 'Define explicitly who can inspect, propose, approve, and execute across SRE, Security, FinOps, and Executive roles.',
        standardPill: 'DMN 1.3 Rules R10 & R6 · BPMN Parallel Fork/Join',
        cue: 'MOTION GRAPHIC: <1s STAGING GREEN LANE vs. PARALLEL DEPT FORK + ACL BLOCK + HUMAN-ONLY GATE',
        narration:
          '"Routine low-risk work moves without friction: in Scenario 1, a $45 staging scale-up matches DMN Rule <code>R10_GREEN_LANE_AUTO_APPROVE</code> and deploys in under a second. In Scenario 2, a production hotfix requesting a $3,200/month GPU burst matches DMN Rule <code>R6</code> and forks a BPMN <b>parallel gateway</b> to Security and FinOps simultaneously. When <code>@sre-agent</code> attempts to submit Security sign-off, cross-department ACL blocks the action (<code>ERR_DEPARTMENT_ACL_DENIED</code>). Once both departments synchronize at the parallel join, a <b>Human-Only Gate</b> opens—blocking AI self-approval (<code>ERR_HUMAN_ONLY_GATE</code>) until human <code>@eng-manager</code> approves."',
      },
      {
        id: 2,
        startSec: 80,
        endSec: 115,
        kicker: 'ACT 3 · APPLIED COMPLIANCE & COMPENSATING ROLLBACK (1:20 – 1:55)',
        title: 'Scenario 3: Non-Compliance Halted Before Automation & Reverse-Topological Undo',
        subtitle: 'αIAt Execution Limit: Resolve legal, contractual, or compliance violations before automating the affected operation.',
        standardPill: 'Sticky Taint Cap (0.65) · R1_BLOCK_PUBLIC_PII · Reverse Undo',
        cue: 'MOTION GRAPHIC: EXTERNAL TAINT CONFIDENCE CAP → HARD PII REJECTION → 3-STEP REVERSE COMPENSATION',
        narration:
          '"At <code>αIAt</code>, non-compliant practices are halted before automation can proceed. In Scenario 3, an untrusted external bot requests making a customer PII bucket public. SwitchCortex applies <b>sticky taint</b>, capping effective confidence at <code>0.65</code>, while DMN Rule <code>R1_BLOCK_PUBLIC_PII</code> deterministically rejects the request. And when our CISO aborts an in-flight payment migration due to lock contention, <code>undo_workflow</code> executes compensating actions in <b>reverse topological order</b>—releasing FinOps budget, revoking temporary security clearance, and reverting the SRE workspace."',
      },
      {
        id: 3,
        startSec: 115,
        endSec: 158,
        kicker: 'ACT 4 · RIGOR & DESIGN-TIME FORMAL VERIFICATION IN CHAT (1:55 – 2:38)',
        title: 'Scenario 4: Mathematical Rejection of Conflicting DMN Rules & Unsound BPMN Deadlocks',
        subtitle: 'Distinguish facts, hypotheses, and rules: prove that every policy modification is conflict-free and deadlock-free before registration.',
        standardPill: 'Equivalence-Class Counterexample + Petri-Net Verifier',
        cue: 'MOTION GRAPHIC: DMN PAIRWISE OVERLAP COUNTEREXAMPLE + BPMN PARALLEL JOIN DEADLOCK PROOF',
        narration:
          '"What happens when someone in the Switch Room asks <code>@policy-agent</code> to add a shortcut—proposing to auto-approve whenever <code>confidence >= 0.90</code> and bypass Security before the parallel join? Before any blueprint is registered, SwitchCortex runs <b>formal static verification</b>. Its DMN analyzer checks all finite-domain equivalence classes and blocks the rule with a <b>concrete counterexample</b> where <code>confidence = 0.90</code> collides with <code>R1_BLOCK_PUBLIC_PII</code>. Its <b>Petri-net soundness verifier</b> explores reachable token markings and proves that bypassing Security causes an <code>ERR_LACK_OF_SYNCHRONIZATION</code> deadlock at the parallel join!"',
      },
      {
        id: 4,
        startSec: 158,
        endSec: 180,
        kicker: 'ACT 5 · CONTINUITY, AUDIT EVIDENCE & LIVE EXECUTION (2:38 – 3:00)',
        title: 'Tamper-Evident SHA-256 Audit Ledger & Live Google Gemini Multi-Agent Execution',
        subtitle: 'Preserve operational context, verifiable decisions, and complete historical continuity — αIAt · aiat.pt',
        standardPill: 'SHA-256 Hash Chain · 51 Verified Events',
        cue: 'MOTION GRAPHIC: HASH-CHAINED AUDIT RECORDS → αIAt × SWITCHCORTEX INSTITUTIONAL SUMMARY',
        narration:
          '"Instead of reconstructing history manually during an audit, SwitchCortex records every proposal, DMN rule evaluation, blocked violation, rollback, and human decision in a tamper-evident <b>SHA-256 hash chain</b>. With <b>SwitchCortex</b> by <code>αIAt</code>, teams and AI agents collaborate naturally in chat—backed by clear responsibilities, applied compliance, and mathematical rigor."',
      },
    ];

    let isPlaying = true;
    let totalElapsedSec = 0;
    const TOTAL_DURATION = 180;
    let lastTick = performance.now();

    function getCurrentSceneIndex(sec) {
      for (let i = SCENES.length - 1; i >= 0; i--) {
        if (sec >= SCENES[i].startSec) return i;
      }
      return 0;
    }

    function jumpToScene(idx) {
      const target = SCENES[idx] || SCENES[0];
      totalElapsedSec = target.startSec;
      updateUI();
    }

    function prevScene() {
      const idx = getCurrentSceneIndex(totalElapsedSec);
      jumpToScene(Math.max(0, idx - 1));
    }

    function nextScene() {
      const idx = getCurrentSceneIndex(totalElapsedSec);
      jumpToScene(Math.min(SCENES.length - 1, idx + 1));
    }

    function restartCurrentScene() {
      jumpToScene(getCurrentSceneIndex(totalElapsedSec));
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      document.getElementById('play-btn').textContent = isPlaying ? 'Pause Motion' : 'Play Motion';
    }

    function scrubTimeline(e) {
      const rect = document.getElementById('scrubber').getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      totalElapsedSec = ratio * TOTAL_DURATION;
      updateUI();
    }

    function formatTime(sec) {
      const s = Math.floor(sec);
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return String(m).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
    }

    function renderSceneSvg(sceneIdx, localProgress) {
      const p = Math.max(0, Math.min(1, localProgress));

      if (sceneIdx === 0) {
        // ACT 1: Operational Comparison — Dispersed Chat Decisions vs. αIAt Controlled Execution
        const packetX = 635 + ((performance.now() / 14) % 490);
        return \`
        <svg class="motion-svg" viewBox="0 0 1200 410">
          <!-- LEFT COLUMN: DISPERSED, UNVERIFIED CHAT COORDINATION -->
          <rect x="16" y="14" width="430" height="382" rx="8" fill="#faf9f6" stroke="#cbc6ba" stroke-width="1.5" />
          <rect x="16" y="14" width="430" height="38" rx="8" fill="#fef2f2" />
          <text x="34" y="38" fill="#7f1d1d" font-size="12" font-weight="700" letter-spacing="0.5">PROBLEM: PROMPT-ONLY MULTI-AGENT ROOMS</text>

          <text x="34" y="72" fill="#4d4c48" font-size="11.5">When multiple agents act on unstructured chat messages alone:</text>

          <!-- Problem Cards -->
          <rect x="34" y="90" width="394" height="68" rx="6" fill="#ffffff" stroke="#fca5a5" />
          <text x="50" y="114" fill="#7f1d1d" font-size="12" font-weight="700">1. Unclear Responsibilities &amp; Skipped Reviews</text>
          <text x="50" y="134" fill="#4d4c48" font-size="11">@sre-agent deploys before @sec-agent or @finops-agent</text>
          <text x="50" y="149" fill="#76746e" font-size="10.5">completes mandatory security and cloud budget verification.</text>

          <rect x="34" y="172" width="394" height="68" rx="6" fill="#ffffff" stroke="#fca5a5" />
          <text x="50" y="196" fill="#7f1d1d" font-size="12" font-weight="700">2. Unchecked Authority on High-Impact Decisions</text>
          <text x="50" y="216" fill="#4d4c48" font-size="11">An AI agent treats a +$3,200/mo production GPU burst as</text>
          <text x="50" y="231" fill="#76746e" font-size="10.5">routine or attempts to approve an executive human gate.</text>

          <rect x="34" y="254" width="394" height="68" rx="6" fill="#ffffff" stroke="#fca5a5" />
          <text x="50" y="278" fill="#7f1d1d" font-size="12" font-weight="700">3. Unverified Policy Edits &amp; Scattered Evidence</text>
          <text x="50" y="298" fill="#4d4c48" font-size="11">Ad-hoc rule changes in chat create conflicting rules, deadlocks,</text>
          <text x="50" y="313" fill="#76746e" font-size="10.5">and force manual history reconstruction during audits.</text>

          <rect x="34" y="336" width="394" height="44" rx="6" fill="#fef2f2" stroke="#fecaca" />
          <text x="231" y="363" text-anchor="middle" fill="#7f1d1d" font-size="11.5" font-weight="700">Result: Operational risk and lack of verifiable control</text>

          <!-- CENTER BRIDGE: αIAt METHOD -->
          <g transform="translate(464, 132)">
            <rect x="0" y="0" width="128" height="146" rx="8" fill="#182b49" />
            <text x="64" y="36" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="700">&alpha;IAt</text>
            <line x1="20" y1="48" x2="108" y2="48" stroke="#476288" stroke-width="1" />
            <text x="64" y="70" text-anchor="middle" fill="#eef2f7" font-size="10.5" font-weight="600">Diagnosis</text>
            <text x="64" y="90" text-anchor="middle" fill="#eef2f7" font-size="10.5" font-weight="600">Implementation</text>
            <text x="64" y="110" text-anchor="middle" fill="#eef2f7" font-size="10.5" font-weight="600">Control</text>
            <rect x="14" y="120" width="100" height="18" rx="3" fill="#f0fdf4" />
            <text x="64" y="133" text-anchor="middle" fill="#14532d" font-size="9.5" font-weight="700">VERIFIED</text>
          </g>

          <!-- RIGHT COLUMN: SWITCHCORTEX CONTROLLED ARCHITECTURE -->
          <rect x="610" y="14" width="574" height="382" rx="8" fill="#faf9f6" stroke="#182b49" stroke-width="2" />
          <rect x="610" y="14" width="574" height="38" rx="8" fill="#182b49" />
          <text x="630" y="38" fill="#ffffff" font-size="12" font-weight="700" letter-spacing="0.5">SOLUTION: SWITCHCORTEX DETERMINISTIC GOVERNANCE CORTEX</text>

          <!-- Plane 1: Conversational Room -->
          <rect x="630" y="66" width="534" height="74" rx="6" fill="#ffffff" stroke="#c5d2e3" stroke-width="1.5" />
          <text x="648" y="88" fill="#182b49" font-size="12" font-weight="700">1. Conversational Plane — Switch AI Room (#switch-ops-room · Slack / Mattermost)</text>
          <text x="648" y="108" fill="#161615" font-size="11" font-family="monospace">@alice-devops (SRE)  ·  @sre-agent  ·  @sec-agent  ·  @finops-agent  ·  @eng-manager / @ciso</text>
          <text x="648" y="126" fill="#4d4c48" font-size="11">Agents interpret telemetry and propose structured facts; they never self-authorize policy.</text>

          <!-- MCP Protocol Bus -->
          <rect x="630" y="152" width="534" height="34" rx="5" fill="#eef2f7" stroke="#182b49" stroke-width="1.5" />
          <text x="897" y="173" text-anchor="middle" fill="#182b49" font-size="11.5" font-weight="700">Model Context Protocol (MCP) — 12 Deterministic Governance &amp; Verification Tools</text>
          <circle cx="\${packetX}" cy="169" r="5" fill="#182b49" />

          <!-- Plane 2: 3 Formal Engines -->
          <rect x="630" y="200" width="170" height="132" rx="6" fill="#ffffff" stroke="#cbc6ba" />
          <text x="644" y="224" fill="#182b49" font-size="12" font-weight="700">BPMN 2.0 Workflow</text>
          <text x="644" y="244" fill="#4d4c48" font-size="10.5">• Petri-net token routing</text>
          <text x="644" y="262" fill="#4d4c48" font-size="10.5">• Parallel Dept Fork &amp; Join</text>
          <text x="644" y="280" fill="#4d4c48" font-size="10.5">• Strict Department ACLs</text>
          <text x="644" y="298" fill="#14532d" font-size="10.5" font-weight="600">• Deadlock Verifier</text>
          <text x="644" y="316" fill="#78350f" font-size="10.5" font-weight="600">• humanOnly Gates</text>

          <rect x="812" y="200" width="170" height="132" rx="6" fill="#ffffff" stroke="#cbc6ba" />
          <text x="826" y="224" fill="#182b49" font-size="12" font-weight="700">DMN 1.3 Decisions</text>
          <text x="826" y="244" fill="#4d4c48" font-size="10.5">• Green-Lane Auto Gate</text>
          <text x="826" y="262" fill="#4d4c48" font-size="10.5">• Multi-Dept Escalation</text>
          <text x="826" y="280" fill="#4d4c48" font-size="10.5">• Hard PII Block (R1)</text>
          <text x="826" y="298" fill="#14532d" font-size="10.5" font-weight="600">• Overlap Counterexample</text>
          <text x="826" y="316" fill="#14532d" font-size="10.5" font-weight="600">• Coverage Gap Analyzer</text>

          <rect x="994" y="200" width="170" height="132" rx="6" fill="#ffffff" stroke="#cbc6ba" />
          <text x="1008" y="224" fill="#182b49" font-size="12" font-weight="700">FEEL &amp; Guardrails</text>
          <text x="1008" y="244" fill="#4d4c48" font-size="10.5">• Step-budgeted evaluator</text>
          <text x="1008" y="262" fill="#4d4c48" font-size="10.5">• Three-valued null logic</text>
          <text x="1008" y="280" fill="#4d4c48" font-size="10.5">• Sticky Taint Cap (0.65)</text>
          <text x="1008" y="298" fill="#78350f" font-size="10.5" font-weight="600">• Reverse-Topo Undo</text>
          <text x="1008" y="316" fill="#14532d" font-size="10.5" font-weight="600">• SHA-256 Audit Ledger</text>

          <rect x="630" y="344" width="534" height="38" rx="6" fill="#f0fdf4" stroke="#86efac" />
          <text x="897" y="368" text-anchor="middle" fill="#14532d" font-size="11.5" font-weight="700">Requirements identified. Controls applied. — Every action traceable to a rule and a responsible actor.</text>
        </svg>\`;
      }

      if (sceneIdx === 1) {
        // ACT 2: Scenario 1 (Green Lane) vs. Scenario 2 (Parallel Multi-Department Fork + ACL Block + Human Gate)
        const s1TokenX = 95 + Math.min(1, p / 0.32) * 985;
        const s2Sub = Math.max(0, (p - 0.32) / 0.68);
        const showFork = s2Sub >= 0.12 && s2Sub < 0.62;
        const showAclBlock = s2Sub >= 0.25 && s2Sub < 0.56;
        const showHumanBlock = s2Sub >= 0.62 && s2Sub < 0.84;
        const showApproved = s2Sub >= 0.84;

        return \`
        <svg class="motion-svg" viewBox="0 0 1200 410">
          <!-- TOP BAND: SCENARIO 1 GREEN LANE -->
          <rect x="16" y="12" width="1168" height="122" rx="8" fill="#faf9f6" stroke="#86efac" stroke-width="1.8" />
          <text x="36" y="36" fill="#14532d" font-size="12" font-weight="700">SCENARIO 1 (WF-101) — GREEN LANE: 100% AUTOMATIC APPROVAL IN &lt; 1 SECOND</text>
          <text x="36" y="54" fill="#4d4c48" font-size="11">Facts extracted by @sre-agent: env="staging", cost_delta=+$45/mo, touches_pii=false, confidence=0.96 → Matches DMN Rule R10_GREEN_LANE_AUTO_APPROVE</text>

          <rect x="36" y="68" width="195" height="48" rx="6" fill="#ffffff" stroke="#182b49" />
          <text x="133" y="91" text-anchor="middle" fill="#161615" font-size="11.5" font-weight="700">1. task_sre_triage</text>
          <text x="133" y="106" text-anchor="middle" fill="#4d4c48" font-size="10">Owner: @sre-agent (SRE)</text>

          <line x1="231" y1="92" x2="355" y2="92" stroke="#14532d" stroke-width="2.5" />
          <rect x="355" y="68" width="255" height="48" rx="6" fill="#f0fdf4" stroke="#14532d" stroke-width="1.8" />
          <text x="482" y="90" text-anchor="middle" fill="#14532d" font-size="11.5" font-weight="700">2. DMN Gate: Rule R10 Matched</text>
          <text x="482" y="106" text-anchor="middle" fill="#14532d" font-size="10.5" font-family="monospace">verdict = "auto_approve"</text>

          <line x1="610" y1="92" x2="735" y2="92" stroke="#14532d" stroke-width="2.5" />
          <rect x="735" y="68" width="215" height="48" rx="6" fill="#ffffff" stroke="#182b49" />
          <text x="842" y="91" text-anchor="middle" fill="#161615" font-size="11.5" font-weight="700">3. task_sre_execute</text>
          <text x="842" y="106" text-anchor="middle" fill="#4d4c48" font-size="10">Rollout: deploy-stg-8821</text>

          <line x1="950" y1="92" x2="1030" y2="92" stroke="#14532d" stroke-width="2.5" />
          <rect x="1030" y="68" width="134" height="48" rx="24" fill="#14532d" />
          <text x="1097" y="96" text-anchor="middle" fill="#ffffff" font-size="11.5" font-weight="700">COMPLETED</text>

          <!-- Moving Green Token -->
          <circle cx="\${s1TokenX}" cy="92" r="8" fill="#14532d" stroke="#ffffff" stroke-width="2" />

          <!-- BOTTOM BAND: SCENARIO 2 MULTI-DEPARTMENT PARALLEL REVIEW & HUMAN GATE -->
          <rect x="16" y="148" width="1168" height="248" rx="8" fill="#faf9f6" stroke="#182b49" stroke-width="1.8" />
          <text x="36" y="172" fill="#182b49" font-size="12" font-weight="700">SCENARIO 2 (WF-102) — PRODUCTION HOTFIX + $3,200/MO GPU BURST: PARALLEL BPMN FORK &amp; HUMAN-ONLY GATE</text>
          <text x="36" y="190" fill="#4d4c48" font-size="11">Facts: env="prod", cost_delta=+$3,200/mo, public_exposure=true → Matches DMN Rule R6_PROD_STANDARD_MULTI_DEPT (verdict = "require_dept_signoff")</text>

          <!-- SRE Triage + DMN R6 -->
          <rect x="36" y="244" width="165" height="62" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.5" />
          <text x="118" y="270" text-anchor="middle" fill="#161615" font-size="11.5" font-weight="700">SRE Triage + DMN R6</text>
          <text x="118" y="288" text-anchor="middle" fill="#78350f" font-size="10" font-family="monospace">require_dept_signoff</text>

          <!-- Parallel Fork -->
          <line x1="201" y1="275" x2="250" y2="275" stroke="#182b49" stroke-width="2" />
          <polygon points="274,251 298,275 274,299 250,275" fill="#eef2f7" stroke="#182b49" stroke-width="2" />
          <text x="274" y="281" text-anchor="middle" fill="#182b49" font-size="16" font-weight="700">+</text>
          <text x="274" y="316" text-anchor="middle" fill="#4d4c48" font-size="9.5" font-weight="600">gw_dept_fork</text>

          <!-- Branch 1: Security -->
          <path d="M 288 263 L 330 226 L 375 226" fill="none" stroke="#182b49" stroke-width="2" />
          <rect x="375" y="200" width="225" height="52" rx="6" fill="#ffffff" stroke="\${showAclBlock ? '#7f1d1d' : '#182b49'}" stroke-width="1.8" />
          <text x="487" y="222" text-anchor="middle" fill="#161615" font-size="11.5" font-weight="700">task_sec_audit (@sec-agent)</text>
          <text x="487" y="239" text-anchor="middle" fill="#14532d" font-size="10">Cosign valid · 0 critical CVEs</text>

          <!-- Branch 2: FinOps -->
          <path d="M 288 287 L 330 328 L 375 328" fill="none" stroke="#182b49" stroke-width="2" />
          <rect x="375" y="302" width="225" height="52" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.8" />
          <text x="487" y="324" text-anchor="middle" fill="#161615" font-size="11.5" font-weight="700">task_finops_audit (@finops)</text>
          <text x="487" y="341" text-anchor="middle" fill="#14532d" font-size="10">+$3,200/mo Q4 reserve verified</text>

          \${showFork ? \`
            <circle cx="487" cy="200" r="7" fill="#182b49" stroke="#ffffff" stroke-width="2" />
            <circle cx="487" cy="354" r="7" fill="#182b49" stroke="#ffffff" stroke-width="2" />
          \` : ''}

          \${showAclBlock ? \`
            <rect x="355" y="156" width="265" height="34" rx="5" fill="#fef2f2" stroke="#7f1d1d" stroke-width="1.8" />
            <text x="487" y="177" text-anchor="middle" fill="#7f1d1d" font-size="10.5" font-weight="700">BLOCKED @sre-agent: ERR_DEPARTMENT_ACL_DENIED</text>
          \` : ''}

          <!-- Parallel Join -->
          <path d="M 600 226 L 642 226 L 676 263" fill="none" stroke="#182b49" stroke-width="2" />
          <path d="M 600 328 L 642 328 L 676 287" fill="none" stroke="#182b49" stroke-width="2" />
          <polygon points="690,251 714,275 690,299 666,275" fill="#eef2f7" stroke="#182b49" stroke-width="2" />
          <text x="690" y="281" text-anchor="middle" fill="#182b49" font-size="16" font-weight="700">+</text>
          <text x="690" y="316" text-anchor="middle" fill="#4d4c48" font-size="9.5" font-weight="600">gw_dept_join (Sync)</text>

          <!-- Human-Only Gate -->
          <line x1="714" y1="275" x2="762" y2="275" stroke="#182b49" stroke-width="2" />
          <rect x="762" y="238" width="220" height="74" rx="6" fill="\${showApproved ? '#f0fdf4' : '#fffbeb'}" stroke="\${showHumanBlock ? '#7f1d1d' : showApproved ? '#14532d' : '#78350f'}" stroke-width="2" />
          <text x="872" y="261" text-anchor="middle" fill="\${showApproved ? '#14532d' : '#78350f'}" font-size="11.5" font-weight="700">task_human_approval (humanOnly)</text>
          <text x="872" y="279" text-anchor="middle" fill="#161615" font-size="11" font-weight="600">\${showApproved ? 'Approved by @eng-manager' : 'Assigned: @eng-manager (Human)'}</text>
          <text x="872" y="297" text-anchor="middle" fill="#76746e" font-size="10">AI agents prohibited from deciding</text>

          \${showHumanBlock ? \`
            <rect x="738" y="184" width="268" height="44" rx="5" fill="#fef2f2" stroke="#7f1d1d" stroke-width="2" />
            <text x="872" y="203" text-anchor="middle" fill="#7f1d1d" font-size="10.5" font-weight="700">SECURITY BLOCK: ERR_HUMAN_ONLY_GATE</text>
            <text x="872" y="219" text-anchor="middle" fill="#7f1d1d" font-size="9.5">@sre-agent self-approval rejected &amp; recorded in ledger</text>
          \` : ''}

          <!-- Prod Execute -->
          <line x1="982" y1="275" x2="1028" y2="275" stroke="\${showApproved ? '#14532d' : '#cbc6ba'}" stroke-width="2.5" />
          <rect x="1028" y="244" width="136" height="62" rx="6" fill="\${showApproved ? '#14532d' : '#ffffff'}" stroke="\${showApproved ? '#14532d' : '#cbc6ba'}" stroke-width="1.8" />
          <text x="1096" y="272" text-anchor="middle" fill="\${showApproved ? '#ffffff' : '#76746e'}" font-size="11.5" font-weight="700">\${showApproved ? 'PROD DEPLOYED' : 'task_sre_execute'}</text>
          <text x="1096" y="290" text-anchor="middle" fill="\${showApproved ? '#dcfce7' : '#76746e'}" font-size="10">deploy-prod-9904</text>
        </svg>\`;
      }

      if (sceneIdx === 2) {
        // ACT 3: Applied Compliance (Sticky Taint + Hard PII Block) & Reverse-Topological Undo
        const undoStep = p < 0.42 ? 0 : p < 0.62 ? 1 : p < 0.80 ? 2 : 3;

        return \`
        <svg class="motion-svg" viewBox="0 0 1200 410">
          <!-- LEFT PANEL: HARD PII COMPLIANCE BLOCK -->
          <rect x="16" y="14" width="564" height="382" rx="8" fill="#faf9f6" stroke="#cbc6ba" stroke-width="1.5" />
          <rect x="16" y="14" width="564" height="38" rx="8" fill="#fef2f2" />
          <text x="36" y="38" fill="#7f1d1d" font-size="12" font-weight="700">PART A (WF-103) — APPLIED COMPLIANCE: STICKY TAINT &amp; HARD PII BLOCK</text>
          <text x="36" y="72" fill="#4d4c48" font-size="11">αIAt Limit: Non-compliance must be halted before automating the affected operation.</text>

          <rect x="36" y="90" width="524" height="62" rx="6" fill="#ffffff" stroke="#cbc6ba" />
          <text x="54" y="114" fill="#161615" font-size="11.5" font-weight="700">External Untrusted Trigger: @partner-bot (tainted = true)</text>
          <text x="54" y="134" fill="#4d4c48" font-size="11" font-family="monospace">"Make s3://prod-customer-pii-export publicly readable for partner CSV sync"</text>

          <rect x="36" y="168" width="524" height="88" rx="6" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.5" />
          <text x="54" y="192" fill="#78350f" font-size="11.5" font-weight="700">Smart Guardrail: Sticky Taint Confidence Capping</text>
          <rect x="54" y="206" width="460" height="14" rx="7" fill="#e2dfd7" />
          <rect x="54" y="206" width="299" height="14" rx="7" fill="#78350f" />
          <line x1="353" y1="198" x2="353" y2="228" stroke="#7f1d1d" stroke-width="3" />
          <text x="54" y="240" fill="#4d4c48" font-size="11">Untrusted origin caps effective confidence at <tspan fill="#78350f" font-weight="700">0.65 maximum</tspan> (preventing green-lane bypass).</text>

          <rect x="36" y="274" width="524" height="102" rx="6" fill="#fef2f2" stroke="#7f1d1d" stroke-width="2" />
          <text x="298" y="304" text-anchor="middle" fill="#7f1d1d" font-size="13" font-weight="700">DMN RULE R1_BLOCK_PUBLIC_PII MATCHED → VERDICT: REJECT</text>
          <text x="298" y="328" text-anchor="middle" fill="#161615" font-size="11.5" font-family="monospace">touches_pii = true AND public_exposure = true</text>
          <text x="298" y="352" text-anchor="middle" fill="#7f1d1d" font-size="11" font-weight="600">Workflow Halted (completed_rejected) · Zero S3 Permissions Modified</text>

          <!-- RIGHT PANEL: REVERSE-TOPOLOGICAL COMPENSATING ROLLBACK -->
          <rect x="604" y="14" width="580" height="382" rx="8" fill="#faf9f6" stroke="#cbc6ba" stroke-width="1.5" />
          <rect x="604" y="14" width="580" height="38" rx="8" fill="#182b49" />
          <text x="624" y="38" fill="#ffffff" font-size="12" font-weight="700">PART B (WF-104) — CONTROLLED EXECUTION: REVERSE-TOPOLOGICAL UNDO</text>
          <text x="624" y="72" fill="#4d4c48" font-size="11">Supervisor @ciso aborts canary migration due to lock contention (action: "undo_workflow"):</text>

          <!-- Step 3: FinOps (Compensated 1st) -->
          <rect x="624" y="92" width="540" height="74" rx="6" fill="\${undoStep >= 1 ? '#fffbeb' : '#ffffff'}" stroke="\${undoStep >= 1 ? '#78350f' : '#cbc6ba'}" stroke-width="1.8" />
          <text x="642" y="116" fill="#161615" font-size="11.5" font-weight="700">Completed Step #3: task_finops_audit (@finops-agent)</text>
          <text x="642" y="136" fill="\${undoStep >= 1 ? '#78350f' : '#4d4c48'}" font-size="11" font-family="monospace">\${undoStep >= 1 ? '⏪ COMPENSATED [1st]: release_reserved_cloud_budget ($450/mo released)' : 'State: Reserved $450/mo shadow replica budget'}</text>

          <!-- Step 2: Security (Compensated 2nd) -->
          <rect x="624" y="182" width="540" height="74" rx="6" fill="\${undoStep >= 2 ? '#fffbeb' : '#ffffff'}" stroke="\${undoStep >= 2 ? '#78350f' : '#cbc6ba'}" stroke-width="1.8" />
          <text x="642" y="206" fill="#161615" font-size="11.5" font-weight="700">Completed Step #2: task_sec_audit (@sec-agent)</text>
          <text x="642" y="226" fill="\${undoStep >= 2 ? '#78350f' : '#4d4c48'}" font-size="11" font-family="monospace">\${undoStep >= 2 ? '⏪ COMPENSATED [2nd]: revoke_temporary_security_clearance' : 'State: Temporary KMS key clearance granted'}</text>

          <!-- Step 1: SRE (Compensated 3rd) -->
          <rect x="624" y="272" width="540" height="74" rx="6" fill="\${undoStep >= 3 ? '#fffbeb' : '#ffffff'}" stroke="\${undoStep >= 3 ? '#78350f' : '#cbc6ba'}" stroke-width="1.8" />
          <text x="642" y="296" fill="#161615" font-size="11.5" font-weight="700">Completed Step #1: task_sre_triage (@sre-agent)</text>
          <text x="642" y="316" fill="\${undoStep >= 3 ? '#78350f' : '#4d4c48'}" font-size="11" font-family="monospace">\${undoStep >= 3 ? '⏪ COMPENSATED [3rd]: revert_sre_triage_workspace' : 'State: Canary schema workspace initialized'}</text>

          <text x="894" y="374" text-anchor="middle" fill="#182b49" font-size="11.5" font-weight="700">Reverse-Topological Order Guaranteed: Step #3 → Step #2 → Step #1 · Final Status: rolled_back</text>
        </svg>\`;
      }

      if (sceneIdx === 3) {
        // ACT 4: Design-Time Formal Verification (DMN Overlap Counterexample + BPMN Petri-Net Deadlock Proof)
        return \`
        <svg class="motion-svg" viewBox="0 0 1200 410">
          <!-- LEFT PANEL: DMN 1.3 STATIC ANALYZER -->
          <rect x="16" y="14" width="568" height="382" rx="8" fill="#faf9f6" stroke="#182b49" stroke-width="1.8" />
          <rect x="16" y="14" width="568" height="38" rx="8" fill="#182b49" />
          <text x="36" y="38" fill="#ffffff" font-size="12" font-weight="700">1. DMN 1.3 STATIC VERIFIER (analyzeDecisionTable)</text>
          <text x="36" y="70" fill="#4d4c48" font-size="11">Proposed chat edit: Add R11_NAIVE_HOTFIX_BYPASS ("auto-approve whenever confidence &gt;= 0.90")</text>

          <rect x="36" y="88" width="528" height="110" rx="6" fill="#fef2f2" stroke="#7f1d1d" stroke-width="1.5" />
          <text x="54" y="112" fill="#7f1d1d" font-size="11.5" font-weight="700">PAIRWISE EQUIVALENCE-CLASS CONFLICT DETECTED (9 OVERLAPS)</text>
          <text x="54" y="136" fill="#161615" font-size="11" font-family="monospace">Rule R1_BLOCK_PUBLIC_PII     : touches_pii=true, public=true → <tspan fill="#7f1d1d" font-weight="700">reject</tspan></text>
          <text x="54" y="158" fill="#161615" font-size="11" font-family="monospace">Rule R11_NAIVE_HOTFIX_BYPASS : confidence &gt;= 0.90           → <tspan fill="#14532d" font-weight="700">auto_approve</tspan></text>
          <text x="54" y="182" fill="#7f1d1d" font-size="11" font-weight="600">Contradiction: Both rules match the same input vector with opposite verdicts.</text>

          <rect x="36" y="214" width="528" height="162" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.5" />
          <text x="54" y="238" fill="#182b49" font-size="11.5" font-weight="700">CONCRETE MATHEMATICAL COUNTEREXAMPLE WITNESS:</text>
          <text x="54" y="264" fill="#161615" font-size="11.5" font-family="monospace">{</text>
          <text x="74" y="284" fill="#161615" font-size="11.5" font-family="monospace">"env": "dev", "cost_delta": 0,</text>
          <text x="74" y="304" fill="#7f1d1d" font-size="11.5" font-family="monospace" font-weight="700">"touches_pii": true, "public_exposure": true,</text>
          <text x="74" y="324" fill="#182b49" font-size="11.5" font-family="monospace" font-weight="700">"confidence": 0.90</text>
          <text x="54" y="344" fill="#161615" font-size="11.5" font-family="monospace">}</text>
          <text x="54" y="364" fill="#7f1d1d" font-size="11" font-weight="700">Registration Blocked: ERR_DMN_FORMAL_VERIFICATION_FAILED</text>

          <!-- RIGHT PANEL: BPMN 2.0 PETRI-NET SOUNDNESS VERIFIER -->
          <rect x="604" y="14" width="580" height="382" rx="8" fill="#faf9f6" stroke="#7f1d1d" stroke-width="1.8" />
          <rect x="604" y="14" width="580" height="38" rx="8" fill="#7f1d1d" />
          <text x="624" y="38" fill="#ffffff" font-size="12" font-weight="700">2. BPMN 2.0 PETRI-NET SOUNDNESS VERIFIER (verifyBpmnSoundness)</text>
          <text x="624" y="70" fill="#4d4c48" font-size="11">Proposed chat edit: Route gw_route_verdict directly to @finops-agent, bypassing @sec-agent</text>

          <!-- Unreachable Upper Branch -->
          <rect x="630" y="96" width="145" height="48" rx="6" fill="#f0eee8" stroke="#cbc6ba" stroke-dasharray="5 4" />
          <text x="702" y="118" text-anchor="middle" fill="#76746e" font-size="11" font-weight="700">gw_dept_fork</text>
          <text x="702" y="134" text-anchor="middle" fill="#7f1d1d" font-size="9.5" font-weight="700">UNREACHABLE</text>

          <rect x="810" y="96" width="170" height="48" rx="6" fill="#f0eee8" stroke="#cbc6ba" stroke-dasharray="5 4" />
          <text x="895" y="118" text-anchor="middle" fill="#76746e" font-size="11" font-weight="700">task_sec_audit</text>
          <text x="895" y="134" text-anchor="middle" fill="#7f1d1d" font-size="9.5" font-weight="700">0 TOKENS (BYPASSED)</text>

          <line x1="980" y1="120" x2="1060" y2="174" stroke="#7f1d1d" stroke-width="2" stroke-dasharray="5 4" />

          <!-- Active Lower Shortcut Branch -->
          <rect x="630" y="196" width="145" height="48" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.8" />
          <text x="702" y="224" text-anchor="middle" fill="#161615" font-size="11" font-weight="700">gw_route_verdict</text>

          <line x1="775" y1="220" x2="810" y2="220" stroke="#182b49" stroke-width="2.5" />
          <rect x="810" y="196" width="170" height="48" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.8" />
          <text x="895" y="218" text-anchor="middle" fill="#161615" font-size="11" font-weight="700">task_finops_audit</text>
          <text x="895" y="234" text-anchor="middle" fill="#14532d" font-size="9.5" font-weight="700">1 TOKEN ARRIVED</text>

          <line x1="980" y1="220" x2="1060" y2="194" stroke="#182b49" stroke-width="2.5" />
          <circle cx="1022" cy="206" r="7" fill="#182b49" stroke="#ffffff" stroke-width="2" />

          <!-- Deadlocked Join Gateway -->
          <polygon points="1085,154 1118,184 1085,214 1052,184" fill="#fef2f2" stroke="#7f1d1d" stroke-width="2.5" />
          <text x="1085" y="190" text-anchor="middle" fill="#7f1d1d" font-size="17" font-weight="800">+</text>
          <text x="1085" y="234" text-anchor="middle" fill="#7f1d1d" font-size="10.5" font-weight="700">DEADLOCK</text>

          <rect x="630" y="268" width="530" height="108" rx="6" fill="#fef2f2" stroke="#7f1d1d" stroke-width="1.8" />
          <text x="648" y="292" fill="#7f1d1d" font-size="11.5" font-weight="700">PETRI-NET REACHABILITY &amp; SYNCHRONIZATION PROOF:</text>
          <text x="648" y="314" fill="#161615" font-size="11" font-family="monospace">1. ERR_UNREACHABLE_NODE @ gw_dept_fork &amp; task_sec_audit</text>
          <text x="648" y="334" fill="#161615" font-size="11" font-family="monospace">2. ERR_LACK_OF_SYNCHRONIZATION @ gw_dept_join:</text>
          <text x="648" y="354" fill="#7f1d1d" font-size="10.5" font-family="monospace">   Received token from [task_finops_audit]; branch [task_sec_audit] never fires.</text>
        </svg>\`;
      }

      // ACT 5: Tamper-Evident SHA-256 Audit Chain & αIAt Institutional Summary Card
      return \`
      <svg class="motion-svg" viewBox="0 0 1200 410">
        <text x="600" y="32" text-anchor="middle" fill="#182b49" font-size="13" font-weight="700" letter-spacing="0.5">
          CONTINUOUS AUDIT EVIDENCE — TAMPER-EVIDENT SHA-256 HASH CHAIN (51 OPERATIONAL EVENTS VERIFIED)
        </text>

        <!-- 4 Linked Audit Blocks -->
        <g transform="translate(36, 52)">
          <rect x="0" y="0" width="252" height="92" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.5" />
          <text x="16" y="24" fill="#182b49" font-size="11" font-weight="700">SEQ #01 · WORKFLOW_STARTED</text>
          <text x="16" y="44" fill="#161615" font-size="11">WF-101 · @alice-devops (SRE)</text>
          <text x="16" y="64" fill="#76746e" font-size="10" font-family="monospace">prev: 000000000000...</text>
          <text x="16" y="80" fill="#14532d" font-size="10" font-family="monospace">hash: 8f93b40a21c9...</text>

          <line x1="252" y1="46" x2="290" y2="46" stroke="#182b49" stroke-width="2.5" />

          <rect x="290" y="0" width="252" height="92" rx="6" fill="#ffffff" stroke="#182b49" stroke-width="1.5" />
          <text x="306" y="24" fill="#182b49" font-size="11" font-weight="700">SEQ #14 · DMN_GATE_EVALUATED</text>
          <text x="306" y="44" fill="#161615" font-size="11">Rule R6 → require_dept_signoff</text>
          <text x="306" y="64" fill="#76746e" font-size="10" font-family="monospace">prev: 8f93b40a21c9...</text>
          <text x="306" y="80" fill="#14532d" font-size="10" font-family="monospace">hash: 41d7e920b114...</text>

          <line x1="542" y1="46" x2="580" y2="46" stroke="#182b49" stroke-width="2.5" />

          <rect x="580" y="0" width="252" height="92" rx="6" fill="#fef2f2" stroke="#7f1d1d" stroke-width="1.5" />
          <text x="596" y="24" fill="#7f1d1d" font-size="11" font-weight="700">SEQ #21 · SECURITY_VIOLATION</text>
          <text x="596" y="44" fill="#161615" font-size="11">Blocked @sre on humanOnly gate</text>
          <text x="596" y="64" fill="#76746e" font-size="10" font-family="monospace">prev: 41d7e920b114...</text>
          <text x="596" y="80" fill="#7f1d1d" font-size="10" font-family="monospace">hash: ac088604b9a2...</text>

          <line x1="832" y1="46" x2="870" y2="46" stroke="#182b49" stroke-width="2.5" />

          <rect x="870" y="0" width="258" height="92" rx="6" fill="#f0fdf4" stroke="#14532d" stroke-width="2" />
          <text x="886" y="24" fill="#14532d" font-size="11" font-weight="700">SEQ #51 · LEDGER VERIFIED</text>
          <text x="886" y="44" fill="#14532d" font-size="11" font-weight="700">✔ 100% Tamper-Evident Chain</text>
          <text x="886" y="64" fill="#76746e" font-size="10" font-family="monospace">prev: 7c12a889e041...</text>
          <text x="886" y="80" fill="#14532d" font-size="10" font-family="monospace">head: 2f0fd960cda9...</text>
        </g>

        <!-- INSTITUTIONAL CLOSING CARD: αIAt · SwitchCortex -->
        <rect x="130" y="172" width="940" height="218" rx="10" fill="#ffffff" stroke="#182b49" stroke-width="2" />
        <rect x="130" y="172" width="940" height="10" rx="4" fill="#182b49" />

        <text x="600" y="228" text-anchor="middle" fill="#161615" font-size="30" font-weight="700" letter-spacing="-0.5">
          &alpha;IAt <tspan fill="#cbc6ba" font-weight="400">·</tspan> SwitchCortex
        </text>
        <text x="600" y="256" text-anchor="middle" fill="#182b49" font-size="15.5" font-weight="600">
          Tailored Intelligent Solutions — AI tailored to your processes, data, and rules.
        </text>
        <text x="600" y="286" text-anchor="middle" fill="#4d4c48" font-size="13.5">
          "AI agents propose in the Switch Room. Formal BPMN 2.0, DMN 1.3, and FEEL models decide."
        </text>

        <rect x="210" y="312" width="780" height="48" rx="6" fill="#eef2f7" stroke="#c5d2e3" />
        <text x="600" y="341" text-anchor="middle" fill="#182b49" font-size="12.5" font-weight="700" font-family="monospace">
          Requirements identified. Controls applied.   ·   12 MCP Tools   ·   aiat.pt
        </text>
      </svg>\`;
    }

    function updateUI() {
      const idx = getCurrentSceneIndex(totalElapsedSec);
      const scene = SCENES[idx];
      const sceneDuration = scene.endSec - scene.startSec;
      const localProgress = (totalElapsedSec - scene.startSec) / sceneDuration;

      for (let i = 0; i < SCENES.length; i++) {
        const tab = document.getElementById('tab-' + i);
        if (tab) tab.className = i === idx ? 'scene-tab active' : 'scene-tab';
      }

      document.getElementById('scene-kicker').textContent = scene.kicker;
      document.getElementById('scene-title').textContent = scene.title;
      document.getElementById('scene-subtitle').textContent = scene.subtitle;
      document.getElementById('active-standard-pill').textContent = scene.standardPill;
      document.getElementById('tp-scene-label').textContent =
        'ENGLISH VOICEOVER SCRIPT (ACT ' + (idx + 1) + ' OF 5 · ' + formatTime(scene.startSec) + ' – ' + formatTime(scene.endSec) + ')';
      document.getElementById('tp-cue-label').textContent = scene.cue;
      document.getElementById('tp-text').innerHTML = scene.narration;

      document.getElementById('time-readout').textContent =
        formatTime(totalElapsedSec) + ' / ' + formatTime(TOTAL_DURATION);
      document.getElementById('scrubber-fill').style.width =
        ((totalElapsedSec / TOTAL_DURATION) * 100).toFixed(2) + '%';

      document.getElementById('canvas-stage').innerHTML = renderSceneSvg(idx, localProgress);
    }

    function loop(now) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      if (isPlaying) {
        totalElapsedSec += dt;
        if (totalElapsedSec >= TOTAL_DURATION) {
          totalElapsedSec = 0;
        }
      }
      updateUI();
      requestAnimationFrame(loop);
    }

    updateUI();
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;
}
