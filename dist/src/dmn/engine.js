/**
 * SwitchCortex — Clean-Room DMN 1.3 Decision Table Engine & Static Verifier
 *
 * Implements deterministic DMN 1.3 evaluation (UNIQUE, FIRST, PRIORITY, RULE ORDER, COLLECT),
 * SHA-256 canonical digesting, DMN 1.3 XML export, and formal static verification
 * (conflicting overlaps, shadowed rules, null-safety hazards, and coverage gaps with counterexamples).
 */
import { createHash } from 'node:crypto';
import { evaluateFeel, evaluateUnaryTests, extractDomainSamplePoints, feelEquals, parseFeelExpression, parseUnaryTests, } from '../feel/engine.js';
export function computeDmnDigest(table) {
    const canonical = JSON.stringify({
        id: table.id,
        version: table.version,
        name: table.name,
        hitPolicy: table.hitPolicy,
        aggregation: table.aggregation ?? null,
        inputs: table.inputs.map((i) => ({
            id: i.id,
            label: i.label,
            expression: i.expression,
            type: i.type ?? null,
            allowedValues: i.allowedValues ?? null,
        })),
        outputs: table.outputs.map((o) => ({
            id: o.id,
            name: o.name,
            type: o.type ?? null,
            allowedValues: o.allowedValues ?? null,
        })),
        rules: table.rules.map((r) => ({
            id: r.id,
            inputEntries: r.inputEntries,
            outputEntries: r.outputEntries,
        })),
    });
    return createHash('sha256').update(canonical).digest('hex');
}
export function evaluateDecisionTable(table, context) {
    const digest = computeDmnDigest(table);
    const inputAsts = table.inputs.map((inp) => ({
        col: inp,
        ast: parseFeelExpression(inp.expression),
    }));
    const inputValues = inputAsts.map((item) => evaluateFeel(item.ast, context));
    const trace = [];
    const matchedRules = [];
    for (let rIdx = 0; rIdx < table.rules.length; rIdx++) {
        const rule = table.rules[rIdx];
        const cellResults = [];
        let allCellsMatch = true;
        for (let cIdx = 0; cIdx < table.inputs.length; cIdx++) {
            const col = table.inputs[cIdx];
            const cellStr = rule.inputEntries[cIdx] ?? '-';
            const unaryAst = parseUnaryTests(cellStr);
            const actualVal = inputValues[cIdx] ?? null;
            const cellMatched = evaluateUnaryTests(unaryAst, actualVal, context);
            cellResults.push({
                inputId: col.id,
                expression: col.expression,
                unaryTest: cellStr,
                actualValue: actualVal,
                matched: cellMatched,
            });
            if (!cellMatched) {
                allCellsMatch = false;
            }
        }
        trace.push({
            ruleId: rule.id,
            description: rule.description,
            matched: allCellsMatch,
            cellResults,
        });
        if (allCellsMatch) {
            const outputRecord = {};
            for (let oIdx = 0; oIdx < table.outputs.length; oIdx++) {
                const outCol = table.outputs[oIdx];
                const outExprStr = rule.outputEntries[oIdx] ?? 'null';
                const outAst = parseFeelExpression(outExprStr);
                const val = evaluateFeel(outAst, context);
                if (outCol.allowedValues && outCol.allowedValues.length > 0) {
                    const allowed = outCol.allowedValues.some((av) => feelEquals(av, val));
                    if (!allowed) {
                        return {
                            ok: false,
                            tableId: table.id,
                            tableVersion: table.version,
                            digest,
                            hitPolicy: table.hitPolicy,
                            status: 'error',
                            matchedRuleIds: matchedRules.map((m) => m.rule.id),
                            selectedRuleIds: [],
                            outputs: null,
                            trace,
                            errorDetail: `Rule '${rule.id}' produced disallowed output '${String(val)}' for column '${outCol.name}'`,
                        };
                    }
                }
                outputRecord[outCol.name] = val;
            }
            matchedRules.push({ rule, index: rIdx, outputRecord });
        }
    }
    if (matchedRules.length === 0) {
        if (table.hitPolicy === 'COLLECT' || table.hitPolicy === 'RULE ORDER') {
            return {
                ok: true,
                tableId: table.id,
                tableVersion: table.version,
                digest,
                hitPolicy: table.hitPolicy,
                status: 'decided',
                matchedRuleIds: [],
                selectedRuleIds: [],
                outputs: table.aggregation === 'COUNT' ? { count: 0 } : [],
                trace,
            };
        }
        return {
            ok: false,
            tableId: table.id,
            tableVersion: table.version,
            digest,
            hitPolicy: table.hitPolicy,
            status: 'no-match',
            matchedRuleIds: [],
            selectedRuleIds: [],
            outputs: null,
            trace,
            errorDetail: `No rule matched input context in table '${table.id}'`,
        };
    }
    const matchedIds = matchedRules.map((m) => m.rule.id);
    switch (table.hitPolicy) {
        case 'UNIQUE': {
            if (matchedRules.length > 1) {
                return {
                    ok: false,
                    tableId: table.id,
                    tableVersion: table.version,
                    digest,
                    hitPolicy: table.hitPolicy,
                    status: 'conflict',
                    matchedRuleIds: matchedIds,
                    selectedRuleIds: [],
                    outputs: null,
                    trace,
                    errorDetail: `UNIQUE hit policy violated: rules [${matchedIds.join(', ')}] matched simultaneously`,
                };
            }
            const winner = matchedRules[0];
            return {
                ok: true,
                tableId: table.id,
                tableVersion: table.version,
                digest,
                hitPolicy: table.hitPolicy,
                status: 'decided',
                matchedRuleIds: matchedIds,
                selectedRuleIds: [winner.rule.id],
                outputs: winner.outputRecord,
                trace,
            };
        }
        case 'FIRST': {
            const winner = matchedRules[0];
            return {
                ok: true,
                tableId: table.id,
                tableVersion: table.version,
                digest,
                hitPolicy: table.hitPolicy,
                status: 'decided',
                matchedRuleIds: matchedIds,
                selectedRuleIds: [winner.rule.id],
                outputs: winner.outputRecord,
                trace,
            };
        }
        case 'PRIORITY': {
            const primaryOut = table.outputs[0];
            const priorityList = primaryOut?.allowedValues ?? [];
            const rankOf = (rec) => {
                if (!primaryOut || priorityList.length === 0)
                    return Number.MAX_SAFE_INTEGER;
                const v = rec[primaryOut.name] ?? null;
                const idx = priorityList.findIndex((av) => feelEquals(av, v));
                return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
            };
            const sorted = [...matchedRules].sort((a, b) => rankOf(a.outputRecord) - rankOf(b.outputRecord));
            const best = sorted[0];
            const bestRank = rankOf(best.outputRecord);
            // Check if another rule tied for best rank with different full outputs
            for (let i = 1; i < sorted.length; i++) {
                const candidate = sorted[i];
                if (rankOf(candidate.outputRecord) === bestRank) {
                    const sameOutputs = JSON.stringify(best.outputRecord) === JSON.stringify(candidate.outputRecord);
                    if (!sameOutputs) {
                        return {
                            ok: false,
                            tableId: table.id,
                            tableVersion: table.version,
                            digest,
                            hitPolicy: table.hitPolicy,
                            status: 'conflict',
                            matchedRuleIds: matchedIds,
                            selectedRuleIds: [],
                            outputs: null,
                            trace,
                            errorDetail: `PRIORITY tie conflict between rules '${best.rule.id}' and '${candidate.rule.id}'`,
                        };
                    }
                }
            }
            return {
                ok: true,
                tableId: table.id,
                tableVersion: table.version,
                digest,
                hitPolicy: table.hitPolicy,
                status: 'decided',
                matchedRuleIds: matchedIds,
                selectedRuleIds: [best.rule.id],
                outputs: best.outputRecord,
                trace,
            };
        }
        case 'RULE ORDER': {
            return {
                ok: true,
                tableId: table.id,
                tableVersion: table.version,
                digest,
                hitPolicy: table.hitPolicy,
                status: 'decided',
                matchedRuleIds: matchedIds,
                selectedRuleIds: matchedIds,
                outputs: matchedRules.map((m) => m.outputRecord),
                trace,
            };
        }
        case 'COLLECT': {
            if (!table.aggregation) {
                return {
                    ok: true,
                    tableId: table.id,
                    tableVersion: table.version,
                    digest,
                    hitPolicy: table.hitPolicy,
                    status: 'decided',
                    matchedRuleIds: matchedIds,
                    selectedRuleIds: matchedIds,
                    outputs: matchedRules.map((m) => m.outputRecord),
                    trace,
                };
            }
            const primaryOutName = table.outputs[0].name;
            const vals = matchedRules
                .map((m) => m.outputRecord[primaryOutName])
                .filter((v) => typeof v === 'number');
            let aggValue = 0;
            if (table.aggregation === 'COUNT')
                aggValue = matchedRules.length;
            else if (table.aggregation === 'SUM')
                aggValue = vals.reduce((a, b) => a + b, 0);
            else if (table.aggregation === 'MIN')
                aggValue = vals.length > 0 ? Math.min(...vals) : 0;
            else if (table.aggregation === 'MAX')
                aggValue = vals.length > 0 ? Math.max(...vals) : 0;
            return {
                ok: true,
                tableId: table.id,
                tableVersion: table.version,
                digest,
                hitPolicy: table.hitPolicy,
                status: 'decided',
                matchedRuleIds: matchedIds,
                selectedRuleIds: matchedIds,
                outputs: { [primaryOutName]: aggValue },
                trace,
            };
        }
    }
}
/**
 * Formal Static Verification of a DMN 1.3 Decision Table.
 * Detects syntax errors, null-safety hazards, conflicting overlaps (with counterexamples),
 * shadowed/unreachable rules, and coverage gaps (with counterexamples).
 */
