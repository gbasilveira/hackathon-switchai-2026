/**
 * SwitchCortex — Clean-Room DMN 1.3 Decision Table Engine & Static Verifier
 *
 * Implements deterministic DMN 1.3 evaluation (UNIQUE, FIRST, PRIORITY, RULE ORDER, COLLECT),
 * SHA-256 canonical digesting, DMN 1.3 XML export, and formal static verification
 * (conflicting overlaps, shadowed rules, null-safety hazards, and coverage gaps with counterexamples).
 */
import { FeelContext, FeelPrimitive, FeelValue } from '../feel/engine.js';
export type DmnHitPolicy = 'UNIQUE' | 'FIRST' | 'PRIORITY' | 'RULE ORDER' | 'COLLECT';
export type DmnAggregation = 'SUM' | 'MIN' | 'MAX' | 'COUNT';
export interface DmnInputColumn {
    readonly id: string;
    readonly label: string;
    readonly expression: string;
    readonly type?: 'string' | 'number' | 'boolean';
    readonly allowedValues?: readonly FeelPrimitive[];
    readonly required?: boolean;
}
export interface DmnOutputColumn {
    readonly id: string;
    readonly name: string;
    readonly label?: string;
    readonly type?: 'string' | 'number' | 'boolean';
    readonly allowedValues?: readonly FeelPrimitive[];
}
export interface DmnRule {
    readonly id: string;
    readonly description?: string;
    readonly inputEntries: readonly string[];
    readonly outputEntries: readonly string[];
}
export interface DmnDecisionTable {
    readonly id: string;
    readonly version: string;
    readonly name: string;
    readonly description?: string;
    readonly hitPolicy: DmnHitPolicy;
    readonly aggregation?: DmnAggregation;
    readonly inputs: readonly DmnInputColumn[];
    readonly outputs: readonly DmnOutputColumn[];
    readonly rules: readonly DmnRule[];
}
export interface DmnRuleTrace {
    readonly ruleId: string;
    readonly description?: string;
    readonly matched: boolean;
    readonly cellResults: readonly {
        readonly inputId: string;
        readonly expression: string;
        readonly unaryTest: string;
        readonly actualValue: FeelValue;
        readonly matched: boolean;
    }[];
}
export interface DmnEvaluationResult {
    readonly ok: boolean;
    readonly tableId: string;
    readonly tableVersion: string;
    readonly digest: string;
    readonly hitPolicy: DmnHitPolicy;
    readonly status: 'decided' | 'no-match' | 'conflict' | 'error';
    readonly matchedRuleIds: readonly string[];
    readonly selectedRuleIds: readonly string[];
    readonly outputs: Record<string, FeelValue> | readonly Record<string, FeelValue>[] | null;
    readonly trace: readonly DmnRuleTrace[];
    readonly errorDetail?: string;
}
export interface DmnOverlapIssue {
    readonly ruleA: string;
    readonly ruleB: string;
    readonly conflicting: boolean;
    readonly severity: 'error' | 'warning';
    readonly reason: string;
    readonly counterexample: Record<string, FeelPrimitive>;
    readonly outputA: Record<string, FeelValue>;
    readonly outputB: Record<string, FeelValue>;
}
export interface DmnAnalysisReport {
    readonly ok: boolean;
    readonly status: 'verified' | 'issues-found';
    readonly tableId: string;
    readonly digest: string;
    readonly checkedCombinations: number;
    readonly overlaps: readonly DmnOverlapIssue[];
    readonly gaps: readonly Record<string, FeelPrimitive>[];
    readonly shadowedRules: readonly string[];
    readonly nullHazards: readonly {
        readonly ruleId: string;
        readonly inputId: string;
        readonly cell: string;
    }[];
    readonly syntaxErrors: readonly {
        readonly where: string;
        readonly message: string;
    }[];
}
export declare function computeDmnDigest(table: DmnDecisionTable): string;
export declare function evaluateDecisionTable(table: DmnDecisionTable, context: FeelContext): DmnEvaluationResult;
/**
 * Formal Static Verification of a DMN 1.3 Decision Table.
 * Detects syntax errors, null-safety hazards, conflicting overlaps (with counterexamples),
 * shadowed/unreachable rules, and coverage gaps (with counterexamples).
 */
export declare function analyzeDecisionTable(table: DmnDecisionTable): DmnAnalysisReport;
/**
 * Exports a DmnDecisionTable to standard OMG DMN 1.3 XML.
 */
export declare function exportDmnToXml(table: DmnDecisionTable): string;
