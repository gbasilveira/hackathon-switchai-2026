/**
 * SwitchCortex — Append-Only SHA-256 Hash-Chained Audit Ledger
 *
 * Records every BPMN token transition, DMN rule evaluation, agent proposal,
 * human approval, guardrail violation, and supervision rollback in an immutable
 * cryptographic hash chain.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type AuditEventType =
  | 'WORKFLOW_STARTED'
  | 'AGENT_TASK_DISPATCHED'
  | 'AGENT_PROPOSAL_RECORDED'
  | 'DMN_EVALUATED'
  | 'SMART_GUARDRAIL_ENFORCED'
  | 'GATEWAY_TRANSITION'
  | 'HUMAN_INBOX_CREATED'
  | 'HUMAN_APPROVAL_DECIDED'
  | 'SECURITY_VIOLATION_BLOCKED'
  | 'KILL_SWITCH_ENGAGED'
  | 'KILL_SWITCH_RELEASED'
  | 'COMPENSATION_EXECUTED'
  | 'POLICY_VERIFICATION_REJECTED'
  | 'POLICY_REGISTERED'
  | 'WORKFLOW_COMPLETED';

export interface AuditEntry {
  readonly seq: number;
  readonly timestamp: string;
  readonly instanceId: string;
  readonly roomChannel: string;
  readonly actorId: string;
  readonly actorKind: 'agent' | 'human' | 'system';
  readonly department: string;
  readonly eventType: AuditEventType;
  readonly summary: string;
  readonly payload: Record<string, unknown>;
  readonly prevHash: string;
  readonly entryHash: string;
}

export interface LedgerVerificationResult {
  readonly ok: boolean;
  readonly totalEntries: number;
  readonly headHash: string;
  readonly brokenAtSeq?: number;
  readonly reason?: string;
}

const GENESIS_HASH = '0'.repeat(64);

export function computeEntryHash(
  seq: number,
  timestamp: string,
  instanceId: string,
  roomChannel: string,
  actorId: string,
  actorKind: string,
  department: string,
  eventType: string,
  summary: string,
  payload: Record<string, unknown>,
  prevHash: string
): string {
  const canonical = JSON.stringify({
    seq,
    timestamp,
    instanceId,
    roomChannel,
    actorId,
    actorKind,
    department,
    eventType,
    summary,
    payload,
    prevHash,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export class AuditLedger {
  private entries: AuditEntry[] = [];
  private readonly persistPath?: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath;
    if (persistPath && existsSync(persistPath)) {
      try {
        const raw = readFileSync(persistPath, 'utf8');
        const parsed = JSON.parse(raw) as AuditEntry[];
        if (Array.isArray(parsed)) {
          this.entries = parsed;
        }
      } catch {
        this.entries = [];
      }
    }
  }

  public append(params: {
    instanceId: string;
    roomChannel?: string;
    actorId: string;
    actorKind: 'agent' | 'human' | 'system';
    department: string;
    eventType: AuditEventType;
    summary: string;
    payload?: Record<string, unknown>;
    timestamp?: string;
  }): AuditEntry {
    const seq = this.entries.length + 1;
    const timestamp = params.timestamp ?? new Date().toISOString();
    const roomChannel = params.roomChannel ?? '#ops-command-room';
    const payload = JSON.parse(JSON.stringify(params.payload ?? {})) as Record<string, unknown>;
    const prevHash = seq === 1 ? GENESIS_HASH : this.entries[seq - 2]!.entryHash;

    const entryHash = computeEntryHash(
      seq,
      timestamp,
      params.instanceId,
      roomChannel,
      params.actorId,
      params.actorKind,
      params.department,
      params.eventType,
      params.summary,
      payload,
      prevHash
    );

    const entry: AuditEntry = Object.freeze({
      seq,
      timestamp,
      instanceId: params.instanceId,
      roomChannel,
      actorId: params.actorId,
      actorKind: params.actorKind,
      department: params.department,
      eventType: params.eventType,
      summary: params.summary,
      payload,
      prevHash,
      entryHash,
    });

    this.entries.push(entry);
    this.flush();
    return entry;
  }

  public list(filter?: { instanceId?: string; actorId?: string; eventType?: AuditEventType }): readonly AuditEntry[] {
    return this.entries.filter((e) => {
      if (filter?.instanceId && e.instanceId !== filter.instanceId) return false;
      if (filter?.actorId && e.actorId !== filter.actorId) return false;
      if (filter?.eventType && e.eventType !== filter.eventType) return false;
      return true;
    });
  }

  public verifyIntegrity(): LedgerVerificationResult {
    let expectedPrev = GENESIS_HASH;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i]!;
      if (e.seq !== i + 1) {
        return {
          ok: false,
          totalEntries: this.entries.length,
          headHash: this.headHash(),
          brokenAtSeq: e.seq,
          reason: `Sequence gap at index ${i}: expected seq ${i + 1}, got ${e.seq}`,
        };
      }
      if (e.prevHash !== expectedPrev) {
        return {
          ok: false,
          totalEntries: this.entries.length,
          headHash: this.headHash(),
          brokenAtSeq: e.seq,
          reason: `Broken prevHash link at seq ${e.seq}`,
        };
      }
      const recomputed = computeEntryHash(
        e.seq,
        e.timestamp,
        e.instanceId,
        e.roomChannel,
        e.actorId,
        e.actorKind,
        e.department,
        e.eventType,
        e.summary,
        e.payload,
        e.prevHash
      );
      if (recomputed !== e.entryHash) {
        return {
          ok: false,
          totalEntries: this.entries.length,
          headHash: this.headHash(),
          brokenAtSeq: e.seq,
          reason: `Hash mismatch at seq ${e.seq}: entry was tampered with`,
        };
      }
      expectedPrev = e.entryHash;
    }

    return {
      ok: true,
      totalEntries: this.entries.length,
      headHash: this.headHash(),
    };
  }

  public headHash(): string {
    return this.entries.length === 0 ? GENESIS_HASH : this.entries[this.entries.length - 1]!.entryHash;
  }

  public formatMarkdownReport(instanceId?: string): string {
    const items = instanceId ? this.list({ instanceId }) : this.entries;
    const verification = this.verifyIntegrity();
    const lines: string[] = [
      `### 🛡️ SwitchCortex Cryptographic Audit Trail`,
      `- **Chain Integrity:** ${verification.ok ? '✅ VERIFIED (SHA-256 Tamper-Evident)' : '❌ TAMPERED'}`,
      `- **Total Entries:** ${items.length} (Global Chain: ${verification.totalEntries})`,
      `- **Head Digest:** \`${verification.headHash.slice(0, 16)}...${verification.headHash.slice(-8)}\``,
      ``,
      `| # | Actor | Dept | Event | Summary | Hash |`,
      `|---:|---|---|---|---|---|`,
    ];

    for (const item of items) {
      const badge = item.actorKind === 'human' ? '👤' : item.actorKind === 'agent' ? '🤖' : '⚙️';
      lines.push(
        `| ${item.seq} | ${badge} \`${item.actorId}\` | ${item.department} | \`${item.eventType}\` | ${item.summary} | \`${item.entryHash.slice(0, 10)}\` |`
      );
    }

    return lines.join('\n');
  }

  private flush(): void {
    if (!this.persistPath) return;
    mkdirSync(dirname(this.persistPath), { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify(this.entries, null, 2), 'utf8');
  }
}
