import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SkillInstallState,
  SkillInstallAction,
  classifySkillInstallPrerequisites,
  classifySkillInstallObservation,
  formatSkillInstallFsmMarker,
} from '../lib/skill-install-workflow-fsm.mjs';

const NOW = Date.parse('2026-07-16T10:00:00.000Z');

function workflowContext(overrides = {}) {
  return {
    now: NOW,
    userId: 'user_1',
    conversationId: 'conversation_1',
    environment: 'sandbox:https://api.clinkbill.dev',
    ...overrides,
  };
}

function displayedSnapshot(overrides = {}) {
  const displayedAt = overrides.displayedAt
    ?? new Date(NOW - (overrides.ageMs ?? 60_000)).toISOString();
  return {
    snapshotId: overrides.snapshotId ?? 'snapshot_1',
    scope: overrides.scope ?? 'tippable',
    userId: overrides.userId ?? 'user_1',
    conversationId: overrides.conversationId ?? 'conversation_1',
    environment: overrides.environment ?? 'sandbox:https://api.clinkbill.dev',
    displayedAt,
    rows: overrides.rows ?? [
      {
        number: 2,
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        skillId: 'skill_2',
        versionNo: 'v1.2.3',
      },
    ],
  };
}

function authorizedInstall(target) {
  return { target, explicitlyAuthorized: true };
}

function executingPending(overrides = {}) {
  const resolvedTarget = {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skillId: 'skill_2',
    versionNo: 'v1.2.3',
    ...(overrides.resolvedTarget ?? {}),
  };
  return {
    pendingId: 'install_pending_1',
    status: 'EXECUTING',
    number: 2,
    userId: 'user_1',
    conversationId: 'conversation_1',
    environment: 'sandbox:https://api.clinkbill.dev',
    createdAt: '2026-07-16T09:59:00.000Z',
    expiresAt: '2026-07-16T11:59:00.000Z',
    ...overrides,
    resolvedTarget,
  };
}

test('identity install without a version builds the latest command by omission', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({
      kind: 'identity',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_EXECUTION_READY);
  assert.equal(result.action, SkillInstallAction.RUN_SKILL_INSTALL);
  assert.equal(result.command, 'clink skills install clinkpay/PollyReach --format json');
  assert.doesNotMatch(result.command, /@latest|--version/u);
  assert.deepEqual(result.expectedInstall, {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: null,
  });
});

test('identity install with a version builds one exact package operand', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({
      kind: 'identity',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      versionNo: 'v1.2.3',
    }),
  });

  assert.equal(
    result.command,
    'clink skills install clinkpay/PollyReach@v1.2.3 --format json',
  );
  assert.doesNotMatch(result.command, /--version/u);
  assert.equal(result.expectedInstall.requestedVersion, 'v1.2.3');
});

test('identity install quotes a human-readable Skill name containing spaces', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({
      kind: 'identity',
      publisher: 'Jeff',
      skillName: 'SEO Deep Audit',
      versionNo: 'v1.0.0',
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_EXECUTION_READY);
  assert.equal(result.action, SkillInstallAction.RUN_SKILL_INSTALL);
  assert.equal(
    result.command,
    'clink skills install "Jeff/SEO Deep Audit@v1.0.0" --format json',
  );
  assert.deepEqual(result.expectedInstall, {
    publisher: 'Jeff',
    skillName: 'SEO Deep Audit',
    requestedVersion: 'v1.0.0',
  });
});

test('identity install supports Chinese publisher and Skill names', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({
      kind: 'identity',
      publisher: '艺术家',
      skillName: '跨境数据分析套件',
      versionNo: 'v1.0.0',
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_EXECUTION_READY);
  assert.equal(result.action, SkillInstallAction.RUN_SKILL_INSTALL);
  assert.equal(
    result.command,
    'clink skills install "艺术家/跨境数据分析套件@v1.0.0" --format json',
  );
  assert.deepEqual(result.expectedInstall, {
    publisher: '艺术家',
    skillName: '跨境数据分析套件',
    requestedVersion: 'v1.0.0',
  });
});

test('identity install protects a leading-hyphen publisher from CLI option parsing', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({
      kind: 'identity',
      publisher: '-publisher',
      skillName: 'PollyReach',
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_EXECUTION_READY);
  assert.equal(
    result.command,
    'clink skills install --format json -- -publisher/PollyReach',
  );
});

