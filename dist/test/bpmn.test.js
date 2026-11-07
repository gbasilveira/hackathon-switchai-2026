import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportBpmnToXml, verifyBpmnSoundness, } from '../src/bpmn/engine.js';
import { DEFAULT_BPMN_PROCESS, FLAWED_BPMN_DEADLOCK_PROPOSAL, } from '../src/blueprints/defaults.js';
describe('BPMN 2.0 Multi-Department Engine & Petri-Net Soundness Verifier', () => {
    it('verifies the default multi-department BPMN process as sound (zero deadlocks, synchronized joins)', () => {
        const report = verifyBpmnSoundness(DEFAULT_BPMN_PROCESS);
        assert.equal(report.ok, true);
        assert.equal(report.status, 'sound');
        assert.equal(report.problems.length, 0);
        assert.ok(report.exploredMarkings >= 10);
        assert.deepEqual(report.decisionRefs, ['dmn_release_and_infra_governance']);
    });
    it('detects lack-of-synchronization deadlocks when a parallel department branch is bypassed', () => {
        const report = verifyBpmnSoundness(FLAWED_BPMN_DEADLOCK_PROPOSAL);
        assert.equal(report.ok, false);
        assert.equal(report.status, 'unsound');
        assert.ok(report.problems.length > 0);
        const syncErr = report.problems.find((p) => p.code === 'ERR_LACK_OF_SYNCHRONIZATION');
        assert.ok(syncErr);
        assert.equal(syncErr.elementId, 'gw_dept_join');
    });
    it('exports valid OMG BPMN 2.0 XML', () => {
        const xml = exportBpmnToXml(DEFAULT_BPMN_PROCESS);
        assert.ok(xml.includes('http://www.omg.org/spec/BPMN/20100524/MODEL'));
        assert.ok(xml.includes('id="bpmn_switch_ops_governance"'));
        assert.ok(xml.includes('<parallelGateway id="gw_dept_fork"'));
    });
});
//# sourceMappingURL=bpmn.test.js.map