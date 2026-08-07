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

const NOW = Date.parse('2026-07-15T12:00:00.000Z');
const workflowIdentity = {
  userId: 'user_1',
  conversationId: 'conversation_1',
  environment: 'sandbox',
};

function displayedSnapshot({
  ageMs = 60 * 60 * 1000,
  scope = 'tippable',
  environment = workflowIdentity.environment,
  rows = [{
    number: 2,
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skillId: 'skill_2',
    versionNo: 'v1.2.3',
  }],
} = {}) {
  const listedAt = new Date(NOW - ageMs).toISOString();
  return {
    snapshotId: `snapshot_${ageMs}`,
    scope,
    ...workflowIdentity,
    environment,
    listedAt,
    displayedAt: listedAt,
    rows,
  };
}

function workflowContext(overrides = {}) {
  return {
    now: NOW,
    ...workflowIdentity,
    ...overrides,
  };
}

test('skill list observation renders a Chinese three-column table and keeps hidden snapshot metadata', () => {
  const result = classifySkillListObservation({
    ok: true,
    data: [
      {
        Number: 2,
        publisher: 'clinkpay',
        name: 'Polly|Reach',
        skillId: 'skill_2',
        versionNo: 'v1.2.3',
      },
    ],
  }, {
    language: 'zh-CN',
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_READY);
  assert.equal(result.action, SkillTipAction.RETURN_SKILL_TABLE);
  assert.equal(result.snapshot.scope, 'tippable');
  assert.equal(result.table, [
    '| 编号 | 发布者 | 技能名称 |',
    '| ---: | --- | --- |',
    '| 2 | clinkpay | Polly\\|Reach |',
  ].join('\n'));
  assert.deepEqual(result.snapshot.rows[0], {
    number: 2,
    publisher: 'clinkpay',
    skillName: 'Polly|Reach',
    skillId: 'skill_2',
    versionNo: 'v1.2.3',
  });
});

test('skill list observation renders all table headers in English', () => {
  const result = classifySkillListObservation({
    ok: true,
    data: [{ Number: 1, publisher: 'acme', name: 'Demo', skillId: 'skill_1' }],
  }, {
    language: 'en-US',
  });

  assert.equal(result.table, [
    '| Number | Publisher | Skill Name |',
    '| ---: | --- | --- |',
    '| 1 | acme | Demo |',
  ].join('\n'));
});

test('skill list observation accepts one localized header set for another user language', () => {
  const result = classifySkillListObservation({
    ok: true,
    data: [{ Number: 1, publisher: 'acme', name: 'Demo', skillId: 'skill_1' }],
  }, {
    headers: {
      number: 'Número',
      publisher: 'Publicador',
      skillName: 'Nombre de habilidad',
    },
  });

  assert.equal(result.table, [
    '| Número | Publicador | Nombre de habilidad |',
    '| ---: | --- | --- |',
    '| 1 | acme | Demo |',
  ].join('\n'));
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

test('skill list observation rejects duplicate Number rows', () => {
  const result = classifySkillListObservation({
    ok: true,
    data: [
      { Number: 2, publisher: 'acme', name: 'One', skillId: 'skill_1' },
      { Number: 2, publisher: 'acme', name: 'Two', skillId: 'skill_2' },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_ERROR);
  assert.equal(result.action, SkillTipAction.SURFACE_ERROR);
  assert.equal(result.reason, 'invalid_skill_list_row');
  assert.equal(result.table, undefined);
});

test('identity tip prerequisites build the identity command', () => {
  const result = classifySkillTipPrerequisites({ tip: identityTip });

  assert.equal(result.state, SkillTipState.TIP_EXECUTION_READY);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP);
  assert.equal(
    result.command,
    'clink skills tip --publisher clinkpay --name pollyreach --amount 2 --format json',
  );
  assert.deepEqual(result.expectedTip, {
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    amount: '2',
    currency: 'USD',
  });
});

test('identity tip prerequisites ignore an optional version for execution', () => {
  const result = classifySkillTipPrerequisites({
    tip: {
      ...identityTip,
      target: { ...identityTip.target, versionNo: 'v1.2.3' },
    },
  });

  assert.equal(
    result.command,
    'clink skills tip --publisher clinkpay --name pollyreach --amount 2 --format json',
  );
  assert.equal(result.resolvedTarget.versionNo, undefined);
  assert.deepEqual(result.expectedTip, {
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    amount: '2',
    currency: 'USD',
  });
});

test('Number tip without a recent displayed snapshot requests the list workflow', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext(),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP_LIST_WORKFLOW);
  assert.equal(result.command, 'clink skills list --all --tippable --format json');
  assert.deepEqual(result.tipDraft, {
    ...numberedTip,
    confirmationRequired: true,
  });
  assert.equal(result.confirmationRequired, true);
});

test('list continuation keeps confirmation required inside the tip draft', () => {
  const listRequired = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext(),
  });
  const resumed = classifySkillTipPrerequisites({
    tip: listRequired.tipDraft,
    pendingId: 'pending_1',
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ ageMs: 0 })],
    }),
  });

  assert.equal(resumed.state, SkillTipState.TIP_CONFIRMATION_REQUIRED);
  assert.equal(resumed.action, SkillTipAction.ASK_FOR_TIP_CONFIRMATION);
  assert.equal(resumed.command, undefined);
});

