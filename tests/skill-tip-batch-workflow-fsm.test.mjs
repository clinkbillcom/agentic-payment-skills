import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SkillTipBatchAction,
  SkillTipBatchState,
  classifySkillTipBatchPrerequisites,
  formatSkillTipBatchFsmMarker,
} from '../lib/skill-tip-batch-workflow-fsm.mjs';

const NOW = Date.parse('2026-07-16T10:00:00.000Z');
const identity = {
  userId: 'user_1',
  conversationId: 'conversation_1',
  environment: 'sandbox',
};

function workflowContext(overrides = {}) {
  return {
    now: NOW,
    ...identity,
    ...overrides,
  };
}

function tippableSnapshot(overrides = {}) {
  const displayedAt = new Date(NOW - 60_000).toISOString();
  return {
    snapshotId: 'snapshot_1',
    scope: 'tippable',
    ...identity,
    listedAt: displayedAt,
    displayedAt,
    rows: [
      {
        number: 1,
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_1',
        versionNo: 'v1.2.3',
      },
      {
        number: 2,
        publisher: 'clinkpay',
        skillName: 'ModelMax',
        skillId: 'skill_2',
        versionNo: 'v2.0.0',
      },
    ],
    ...overrides,
  };
}

function sharedAmountBatch(overrides = {}) {
  return {
    targets: [
      { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach' },
      { kind: 'identity', publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2.25',
    currency: 'USD',
    explicitlyAuthorized: true,
    ...overrides,
  };
}

function pendingBatch(overrides = {}) {
  return {
    batchId: 'batch_1',
    status: 'AWAITING_CONFIRMATION',
    items: [
      {
        itemId: 'batch_1:1',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        amount: '2',
        currency: 'USD',
      },
      {
        itemId: 'batch_1:2',
        publisher: 'clinkpay',
        skillName: 'ModelMax',
        amount: '5',
        currency: 'USD',
      },
    ],
    ignoredDuplicates: [],
    authorizedTotal: '7',
    currency: 'USD',
    ...identity,
    createdAt: new Date(NOW - 1000).toISOString(),
    expiresAt: new Date(NOW + 60_000).toISOString(),
    ...overrides,
  };
}

test('shared amount expands to every target and uses an exact decimal total', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: sharedAmountBatch(),
    batchId: 'batch_1',
    context: workflowContext(),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_CONFIRMATION_REQUIRED);
  assert.equal(result.action, SkillTipBatchAction.ASK_FOR_TIP_BATCH_CONFIRMATION);
  assert.equal(result.command, undefined);
  assert.equal(result.pendingTipBatchConfirmation.authorizedTotal, '4.5');
  assert.deepEqual(
    result.pendingTipBatchConfirmation.items.map(({ publisher, skillName, amount }) => ({
      publisher,
      skillName,
      amount,
    })),
    [
      { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2.25' },
      { publisher: 'clinkpay', skillName: 'ModelMax', amount: '2.25' },
    ],
  );
});

test('per-item amounts are preserved and override the shared fallback', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: {
      tips: [
        { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2' },
        { publisher: 'clinkpay', skillName: 'ModelMax', amount: '5.50' },
      ],
      amount: '9',
      currency: 'USD',
      explicitlyAuthorized: true,
    },
    batchId: 'batch_1',
    context: workflowContext(),
  });

  assert.equal(result.pendingTipBatchConfirmation.authorizedTotal, '7.5');
  assert.deepEqual(
    result.pendingTipBatchConfirmation.items.map((item) => item.amount),
    ['2', '5.5'],
  );
});

test('tips without item amounts use the shared amount fallback', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: {
      tips: [
        { publisher: 'clinkpay', skillName: 'PollyReach' },
        { publisher: 'clinkpay', skillName: 'ModelMax', amount: '5' },
      ],
      amount: '3',
      currency: 'USD',
      explicitlyAuthorized: true,
    },
    batchId: 'batch_1',
    context: workflowContext(),
  });

  assert.deepEqual(
    result.pendingTipBatchConfirmation.items.map((item) => item.amount),
    ['3', '5'],
  );
  assert.equal(result.pendingTipBatchConfirmation.authorizedTotal, '8');
});