test('identity install rejects a literal latest version instead of emitting @latest', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({
      kind: 'identity',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      versionNo: 'latest',
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
  assert.equal(result.action, SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.command, undefined);
});

for (const target of [
  { kind: 'identity', publisher: '.', skillName: 'PollyReach' },
  { kind: 'identity', publisher: '..', skillName: 'PollyReach' },
  { kind: 'identity', publisher: 'clinkpay', skillName: '.' },
  { kind: 'identity', publisher: 'clinkpay', skillName: '..' },
  { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach', versionNo: '.' },
  { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach', versionNo: '..' },
]) {
  test(`identity install rejects path-like segment ${JSON.stringify(target)}`, () => {
    const result = classifySkillInstallPrerequisites({
      install: authorizedInstall(target),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
    assert.equal(result.action, SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT);
    assert.equal(result.command, undefined);
  });
}

for (const target of [
  { kind: 'identity', publisher: true, skillName: 'PollyReach' },
  { kind: 'identity', publisher: 'clinkpay', skillName: 123 },
  { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach', versionNo: 123 },
]) {
  test(`identity install rejects non-string fields ${JSON.stringify(target)}`, () => {
    const result = classifySkillInstallPrerequisites({ install: authorizedInstall(target) });

    assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
    assert.notEqual(result.action, SkillInstallAction.RUN_SKILL_INSTALL);
    assert.equal(result.command, undefined);
  });
}

test('Number install resolves the newest snapshot row but requires confirmation', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({ skillListSnapshots: [displayedSnapshot()] }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_REQUIRED);
  assert.equal(result.action, SkillInstallAction.ASK_FOR_INSTALL_CONFIRMATION);
  assert.equal(result.command, undefined);
  assert.deepEqual(result.pendingSkillInstallConfirmation.resolvedTarget, {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skillId: 'skill_2',
    versionNo: 'v1.2.3',
  });
  assert.equal(result.pendingSkillInstallConfirmation.status, 'AWAITING_CONFIRMATION');
  assert.match(result.confirmationPrompt, /clinkpay\/PollyReach@v1\.2\.3/u);
});

for (const [malformedNumber, rowNumber] of [[true, 1], [[2], 2]]) {
  test(`Number install rejects non-number target ${JSON.stringify(malformedNumber)}`, () => {
    const result = classifySkillInstallPrerequisites({
      install: authorizedInstall({ kind: 'number', number: malformedNumber }),
      pendingId: 'install_pending_1',
      context: workflowContext({
        skillListSnapshots: [displayedSnapshot({
          rows: [{
            number: rowNumber,
            publisher: 'clinkpay',
            skillName: 'PollyReach',
            skillId: 'skill_2',
          }],
        })],
      }),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
    assert.notEqual(result.action, SkillInstallAction.ASK_FOR_INSTALL_CONFIRMATION);
  });
}

test('Number install shows latest when the displayed row has no version', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({
        rows: [{
          number: 2,
          publisher: 'clinkpay',
          skillName: 'PollyReach',
          skillId: 'skill_2',
        }],
      })],
    }),
  });

  assert.match(result.confirmationPrompt, /version: latest/u);
  assert.equal(result.pendingSkillInstallConfirmation.resolvedTarget.versionNo, undefined);
});

test('Number install accepts a numbered all-list snapshot', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ scope: 'all' })],
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_REQUIRED);
  assert.equal(result.pendingSkillInstallConfirmation.snapshotId, 'snapshot_1');
});