test('fresh list without the requested Number asks the user to select again', () => {
  const snapshot = displayedSnapshot({
    ageMs: 0,
    rows: [{
      number: 3,
      publisher: 'clinkpay',
      skillName: 'AnotherSkill',
      skillId: 'skill_3',
      versionNo: 'v2.0.0',
    }],
  });
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    pendingId: 'pending_1',
    confirmationRequired: true,
    context: workflowContext({ skillListSnapshots: [snapshot] }),
  });

  assert.equal(result.state, SkillTipState.TIP_INPUT_REQUIRED);
  assert.equal(result.action, SkillTipAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_number_not_in_fresh_list');
  assert.deepEqual(result.missing, ['available_skill_number']);
  assert.equal(result.command, undefined);
  assert.equal(result.pendingTipConfirmation, undefined);
});

test('Number tip resolves a versioned context row to a versionless identity command', () => {
  const snapshot = displayedSnapshot();
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({ skillListSnapshots: [snapshot] }),
  });

  assert.equal(result.state, SkillTipState.TIP_EXECUTION_READY);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP);
  assert.equal(
    result.command,
    'clink skills tip --publisher clinkpay --name PollyReach --amount 2 --format json',
  );
  assert.equal(result.resolvedTarget.skillId, 'skill_2');
  assert.equal(result.resolvedTarget.versionNo, undefined);
  assert.deepEqual(result.expectedTip, {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skillId: 'skill_2',
    amount: '2',
    currency: 'USD',
  });
});

test('Number tip treats a snapshot older than two hours as missing', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ ageMs: (2 * 60 * 60 * 1000) + 1 })],
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP_LIST_WORKFLOW);
});

test('Number tip accepts a snapshot exactly two hours old', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ ageMs: 2 * 60 * 60 * 1000 })],
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_EXECUTION_READY);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP);
});

test('Number tip does not reuse a snapshot from another environment', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ environment: 'production' })],
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.action, SkillTipAction.RUN_SKILL_TIP_LIST_WORKFLOW);
});

for (const [label, snapshot] of [
  ['all-list scope', displayedSnapshot({ scope: 'all' })],
  ['missing scope', { ...displayedSnapshot(), scope: undefined }],
]) {
  test(`Number tip rejects a snapshot with ${label}`, () => {
    const result = classifySkillTipPrerequisites({
      tip: numberedTip,
      context: workflowContext({ skillListSnapshots: [snapshot] }),
    });

    assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
    assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
  });
}