test('duplicate identities keep the first spelling and amount without accumulation', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: {
      tips: [
        { publisher: 'ClinkPay', skillName: 'PollyReach', amount: '2' },
        { publisher: ' clinkpay ', skillName: ' pollyreach ', amount: '9' },
        { publisher: 'clinkpay', skillName: 'ModelMax', amount: '5' },
      ],
      currency: 'USD',
      explicitlyAuthorized: true,
    },
    batchId: 'batch_1',
    context: workflowContext(),
  });

  assert.deepEqual(
    result.pendingTipBatchConfirmation.items.map(({ publisher, skillName, amount }) => ({
      publisher,
      skillName,
      amount,
    })),
    [
      { publisher: 'ClinkPay', skillName: 'PollyReach', amount: '2' },
      { publisher: 'clinkpay', skillName: 'ModelMax', amount: '5' },
    ],
  );
  assert.deepEqual(result.pendingTipBatchConfirmation.ignoredDuplicates, [{
    duplicateIndex: 2,
    keptIndex: 1,
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    ignoredAmount: '9',
  }]);
  assert.equal(result.pendingTipBatchConfirmation.authorizedTotal, '7');
});

test('every Number resolves from one recent tippable snapshot before confirmation', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: {
      targets: [
        { kind: 'number', number: 1 },
        { kind: 'number', number: 2 },
      ],
      amount: '2',
      currency: 'USD',
      explicitlyAuthorized: true,
    },
    batchId: 'batch_1',
    context: workflowContext({ skillListSnapshots: [tippableSnapshot()] }),
  });

  assert.deepEqual(
    result.pendingTipBatchConfirmation.items.map((item) => ({
      publisher: item.publisher,
      skillName: item.skillName,
      skillId: item.skillId,
      versionNo: item.versionNo,
    })),
    [
      {
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_1',
        versionNo: undefined,
      },
      {
        publisher: 'clinkpay',
        skillName: 'ModelMax',
        skillId: 'skill_2',
        versionNo: undefined,
      },
    ],
  );
  assert.equal(result.pendingTipBatchConfirmation.snapshotId, 'snapshot_1');
});

test('one invalid item prevents confirmation for the complete batch', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: {
      tips: [
        { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2' },
        { publisher: 'clinkpay', skillName: '', amount: '5' },
      ],
      currency: 'USD',
      explicitlyAuthorized: true,
    },
    batchId: 'batch_1',
    context: workflowContext(),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_INPUT_REQUIRED);
  assert.equal(result.action, SkillTipBatchAction.ASK_FOR_SKILL_TIP_BATCH_INPUT);
  assert.equal(result.reason, 'skill_tip_batch_item_invalid');
  assert.equal(result.pendingTipBatchConfirmation, undefined);
  assert.equal(result.command, undefined);
});