test('Number install rejects an unscoped snapshot', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({
      skillListSnapshots: [{ ...displayedSnapshot(), scope: undefined }],
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
  assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
});

test('Number install without a recent structured snapshot asks for identity input', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({ skillListSnapshots: [] }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
  assert.equal(result.action, SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
  assert.equal(result.command, undefined);
  assert.equal(result.pendingSkillInstallConfirmation, undefined);
});

test('Number install accepts a snapshot displayed exactly two hours ago', () => {
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({
      skillListSnapshots: [displayedSnapshot({ ageMs: 2 * 60 * 60 * 1000 })],
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_REQUIRED);
  assert.equal(result.action, SkillInstallAction.ASK_FOR_INSTALL_CONFIRMATION);
});

test('Number install never falls back to an older snapshot containing the Number', () => {
  const older = displayedSnapshot({ snapshotId: 'older', ageMs: 120_000 });
  const newer = displayedSnapshot({
    snapshotId: 'newer',
    ageMs: 60_000,
    rows: [{
      number: 1,
      publisher: 'clinkpay',
      skillName: 'AnotherSkill',
      skillId: 'skill_1',
      versionNo: 'v2',
    }],
  });
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({ skillListSnapshots: [older, newer] }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
  assert.equal(result.reason, 'skill_number_not_in_recent_snapshot');
  assert.equal(result.pendingSkillInstallConfirmation, undefined);
});

test('Number install never falls back when the newest displayed snapshot is malformed', () => {
  const older = displayedSnapshot({ snapshotId: 'older', ageMs: 120_000 });
  const newer = displayedSnapshot({
    snapshotId: 'newer',
    ageMs: 60_000,
    rows: [{
      number: 2,
      publisher: 'clinkpay',
      skillName: 'ChangedSkill',
      skillId: 'skill_changed',
      versionNo: 'bad version',
    }],
  });
  const result = classifySkillInstallPrerequisites({
    install: authorizedInstall({ kind: 'number', number: 2 }),
    pendingId: 'install_pending_1',
    context: workflowContext({ skillListSnapshots: [older, newer] }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
  assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
  assert.equal(result.pendingSkillInstallConfirmation, undefined);
});

for (const [label, row, targetNumber] of [
  ['boolean Number', { number: true, publisher: 'clinkpay', skillName: 'PollyReach', skillId: 'skill_1' }, 1],
  ['array Number', { number: [2], publisher: 'clinkpay', skillName: 'PollyReach', skillId: 'skill_2' }, 2],
  ['boolean publisher', { number: 2, publisher: true, skillName: 'PollyReach', skillId: 'skill_2' }, 2],
  ['numeric skill name', { number: 2, publisher: 'clinkpay', skillName: 123, skillId: 'skill_2' }, 2],
  ['boolean skill id', { number: 2, publisher: 'clinkpay', skillName: 'PollyReach', skillId: true }, 2],
  ['numeric version', { number: 2, publisher: 'clinkpay', skillName: 'PollyReach', skillId: 'skill_2', versionNo: 123 }, 2],
]) {
  test(`Number install rejects snapshot row with ${label}`, () => {
    const result = classifySkillInstallPrerequisites({
      install: authorizedInstall({ kind: 'number', number: targetNumber }),
      pendingId: 'install_pending_1',
      context: workflowContext({
        skillListSnapshots: [displayedSnapshot({ rows: [row] })],
      }),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
    assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
    assert.equal(result.pendingSkillInstallConfirmation, undefined);
  });
}

for (const [label, snapshotOverrides] of [
  ['expired', { ageMs: (2 * 60 * 60 * 1000) + 1 }],
  ['future', { displayedAt: new Date(NOW + 1).toISOString() }],
  ['another user', { userId: 'user_2' }],
  ['another conversation', { conversationId: 'conversation_2' }],
  ['another environment', { environment: 'production:https://api.clinkbill.com' }],
  ['duplicate Number', {
    rows: [
      { number: 2, publisher: 'a', skillName: 'one', skillId: 'skill_1' },
      { number: 2, publisher: 'b', skillName: 'two', skillId: 'skill_2' },
    ],
  }],
]) {
  test(`Number install rejects a ${label} snapshot`, () => {
    const result = classifySkillInstallPrerequisites({
      install: authorizedInstall({ kind: 'number', number: 2 }),
      pendingId: 'install_pending_1',
      context: workflowContext({
        skillListSnapshots: [displayedSnapshot(snapshotOverrides)],
      }),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
    assert.equal(result.reason, 'recent_skill_list_snapshot_missing');
    assert.equal(result.command, undefined);
  });
}

test('confirmation first requests an atomic pending claim without a command', () => {
  const pendingSkillInstallConfirmation = {
    pendingId: 'install_pending_1',
    status: 'AWAITING_CONFIRMATION',
    number: 2,
    resolvedTarget: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      skillId: 'skill_2',
      versionNo: 'v1.2.3',
    },
    userId: 'user_1',
    conversationId: 'conversation_1',
    environment: 'sandbox:https://api.clinkbill.dev',
    createdAt: '2026-07-16T09:59:00.000Z',
    expiresAt: '2026-07-16T11:59:00.000Z',
  };
  const result = classifySkillInstallPrerequisites({
    confirmation: 'CONFIRMED',
    context: workflowContext({ pendingSkillInstallConfirmation }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_ACCEPTED);
  assert.equal(result.action, SkillInstallAction.CLAIM_PENDING_INSTALL);
  assert.deepEqual(result.pendingTransition, {
    pendingId: 'install_pending_1',
    from: 'AWAITING_CONFIRMATION',
    to: 'EXECUTING',
  });
  assert.equal(result.command, undefined);
});

test('only a claimed executing confirmation runs the frozen exact install', () => {
  const result = classifySkillInstallPrerequisites({
    confirmation: 'CLAIMED',
    context: workflowContext({
      pendingSkillInstallConfirmation: {
        pendingId: 'install_pending_1',
        status: 'EXECUTING',
        number: 2,
        resolvedTarget: {
          publisher: 'clinkpay',
          skillName: 'PollyReach',
          skillId: 'skill_2',
          versionNo: 'v1.2.3',
        },
        userId: 'user_1',
        conversationId: 'conversation_1',
        environment: 'sandbox:https://api.clinkbill.dev',
        createdAt: '2026-07-16T09:59:00.000Z',
        expiresAt: '2026-07-16T11:59:00.000Z',
      },
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_EXECUTION_READY);
  assert.equal(result.action, SkillInstallAction.RUN_SKILL_INSTALL);
  assert.equal(
    result.command,
    'clink skills install clinkpay/PollyReach@v1.2.3 --format json',
  );
  assert.equal(result.pendingId, 'install_pending_1');
});

for (const [label, pendingOverrides] of [
  ['boolean Number', { number: true }],
  ['array Number', { number: [2] }],
  ['boolean publisher', { resolvedTarget: { publisher: true } }],
  ['numeric skill name', { resolvedTarget: { skillName: 123 } }],
  ['boolean skill id', { resolvedTarget: { skillId: true } }],
  ['numeric version', { resolvedTarget: { versionNo: 123 } }],
]) {
  test(`claimed install rejects pending data with ${label}`, () => {
    const result = classifySkillInstallPrerequisites({
      confirmation: 'CLAIMED',
      context: workflowContext({
        pendingSkillInstallConfirmation: executingPending(pendingOverrides),
      }),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
    assert.notEqual(result.action, SkillInstallAction.RUN_SKILL_INSTALL);
    assert.equal(result.command, undefined);
  });
}

for (const status of ['AWAITING_CONFIRMATION', 'CONSUMED', 'CANCELLED']) {
  test(`CLAIMED cannot execute a pending install in ${status}`, () => {
    const result = classifySkillInstallPrerequisites({
      confirmation: 'CLAIMED',
      context: workflowContext({
        pendingSkillInstallConfirmation: {
          pendingId: 'install_pending_1',
          status,
          number: 2,
          resolvedTarget: {
            publisher: 'clinkpay',
            skillName: 'PollyReach',
            skillId: 'skill_2',
            versionNo: 'v1.2.3',
          },
          userId: 'user_1',
          conversationId: 'conversation_1',
          environment: 'sandbox:https://api.clinkbill.dev',
          createdAt: '2026-07-16T09:59:00.000Z',
          expiresAt: '2026-07-16T11:59:00.000Z',
        },
      }),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_ALREADY_HANDLED);
    assert.equal(result.action, SkillInstallAction.RETURN_PENDING_INSTALL_ALREADY_HANDLED);
    assert.equal(result.command, undefined);
  });
}

for (const [label, pendingOverrides] of [
  ['expired', { expiresAt: '2026-07-16T09:59:59.999Z' }],
  ['another user', { userId: 'user_2' }],
  ['another conversation', { conversationId: 'conversation_2' }],
  ['another environment', { environment: 'production:https://api.clinkbill.com' }],
]) {
  test(`${label} pending install confirmation never claims or executes`, () => {
    const result = classifySkillInstallPrerequisites({
      confirmation: 'CONFIRMED',
      context: workflowContext({
        pendingSkillInstallConfirmation: {
          pendingId: 'install_pending_1',
          status: 'AWAITING_CONFIRMATION',
          number: 2,
          resolvedTarget: {
            publisher: 'clinkpay',
            skillName: 'PollyReach',
            skillId: 'skill_2',
          },
          userId: 'user_1',
          conversationId: 'conversation_1',
          environment: 'sandbox:https://api.clinkbill.dev',
          createdAt: '2026-07-16T09:59:00.000Z',
          expiresAt: '2026-07-16T11:59:00.000Z',
          ...pendingOverrides,
        },
      }),
    });

    assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_EXPIRED);
    assert.equal(result.action, SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT);
    assert.equal(result.command, undefined);
    assert.equal(result.pendingTransition, undefined);
  });
}

test('claimed Number install requires the frozen skill id', () => {
  const result = classifySkillInstallPrerequisites({
    confirmation: 'CLAIMED',
    context: workflowContext({
      pendingSkillInstallConfirmation: {
        pendingId: 'install_pending_1',
        status: 'EXECUTING',
        number: 2,
        resolvedTarget: {
          publisher: 'clinkpay',
          skillName: 'PollyReach',
        },
        userId: 'user_1',
        conversationId: 'conversation_1',
        environment: 'sandbox:https://api.clinkbill.dev',
        createdAt: '2026-07-16T09:59:00.000Z',
        expiresAt: '2026-07-16T11:59:00.000Z',
      },
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_INPUT_REQUIRED);
  assert.equal(result.action, SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.command, undefined);
});

test('cancelled Number confirmation never produces an install command', () => {
  const result = classifySkillInstallPrerequisites({
    confirmation: 'CANCELLED',
    context: workflowContext({
      pendingSkillInstallConfirmation: {
        pendingId: 'install_pending_1',
        status: 'AWAITING_CONFIRMATION',
        userId: 'user_1',
        conversationId: 'conversation_1',
        environment: 'sandbox:https://api.clinkbill.dev',
        createdAt: '2026-07-16T09:59:00.000Z',
        expiresAt: '2026-07-16T11:59:00.000Z',
      },
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_CONFIRMATION_REJECTED);
  assert.equal(result.action, SkillInstallAction.CANCEL_PENDING_INSTALL);
  assert.equal(result.command, undefined);
});

test('a planned dry-run is not reported as an installed Skill', () => {
  const result = classifySkillInstallObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        requestedVersion: null,
        action: 'planned',
        dryRun: true,
      },
    }),
    expectedInstall: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: null,
    },
  });

  assert.equal(result.state, SkillInstallState.INSTALL_PLANNED);
  assert.equal(result.action, SkillInstallAction.RETURN_INSTALL_PLAN);
  assert.equal(result.installStatus, 'PLANNED');
});

test('an exact installed result must match the frozen install binding', () => {
  const expectedInstall = {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: 'v1.2.3',
  };
  const result = classifySkillInstallObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { ...expectedInstall, action: 'installed' } }),
    expectedInstall,
  });

  assert.equal(result.state, SkillInstallState.INSTALL_SUCCEEDED);
  assert.equal(result.action, SkillInstallAction.RETURN_INSTALL_SUCCESS);
  assert.equal(result.installStatus, 'INSTALLED');
});

test('an unchanged latest install is a successful terminal result', () => {
  const expectedInstall = {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: null,
  };
  const result = classifySkillInstallObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { ...expectedInstall, action: 'unchanged' } }),
    expectedInstall,
  });

  assert.equal(result.state, SkillInstallState.INSTALL_UNCHANGED);
  assert.equal(result.installStatus, 'UNCHANGED');
});

for (const action of ['installed', 'updated', 'unchanged']) {
  test(`a dry-run ${action} action is unknown, never an install success`, () => {
    const expectedInstall = {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: null,
    };
    const result = classifySkillInstallObservation({
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: { ...expectedInstall, action, dryRun: true },
      }),
      expectedInstall,
    });

    assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
    assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
    assert.equal(result.reason, 'invalid_skill_install_dry_run_action');
  });
}

for (const malformedDryRun of ['true', 1, 'false', null, false, {}, []]) {
  test(`install success rejects malformed dryRun=${JSON.stringify(malformedDryRun)}`, () => {
    const expectedInstall = {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: null,
    };
    const result = classifySkillInstallObservation({
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ...expectedInstall,
          action: 'installed',
          dryRun: malformedDryRun,
        },
      }),
      expectedInstall,
    });

    assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
    assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
    assert.equal(result.reason, 'invalid_skill_install_dry_run_value');
  });
}

for (const [label, data] of [
  ['snake_case dry_run', {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: null,
    action: 'installed',
    dry_run: true,
  }],
  ['snake_case skill_name', {
    publisher: 'clinkpay',
    skill_name: 'PollyReach',
    requestedVersion: null,
    action: 'installed',
  }],
  ['conflicting skill_name alias', {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    skill_name: 'AnotherSkill',
    requestedVersion: null,
    action: 'installed',
  }],
]) {
  test(`install success rejects noncanonical result field: ${label}`, () => {
    const result = classifySkillInstallObservation({
      exitCode: 0,
      stdout: JSON.stringify({ ok: true, data }),
      expectedInstall: {
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        requestedVersion: null,
      },
    });

    assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
    assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
    assert.equal(result.reason, 'invalid_skill_install_result_schema');
  });
}

test('an install result with a different version is unknown, never success', () => {
  const result = classifySkillInstallObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        requestedVersion: 'v2',
        action: 'installed',
      },
    }),
    expectedInstall: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: 'v1',
    },
  });

  assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
  assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
  assert.equal(result.reason, 'skill_install_binding_mismatch');
});