for (const [label, snapshotOverrides] of [
  ['user', { userId: 'user_2' }],
  ['conversation', { conversationId: 'conversation_2' }],
]) {
  test(`Number tip does not reuse a snapshot from another ${label}`, () => {
    const result = classifySkillTipPrerequisites({
      tip: numberedTip,
      context: workflowContext({
        skillListSnapshots: [{ ...displayedSnapshot(), ...snapshotOverrides }],
      }),
    });

    assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
    assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
    assert.doesNotMatch(result.command, /skills tip/u);
  });
}

test('Number tip requires the exact environment lock rather than a sandbox label', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({
      environment: 'sandbox:https://api.clinkbill.dev',
      skillListSnapshots: [displayedSnapshot({
        environment: 'sandbox:https://another-api.clinkbill.dev',
      })],
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
});

test('Number tip rejects a snapshot displayed in the future', () => {
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ ageMs: -1 })],
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
});

test('Number tip uses the newest valid displayed snapshot regardless of array order', () => {
  const older = displayedSnapshot({
    ageMs: 90 * 60 * 1000,
    rows: [{
      number: 2,
      publisher: 'old-publisher',
      skillName: 'OldSkill',
      skillId: 'skill_old',
      versionNo: 'v1',
    }],
  });
  const newer = displayedSnapshot({
    ageMs: 10 * 60 * 1000,
    rows: [{
      number: 2,
      publisher: 'new-publisher',
      skillName: 'NewSkill',
      skillId: 'skill_new',
      versionNo: 'v2',
    }],
  });
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({ skillListSnapshots: [newer, older] }),
  });

  assert.equal(result.snapshotId, newer.snapshotId);
  assert.equal(result.resolvedTarget.publisher, 'new-publisher');
  assert.equal(
    result.command,
    'clink skills tip --publisher new-publisher --name NewSkill --amount 2 --format json',
  );
});

test('Number tip does not fall back when the newest valid snapshot lacks Number', () => {
  const older = displayedSnapshot({ ageMs: 90 * 60 * 1000 });
  const newer = displayedSnapshot({
    ageMs: 10 * 60 * 1000,
    rows: [{
      number: 3,
      publisher: 'clinkpay',
      skillName: 'AnotherSkill',
      skillId: 'skill_3',
    }],
  });
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({ skillListSnapshots: [older, newer] }),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.reason, 'skill_number_not_in_recent_snapshot');
  assert.equal(result.command, 'clink skills list --all --tippable --format json');
});

test('Number tip does not fall back when the newest displayed snapshot is malformed', () => {
  const older = displayedSnapshot({ ageMs: 120_000 });
  const newer = displayedSnapshot({
    ageMs: 60_000,
    rows: [{
      number: 2,
      publisher: 'clinkpay',
      skillName: 'ChangedSkill',
      skillId: 'skill_changed',
      versionNo: 'bad version',
    }],
  });
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({ skillListSnapshots: [older, newer] }),
  });

  assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
  assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
});

for (const [label, rows] of [
  ['duplicate Number', [
    { number: 2, publisher: 'a', skillName: 'One', skillId: 'skill_1' },
    { number: 2, publisher: 'b', skillName: 'Two', skillId: 'skill_2' },
  ]],
  ['malformed row', [
    { number: 2, publisher: 'a', skillName: 'One' },
  ]],
  ['invalid version', [
    { number: 2, publisher: 'a', skillName: 'One', skillId: 'skill_1', versionNo: 'bad version' },
  ]],
]) {
  test(`Number tip rejects a stored snapshot with ${label}`, () => {
    const result = classifySkillTipPrerequisites({
      tip: numberedTip,
      context: workflowContext({
        skillListSnapshots: [displayedSnapshot({ rows })],
      }),
    });

    assert.equal(result.state, SkillTipState.TIP_LIST_REQUIRED);
    assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
    assert.doesNotMatch(result.command, /skills tip/u);
  });
}