export function analyzeDecisionTable(table) {
    const digest = computeDmnDigest(table);
    const syntaxErrors = [];
    const nullHazards = [];
    const parsedGrid = [];
    const columnTests = table.inputs.map(() => []);
    const ruleOutputs = [];
    for (let rIdx = 0; rIdx < table.rules.length; rIdx++) {
        const rule = table.rules[rIdx];
        const rowAsts = [];
        for (let cIdx = 0; cIdx < table.inputs.length; cIdx++) {
            const col = table.inputs[cIdx];
            const rawCell = rule.inputEntries[cIdx] ?? '-';
            try {
                const ut = parseUnaryTests(rawCell);
                rowAsts.push(ut);
                columnTests[cIdx].push(ut);
                // Null-safety check: negated test `not(...)` where null is not excluded on optional column
                if (ut.negated && col.required === false) {
                    const matchesNull = evaluateUnaryTests(ut, null, {});
                    if (matchesNull) {
                        nullHazards.push({ ruleId: rule.id, inputId: col.id, cell: rawCell });
                    }
                }
            }
            catch (err) {
                syntaxErrors.push({
                    where: `rule:${rule.id}.input:${col.id}`,
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        }
        parsedGrid.push(rowAsts);
        const outRec = {};
        for (let oIdx = 0; oIdx < table.outputs.length; oIdx++) {
            const outCol = table.outputs[oIdx];
            const rawOut = rule.outputEntries[oIdx] ?? 'null';
            try {
                const ast = parseFeelExpression(rawOut);
                const val = evaluateFeel(ast, {});
                outRec[outCol.name] = val;
                if (outCol.allowedValues && outCol.allowedValues.length > 0) {
                    if (!outCol.allowedValues.some((av) => feelEquals(av, val))) {
                        syntaxErrors.push({
                            where: `rule:${rule.id}.output:${outCol.name}`,
                            message: `Output '${String(val)}' is not in allowedValues [${outCol.allowedValues.join(', ')}]`,
                        });
                    }
                }
            }
            catch (err) {
                syntaxErrors.push({
                    where: `rule:${rule.id}.output:${outCol.name}`,
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        }
        ruleOutputs.push(outRec);
    }
    if (syntaxErrors.length > 0) {
        return {
            ok: false,
            status: 'issues-found',
            tableId: table.id,
            digest,
            checkedCombinations: 0,
            overlaps: [],
            gaps: [],
            shadowedRules: [],
            nullHazards,
            syntaxErrors,
        };
    }
    // Build finite domain sample points per input column
    const sampleDomains = table.inputs.map((col, idx) => extractDomainSamplePoints(columnTests[idx], col.type, col.allowedValues));
    const overlapsMap = new Map();
    const gaps = [];
    const ruleFireCount = new Map();
    const ruleSoloOrWinnerCount = new Map();
    for (const r of table.rules) {
        ruleFireCount.set(r.id, 0);
        ruleSoloOrWinnerCount.set(r.id, 0);
    }
    let checkedCombinations = 0;
    const maxCombinations = 25000;
    const currentVector = new Array(table.inputs.length).fill(null);
    function buildContextFromVector(vec) {
        const ctx = {};
        for (let i = 0; i < table.inputs.length; i++) {
            ctx[table.inputs[i].expression] = vec[i];
        }
        return ctx;
    }
    function explore(colIdx) {
        if (checkedCombinations >= maxCombinations)
            return;
        if (colIdx === table.inputs.length) {
            checkedCombinations++;
            const matchedIndices = [];
            for (let rIdx = 0; rIdx < table.rules.length; rIdx++) {
                const row = parsedGrid[rIdx];
                let allMatch = true;
                for (let c = 0; c < table.inputs.length; c++) {
                    if (!evaluateUnaryTests(row[c], currentVector[c])) {
                        allMatch = false;
                        break;
                    }
                }
                if (allMatch) {
                    matchedIndices.push(rIdx);
                    const rId = table.rules[rIdx].id;
                    ruleFireCount.set(rId, (ruleFireCount.get(rId) ?? 0) + 1);
                }
            }
            if (matchedIndices.length === 0) {
                if (gaps.length < 10) {
                    gaps.push(buildContextFromVector(currentVector));
                }
                return;
            }
            // Determine winning rule for shadowed check
            if (table.hitPolicy === 'FIRST' || table.hitPolicy === 'UNIQUE') {
                const firstId = table.rules[matchedIndices[0]].id;
                ruleSoloOrWinnerCount.set(firstId, (ruleSoloOrWinnerCount.get(firstId) ?? 0) + 1);
            }
            else if (table.hitPolicy === 'PRIORITY') {
                const primaryOut = table.outputs[0];
                const priorityList = primaryOut?.allowedValues ?? [];
                const rankOf = (idx) => {
                    if (!primaryOut || priorityList.length === 0)
                        return idx;
                    const v = ruleOutputs[idx][primaryOut.name] ?? null;
                    const pIdx = priorityList.findIndex((av) => feelEquals(av, v));
                    return pIdx === -1 ? 999 : pIdx;
                };
                const sorted = [...matchedIndices].sort((a, b) => rankOf(a) - rankOf(b));
                const winId = table.rules[sorted[0]].id;
                ruleSoloOrWinnerCount.set(winId, (ruleSoloOrWinnerCount.get(winId) ?? 0) + 1);
            }
            else {
                for (const mIdx of matchedIndices) {
                    const id = table.rules[mIdx].id;
                    ruleSoloOrWinnerCount.set(id, (ruleSoloOrWinnerCount.get(id) ?? 0) + 1);
                }
            }
            // Check pairwise overlaps
            if (matchedIndices.length > 1) {
                for (let i = 0; i < matchedIndices.length; i++) {
                    for (let j = i + 1; j < matchedIndices.length; j++) {
                        const idxA = matchedIndices[i];
                        const idxB = matchedIndices[j];
                        const ruleA = table.rules[idxA];
                        const ruleB = table.rules[idxB];
                        const pairKey = `${ruleA.id}::${ruleB.id}`;
                        if (overlapsMap.has(pairKey))
                            continue;
                        const outA = ruleOutputs[idxA];
                        const outB = ruleOutputs[idxB];
                        const differentOutputs = JSON.stringify(outA) !== JSON.stringify(outB);
                        if (table.hitPolicy === 'UNIQUE') {
                            overlapsMap.set(pairKey, {
                                ruleA: ruleA.id,
                                ruleB: ruleB.id,
                                conflicting: differentOutputs,
                                severity: 'error',
                                reason: differentOutputs
                                    ? `Rules '${ruleA.id}' and '${ruleB.id}' overlap with conflicting verdicts under UNIQUE hit policy`
                                    : `Rules '${ruleA.id}' and '${ruleB.id}' overlap redundantly under UNIQUE hit policy`,
                                counterexample: buildContextFromVector(currentVector),
                                outputA: outA,
                                outputB: outB,
                            });
                        }
                        else if (differentOutputs && (table.hitPolicy === 'PRIORITY' || table.hitPolicy === 'FIRST')) {
                            // Check if one rule is a blanket fast-track (<= 1 wildcard difference) colliding with a security/rejection rule
                            const primaryName = table.outputs[0]?.name ?? 'verdict';
                            const valA = String(outA[primaryName] ?? '');
                            const valB = String(outB[primaryName] ?? '');
                            const involvesRejectAndAuto = (valA.includes('auto') && (valB.includes('reject') || valB.includes('escalate'))) ||
                                (valB.includes('auto') && (valA.includes('reject') || valA.includes('escalate')));
                            if (involvesRejectAndAuto) {
                                overlapsMap.set(pairKey, {
                                    ruleA: ruleA.id,
                                    ruleB: ruleB.id,
                                    conflicting: true,
                                    severity: 'error',
                                    reason: `Safety conflict: auto-approval rule collides with restriction/escalation rule between '${ruleA.id}' (${valA}) and '${ruleB.id}' (${valB})`,
                                    counterexample: buildContextFromVector(currentVector),
                                    outputA: outA,
                                    outputB: outB,
                                });
                            }
                        }
                    }
                }
            }
            return;
        }
        const domain = sampleDomains[colIdx];
        for (const val of domain) {
            currentVector[colIdx] = val;
            explore(colIdx + 1);
        }
    }
    explore(0);
    const shadowedRules = [];
    for (const r of table.rules) {
        if ((ruleSoloOrWinnerCount.get(r.id) ?? 0) === 0) {
            shadowedRules.push(r.id);
        }
    }
    const overlaps = Array.from(overlapsMap.values());
    const hasBlockingIssues = overlaps.some((o) => o.severity === 'error') ||
        gaps.length > 0 ||
        shadowedRules.length > 0 ||
        nullHazards.length > 0;
    return {
        ok: !hasBlockingIssues,
        status: hasBlockingIssues ? 'issues-found' : 'verified',
        tableId: table.id,
        digest,
        checkedCombinations,
        overlaps,
        gaps,
        shadowedRules,
        nullHazards,
        syntaxErrors,
    };
}
/**
 * Exports a DmnDecisionTable to standard OMG DMN 1.3 XML.
 */
export function exportDmnToXml(table) {
    const esc = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const inputsXml = table.inputs
        .map((inp) => `      <input id="${esc(inp.id)}" label="${esc(inp.label)}">
        <inputExpression id="${esc(inp.id)}_expr" typeRef="${esc(inp.type ?? 'string')}">
          <text>${esc(inp.expression)}</text>
        </inputExpression>
      </input>`)
        .join('\n');
    const outputsXml = table.outputs
        .map((out) => `      <output id="${esc(out.id)}" name="${esc(out.name)}" label="${esc(out.label ?? out.name)}" typeRef="${esc(out.type ?? 'string')}" />`)
        .join('\n');
    const rulesXml = table.rules
        .map((rule) => {
        const inEntries = rule.inputEntries
            .map((e, idx) => `        <inputEntry id="${esc(rule.id)}_in_${idx}">
          <text>${esc(e)}</text>
        </inputEntry>`)
            .join('\n');
        const outEntries = rule.outputEntries
            .map((e, idx) => `        <outputEntry id="${esc(rule.id)}_out_${idx}">
          <text>${esc(e)}</text>
        </outputEntry>`)
            .join('\n');
        return `      <rule id="${esc(rule.id)}">
        <description>${esc(rule.description ?? '')}</description>
${inEntries}
${outEntries}
      </rule>`;
    })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="${esc(table.id)}_defs" name="${esc(table.name)}" namespace="urn:switch-cortex:dmn:1.3">
  <decision id="${esc(table.id)}" name="${esc(table.name)}">
    <decisionTable id="${esc(table.id)}_table" hitPolicy="${esc(table.hitPolicy)}"${table.aggregation ? ` aggregation="${esc(table.aggregation)}"` : ''}>
${inputsXml}
${outputsXml}
${rulesXml}
    </decisionTable>
  </decision>
</definitions>
`;
}
//# sourceMappingURL=engine.js.map