test('a success envelope containing an error is contradictory, never install success', () => {
  const expectedInstall = {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: null,
  };
  const result = classifySkillInstallObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      error: { type: 'install_error', code: 8, message: 'conflict' },
      data: { ...expectedInstall, action: 'installed' },
    }),
    expectedInstall,
  });

  assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
  assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
  assert.equal(result.reason, 'invalid_skill_install_envelope');
});

test('install result binding preserves publisher and Skill name case exactly', () => {
  const expectedInstall = {
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: null,
  };
  const result = classifySkillInstallObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        publisher: 'CLINKPAY',
        skillName: 'pollyreach',
        requestedVersion: null,
        action: 'installed',
      },
    }),
    expectedInstall,
  });

  assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
  assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
  assert.equal(result.reason, 'skill_install_binding_mismatch');
});

for (const [label, stdout] of [
  ['missing ok', JSON.stringify({
    data: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: null,
      action: 'installed',
    },
  })],
  ['non-boolean ok', JSON.stringify({
    ok: 'false',
    data: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: null,
      action: 'installed',
    },
  })],
  ['raw top-level data', JSON.stringify({
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    requestedVersion: null,
    action: 'installed',
  })],
  ['multiple stdout envelopes', `${JSON.stringify({
    ok: true,
    data: {
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      requestedVersion: null,
      action: 'installed',
    },
  })}\n${JSON.stringify({ ok: false, error: { message: 'late failure' } })}`],
]) {
  test(`install success rejects ${label}`, () => {
    const result = classifySkillInstallObservation({
      exitCode: 0,
      stdout,
      expectedInstall: {
        publisher: 'clinkpay',
        skillName: 'PollyReach',
        requestedVersion: null,
      },
    });

    assert.equal(result.state, SkillInstallState.INSTALL_UNKNOWN);
    assert.equal(result.action, SkillInstallAction.SURFACE_ERROR);
  });
}

test('a nonzero install exit surfaces failure without retrying or claiming success', () => {
  const result = classifySkillInstallObservation({
    exitCode: 8,
    stderr: JSON.stringify({
      ok: false,
      error: { type: 'install_error', code: 8, message: 'conflict' },
    }),
  });

  assert.equal(result.state, SkillInstallState.INSTALL_FAILED);
  assert.equal(result.action, SkillInstallAction.RETURN_INSTALL_FAILURE);
  assert.equal(result.installStatus, 'FAILED');
  assert.equal(result.exitCode, 8);
});

test('Skill install marker uses the shared marker format', () => {
  assert.equal(
    formatSkillInstallFsmMarker({
      state: SkillInstallState.INSTALL_EXECUTION_READY,
      action: SkillInstallAction.RUN_SKILL_INSTALL,
      reason: 'skill_install_identity_ready',
    }),
    '[SKILL_INSTALL_FSM] state=INSTALL_EXECUTION_READY action=RUN_SKILL_INSTALL reason=skill_install_identity_ready',
  );
});