test('freshly listed Number target creates a bound confirmation instead of paying', () => {
  const snapshot = displayedSnapshot({ ageMs: 0 });
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    pendingId: 'pending_1',
    confirmationRequired: true,
    context: workflowContext({ skillListSnapshots: [snapshot] }),
  });

  assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_REQUIRED);
  assert.equal(result.action, SkillTipAction.ASK_FOR_TIP_CONFIRMATION);
  assert.equal(result.command, undefined);
  assert.deepEqual(result.pendingTipConfirmation.resolvedTarget, {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skillId: 'skill_2',
  });
  assert.equal(result.confirmationPrompt, '确认打赏第 2 号 clinkpay/PollyReach 2 USD 吗？');
  assert.doesNotMatch(result.confirmationPrompt, /v1\.2\.3|@/u);
  assert.equal(result.pendingTipConfirmation.status, 'AWAITING_CONFIRMATION');
  assert.equal(result.pendingTipConfirmation.amount, '2');
  assert.equal(result.pendingTipConfirmation.environment, 'sandbox');
});

test('confirmation consumes the frozen identity and never re-resolves Number', () => {
  const pendingTipConfirmation = {
    pendingId: 'pending_1',
    status: 'AWAITING_CONFIRMATION',
    number: 2,
    resolvedTarget: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_2',
      versionNo: 'v1.2.3',
    },
    amount: '2',
    currency: 'USD',
    ...workflowIdentity,
    createdAt: new Date(NOW).toISOString(),
    expiresAt: new Date(NOW + (2 * 60 * 60 * 1000)).toISOString(),
  };
  const result = classifySkillTipPrerequisites({
    confirmation: 'CONFIRMED',
    context: workflowContext({ pendingTipConfirmation }),
  });

  assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_ACCEPTED);
  assert.equal(result.action, SkillTipAction.CLAIM_PENDING_TIP);
  assert.equal(result.command, undefined);
  assert.deepEqual(result.pendingTransition, {
    pendingId: 'pending_1',
    from: 'AWAITING_CONFIRMATION',
    to: 'EXECUTING',
  });

  const claimed = classifySkillTipPrerequisites({
    confirmation: 'CLAIMED',
    context: workflowContext({
      pendingTipConfirmation: { ...pendingTipConfirmation, status: 'EXECUTING' },
    }),
  });
  assert.equal(claimed.state, SkillTipState.TIP_EXECUTION_READY);
  assert.equal(claimed.action, SkillTipAction.RUN_SKILL_TIP);
  assert.equal(
    claimed.command,
    'clink skills tip --publisher clinkpay --name PollyReach --amount 2 --format json',
  );
  assert.equal(claimed.resolvedTarget.versionNo, undefined);
  assert.deepEqual(claimed.expectedTip, {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skillId: 'skill_2',
    amount: '2',
    currency: 'USD',
  });
});

