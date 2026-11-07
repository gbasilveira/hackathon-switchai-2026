/**
 * SwitchCortex — Clean-Room FEEL (Friendly Enough Expression Language, DMN 1.3) Engine
 *
 * Provides deterministic, side-effect-free, budget-bounded parsing, evaluation,
 * unary-test evaluation, and static variable/domain extraction for DMN 1.3 & BPMN 2.0.
 * Zero eval() or dynamic code generation.
 */
export type FeelPrimitive = number | string | boolean | null;
export type FeelValue = FeelPrimitive | FeelValue[] | {
    readonly [key: string]: FeelValue;
} | FeelInterval;
export interface FeelInterval {
    readonly __kind: 'interval';
    readonly start: number;
    readonly end: number;
    readonly startInclusive: boolean;
    readonly endInclusive: boolean;
}
export type FeelContext = Record<string, unknown>;
export type FeelAst = {
    readonly kind: 'literal';
    readonly value: FeelPrimitive;
} | {
    readonly kind: 'path';
    readonly segments: readonly string[];
} | {
    readonly kind: 'unary';
    readonly op: '-' | 'not';
    readonly operand: FeelAst;
} | {
    readonly kind: 'binary';
    readonly op: '+' | '-' | '*' | '/' | '=' | '!=' | '<' | '<=' | '>' | '>=' | 'and' | 'or' | 'in';
    readonly left: FeelAst;
    readonly right: FeelAst;
} | {
    readonly kind: 'interval';
    readonly start: FeelAst;
    readonly end: FeelAst;
    readonly startInclusive: boolean;
    readonly endInclusive: boolean;
} | {
    readonly kind: 'list';
    readonly items: readonly FeelAst[];
} | {
    readonly kind: 'call';
    readonly fn: string;
    readonly args: readonly FeelAst[];
};
export type UnaryTestItem = {
    readonly kind: 'wildcard';
} | {
    readonly kind: 'compare';
    readonly op: '=' | '!=' | '<' | '<=' | '>' | '>=';
    readonly expr: FeelAst;
} | {
    readonly kind: 'range';
    readonly start: FeelAst;
    readonly end: FeelAst;
    readonly startInclusive: boolean;
    readonly endInclusive: boolean;
} | {
    readonly kind: 'expr';
    readonly expr: FeelAst;
};
export interface UnaryTestsAst {
    readonly negated: boolean;
    readonly items: readonly UnaryTestItem[];
    readonly raw: string;
}
export declare class FeelError extends Error {
    readonly code: string;
    readonly position?: number;
    constructor(code: string, message: string, position?: number);
}
interface Token {
    readonly type: 'number' | 'string' | 'boolean' | 'null' | 'ident' | 'op' | 'punct' | 'dots' | 'eof';
    readonly value: string;
    readonly pos: number;
}
export declare function tokenizeFeel(input: string): Token[];
export declare function parseFeelExpression(source: string): FeelAst;
export declare function parseUnaryTests(source: string): UnaryTestsAst;
export interface FeelEvalOptions {
    readonly maxSteps?: number;
}
export declare function evaluateFeel(ast: FeelAst, context: FeelContext, options?: FeelEvalOptions): FeelValue;
export declare function feelEquals(a: FeelValue, b: FeelValue): boolean;
export declare function evaluateUnaryTests(unary: UnaryTestsAst, inputValue: FeelValue, context?: FeelContext, options?: FeelEvalOptions): boolean;
/**
 * Extracts all variable paths referenced in a FEEL AST (sorted, deduplicated).
 */
export declare function extractFreeVariables(ast: FeelAst): string[];
/**
 * Extracts boundary sample values from a collection of unary tests for a column,
 * enabling exact finite-domain counterexample generation for DMN overlap & gap analysis.
 */
export declare function extractDomainSamplePoints(testsList: readonly UnaryTestsAst[], columnType?: 'string' | 'number' | 'boolean', allowedValues?: readonly FeelPrimitive[]): FeelPrimitive[];
export {};
