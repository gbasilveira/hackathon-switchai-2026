import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFeel, evaluateUnaryTests, extractFreeVariables, FeelError, parseFeelExpression, parseUnaryTests, } from '../src/feel/engine.js';
describe('FEEL Expression Engine (DMN 1.3 Subset)', () => {
    it('evaluates arithmetic, comparisons, intervals, and logical expressions deterministically', () => {
        const ast1 = parseFeelExpression('cost_delta * 2 + 10 <= 100 and env != "prod"');
        assert.equal(evaluateFeel(ast1, { cost_delta: 40, env: 'staging' }), true);
        assert.equal(evaluateFeel(ast1, { cost_delta: 50, env: 'staging' }), false);
        const ast2 = parseFeelExpression('cost_delta in [101..5000] and env in ("dev", "staging")');
        assert.equal(evaluateFeel(ast2, { cost_delta: 101, env: 'dev' }), true);
        assert.equal(evaluateFeel(ast2, { cost_delta: 5000, env: 'staging' }), true);
        assert.equal(evaluateFeel(ast2, { cost_delta: 100, env: 'dev' }), false);
    });
    it('supports three-valued null-safe boolean logic (and / or / not)', () => {
        const andAst = parseFeelExpression('a and b');
        assert.equal(evaluateFeel(andAst, { a: false, b: null }), false);
        assert.equal(evaluateFeel(andAst, { a: true, b: null }), null);
        const orAst = parseFeelExpression('a or b');
        assert.equal(evaluateFeel(orAst, { a: true, b: null }), true);
        assert.equal(evaluateFeel(orAst, { a: false, b: null }), null);
    });
    it('evaluates DMN unary tests (wildcards, ranges, lists, negations, comparisons)', () => {
        const wild = parseUnaryTests('-');
        assert.equal(evaluateUnaryTests(wild, 'anything'), true);
        assert.equal(evaluateUnaryTests(wild, null), true);
        const range = parseUnaryTests('[101..10000]');
        assert.equal(evaluateUnaryTests(range, 100), false);
        assert.equal(evaluateUnaryTests(range, 101), true);
        assert.equal(evaluateUnaryTests(range, 10000), true);
        const list = parseUnaryTests('"dev", "staging"');
        assert.equal(evaluateUnaryTests(list, 'staging'), true);
        assert.equal(evaluateUnaryTests(list, 'prod'), false);
        const neg = parseUnaryTests('not("prod")');
        assert.equal(evaluateUnaryTests(neg, 'dev'), true);
        assert.equal(evaluateUnaryTests(neg, 'prod'), false);
    });
    it('extracts free variables and rejects prototype pollution paths', () => {
        const ast = parseFeelExpression('governance.verdict = "auto_approve" and cost_delta <= 100');
        assert.deepEqual(extractFreeVariables(ast), ['cost_delta', 'governance.verdict']);
        assert.throws(() => parseFeelExpression('obj.__proto__.polluted = true'), FeelError);
        assert.throws(() => parseFeelExpression('constructor.prototype'), FeelError);
    });
    it('enforces execution step budgets', () => {
        const ast = parseFeelExpression('1 + 2 + 3 + 4 + 5 + 6 + 7 + 8');
        assert.throws(() => evaluateFeel(ast, {}, { maxSteps: 3 }), FeelError);
    });
});
//# sourceMappingURL=feel.test.js.map