test('confirmation without a pending id never requests an atomic claim', () => {
  const result = classifySkillTipPrerequisites({
    confirmation: 'CONFIRMED',
    context: workflowContext({
      pendingTipConfirmation: {
        status: 'AWAITING_CONFIRMATION',
        ...workflowIdentity,
        createdAt: new Date(NOW).toISOString(),
        expiresAt: new Date(NOW + 1000).toISOString(),
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_INPUT_REQUIRED);
  assert.equal(result.action, SkillTipAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'invalid_pending_skill_tip_confirmation');
  assert.equal(result.pendingTransition, undefined);
  assert.equal(result.command, undefined);
});

test('claimed Number confirmation requires the frozen skill id', () => {
  const result = classifySkillTipPrerequisites({
    confirmation: 'CLAIMED',
    context: workflowContext({
      pendingTipConfirmation: {
        pendingId: 'pending_1',
        status: 'EXECUTING',
        number: 2,
        resolvedTarget: {
          publisher: 'clinkpay',
          skillName: 'PollyReach',
          versionNo: 'v1.2.3',
        },
        amount: '2',
        currency: 'USD',
        ...workflowIdentity,
        createdAt: new Date(NOW).toISOString(),
        expiresAt: new Date(NOW + 1000).toISOString(),
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_INPUT_REQUIRED);
  assert.equal(result.action, SkillTipAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'invalid_pending_skill_tip_confirmation');
  assert.equal(result.command, undefined);
});

test('cancelled pending confirmation never produces a payment command', () => {
  const result = classifySkillTipPrerequisites({
    confirmation: 'CANCELLED',
    context: workflowContext({
      pendingTipConfirmation: {
        pendingId: 'pending_1',
        status: 'AWAITING_CONFIRMATION',
        ...workflowIdentity,
        createdAt: new Date(NOW).toISOString(),
        expiresAt: new Date(NOW + 1000).toISOString(),
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_REJECTED);
  assert.equal(result.action, SkillTipAction.CANCEL_PENDING_TIP);
  assert.equal(result.command, undefined);
});

test('an already consumed pending confirmation cannot execute twice', () => {
  const result = classifySkillTipPrerequisites({
    confirmation: 'CONFIRMED',
    context: workflowContext({
      pendingTipConfirmation: {
        pendingId: 'pending_1',
        status: 'CONSUMED',
        ...workflowIdentity,
        createdAt: new Date(NOW).toISOString(),
        expiresAt: new Date(NOW + 1000).toISOString(),
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_ALREADY_HANDLED);
  assert.equal(result.action, SkillTipAction.RETURN_PENDING_TIP_ALREADY_HANDLED);
  assert.equal(result.command, undefined);
});

for (const [label, pendingOverrides] of [
  ['expired', { expiresAt: new Date(NOW - 1).toISOString() }],
  ['cross-environment', { environment: 'production' }],
]) {
  test(`${label} pending confirmation never claims or executes`, () => {
    const result = classifySkillTipPrerequisites({
      confirmation: 'CONFIRMED',
      context: workflowContext({
        pendingTipConfirmation: {
          pendingId: 'pending_1',
          status: 'AWAITING_CONFIRMATION',
          number: 2,
          resolvedTarget: {
            publisher: 'clinkpay',
            skillName: 'PollyReach',
            skillId: 'skill_2',
          },
          amount: '2',
          currency: 'USD',
          ...workflowIdentity,
          createdAt: new Date(NOW - 1000).toISOString(),
          expiresAt: new Date(NOW + 1000).toISOString(),
          ...pendingOverrides,
        },
      }),
    });

    assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_EXPIRED);
    assert.equal(result.action, SkillTipAction.ASK_FOR_SKILL_TIP_INPUT);
    assert.equal(result.reason, 'skill_tip_confirmation_expired_or_context_mismatch');
    assert.equal(result.pendingTransition, undefined);
    assert.equal(result.command, undefined);
  });
}

test('confirmation against an already executing pending is already handled', () => {
  const result = classifySkillTipPrerequisites({
    confirmation: 'CONFIRMED',
    context: workflowContext({
      pendingTipConfirmation: {
        pendingId: 'pending_1',
        status: 'EXECUTING',
        ...workflowIdentity,
        createdAt: new Date(NOW - 1000).toISOString(),
        expiresAt: new Date(NOW + 1000).toISOString(),
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_ALREADY_HANDLED);
  assert.equal(result.action, SkillTipAction.RETURN_PENDING_TIP_ALREADY_HANDLED);
  assert.equal(result.command, undefined);
});

for (const status of ['AWAITING_CONFIRMATION', 'CONSUMED', 'CANCELLED']) {
  test(`CLAIMED cannot execute a pending in ${status}`, () => {
    const result = classifySkillTipPrerequisites({
      confirmation: 'CLAIMED',
      context: workflowContext({
        pendingTipConfirmation: {
          pendingId: 'pending_1',
          status,
          ...workflowIdentity,
          createdAt: new Date(NOW - 1000).toISOString(),
          expiresAt: new Date(NOW + 1000).toISOString(),
        },
      }),
    });

    assert.equal(result.state, SkillTipState.TIP_CONFIRMATION_ALREADY_HANDLED);
    assert.equal(result.action, SkillTipAction.RETURN_PENDING_TIP_ALREADY_HANDLED);
    assert.equal(result.command, undefined);
  });
}

test('Number tip omits version when the context row has none', () => {
  const snapshot = displayedSnapshot({
    rows: [{
      number: 2,
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_2',
    }],
  });
  const result = classifySkillTipPrerequisites({
    tip: numberedTip,
    context: workflowContext({ skillListSnapshots: [snapshot] }),
  });

  assert.equal(
    result.command,
    'clink skills tip --publisher clinkpay --name PollyReach --amount 2 --format json',
  );
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
    expectedTip: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_1',
      amount: '2',
      currency: 'USD',
    },
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_1',
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
  assert.equal(result.paymentTerminal, true);
  assert.equal(result.accountEventStatus, 'PENDING');
  assert.equal(result.terminal, false);
  assert.deepEqual(result.expectedResource, {
    orderId: 'order_1',
    merchantId: 'mcht_1',
    skillId: 'skill_1',
  });
  assert.deepEqual(result.pollCommands, [
    'clink events poll --type account-created,account-reloaded --max-wait 60 --format json',
  ]);
  assert.deepEqual(
    result.accountWaitSpecs.map(({ eventType, pollCommand }) => ({ eventType, pollCommand })),
    [
      {
        eventType: 'account-created',
        pollCommand: result.pollCommands[0],
      },
      {
        eventType: 'account-reloaded',
        pollCommand: result.pollCommands[0],
      },
    ],
  );
});

test('paid tip carries caller stable identifiers for account-event fallback correlation', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    expectedTip: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_1',
      amount: '2',
      currency: 'USD',
    },
    expectedResource: { customerId: 'cust_1', skillId: 'skill_1' },
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_1',
        merchantId: 'mcht_1',
        amount: 2,
        currency: 'USD',
        payment: { status: 1 },
      },
    }),
  });

  assert.deepEqual(result.expectedResource, {
    customerId: 'cust_1',
    merchantId: 'mcht_1',
    skillId: 'skill_1',
  });
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
        resumeCommand: 'clink skills tip --publisher clinkpay --name PollyReach --amount 2 --format json',
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

test('payment failure payload remains terminal when CLI returns exit code 5', () => {
  const result = classifySkillTipObservation({
    exitCode: 5,
    stdout: JSON.stringify({ ok: true, data: { status: 'payment_failed', payment: { status: 3 } } }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_FAILED);
  assert.equal(result.action, SkillTipAction.RETURN_TIP_FAILURE);
  assert.equal(result.paymentStatus, 'FAILED');
});

test('402 card-binding-required error only surfaces the message and stops the tip', () => {
  const result = classifySkillTipObservation({
    exitCode: 5,
    stderr: JSON.stringify({
      ok: false,
      error: {
        type: 'api_error',
        code: 402,
        message: 'Credit 余额不足，请先绑定银行卡',
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_CARD_BINDING_REQUIRED);
  assert.equal(result.action, SkillTipAction.SURFACE_ERROR);
  assert.equal(result.paymentStatus, 'NOT_PAID');
  assert.equal(result.userMessage, 'Credit 余额不足，请先绑定银行卡');
  assert.equal(result.terminal, true);
  assert.equal(result.command, undefined);
  assert.equal(result.retryCurrentTipAfterBinding, undefined);
  assert.equal(result.pollCommands, undefined);
});

test('the card-binding message without code 402 remains a generic terminal error', () => {
  const result = classifySkillTipObservation({
    exitCode: 5,
    stderr: JSON.stringify({
      ok: false,
      error: {
        code: 500,
        message: 'Credit 余额不足，请先绑定银行卡',
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_ERROR);
  assert.equal(result.action, SkillTipAction.SURFACE_ERROR);
  assert.equal(result.terminal, true);
  assert.equal(result.command, undefined);
  assert.equal(result.pollCommands, undefined);
});

test('paid result that conflicts with the authorization binding is unknown', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    expectedTip: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_expected',
      amount: '2',
      currency: 'USD',
    },
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        skillId: 'skill_other',
        amount: 2,
        currency: 'USD',
        payment: { orderId: 'order_wrong_target', status: 1 },
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_UNKNOWN);
  assert.equal(result.action, SkillTipAction.VERIFY_BEFORE_RETRY);
  assert.equal(result.reason, 'skill_tip_authorization_binding_mismatch');
  assert.equal(result.paymentStatus, 'UNKNOWN');
  assert.equal(result.pollCommands, undefined);
});

test('paid result accepts the version resolved by the CLI when no version was requested', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    expectedTip: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_2',
      amount: '2',
      currency: 'USD',
    },
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_2',
        versionNo: 'v2.0.0',
        amount: 2,
        currency: 'USD',
        payment: { orderId: 'order_resolved_version', status: 1 },
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_SUCCEEDED);
  assert.equal(result.action, SkillTipAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH);
  assert.equal(result.paymentStatus, 'PAID');
});

test('paid result does not collapse distinct unsafe integer amounts during binding', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    expectedTip: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_2',
      amount: '9007199254740993',
      currency: 'USD',
    },
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_2',
        amount: '9007199254740992',
        currency: 'USD',
        payment: { orderId: 'order_wrong_amount', status: 1 },
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_UNKNOWN);
  assert.equal(result.action, SkillTipAction.VERIFY_BEFORE_RETRY);
  assert.equal(result.reason, 'skill_tip_authorization_binding_mismatch');
});

test('paid result without an authorization binding remains unknown', () => {
  const result = classifySkillTipObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        status: 'paid',
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_2',
        versionNo: 'v1.2.3',
        amount: 2,
        currency: 'USD',
        payment: { orderId: 'order_unbound', status: 1 },
      },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_PAYMENT_UNKNOWN);
  assert.equal(result.action, SkillTipAction.VERIFY_BEFORE_RETRY);
  assert.equal(result.reason, 'skill_tip_authorization_binding_missing');
  assert.equal(result.paymentStatus, 'UNKNOWN');
  assert.equal(result.pollCommands, undefined);
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

test('non-3DS CLI errors take precedence over a conflicting result status', () => {
  const result = classifySkillTipObservation({
    exitCode: 5,
    stdout: JSON.stringify({
      ok: true,
      data: { status: 'three_ds_required', redirectUrl: 'https://3ds.example/auth' },
    }),
  });

  assert.equal(result.state, SkillTipState.TIP_ERROR);
  assert.equal(result.action, SkillTipAction.SURFACE_ERROR);
  assert.equal(result.exitCode, 5);
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

test('mutually exclusive account events both matching preserve paid with a warning', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', matched: true, event: { type: 'account-created' } },
      { eventType: 'account-reloaded', matched: true, event: { type: 'account-reloaded' } },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_POLL_ERROR);
  assert.equal(result.action, SkillTipAction.RETURN_TIP_SUCCESS_WITH_WARNING);
  assert.equal(result.reason, 'mutually_exclusive_account_events_conflict');
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.accountEventStatus, 'POLL_ERROR');
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

test('optional account aggregation accepts event FSM timeout results', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', state: 'EVENT_TIMEOUT' },
      { eventType: 'account-reloaded', state: 'EVENT_TIMEOUT' },
    ],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_NOT_OBSERVED);
  assert.equal(result.accountEventStatus, 'NOT_OBSERVED');
  assert.equal(result.paymentStatus, 'PAID');
});

test('optional account event aggregation waits for both any-of type classifications', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{ eventType: 'account-created', timedOut: true }],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_WAITING);
  assert.equal(result.action, SkillTipAction.WAIT_OPTIONAL_ACCOUNT_EVENT);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.accountEventStatus, 'PENDING');
  assert.equal(result.terminal, false);
});

test('one optional type error waits for the other any-of classification before warning', () => {
  const result = classifySkillTipAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{ eventType: 'account-created', error: { message: 'network' } }],
  });

  assert.equal(result.state, SkillTipState.TIP_ACCOUNT_EVENT_WAITING);
  assert.equal(result.action, SkillTipAction.WAIT_OPTIONAL_ACCOUNT_EVENT);
  assert.equal(result.accountEventStatus, 'PENDING');
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
