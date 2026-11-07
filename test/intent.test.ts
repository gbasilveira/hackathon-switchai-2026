import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent } from '../src/agents/intent.js';
import { SwitchCortexRuntime } from '../src/governance/runtime.js';
import { runLiveChatWorkflow } from '../src/agents/live-orchestrator.js';

test('conversation never becomes an ops request', () => {
  for (const p of ['quem são vocês e o que fazem', 'who are you and what do you do?', 'olá a todos', 'can you deploy checkout-api to prod?', 'what does the deploy pipeline do']) {
    assert.notEqual(classifyIntent(p).intent, 'ops_request', p);
  }
});

test('missing environment or target needs clarification', () => {
  assert.equal(classifyIntent('deploy checkout-api now').intent, 'needs_clarification');
  assert.equal(classifyIntent('please deploy to staging').intent, 'needs_clarification');
});

test('explicit request passes the gate', () => {
  const v = classifyIntent('scale staging-search-indexer from 2 to 4 pods in staging, about $45/mo');
  assert.equal(v.intent, 'ops_request');
  assert.equal(v.env, 'staging');
  assert.equal(v.costStated, true);
});

test('chat question starts no workflow and executes nothing', async () => {
  delete process.env['GEMINI_API_KEY'];
  const rt = new SwitchCortexRuntime();
  const res = await runLiveChatWorkflow(rt, { prompt: 'quem são vocês e o que fazem' });
  assert.equal(res.instance, undefined);
  assert.ok(res.intent.reply);
});

test('unstated cost can never take the Green Lane', async () => {
  delete process.env['GEMINI_API_KEY'];
  const rt = new SwitchCortexRuntime();
  const res = await runLiveChatWorkflow(rt, { prompt: 'scale staging-search-indexer to 4 pods in staging' });
  assert.ok(res.instance);
  assert.notEqual(res.instance!.variables['verdict'], 'auto_approve');
});


test('MCP cortex_start_workflow refuses non-executable chat', async () => {
  const { executeMcpTool } = await import('../src/mcp/server.js');
  const rt = new SwitchCortexRuntime();
  const bad = executeMcpTool(rt, 'cortex_start_workflow', {
    title: 'Who are you', initialMessage: 'quem são vocês e o que fazem', callerId: '@sre-agent', callerKind: 'agent', department: 'SRE',
  });
  assert.equal(bad.isError, true);
  const good = executeMcpTool(rt, 'cortex_start_workflow', {
    title: 'Scale indexer', initialMessage: 'scale staging-search-indexer to 4 pods in staging', callerId: '@sre-agent', callerKind: 'agent', department: 'SRE',
  });
  assert.equal(good.isError, false);
});
