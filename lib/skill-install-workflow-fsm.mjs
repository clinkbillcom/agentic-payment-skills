import { formatWorkflowMarker } from './workflow-marker.mjs';
import {
  SKILL_LIST_CONTEXT_TTL_MS,
  normalizedSkillIdentityString,
  positiveSkillNumber,
  recentDisplayedSkillListSnapshot,
  resolvedSkillIdentity,
  sameSkillContextIdentity,
  skillContextIdentity,
  skillContextTimestampMs,
} from './skill-list-context.mjs';

export const SkillInstallState = Object.freeze({
  INSTALL_INPUT_REQUIRED: 'INSTALL_INPUT_REQUIRED',
  INSTALL_CONFIRMATION_REQUIRED: 'INSTALL_CONFIRMATION_REQUIRED',
  INSTALL_CONFIRMATION_ACCEPTED: 'INSTALL_CONFIRMATION_ACCEPTED',
  INSTALL_CONFIRMATION_REJECTED: 'INSTALL_CONFIRMATION_REJECTED',
  INSTALL_CONFIRMATION_EXPIRED: 'INSTALL_CONFIRMATION_EXPIRED',
  INSTALL_CONFIRMATION_ALREADY_HANDLED: 'INSTALL_CONFIRMATION_ALREADY_HANDLED',
  INSTALL_EXECUTION_READY: 'INSTALL_EXECUTION_READY',
  INSTALL_PLANNED: 'INSTALL_PLANNED',
  INSTALL_SUCCEEDED: 'INSTALL_SUCCEEDED',
  INSTALL_UNCHANGED: 'INSTALL_UNCHANGED',
  INSTALL_FAILED: 'INSTALL_FAILED',
  INSTALL_UNKNOWN: 'INSTALL_UNKNOWN',
});

