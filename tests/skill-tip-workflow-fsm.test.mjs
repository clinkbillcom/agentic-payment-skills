import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SkillTipAction,
  SkillTipState,
  classifySkillListObservation,
  classifySkillTipAccountEventObservation,
  classifySkillTipObservation,
  classifySkillTipPrerequisites,
  formatSkillTipFsmMarker,
} from '../lib/skill-tip-workflow-fsm.mjs';

const identityTip = {
  target: { kind: 'identity', publisher: 'clinkpay', skillName: 'pollyreach' },
  amount: '2',
  currency: 'USD',
  explicitlyAuthorized: true,
};

const numberedTip = {
  target: { kind: 'number', number: 2 },
  amount: '2',
  currency: 'USD',
  explicitlyAuthorized: true,
};

test('skill list observation renders the required table and snapshot', () => {
  const result = classifySkillListObservation({
    ok: true,
    data: [
      { Number: 2, publisher: 'clinkpay', name: 'Polly|Reach', skillId: 'skill_2' },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_READY);
  assert.equal(result.action, SkillTipAction.RETURN_SKILL_TABLE);
  assert.match(result.table, /\| 序号 \| 发布者 \| Skill 名称 \| skill_id \|/u);
  assert.match(result.table, /\| 2 \| clinkpay \| Polly\\\|Reach \| skill_2 \|/u);
  assert.deepEqual(result.snapshot.rows[0], {
    number: 2,
    publisher: 'clinkpay',
    skillName: 'Polly|Reach',
    skillId: 'skill_2',
  });
});

test('skill list observation reads a JSON stdout envelope', () => {
  const result = classifySkillListObservation({
    stdout: JSON.stringify({
      ok: true,
      data: [{ Number: 1, publisher: 'acme', name: 'Demo', skillId: 'skill_1' }],
    }),
  });

  assert.equal(result.action, SkillTipAction.RETURN_SKILL_TABLE);
  assert.equal(result.snapshot.rows[0].number, 1);
});

test('skill list observation returns an empty result without error', () => {
  const result = classifySkillListObservation({ ok: true, data: [] });

  assert.equal(result.state, SkillTipState.TIP_LIST_EMPTY);
  assert.equal(result.action, SkillTipAction.RETURN_EMPTY_SKILL_LIST);
  assert.equal(result.terminal, true);
});

test('skill list observation fails closed for malformed rows', () => {
  const result = classifySkillListObservation({
    ok: true,
    data: [{ Number: 1, publisher: 'acme', name: 'Demo' }],
  });

  assert.equal(result.state, SkillTipState.TIP_ERROR);
  assert.equal(result.action, SkillTipAction.SURFACE_ERROR);
  assert.equal(result.reason, 'invalid_skill_list_row');
});

test('identity tip prerequisites build the identity command', () => {
  const result = classifySkillTipPrerequisites({ tip: identityTip });

  assert.equal(result.state, SkillTipState.TIP_EXECUTION_READY);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP);
  assert.equal(
    result.command,
    'clink-cli skills tip --publisher clinkpay --name pollyreach --amount 2 --format json',
  );
});

test('Number tip requires a previously displayed list snapshot', () => {
  const result = classifySkillTipPrerequisites({ tip: numberedTip });

  assert.equal(result.state, SkillTipState.TIP_INPUT_REQUIRED);
  assert.equal(result.action, SkillTipAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['skillListSnapshot']);
});

test('Number tip asks for a fresh list before execution', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    listedRows: [{ number: 2, publisher: 'clinkpay', skillName: 'PollyReach', skillId: 'skill_2' }],
  });

  assert.equal(result.state, SkillTipState.TIP_NUMBER_REFRESH_REQUIRED);
  assert.equal(result.action, SkillTipAction.REFRESH_SKILL_LIST);
});

test('Number tip stops for reauthorization when the row changed', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    listedRows: [{ number: 2, publisher: 'clinkpay', skillName: 'Old', skillId: 'old' }],
    refreshedRows: [{ number: 2, publisher: 'clinkpay', skillName: 'New', skillId: 'new' }],
  });

  assert.equal(result.state, SkillTipState.TIP_NUMBER_CHANGED);
  assert.equal(result.action, SkillTipAction.ASK_FOR_REAUTHORIZATION);
  assert.equal(result.terminal, false);
});

test('Number tip builds the Number command after snapshot verification', () => {
  const row = { number: 2, publisher: 'clinkpay', skillName: 'PollyReach', skillId: 'skill_2' };
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    listedRows: [row],
    refreshedRows: [{ ...row }],
  });

  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP);
  assert.equal(result.command, 'clink-cli skills tip --number 2 --amount 2 --format json');
  assert.deepEqual(result.resolvedTarget, row);
});

test('tip prerequisites reject missing authorization and unsupported currency', () => {
  const unauthorized = classifySkillTipPrerequisites({
    tip: { ...identityTip, explicitlyAuthorized: false },
  });
  assert.deepEqual(unauthorized.missing, ['authorization']);

  const nonUsd = classifySkillTipPrerequisites({
    tip: { ...identityTip, currency: 'EUR' },
  });
  assert.equal(nonUsd.reason, 'skill_tip_currency_unsupported');
});

test('tip prerequisites require an explicit normalized currency', () => {
  const { currency: _currency, ...withoutCurrency } = identityTip;
  const result = classifySkillTipPrerequisites({ tip: withoutCurrency });

  assert.equal(result.state, SkillTipState.TIP_INPUT_REQUIRED);
  assert.deepEqual(result.missing, ['currency']);
});

