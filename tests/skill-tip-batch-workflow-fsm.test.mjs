import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SkillTipBatchAction,
  SkillTipBatchState,
  classifySkillTipBatchObservation,
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

function claimedProgress(overrides = {}) {
  const result = classifySkillTipBatchPrerequisites({
    confirmation: 'CLAIMED',
    context: workflowContext({
      pendingTipBatchConfirmation: pendingBatch({ status: 'EXECUTING', ...overrides }),
    }),
  });
  assert.equal(result.state, SkillTipBatchState.BATCH_EXECUTION_READY);
  return result.progress;
}

function paidObservation({
  publisher = 'clinkpay',
  skillName = 'PollyReach',
  skillId,
  amount = 2,
  orderId = 'order_1',
} = {}) {
  return {
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher,
        skillName,
        ...(skillId ? { skillId } : {}),
        merchantId: `merchant_${skillName}`,
        amount,
        currency: 'USD',
        payment: { orderId, status: 1 },
      },
    }),
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

test('a failed item is recorded and the next frozen payment command still runs', () => {
  const result = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: {
      exitCode: 5,
      stdout: JSON.stringify({
        ok: true,
        data: { status: 'payment_failed', payment: { status: 3 } },
      }),
    },
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_IN_PROGRESS);
  assert.equal(result.action, SkillTipBatchAction.RUN_NEXT_SKILL_TIP);
  assert.equal(result.progress.currentIndex, 1);
  assert.equal(result.progress.results[0].paymentStatus, 'FAILED');
  assert.equal(result.progress.results[0].itemId, 'batch_1:1');
  assert.equal(
    result.command,
    'clink-cli skills tip --publisher clinkpay --name ModelMax --amount 5 --format json',
  );
});

test('an unknown item is not retried and the next frozen payment command still runs', () => {
  const result = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: {
      exitCode: 6,
      stderr: JSON.stringify({ ok: false, error: { message: 'timeout' } }),
    },
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_IN_PROGRESS);
  assert.equal(result.action, SkillTipBatchAction.RUN_NEXT_SKILL_TIP);
  assert.equal(result.progress.results[0].paymentStatus, 'UNKNOWN');
  assert.equal(result.progress.currentIndex, 1);
  assert.doesNotMatch(result.command, /PollyReach/u);
});

test('a synchronously paid item advances and exposes non-blocking optional account watches', () => {
  const result = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: paidObservation(),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_IN_PROGRESS);
  assert.equal(result.progress.results[0].paymentStatus, 'PAID');
  assert.equal(result.progress.currentIndex, 1);
  assert.deepEqual(result.optionalAccountWatch.pollCommands, [
    'clink-cli events poll --type account-created --max-wait 60 --format json',
    'clink-cli events poll --type account-reloaded --max-wait 60 --format json',
  ]);
  assert.equal(result.optionalAccountWatch.expectedResource.orderId, 'order_1');
  assert.match(result.command, /--name ModelMax/u);
});

test('authorization and 3DS continuations block later payment submission', () => {
  const authorization = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          status: 'authorization_pending',
          passkeyUrl: 'https://agent.example/passkey',
        },
      }),
    },
  });
  assert.equal(authorization.state, SkillTipBatchState.BATCH_ITEM_CONTINUATION_REQUIRED);
  assert.equal(authorization.action, SkillTipBatchAction.WAIT_FOR_SKILL_TIP_ITEM);
  assert.equal(authorization.progress.currentIndex, 0);
  assert.equal(authorization.command, undefined);

  const threeDs = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: {
      exitCode: 7,
      stdout: JSON.stringify({
        ok: true,
        data: {
          status: 'three_ds_required',
          redirectUrl: 'https://agent.example/3ds',
          payment: { orderId: 'order_3ds' },
        },
      }),
    },
  });
  assert.equal(threeDs.state, SkillTipBatchState.BATCH_ITEM_CONTINUATION_REQUIRED);
  assert.equal(threeDs.action, SkillTipBatchAction.WAIT_FOR_SKILL_TIP_ITEM);
  assert.equal(threeDs.progress.currentIndex, 0);
  assert.equal(threeDs.command, undefined);
});

test('all paid items return a completed ALL_PAID aggregate in frozen order', () => {
  const first = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: paidObservation(),
  });
  const completed = classifySkillTipBatchObservation({
    progress: first.progress,
    observation: paidObservation({
      skillName: 'ModelMax',
      amount: 5,
      orderId: 'order_2',
    }),
  });

  assert.equal(completed.state, SkillTipBatchState.BATCH_COMPLETED);
  assert.equal(completed.action, SkillTipBatchAction.RETURN_SKILL_TIP_BATCH_RESULT);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.aggregateOutcome, 'ALL_PAID');
  assert.deepEqual(completed.counts, {
    total: 2,
    paid: 2,
    failed: 0,
    unknown: 0,
  });
  assert.deepEqual(completed.items.map((item) => item.skillName), ['PollyReach', 'ModelMax']);
  assert.equal(completed.command, undefined);
});

test('mixed paid and unknown items return PARTIAL without retrying the unknown item', () => {
  const first = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: paidObservation(),
  });
  const completed = classifySkillTipBatchObservation({
    progress: first.progress,
    observation: {
      exitCode: 6,
      stderr: JSON.stringify({ ok: false, error: { message: 'timeout' } }),
    },
  });

  assert.equal(completed.aggregateOutcome, 'PARTIAL');
  assert.deepEqual(completed.counts, {
    total: 2,
    paid: 1,
    failed: 0,
    unknown: 1,
  });
  assert.equal(completed.items[1].paymentStatus, 'UNKNOWN');
});

test('failed and unknown items return NONE_PAID after every item is attempted', () => {
  const first = classifySkillTipBatchObservation({
    progress: claimedProgress(),
    observation: {
      exitCode: 5,
      stdout: JSON.stringify({
        ok: true,
        data: { status: 'payment_failed', payment: { status: 3 } },
      }),
    },
  });
  const completed = classifySkillTipBatchObservation({
    progress: first.progress,
    observation: {
      exitCode: 6,
      stderr: JSON.stringify({ ok: false, error: { message: 'unknown' } }),
    },
  });

  assert.equal(completed.aggregateOutcome, 'NONE_PAID');
  assert.deepEqual(completed.counts, {
    total: 2,
    paid: 0,
    failed: 1,
    unknown: 1,
  });
});

test('invalid or replayed progress never emits another payment command', () => {
  const completedProgress = {
    ...claimedProgress(),
    status: 'COMPLETED',
    currentIndex: 2,
  };
  const result = classifySkillTipBatchObservation({
    progress: completedProgress,
    observation: paidObservation(),
  });

  assert.equal(result.state, SkillTipBatchState.BATCH_INPUT_REQUIRED);
  assert.equal(result.action, SkillTipBatchAction.ASK_FOR_SKILL_TIP_BATCH_INPUT);
  assert.equal(result.command, undefined);
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