export const SkillInstallAction = Object.freeze({
  ASK_FOR_SKILL_INSTALL_INPUT: 'ASK_FOR_SKILL_INSTALL_INPUT',
  ASK_FOR_INSTALL_CONFIRMATION: 'ASK_FOR_INSTALL_CONFIRMATION',
  CLAIM_PENDING_INSTALL: 'CLAIM_PENDING_INSTALL',
  CANCEL_PENDING_INSTALL: 'CANCEL_PENDING_INSTALL',
  RETURN_PENDING_INSTALL_ALREADY_HANDLED: 'RETURN_PENDING_INSTALL_ALREADY_HANDLED',
  RUN_SKILL_INSTALL: 'RUN_SKILL_INSTALL',
  RETURN_INSTALL_PLAN: 'RETURN_INSTALL_PLAN',
  RETURN_INSTALL_SUCCESS: 'RETURN_INSTALL_SUCCESS',
  RETURN_INSTALL_FAILURE: 'RETURN_INSTALL_FAILURE',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function validPublisherSegment(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && /^[\p{L}\p{M}\p{N}._-]{1,128}$/u.test(value);
}

function validSkillName(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && value.length <= 128
    && /^[\p{L}\p{M}\p{N}._-]+(?: +[\p{L}\p{M}\p{N}._-]+)*$/u.test(value);
}

function validVersion(value) {
  return value === null
    || (value !== '.'
      && value !== '..'
      && /^[A-Za-z0-9._+-]{1,128}$/u.test(value)
      && value.toLowerCase() !== 'latest');
}

function inputRequired(reason, missing) {
  return {
    state: SkillInstallState.INSTALL_INPUT_REQUIRED,
    action: SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT,
    terminal: false,
    reason,
    missing,
  };
}

function expectedInstallBinding(target) {
  return {
    publisher: target.publisher,
    skillName: target.skillName,
    requestedVersion: target.versionNo ?? null,
  };
}

function installCommand(target) {
  const versionSuffix = target.versionNo ? `@${target.versionNo}` : '';
  const packageOperand = `${target.publisher}/${target.skillName}${versionSuffix}`;
  const commandOperand = /^[A-Za-z0-9._/@+-]+$/u.test(packageOperand)
    ? packageOperand
    : JSON.stringify(packageOperand);
  return packageOperand.startsWith('-')
    ? `clink skills install --format json -- ${commandOperand}`
    : `clink skills install ${commandOperand} --format json`;
}

function normalizedTarget(target = {}, requireSkillId = false) {
  const publisher = normalizedSkillIdentityString(target.publisher);
  const skillName = normalizedSkillIdentityString(target.skillName ?? target.skill_name);
  const skillIdValue = target.skillId ?? target.skill_id;
  const skillId = normalizedSkillIdentityString(skillIdValue);
  const versionValue = target.versionNo ?? target.version_no;
  const versionNo = normalizedSkillIdentityString(versionValue);
  if (!validPublisherSegment(publisher) || !validSkillName(skillName) || !validVersion(versionNo)) {
    return null;
  }
  if (skillIdValue !== undefined && skillIdValue !== null && skillIdValue !== '' && !skillId) return null;
  if (versionValue !== undefined && versionValue !== null && versionValue !== '' && !versionNo) return null;
  if (requireSkillId && !skillId) return null;
  return {
    publisher,
    skillName,
    ...(skillId ? { skillId } : {}),
    ...(versionNo ? { versionNo } : {}),
  };
}

function pendingIsCurrent(pending, context) {
  const now = skillContextTimestampMs(context.now ?? context.nowMs ?? context.now_ms);
  const createdAt = skillContextTimestampMs(
    pending.createdAtMs ?? pending.created_at_ms ?? pending.createdAt ?? pending.created_at,
  );
  const expiresAt = skillContextTimestampMs(
    pending.expiresAtMs ?? pending.expires_at_ms ?? pending.expiresAt ?? pending.expires_at,
  );
  return now !== null
    && createdAt !== null
    && expiresAt !== null
    && createdAt <= now
    && now <= expiresAt
    && sameSkillContextIdentity(context, pending);
}

function classifyPendingConfirmation(input, context) {
  const confirmation = normalizedString(input.confirmation)?.toUpperCase();
  if (!confirmation) return null;
  const pending = context.pendingSkillInstallConfirmation
    ?? context.pending_skill_install_confirmation;
  if (!pending || typeof pending !== 'object' || Array.isArray(pending)) {
    return inputRequired('skill_install_confirmation_missing', ['pendingSkillInstallConfirmation']);
  }
  const pendingId = normalizedString(pending.pendingId ?? pending.pending_id);
  if (!pendingId) {
    return inputRequired('invalid_pending_skill_install_confirmation', ['pendingSkillInstallConfirmation']);
  }
  if (!pendingIsCurrent(pending, context)) {
    return {
      state: SkillInstallState.INSTALL_CONFIRMATION_EXPIRED,
      action: SkillInstallAction.ASK_FOR_SKILL_INSTALL_INPUT,
      terminal: false,
      reason: 'skill_install_confirmation_expired_or_context_mismatch',
    };
  }

  if (confirmation === 'CANCELLED') {
    if (pending.status !== 'AWAITING_CONFIRMATION') {
      return {
        state: SkillInstallState.INSTALL_CONFIRMATION_ALREADY_HANDLED,
        action: SkillInstallAction.RETURN_PENDING_INSTALL_ALREADY_HANDLED,
        terminal: true,
        reason: 'skill_install_confirmation_already_handled',
      };
    }
    return {
      state: SkillInstallState.INSTALL_CONFIRMATION_REJECTED,
      action: SkillInstallAction.CANCEL_PENDING_INSTALL,
      terminal: true,
      reason: 'skill_install_confirmation_rejected',
      pendingTransition: {
        pendingId,
        from: 'AWAITING_CONFIRMATION',
        to: 'CANCELLED',
      },
    };
  }

  if (confirmation === 'CONFIRMED') {
    if (pending.status !== 'AWAITING_CONFIRMATION') {
      return {
        state: SkillInstallState.INSTALL_CONFIRMATION_ALREADY_HANDLED,
        action: SkillInstallAction.RETURN_PENDING_INSTALL_ALREADY_HANDLED,
        terminal: true,
        reason: 'skill_install_confirmation_already_handled',
      };
    }
    return {
      state: SkillInstallState.INSTALL_CONFIRMATION_ACCEPTED,
      action: SkillInstallAction.CLAIM_PENDING_INSTALL,
      terminal: false,
      reason: 'skill_install_confirmation_claim_required',
      pendingTransition: {
        pendingId,
        from: 'AWAITING_CONFIRMATION',
        to: 'EXECUTING',
      },
    };
  }

  if (confirmation !== 'CLAIMED' || pending.status !== 'EXECUTING') {
    return {
      state: SkillInstallState.INSTALL_CONFIRMATION_ALREADY_HANDLED,
      action: SkillInstallAction.RETURN_PENDING_INSTALL_ALREADY_HANDLED,
      terminal: true,
      reason: 'skill_install_confirmation_not_claimed',
    };
  }

  const number = positiveSkillNumber(pending.number);
  const target = normalizedTarget(pending.resolvedTarget, true);
  if (!target || number === null) {
    return inputRequired('invalid_pending_skill_install_confirmation', ['pendingSkillInstallConfirmation']);
  }
  return {
    state: SkillInstallState.INSTALL_EXECUTION_READY,
    action: SkillInstallAction.RUN_SKILL_INSTALL,
    terminal: false,
    reason: 'claimed_skill_install_confirmation_ready',
    command: installCommand(target),
    resolvedTarget: target,
    expectedInstall: expectedInstallBinding(target),
    pendingId,
  };
}

export function classifySkillInstallPrerequisites(input = {}) {
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const pendingResult = classifyPendingConfirmation(input, context);
  if (pendingResult) return pendingResult;

  const install = input.install && typeof input.install === 'object' ? input.install : {};
  const target = install.target && typeof install.target === 'object' ? install.target : null;
  const missing = [];
  if (!target || !['identity', 'number'].includes(target.kind)) missing.push('target');
  if (install.explicitlyAuthorized !== true) missing.push('authorization');
  if (missing.length > 0) return inputRequired('skill_install_input_missing', missing);

  if (target.kind === 'identity') {
    const resolvedTarget = normalizedTarget(target);
    if (!resolvedTarget) return inputRequired('skill_install_identity_invalid', ['publisher_name_or_version']);
    return {
      state: SkillInstallState.INSTALL_EXECUTION_READY,
      action: SkillInstallAction.RUN_SKILL_INSTALL,
      terminal: false,
      reason: 'skill_install_identity_ready',
      command: installCommand(resolvedTarget),
      resolvedTarget,
      expectedInstall: expectedInstallBinding(resolvedTarget),
    };
  }

  const number = positiveSkillNumber(target.number);
  if (number === null) {
    return inputRequired('skill_install_input_missing', ['target']);
  }
  const snapshot = recentDisplayedSkillListSnapshot(context, {
    allowedScopes: ['tippable', 'all'],
  });
  if (!snapshot) {
    return inputRequired('recent_skill_list_snapshot_missing', ['publisher_name_or_recent_skill_number']);
  }
  const row = snapshot.rows.find((item) => item.number === number);
  if (!row) return inputRequired('skill_number_not_in_recent_snapshot', ['available_skill_number']);

  const pendingId = normalizedString(input.pendingId ?? input.pending_id);
  if (!pendingId) return inputRequired('skill_install_pending_id_missing', ['pendingId']);
  const now = skillContextTimestampMs(context.now ?? context.nowMs ?? context.now_ms);
  const resolvedTarget = resolvedSkillIdentity(row);
  const pendingSkillInstallConfirmation = {
    pendingId,
    status: 'AWAITING_CONFIRMATION',
    number,
    resolvedTarget,
    snapshotId: snapshot.snapshotId,
    ...skillContextIdentity(context),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(snapshot.displayedAtMs + SKILL_LIST_CONTEXT_TTL_MS).toISOString(),
  };
  const displayIdentity = resolvedTarget.versionNo
    ? `${resolvedTarget.publisher}/${resolvedTarget.skillName}@${resolvedTarget.versionNo}`
    : `${resolvedTarget.publisher}/${resolvedTarget.skillName}（version: latest）`;
  return {
    state: SkillInstallState.INSTALL_CONFIRMATION_REQUIRED,
    action: SkillInstallAction.ASK_FOR_INSTALL_CONFIRMATION,
    terminal: false,
    reason: 'skill_install_number_confirmation_required',
    pendingSkillInstallConfirmation,
    confirmationPrompt: `确认安装第 ${number} 号 ${displayIdentity} 吗？`,
  };
}

function parseStrictJson(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

function observationEnvelope(observation = {}, error = false) {
  const source = error
    ? observation.stderr ?? observation.error ?? observation
    : observation.stdout ?? observation.result ?? observation;
  const parsed = parseStrictJson(source);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function validExpectedInstall(expectedInstall) {
  if (!expectedInstall || typeof expectedInstall !== 'object' || Array.isArray(expectedInstall)) return false;
  if (!Object.hasOwn(expectedInstall, 'requestedVersion')) return false;
  const publisher = expectedInstall.publisher;
  const skillName = expectedInstall.skillName ?? expectedInstall.skill_name;
  const requestedVersion = expectedInstall.requestedVersion;
  return typeof publisher === 'string'
    && typeof skillName === 'string'
    && validPublisherSegment(publisher)
    && validSkillName(skillName)
    && (requestedVersion === null
      || (typeof requestedVersion === 'string' && validVersion(requestedVersion)));
}

function installBindingMatches(data = {}, expectedInstall = {}) {
  if (!Object.hasOwn(data, 'requestedVersion')) return false;
  const actualPublisher = data.publisher;
  const actualSkillName = data.skillName;
  const actualVersion = data.requestedVersion;
  const expectedVersion = expectedInstall.requestedVersion;
  if (typeof actualPublisher !== 'string' || typeof actualSkillName !== 'string') return false;
  if (actualVersion !== null && typeof actualVersion !== 'string') return false;
  return actualPublisher === expectedInstall.publisher
    && actualSkillName === (expectedInstall.skillName ?? expectedInstall.skill_name)
    && actualVersion === expectedVersion;
}

export function classifySkillInstallObservation(observation = {}) {
  const exitCode = Number(observation.exitCode ?? observation.exit_code ?? 0);
  if (exitCode !== 0) {
    const envelope = observationEnvelope(observation, true);
    return {
      state: SkillInstallState.INSTALL_FAILED,
      action: SkillInstallAction.RETURN_INSTALL_FAILURE,
      terminal: true,
      reason: 'skill_install_cli_error',
      installStatus: 'FAILED',
      exitCode,
      ...(envelope.error ? { error: envelope.error } : {}),
    };
  }

  const envelope = observationEnvelope(observation);
  if (envelope.ok === false) {
    return {
      state: SkillInstallState.INSTALL_FAILED,
      action: SkillInstallAction.RETURN_INSTALL_FAILURE,
      terminal: true,
      reason: 'skill_install_cli_error',
      installStatus: 'FAILED',
      error: envelope.error,
    };
  }
  const envelopeKeys = Object.keys(envelope).sort();
  if (envelopeKeys.length !== 2
    || envelopeKeys[0] !== 'data'
    || envelopeKeys[1] !== 'ok'
    || envelope.ok !== true
    || !envelope.data
    || typeof envelope.data !== 'object'
    || Array.isArray(envelope.data)) {
    return {
      state: SkillInstallState.INSTALL_UNKNOWN,
      action: SkillInstallAction.SURFACE_ERROR,
      terminal: true,
      reason: 'invalid_skill_install_envelope',
      installStatus: 'UNKNOWN',
    };
  }
  const data = envelope.data;
  if (['skill_name', 'requested_version', 'dry_run'].some((key) => Object.hasOwn(data, key))) {
    return {
      state: SkillInstallState.INSTALL_UNKNOWN,
      action: SkillInstallAction.SURFACE_ERROR,
      terminal: true,
      reason: 'invalid_skill_install_result_schema',
      installStatus: 'UNKNOWN',
      data,
    };
  }
  const expectedInstall = observation.expectedInstall ?? observation.expected_install;
  if (!validExpectedInstall(expectedInstall)) {
    return {
      state: SkillInstallState.INSTALL_UNKNOWN,
      action: SkillInstallAction.SURFACE_ERROR,
      terminal: true,
      reason: 'skill_install_binding_missing',
      installStatus: 'UNKNOWN',
    };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || !installBindingMatches(data, expectedInstall)) {
    return {
      state: SkillInstallState.INSTALL_UNKNOWN,
      action: SkillInstallAction.SURFACE_ERROR,
      terminal: true,
      reason: 'skill_install_binding_mismatch',
      installStatus: 'UNKNOWN',
    };
  }

  if (Object.hasOwn(data, 'dryRun') && data.dryRun !== true) {
    return {
      state: SkillInstallState.INSTALL_UNKNOWN,
      action: SkillInstallAction.SURFACE_ERROR,
      terminal: true,
      reason: 'invalid_skill_install_dry_run_value',
      installStatus: 'UNKNOWN',
      data,
    };
  }

  if (data.dryRun === true && data.action !== 'planned') {
    return {
      state: SkillInstallState.INSTALL_UNKNOWN,
      action: SkillInstallAction.SURFACE_ERROR,
      terminal: true,
      reason: 'invalid_skill_install_dry_run_action',
      installStatus: 'UNKNOWN',
      data,
    };
  }

  if (data.action === 'planned' && data.dryRun === true) {
    return {
      state: SkillInstallState.INSTALL_PLANNED,
      action: SkillInstallAction.RETURN_INSTALL_PLAN,
      terminal: true,
      reason: 'skill_install_dry_run_planned',
      installStatus: 'PLANNED',
      data,
    };
  }
  if (data.action === 'installed' || data.action === 'updated') {
    return {
      state: SkillInstallState.INSTALL_SUCCEEDED,
      action: SkillInstallAction.RETURN_INSTALL_SUCCESS,
      terminal: true,
      reason: `skill_${data.action}`,
      installStatus: data.action.toUpperCase(),
      data,
    };
  }
  if (data.action === 'unchanged') {
    return {
      state: SkillInstallState.INSTALL_UNCHANGED,
      action: SkillInstallAction.RETURN_INSTALL_SUCCESS,
      terminal: true,
      reason: 'skill_install_unchanged',
      installStatus: 'UNCHANGED',
      data,
    };
  }
  return {
    state: SkillInstallState.INSTALL_UNKNOWN,
    action: SkillInstallAction.SURFACE_ERROR,
    terminal: true,
    reason: 'unrecognized_skill_install_status',
    installStatus: 'UNKNOWN',
    data,
  };
}

export function formatSkillInstallFsmMarker(workflow) {
  return formatWorkflowMarker('SKILL_INSTALL_FSM', workflow);
}