test('synchronous paid agent pay starts optional account event monitoring', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        merchantId: 'mcht_1',
        amount: 2,
        currency: 'USD',
        payment: { orderId: 'order_1', status: 1 },
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_SUCCEEDED);
  assert.equal(result.action, SkillTipAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, false);
  assert.deepEqual(result.expectedResource, { orderId: 'order_1', merchantId: 'mcht_1' });
  assert.deepEqual(result.pollCommands, [
    'clink-cli events poll --type account-created --max-wait 60 --format json',
    'clink-cli events poll --type account-reloaded --max-wait 60 --format json',
  ]);
});

test('tip observation reads the first result envelope before a built-in watch envelope', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    stdout: [
      JSON.stringify({ ok: true, data: { status: 'payment_failed', payment: { status: 3 } } }),
      JSON.stringify({ ok: true, data: { events: [{ type: 'agent_order.failed' }] } }),
    ].join('\n'),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_FAILED);
});

test('authorization pending returns the Passkey continuation without polling accounts', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'authorization_pending',
        instructionId: 'ins_1',
        passkeyUrl: 'https://agent.example/passkey',
        resumeCommand: 'clink-cli skills tip --publisher clinkpay --name PollyReach --amount 2 --format json',
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_AUTHORIZATION_PENDING);
  assert.equal(result.action, SkillTipAction.SEND_PASSKEY_AND_WAIT);
  assert.equal(result.paymentStatus, 'NOT_PAID');
  assert.equal(result.pollCommands, undefined);
});

test('payment failure stops without account polling', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { status: 'payment_failed', payment: { status: 3 } } }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_FAILED);
  assert.equal(result.action, SkillTipAction.RETURN_TIP_FAILURE);
  assert.equal(result.paymentStatus, 'FAILED');
  assert.equal(result.terminal, true);
});

test('3DS required waits for the existing order event flow', () => {
  const result = classifySkillTipObservation({
    exitCode: 7,
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'three_ds_required',
        redirectUrl: 'https://3ds.example/auth',
        payment: { orderId: 'order_3ds', status: 3 },
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_3DS_REQUIRED);
  assert.equal(result.action, SkillTipAction.SEND_3DS_AND_WAIT_EVENT);
  assert.equal(result.paymentStatus, 'PENDING_3DS');
});

test('exit code 6 is unknown and never starts a retry or account poll', () => {
  const result = classifySkillTipObservation({ exitCode: 6, stderr: '{"ok":false}' });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_UNKNOWN);
  assert.equal(result.action, SkillTipAction.VERIFY_BEFORE_RETRY);
  assert.equal(result.paymentStatus, 'UNKNOWN');
  assert.equal(result.terminal, false);
});

test('paid status without synchronous agent pay success is rejected', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { status: 'paid', payment: { status: 3 } } }),
  });

  assert.equal(result.state, SkillTipState.TIP_ERROR);
  assert.equal(result.reason, 'paid_without_agent_pay_success');
});

test('account-created enriches an already paid tip', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', matched: true, event: { type: 'account-created' } },
      { eventType: 'account-reloaded', timedOut: true },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_CREATED);
  assert.equal(result.action, SkillTipAction.RETURN_TIP_SUCCESS);
  assert.equal(result.accountEventStatus, 'CONFIRMED_CREATED');
  assert.equal(result.paymentStatus, 'PAID');
});

test('account-reloaded enriches an already paid tip', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{ eventType: 'account-reloaded', matched: true }],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_RELOADED);
  assert.equal(result.accountEventStatus, 'CONFIRMED_RELOADED');
});

test('optional account event timeouts preserve payment success', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', timedOut: true },
      { eventType: 'account-reloaded', timedOut: true },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_NOT_OBSERVED);
  assert.equal(result.action, SkillTipAction.RETURN_TIP_SUCCESS_WITHOUT_ACCOUNT_EVENT);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.accountEventStatus, 'NOT_OBSERVED');
  assert.equal(result.terminal, true);
});

test('optional account event aggregation waits for the sibling poll', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{ eventType: 'account-created', timedOut: true }],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_WAITING);
  assert.equal(result.action, SkillTipAction.WAIT_OPTIONAL_ACCOUNT_EVENT);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, false);
});

test('one optional poll error waits for the sibling before returning a warning', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{ eventType: 'account-created', error: { message: 'network' } }],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_WAITING);
  assert.equal(result.action, SkillTipAction.WAIT_OPTIONAL_ACCOUNT_EVENT);
  assert.equal(result.terminal, false);
});

test('optional account poll errors preserve payment success with a warning', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', error: { message: 'network' } },
      { eventType: 'account-reloaded', timedOut: true },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_POLL_ERROR);
  assert.equal(result.action, SkillTipAction.RETURN_TIP_SUCCESS_WITH_WARNING);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.accountEventStatus, 'POLL_ERROR');
});

test('skill tip marker uses the shared marker format', () => {
  const marker = formatSkillTipFsmMarker({
    state: SkillTipState.TIP_PAYMENT_SUCCEEDED,
    action: SkillTipAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH,
    reason: 'agent_pay_sync_succeeded',
  });

  assert.equal(
    marker,
    '[SKILL_TIP_FSM] state=TIP_PAYMENT_SUCCEEDED action=START_OPTIONAL_ACCOUNT_EVENT_WATCH reason=agent_pay_sync_succeeded',
  );
});
