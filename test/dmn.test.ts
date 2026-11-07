import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDecisionTable,
  evaluateDecisionTable,
  exportDmnToXml,
} from '../src/dmn/engine.js';
import {
  DEFAULT_DMN_TABLE,
  FLAWED_DMN_OVERLAP_PROPOSAL,
} from '../src/blueprints/defaults.js';

describe('DMN 1.3 Decision Table Engine & Static Verifier', () => {
  it('verifies the default production DMN table with zero overlaps, zero gaps, and zero shadowed rules', () => {
    const report = analyzeDecisionTable(DEFAULT_DMN_TABLE);
    assert.equal(report.ok, true);
    assert.equal(report.status, 'verified');
    assert.equal(report.overlaps.length, 0);
    assert.equal(report.gaps.length, 0);
    assert.equal(report.shadowedRules.length, 0);
    assert.ok(report.checkedCombinations > 50);
  });

  it('evaluates Green Lane, Multi-Department Escalation, and Hard PII Rejection deterministically', () => {
    // 1. Green Lane
    const green = evaluateDecisionTable(DEFAULT_DMN_TABLE, {
      env: 'staging',
      cost_delta: 45,
      touches_pii: false,
      public_exposure: false,
      confidence: 0.96,
    });
    assert.equal(green.ok, true);
    assert.deepEqual(green.selectedRuleIds, ['R10_GREEN_LANE_AUTO_APPROVE']);
    assert.equal((green.outputs as Record<string, unknown>)['verdict'], 'auto_approve');

    // 2. Multi-Department Escalation (Prod + $3,200/mo)
    const prod = evaluateDecisionTable(DEFAULT_DMN_TABLE, {
      env: 'prod',
      cost_delta: 3200,
      touches_pii: false,
      public_exposure: true,
      confidence: 0.94,
    });
    assert.equal(prod.ok, true);
    assert.deepEqual(prod.selectedRuleIds, ['R6_PROD_STANDARD_MULTI_DEPT']);
    assert.equal((prod.outputs as Record<string, unknown>)['verdict'], 'require_dept_signoff');
    assert.equal((prod.outputs as Record<string, unknown>)['required_approver'], '@eng-manager');

    // 3. Hard Compliance Rejection (Public PII)
    const piiPublic = evaluateDecisionTable(DEFAULT_DMN_TABLE, {
      env: 'prod',
      cost_delta: 10,
      touches_pii: true,
      public_exposure: true,
      confidence: 0.99,
    });
    assert.equal(piiPublic.ok, true);
    assert.deepEqual(piiPublic.selectedRuleIds, ['R1_BLOCK_PUBLIC_PII']);
    assert.equal((piiPublic.outputs as Record<string, unknown>)['verdict'], 'reject');
  });

  it('catches conflicting rule overlaps with concrete counterexamples in flawed DMN proposals', () => {
    const report = analyzeDecisionTable(FLAWED_DMN_OVERLAP_PROPOSAL);
    assert.equal(report.ok, false);
    assert.equal(report.status, 'issues-found');
    assert.ok(report.overlaps.length > 0);
    const conflict = report.overlaps.find((o) => o.ruleB === 'R11_NAIVE_HOTFIX_BYPASS');
    assert.ok(conflict);
    assert.equal(conflict.conflicting, true);
    assert.ok('env' in conflict.counterexample);
  });

  it('exports valid OMG DMN 1.3 XML', () => {
    const xml = exportDmnToXml(DEFAULT_DMN_TABLE);
    assert.ok(xml.includes('https://www.omg.org/spec/DMN/20191111/MODEL/'));
    assert.ok(xml.includes('id="dmn_release_and_infra_governance"'));
  });
});
