import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');

const referenceDir = new URL('../references/', import.meta.url);
const referenceText = (await Promise.all(
  (await readdir(referenceDir))
    .filter((name) => name.endsWith('.md'))
    .map((name) => readFile(new URL(name, referenceDir), 'utf8')),
)).join('\n');

const libDir = new URL('../lib/', import.meta.url);
const actions = [];
for (const name of (await readdir(libDir)).filter((f) => f.endsWith('.mjs')).sort()) {
  const module = await import(new URL(name, libDir).href);
  for (const [exportName, value] of Object.entries(module)) {
    if (!/Action$/u.test(exportName) || typeof value !== 'object' || value === null) continue;
    for (const action of Object.values(value)) {
      actions.push({ file: name, exportName, action });
    }
  }
}

function isDocumented(action) {
  return skill.includes(`\`${action}\``) || referenceText.includes(action);
}

// An FSM action with no written contract strands the agent mid-workflow: the FSM hands back an
// action name, the agent looks it up, finds nothing, and stops — which is how an activated
// purchase instruction once ended a turn without ever reaching checkout. These are the actions
// still undocumented. The list may shrink, never grow.
const UNDOCUMENTED_ACTIONS = new Set([
  'ASK_FOR_INPUT',
  'ASK_FOR_SKILL_INSTALL_INPUT',
  'ASK_FOR_SKILL_TIP_BATCH_INPUT',
  'ASK_FOR_SKILL_TIP_INPUT',
  'CACHE_ONLY',
  'CANCEL_PENDING_SKILL_INSTALL',
  'CANCEL_PENDING_SKILL_TIP',
  'CANCEL_PENDING_SKILL_TIP_BATCH',
  'CANCEL_PENDING_TIP_BATCH',
  'CONTINUE_SKILL_TIP_BATCH',
  'IGNORE_INTERMEDIATE',
  'LOG_ONLY',
  'MARK_STRONG_AUTH_READY_AND_RETURN',
  'RESUME_SKILL_INSTALL_WORKFLOW',
  'RESUME_SKILL_TIP_BATCH_WORKFLOW',
  'RESUME_SKILL_TIP_WORKFLOW',
  'RETURN_AGENT_PAY_ACCOUNT_AMBIGUOUS',
  'RETURN_AGENT_PAY_ACCOUNT_EVENT',
  'RETURN_EMPTY_SKILL_LIST',
  'RETURN_FAILURE_AND_CLEAR_PENDING',
  'RETURN_INSTALL_FAILURE',
  'RETURN_PENDING_INSTALL_ALREADY_HANDLED',
  'RETURN_PENDING_TIP_ALREADY_HANDLED',
  'RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED',
  'RETURN_PENDING_WITH_RESUME',
  'RETURN_REFUND_FINAL',
  'RETURN_RISK_RULE_UPDATED',
  'RETURN_SKILL_TIP_ACCOUNT_EVENT',
  'RETURN_TIP_FAILURE',
  'RUN_PAY',
  'RUN_PRECHECK',
  'RUN_SKILL_INSTALL_WORKFLOW',
  'RUN_SKILL_TIP_BATCH_WORKFLOW',
  'RUN_SKILL_TIP_WORKFLOW',
  'START_CARD_BINDING',
  'START_EVENT_POLL',
  'UPDATE_CACHE_AND_RETURN',
]);

test('every FSM action enum is discoverable', () => {
  assert.ok(actions.length > 100, `expected to scan many actions, found ${actions.length}`);
});

test('no new FSM action ships without a documented contract', () => {
  const undocumented = actions
    .filter(({ action }) => !isDocumented(action) && !UNDOCUMENTED_ACTIONS.has(action))
    .map(({ file, action }) => `${file} :: ${action}`);

  assert.deepEqual(
    undocumented,
    [],
    `these FSM actions have no contract in SKILL.md or references/:\n  ${undocumented.join('\n  ')}`,
  );
});

test('the undocumented allowlist never grows stale', () => {
  const allActions = new Set(actions.map(({ action }) => action));
  const stale = [...UNDOCUMENTED_ACTIONS].filter((action) => !allActions.has(action));
  assert.deepEqual(stale, [], `allowlisted actions no longer exist in lib/: ${stale.join(', ')}`);

  const nowDocumented = [...UNDOCUMENTED_ACTIONS].filter((action) => isDocumented(action));
  assert.deepEqual(
    nowDocumented,
    [],
    `these actions are documented now — remove them from UNDOCUMENTED_ACTIONS: ${nowDocumented.join(', ')}`,
  );
});

test('the workflow steps that strand a payment mid-flight stay documented', () => {
  // Each of these ended a real turn early when its contract was missing.
  for (const action of [
    'RESUME_AUTHORIZED_PAYMENT',
    'CREATE_INTERNAL_UCP_CHECKOUT',
    'CREATE_EXTERNAL_UCP_CHECKOUT',
    'COMPLETE_CHECKOUT',
    'RUN_UCP_CHECKOUT_WORKFLOW',
  ]) {
    assert.ok(skill.includes(`\`${action}\``), `${action} must have a row in the SKILL.md action table`);
  }

  assert.match(skill, /RESUME_AUTHORIZED_PAYMENT[\s\S]*?Resume, never restart/u);
  assert.doesNotMatch(skill, /resume_pending_payment_intent/u);
});