test('one unresolved Number prevents confirmation for the complete batch', () => {
  const result = classifySkillTipBatchPrerequisites({
    batch: {
      targets: [
        { kind: 'number', number: 1 },
        { kind: 'number', number: 3 },
      ],
      amount: '2',
      currency: 'USD',
      explicitlyAuthorized: true,
    },
    batchId: 'batch_1',
    context: workflowContext({ skillListSnapshots: [tippableSnapshot()] }),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_INPUT_REQUIRED);
  assert.equal(result.reason, 'skill_tip_batch_number_unresolved');
  assert.equal(result.pendingTipBatchConfirmation, undefined);
});

test('batch rejects unsupported currency, missing authorization, and a missing batch id', () => {
  const unsupported = classifySkillTipBatchPrerequisites({
    batch: sharedAmountBatch({ currency: 'EUR' }),
    batchId: 'batch_1',
    context: workflowContext(),
  });
  assert.equal(unsupported.reason, 'skill_tip_batch_currency_unsupported');

  const unauthorized = classifySkillTipBatchPrerequisites({
    batch: sharedAmountBatch({ explicitlyAuthorized: false }),
    batchId: 'batch_1',
    context: workflowContext(),
  });
  assert.deepEqual(unauthorized.missing, ['authorization']);

  const noBatchId = classifySkillTipBatchPrerequisites({
    batch: sharedAmountBatch(),
    context: workflowContext(),
  });
  assert.deepEqual(noBatchId.missing, ['batchId']);
});

test('confirmation requires an atomic pending transition before any command', () => {
  const result = classifySkillTipBatchPrerequisites({
    confirmation: 'CONFIRMED',
    context: workflowContext({ pendingTipBatchConfirmation: pendingBatch() }),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_CONFIRMATION_ACCEPTED);
  assert.equal(result.action, SkillTipBatchAction.CLAIM_PENDING_TIP_BATCH);
  assert.equal(result.command, undefined);
  assert.deepEqual(result.pendingTransition, {
    batchId: 'batch_1',
    from: 'AWAITING_CONFIRMATION',
    to: 'EXECUTING',
  });
});

test('claimed confirmation freezes commands and returns only the first payment call', () => {
  const result = classifySkillTipBatchPrerequisites({
    confirmation: 'CLAIMED',
    context: workflowContext({
      pendingTipBatchConfirmation: pendingBatch({ status: 'EXECUTING' }),
    }),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_EXECUTION_READY);
  assert.equal(result.action, SkillTipBatchAction.RUN_NEXT_SKILL_TIP);
  assert.equal(
    result.command,
    'clink-cli skills tip --publisher clinkpay --name PollyReach --amount 2 --format json',
  );
  assert.equal(result.progress.currentIndex, 0);
  assert.equal(result.progress.executionItems.length, 2);
  assert.deepEqual(result.progress.executionItems[0].expectedTip, {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    amount: '2',
    currency: 'USD',
  });
});

test('cancelled, replayed, expired, and cross-environment confirmations emit no command', () => {
  const cases = [
    {
      confirmation: 'CANCELLED',
      pending: pendingBatch(),
      action: SkillTipBatchAction.CANCEL_PENDING_TIP_BATCH,
    },
    {
      confirmation: 'CONFIRMED',
      pending: pendingBatch({ status: 'CONSUMED' }),
      action: SkillTipBatchAction.RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED,
    },
    {
      confirmation: 'CONFIRMED',
      pending: pendingBatch({ expiresAt: new Date(NOW - 1).toISOString() }),
      action: SkillTipBatchAction.ASK_FOR_SKILL_TIP_BATCH_INPUT,
    },
    {
      confirmation: 'CONFIRMED',
      pending: pendingBatch({ environment: 'production' }),
      action: SkillTipBatchAction.ASK_FOR_SKILL_TIP_BATCH_INPUT,
    },
  ];

  for (const item of cases) {
    const result = classifySkillTipBatchPrerequisites({
      confirmation: item.confirmation,
      context: workflowContext({ pendingTipBatchConfirmation: item.pending }),
    });
    assert.equal(result.action, item.action);
    assert.equal(result.command, undefined);
  }
});

test('batch marker uses the shared workflow marker format', () => {
  assert.equal(
    formatSkillTipBatchFsmMarker({
      state: SkillTipBatchState.BATCH_EXECUTION_READY,
      action: SkillTipBatchAction.RUN_NEXT_SKILL_TIP,
      reason: 'claimed_skill_tip_batch_ready',
    }),
    '[SKILL_TIP_BATCH_FSM] state=BATCH_EXECUTION_READY action=RUN_NEXT_SKILL_TIP reason=claimed_skill_tip_batch_ready',
  );
});
