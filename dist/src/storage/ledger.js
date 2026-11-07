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
const GENESIS_HASH = '0'.repeat(64);
export function computeEntryHash(seq, timestamp, instanceId, roomChannel, actorId, actorKind, department, eventType, summary, payload, prevHash) {
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
    entries = [];
    persistPath;
    constructor(persistPath) {
        this.persistPath = persistPath;
        if (persistPath && existsSync(persistPath)) {
            try {
                const raw = readFileSync(persistPath, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this.entries = parsed;
                }
            }
            catch {
                this.entries = [];
            }
        }
    }
    append(params) {
        const seq = this.entries.length + 1;
        const timestamp = params.timestamp ?? new Date().toISOString();
        const roomChannel = params.roomChannel ?? '#ops-command-room';
        const payload = JSON.parse(JSON.stringify(params.payload ?? {}));
        const prevHash = seq === 1 ? GENESIS_HASH : this.entries[seq - 2].entryHash;
        const entryHash = computeEntryHash(seq, timestamp, params.instanceId, roomChannel, params.actorId, params.actorKind, params.department, params.eventType, params.summary, payload, prevHash);
        const entry = Object.freeze({
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
    list(filter) {
        return this.entries.filter((e) => {
            if (filter?.instanceId && e.instanceId !== filter.instanceId)
                return false;
            if (filter?.actorId && e.actorId !== filter.actorId)
                return false;
            if (filter?.eventType && e.eventType !== filter.eventType)
                return false;
            return true;
        });
    }
    verifyIntegrity() {
        let expectedPrev = GENESIS_HASH;
        for (let i = 0; i < this.entries.length; i++) {
            const e = this.entries[i];
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
            const recomputed = computeEntryHash(e.seq, e.timestamp, e.instanceId, e.roomChannel, e.actorId, e.actorKind, e.department, e.eventType, e.summary, e.payload, e.prevHash);
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
    headHash() {
        return this.entries.length === 0 ? GENESIS_HASH : this.entries[this.entries.length - 1].entryHash;
    }
    formatMarkdownReport(instanceId) {
        const items = instanceId ? this.list({ instanceId }) : this.entries;
        const verification = this.verifyIntegrity();
        const lines = [
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
            lines.push(`| ${item.seq} | ${badge} \`${item.actorId}\` | ${item.department} | \`${item.eventType}\` | ${item.summary} | \`${item.entryHash.slice(0, 10)}\` |`);
        }
        return lines.join('\n');
    }
    flush() {
        if (!this.persistPath)
            return;
        mkdirSync(dirname(this.persistPath), { recursive: true });
        writeFileSync(this.persistPath, JSON.stringify(this.entries, null, 2), 'utf8');
    }
}
//# sourceMappingURL=ledger.js.map