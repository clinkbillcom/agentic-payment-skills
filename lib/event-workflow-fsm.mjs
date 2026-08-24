export const EventWorkflowDomain = Object.freeze({
  PAYMENT_METHOD: 'PAYMENT_METHOD',
  PAYMENT: 'PAYMENT',
  AGENT_PAY_ACCOUNT: 'AGENT_PAY_ACCOUNT',
  REFUND: 'REFUND',
  RISK_RULE: 'RISK_RULE',
  VIC: 'VIC',
  SKILL_TIP_ACCOUNT: 'SKILL_TIP_ACCOUNT',
  UNKNOWN: 'UNKNOWN',
});

export const EventWorkflowState = Object.freeze({
  METHOD_BOUND: 'METHOD_BOUND',
  METHOD_UPDATED: 'METHOD_UPDATED',
  METHOD_DEFAULT_CHANGED: 'METHOD_DEFAULT_CHANGED',
  PAY_ASYNC_SUCCEEDED: 'PAY_ASYNC_SUCCEEDED',
  PAY_ASYNC_FAILED: 'PAY_ASYNC_FAILED',
  REFUND_SUCCEEDED: 'REFUND_SUCCEEDED',
  REFUND_FAILED: 'REFUND_FAILED',
  REFUND_REJECTED: 'REFUND_REJECTED',
  RISK_RULE_UPDATED: 'RISK_RULE_UPDATED',
  VIC_READY: 'VIC_READY',
  SKILL_TIP_ACCOUNT_CREATED: 'SKILL_TIP_ACCOUNT_CREATED',
  SKILL_TIP_ACCOUNT_RELOADED: 'SKILL_TIP_ACCOUNT_RELOADED',
  AGENT_PAY_ACCOUNT_EVENT_CORRELATED: 'AGENT_PAY_ACCOUNT_EVENT_CORRELATED',
  AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED: 'AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED',
  AGENT_PAY_ACCOUNT_EVENT_AMBIGUOUS: 'AGENT_PAY_ACCOUNT_EVENT_AMBIGUOUS',
  ORDER_CREATED_OBSERVED: 'ORDER_CREATED_OBSERVED',
  EVENT_POLL_REQUIRED: 'EVENT_POLL_REQUIRED',
  EVENT_STATUS_VERIFY_REQUIRED: 'EVENT_STATUS_VERIFY_REQUIRED',
  EVENT_NOT_CORRELATED: 'EVENT_NOT_CORRELATED',
  EVENT_PENDING: 'EVENT_PENDING',
  EVENT_TIMEOUT: 'EVENT_TIMEOUT',
  EVENT_INVALID: 'EVENT_INVALID',
  UNKNOWN_EVENT: 'UNKNOWN_EVENT',
});

export const EventWorkflowAction = Object.freeze({
  UPDATE_CACHE_AND_RETURN: 'UPDATE_CACHE_AND_RETURN',
  CACHE_ONLY: 'CACHE_ONLY',
  RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION: 'RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION',
  RETURN_FAILURE_AND_CLEAR_PENDING: 'RETURN_FAILURE_AND_CLEAR_PENDING',
  RETURN_REFUND_FINAL: 'RETURN_REFUND_FINAL',
  RETURN_RISK_RULE_UPDATED: 'RETURN_RISK_RULE_UPDATED',
  MARK_VIC_READY_AND_RETURN: 'MARK_VIC_READY_AND_RETURN',
  RETURN_SKILL_TIP_ACCOUNT_EVENT: 'RETURN_SKILL_TIP_ACCOUNT_EVENT',
  RETURN_AGENT_PAY_ACCOUNT_EVENT: 'RETURN_AGENT_PAY_ACCOUNT_EVENT',
  RETURN_AGENT_PAY_ACCOUNT_AMBIGUOUS: 'RETURN_AGENT_PAY_ACCOUNT_AMBIGUOUS',
  START_EVENT_POLL: 'START_EVENT_POLL',
  VERIFY_RESOURCE_STATUS: 'VERIFY_RESOURCE_STATUS',
  RETURN_PENDING_WITH_RESUME: 'RETURN_PENDING_WITH_RESUME',
  WAIT_EVENT: 'WAIT_EVENT',
  SURFACE_EVENT_ERROR: 'SURFACE_EVENT_ERROR',
  IGNORE_INTERMEDIATE: 'IGNORE_INTERMEDIATE',
  LOG_ONLY: 'LOG_ONLY',
});

const ACCOUNT_EVENT_TYPE_ALIASES = Object.freeze({
  'account-created': 'account.created',
  'account.created': 'account.created',
  'account-reloaded': 'account.reloaded',
  'account.reloaded': 'account.reloaded',
});

const EVENT_TYPE_ALIASES = Object.freeze({
  'payment_method.updated': 'payment_method.update',
});

export function canonicalAccountEventType(value) {
  return ACCOUNT_EVENT_TYPE_ALIASES[String(value ?? '').trim()] ?? null;
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const parsedLines = trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((line) => line !== null);
    if (parsedLines.length > 0) return parsedLines.at(-1);
    return value;
  }
}

function unwrapCliEnvelope(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  if (parsed.result && typeof parsed.result === 'object') return parsed.result;
  return parsed;
}

export function eventTypeOf(event) {
  return event?.eventType || event?.data?.type || event?.type || '';
}

function eventTypesMatch(actual, expected) {
  const canonicalType = (value) => {
    const raw = String(value ?? '').trim();
    return canonicalAccountEventType(raw) ?? EVENT_TYPE_ALIASES[raw] ?? raw;
  };
  const canonicalActual = canonicalType(actual);
  const expectedTypes = String(expected ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return expectedTypes.some((expectedType) => {
    return canonicalActual === canonicalType(expectedType);
  });
}

function eventPayloadOf(event = {}) {
  return event?.data && typeof event.data === 'object' ? event.data : event;
}

function isVisaRegistrationReadyEvent(event = {}) {
  const payload = eventPayloadOf(event);
  return payload?.visaRegistrationSucceeded === true;
}

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function normalizedCurrency(value) {
  const normalized = normalizedString(value)?.trim().toUpperCase();
  return normalized || null;
}

function normalizedAmount(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/u.test(raw)) return null;
  const [integerPart, decimalPart = ''] = raw.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/u, '');
  const decimal = decimalPart.replace(/0+$/u, '');
  return decimal ? `${integer}.${decimal}` : integer;
}

function normalizedIdentityValue(key, value) {
  const normalized = normalizedString(value)?.trim();
  if (!normalized) return null;
  return key === 'customerEmail' ? normalized.toLowerCase() : normalized;
}

function samePaymentCandidate(candidate, currentPayment) {
  if (candidate === currentPayment) return true;
  const candidateWatchId = normalizedString(
    candidate?.accountWatchId ?? candidate?.account_watch_id,
  );
  const currentWatchId = normalizedString(
    currentPayment?.accountWatchId ?? currentPayment?.account_watch_id,
  );
  if (candidateWatchId !== null && currentWatchId !== null) {
    return candidateWatchId === currentWatchId;
  }
  const candidateId = normalizedString(candidate?.paymentId ?? candidate?.payment_id);
  const currentId = normalizedString(currentPayment?.paymentId ?? currentPayment?.payment_id);
  return candidateId !== null && currentId !== null && candidateId === currentId;
}

function candidateMatchesScope(candidate, currentPayment) {
  const candidateEnvironment = normalizedString(candidate?.environment ?? candidate?.environmentLock);
  const currentEnvironment = normalizedString(
    currentPayment?.environment ?? currentPayment?.environmentLock,
  );
  const candidateWallet = normalizedString(
    candidate?.walletId ?? candidate?.wallet_id ?? candidate?.customerId ?? candidate?.customer_id,
  );
  const currentWallet = normalizedString(
    currentPayment?.walletId
      ?? currentPayment?.wallet_id
      ?? currentPayment?.customerId
      ?? currentPayment?.customer_id,
  );
  return candidateEnvironment !== null
    && currentEnvironment !== null
    && candidateEnvironment === currentEnvironment
    && candidateWallet !== null
    && currentWallet !== null
    && candidateWallet === currentWallet;
}

function candidateIsActive(candidate, nowMs, maxAgeMs) {
  const startedAtMs = Number(candidate?.startedAtMs ?? candidate?.started_at_ms);
  if (!Number.isFinite(startedAtMs)) return false;
  const ageMs = nowMs - startedAtMs;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function scoreAccountIdentity(candidate, eventData) {
  let score = 0;
  for (const key of ['customerEmail', 'webSite', 'userId']) {
    const expected = normalizedIdentityValue(key, candidate?.[key]);
    const observed = normalizedIdentityValue(key, eventData?.[key]);
    if (expected === null || observed === null) continue;
    if (expected !== observed) return { candidate, conflict: true, score: 0 };
    score += 1;
  }
  return { candidate, conflict: false, score };
}

function agentPayAccountCandidateResult({
  state,
  action,
  event,
  canonicalEventType,
  matched = false,
  ambiguous = false,
  candidate,
  selectedCandidate,
  reason,
}) {
  return {
    domain: EventWorkflowDomain.AGENT_PAY_ACCOUNT,
    state,
    action,
    terminal: state !== EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED,
    reason,
    matched,
    ambiguous,
    canonicalEventType,
    event,
    ...(candidate ? { candidate } : {}),
    ...(selectedCandidate ? { selectedCandidate } : {}),
  };
}

export function classifyAgentPayAccountEventCandidate(input = {}) {
  const event = input.event ?? {};
  const canonicalEventType = canonicalAccountEventType(eventTypeOf(event));
  const currentPayment = input.currentPayment ?? input.current_payment ?? {};
  const eventData = eventPayloadOf(event);
  const eventAmount = normalizedAmount(eventData?.amount);
  const eventCurrency = normalizedCurrency(eventData?.currency);
  const nowMs = Number(input.nowMs ?? input.now_ms ?? Date.now());
  const maxAgeMs = Number(input.maxAgeMs ?? input.max_age_ms ?? 60_000);

  const notCorrelated = (reason, selectedCandidate) => agentPayAccountCandidateResult({
    state: EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED,
    action: EventWorkflowAction.WAIT_EVENT,
    event,
    canonicalEventType,
    selectedCandidate,
    reason,
  });

  if (!canonicalEventType) return notCorrelated('unsupported_account_event_type');
  if (eventAmount === null || eventCurrency === null) {
    return notCorrelated('account_event_amount_or_currency_missing');
  }
  if (!Number.isFinite(nowMs) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
    return notCorrelated('account_event_candidate_window_invalid');
  }

  const suppliedCandidates = Array.isArray(input.activePayments ?? input.active_payments)
    ? [...(input.activePayments ?? input.active_payments)]
    : [];
  if (!suppliedCandidates.some((candidate) => samePaymentCandidate(candidate, currentPayment))) {
    suppliedCandidates.unshift(currentPayment);
  }

  const scoredCandidates = suppliedCandidates
    .filter((candidate) => candidateMatchesScope(candidate, currentPayment))
    .filter((candidate) => candidateIsActive(candidate, nowMs, maxAgeMs))
    .filter((candidate) => normalizedAmount(candidate?.amount) === eventAmount)
    .filter((candidate) => normalizedCurrency(candidate?.currency) === eventCurrency)
    .map((candidate) => scoreAccountIdentity(candidate, eventData))
    .filter(({ conflict }) => !conflict);

  if (scoredCandidates.length === 0) return notCorrelated('account_event_candidate_not_found');

  let selected;
  if (scoredCandidates.length === 1) {
    [selected] = scoredCandidates;
  } else {
    const highestScore = Math.max(...scoredCandidates.map(({ score }) => score));
    const highestCandidates = scoredCandidates.filter(({ score }) => score === highestScore);
    if (highestScore <= 0 || highestCandidates.length !== 1) {
      return agentPayAccountCandidateResult({
        state: EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_AMBIGUOUS,
        action: EventWorkflowAction.RETURN_AGENT_PAY_ACCOUNT_AMBIGUOUS,
        event,
        canonicalEventType,
        ambiguous: true,
        reason: 'account_event_candidate_ambiguous',
      });
    }
    [selected] = highestCandidates;
  }

  if (!samePaymentCandidate(selected.candidate, currentPayment)) {
    return notCorrelated('account_event_correlated_to_other_payment', selected.candidate);
  }

  return agentPayAccountCandidateResult({
    state: EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED,
    action: EventWorkflowAction.RETURN_AGENT_PAY_ACCOUNT_EVENT,
    event,
    canonicalEventType,
    matched: true,
    candidate: selected.candidate,
    reason: 'agent_pay_account_event_correlated',
  });
}

function booleanValue(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function shellWord(value) {
  const stringValue = String(value);
  if (/^[A-Za-z0-9._:/=,-]+$/u.test(stringValue)) return stringValue;
  return `'${stringValue.replaceAll("'", "'\\''")}'`;
}

function compactValues(values) {
  return values.map(normalizedString).filter((value) => value !== null);
}

function normalizeExpectedResourceForEvent(eventType, expectedResource = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(expectedResource || {})) {
    const stringValue = normalizedString(value);
    if (stringValue !== null) normalized[key] = stringValue;
  }

  if (eventType === 'purchase_instruction.activated') {
    const instructionId = normalized.instructionId
      || normalized.instruction_id
      || normalized.purchaseInstructionId
      || normalized.purchase_instruction_id;
    if (instructionId) {
      normalized.instructionId = instructionId;
      normalized.purchaseInstructionId = instructionId;
    }
  }

  return normalized;
}

function normalizedWaitSpec(waitSpec = {}) {
  const eventType = normalizedString(
    waitSpec.eventType
      ?? waitSpec.event_type
      ?? waitSpec.type
      ?? waitSpec.requiredEventType
      ?? waitSpec.required_event_type,
  );
  const expectedResource = normalizeExpectedResourceForEvent(
    eventType,
    waitSpec.expectedResource ?? waitSpec.expected_resource ?? {},
  );

  return {
    ...waitSpec,
    eventType,
    expectedResource,
    verifyCommand: normalizedString(waitSpec.verifyCommand ?? waitSpec.verify_command),
    resumeCommand: normalizedString(waitSpec.resumeCommand ?? waitSpec.resume_command),
  };
}

function waitSpecDomain(waitSpec = {}) {
  if ((waitSpec.purpose ?? waitSpec.accountEventPurpose) === 'AGENT_PAY_ACCOUNT') {
    return EventWorkflowDomain.AGENT_PAY_ACCOUNT;
  }
  if ((waitSpec.purpose ?? waitSpec.eventPurpose) === 'VIC_READINESS') {
    return EventWorkflowDomain.VIC;
  }
  return classifyEventWorkflow({ eventType: waitSpec.eventType }).domain;
}

function isSingleAttemptWait(waitSpec = {}) {
  return booleanValue(waitSpec.singleAttempt ?? waitSpec.single_attempt) === true;
}

function singleAttemptVerificationResult(waitSpec, reason, detail = {}) {
  const continuation = waitSpec.continuation && typeof waitSpec.continuation === 'object'
    && !Array.isArray(waitSpec.continuation)
    ? waitSpec.continuation
    : {};
  return {
    domain: waitSpecDomain(waitSpec),
    state: EventWorkflowState.EVENT_STATUS_VERIFY_REQUIRED,
    action: EventWorkflowAction.VERIFY_RESOURCE_STATUS,
    terminal: false,
    reason,
    eventType: waitSpec.eventType,
    expectedResource: waitSpec.expectedResource,
    matched: false,
    verifyCommand: waitSpec.verifyCommand,
    waitSpec,
    continuation,
    ...detail,
  };
}

function payloadValues(event = {}) {
  const payload = eventPayloadOf(event);
  return {
    event,
    payload,
    resourceId: normalizedString(event?.resourceId ?? payload?.resourceId),
  };
}

function groupLabel(group) {
  return group.join('|');
}

function expectedGroupValues(expectedResource = {}, group = []) {
  return compactValues(group.map((key) => expectedResource[key]));
}

function eventGroupValues(event = {}, group = [], includeResourceId = true) {
  const { event: originalEvent, payload, resourceId } = payloadValues(event);
  const values = [];
  for (const key of group) {
    switch (key) {
      case 'paymentInstrumentId':
        values.push(
          payload?.paymentInstrumentId,
          payload?.payment_instrument_id,
          originalEvent?.paymentInstrumentId,
        );
        break;
      case 'orderId':
        values.push(payload?.orderId, payload?.order_id, originalEvent?.orderId);
        break;
      case 'sessionId':
        values.push(payload?.sessionId, payload?.session_id, originalEvent?.sessionId);
        break;
      case 'refundOrderId':
        values.push(payload?.refundOrderId, payload?.refund_order_id, originalEvent?.refundOrderId);
        break;
      case 'refundId':
        values.push(payload?.refundId, payload?.refund_id, originalEvent?.refundId);
        break;
      case 'purchaseInstructionId':
        values.push(
          payload?.purchaseInstructionId,
          payload?.purchase_instruction_id,
          originalEvent?.purchaseInstructionId,
        );
        break;
      case 'instructionId':
        values.push(payload?.instructionId, payload?.instruction_id, originalEvent?.instructionId);
        break;
      case 'customerId':
        values.push(payload?.customerId, payload?.customer_id, originalEvent?.customerId);
        break;
      case 'merchantId':
        values.push(payload?.merchantId, payload?.merchant_id, originalEvent?.merchantId);
        break;
      case 'skillId':
        values.push(payload?.skillId, payload?.skill_id, originalEvent?.skillId);
        break;
      default:
        values.push(payload?.[key], originalEvent?.[key]);
        break;
    }
  }
  if (includeResourceId && resourceId) values.push(resourceId);
  return compactValues(values);
}

function correlationGroupsFor(event = {}, workflow = {}, expectedResource = {}) {
  const type = eventTypeOf(event);
  if (workflow.domain === EventWorkflowDomain.PAYMENT) return [['orderId', 'sessionId']];
  if (workflow.domain === EventWorkflowDomain.REFUND) return [['refundOrderId', 'refundId']];
  if (workflow.domain === EventWorkflowDomain.VIC) {
    return type === 'purchase_instruction.activated'
      ? [['purchaseInstructionId', 'instructionId']]
      : [['paymentInstrumentId']];
  }
  if (workflow.domain === EventWorkflowDomain.PAYMENT_METHOD) return [['paymentInstrumentId']];
  if (workflow.domain === EventWorkflowDomain.SKILL_TIP_ACCOUNT) {
    const expectedOrder = expectedGroupValues(expectedResource, ['orderId']);
    const eventOrder = eventGroupValues(event, ['orderId']);
    const explicitEventOrder = eventGroupValues(event, ['orderId'], false);
    if (expectedOrder.length > 0 && (
      explicitEventOrder.length > 0
      || expectedOrder.some((value) => eventOrder.includes(value))
    )) return [['orderId']];
    const hasCustomer = expectedGroupValues(expectedResource, ['customerId']).length > 0;
    const hasMerchant = expectedGroupValues(expectedResource, ['merchantId']).length > 0;
    const hasSkill = expectedGroupValues(expectedResource, ['skillId']).length > 0;
    const candidates = [
      hasCustomer && hasMerchant ? [['customerId'], ['merchantId']] : null,
      hasCustomer && hasSkill ? [['customerId'], ['skillId']] : null,
      hasMerchant && hasSkill ? [['merchantId'], ['skillId']] : null,
    ].filter((candidate) => candidate !== null);
    const available = candidates.find((candidate) => (
      candidate.every((group) => eventGroupValues(event, group).length > 0)
    ));
    return available ?? candidates[0] ?? (expectedOrder.length > 0 ? [['orderId']] : []);
  }
  return [];
}

export function classifyEventWorkflow(event = {}) {
  const observedType = eventTypeOf(event);
  const type = canonicalAccountEventType(observedType) ?? observedType;
  switch (type) {
    case 'payment_method.added':
      return {
        domain: EventWorkflowDomain.PAYMENT_METHOD,
        state: EventWorkflowState.METHOD_BOUND,
        action: EventWorkflowAction.UPDATE_CACHE_AND_RETURN,
        terminal: true,
        reason: type,
      };
    case 'payment_method.updated':
    case 'payment_method.update':
      if (isVisaRegistrationReadyEvent(event)) {
        return {
          domain: EventWorkflowDomain.VIC,
          state: EventWorkflowState.VIC_READY,
          action: EventWorkflowAction.MARK_VIC_READY_AND_RETURN,
          terminal: true,
          reason: `${type}_vic_ready`,
        };
      }
      return {
        domain: EventWorkflowDomain.PAYMENT_METHOD,
        state: EventWorkflowState.METHOD_UPDATED,
        action: EventWorkflowAction.CACHE_ONLY,
        terminal: true,
        reason: type,
      };
    case 'payment_method.default_change':
      return {
        domain: EventWorkflowDomain.PAYMENT_METHOD,
        state: EventWorkflowState.METHOD_DEFAULT_CHANGED,
        action: EventWorkflowAction.UPDATE_CACHE_AND_RETURN,
        terminal: true,
        reason: type,
      };
    case 'agent_order.created':
      return {
        domain: EventWorkflowDomain.PAYMENT,
        state: EventWorkflowState.ORDER_CREATED_OBSERVED,
        action: EventWorkflowAction.IGNORE_INTERMEDIATE,
        terminal: false,
        reason: type,
      };
    case 'agent_order.succeeded':
      return {
        domain: EventWorkflowDomain.PAYMENT,
        state: EventWorkflowState.PAY_ASYNC_SUCCEEDED,
        action: EventWorkflowAction.RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION,
        terminal: true,
        reason: type,
      };
    case 'agent_order.failed':
      return {
        domain: EventWorkflowDomain.PAYMENT,
        state: EventWorkflowState.PAY_ASYNC_FAILED,
        action: EventWorkflowAction.RETURN_FAILURE_AND_CLEAR_PENDING,
        terminal: true,
        reason: type,
      };
    case 'agent_refund.succeeded':
    case 'agent_refund.approved':
      return {
        domain: EventWorkflowDomain.REFUND,
        state: EventWorkflowState.REFUND_SUCCEEDED,
        action: EventWorkflowAction.RETURN_REFUND_FINAL,
        terminal: true,
        reason: type,
      };
    case 'agent_refund.failed':
      return {
        domain: EventWorkflowDomain.REFUND,
        state: EventWorkflowState.REFUND_FAILED,
        action: EventWorkflowAction.RETURN_REFUND_FINAL,
        terminal: true,
        reason: type,
      };
    case 'agent_refund.rejected':
      return {
        domain: EventWorkflowDomain.REFUND,
        state: EventWorkflowState.REFUND_REJECTED,
        action: EventWorkflowAction.RETURN_REFUND_FINAL,
        terminal: true,
        reason: type,
      };
    case 'risk_rule.updated':
      return {
        domain: EventWorkflowDomain.RISK_RULE,
        state: EventWorkflowState.RISK_RULE_UPDATED,
        action: EventWorkflowAction.RETURN_RISK_RULE_UPDATED,
        terminal: true,
        reason: type,
      };
    case 'purchase_instruction.activated':
    case 'vic_device.binding_succeeded':
      return {
        domain: EventWorkflowDomain.VIC,
        state: EventWorkflowState.VIC_READY,
        action: EventWorkflowAction.MARK_VIC_READY_AND_RETURN,
        terminal: true,
        reason: type,
      };
    case 'account.created':
      return {
        domain: EventWorkflowDomain.SKILL_TIP_ACCOUNT,
        state: EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED,
        action: EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT,
        terminal: true,
        reason: observedType,
      };
    case 'account.reloaded':
      return {
        domain: EventWorkflowDomain.SKILL_TIP_ACCOUNT,
        state: EventWorkflowState.SKILL_TIP_ACCOUNT_RELOADED,
        action: EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT,
        terminal: true,
        reason: observedType,
      };
    default:
      return {
        domain: EventWorkflowDomain.UNKNOWN,
        state: EventWorkflowState.UNKNOWN_EVENT,
        action: EventWorkflowAction.LOG_ONLY,
        terminal: false,
        reason: type || 'missing_event_type',
      };
  }
}

export function formatEventFsmLog(workflow) {
  const domain = workflow?.domain || EventWorkflowDomain.UNKNOWN;
  const state = workflow?.state || EventWorkflowState.UNKNOWN_EVENT;
  const action = workflow?.action || EventWorkflowAction.LOG_ONLY;
  const reason = workflow?.reason || 'unspecified';
  return `domain=${domain} state=${state} action=${action} reason=${reason}`;
}

export function waitEventTypeOf(waitSpec = {}) {
  return normalizedWaitSpec(waitSpec).eventType;
}

export function pollCommandForWaitSpec(waitSpec = {}) {
  const normalized = normalizedWaitSpec(waitSpec);
  if (normalized.pollCommand || normalized.poll_command) {
    return normalizedString(normalized.pollCommand ?? normalized.poll_command);
  }

  const command = ['clink', 'events', 'poll'];
  if (normalized.eventType) {
    command.push('--type', shellWord(normalized.eventType));
  }

  const maxWait = normalizedString(
    normalized.maxWaitSeconds
      ?? normalized.max_wait_seconds
      ?? normalized.maxWait
      ?? normalized.max_wait,
  );
  if (maxWait) command.push('--max-wait', shellWord(maxWait));

  if (booleanValue(normalized.noAck ?? normalized.no_ack) !== false) {
    command.push('--no-ack');
  }

  command.push('--format', 'json');
  return command.join(' ');
}

export function classifyEventWaitRequest(waitSpec = {}) {
  const normalized = normalizedWaitSpec(waitSpec);
  if (!normalized.eventType) {
    return {
      domain: EventWorkflowDomain.UNKNOWN,
      state: EventWorkflowState.EVENT_INVALID,
      action: EventWorkflowAction.SURFACE_EVENT_ERROR,
      terminal: false,
      reason: 'missing_event_type',
    };
  }

  const workflow = classifyEventWorkflow({ eventType: normalized.eventType });
  return {
    domain: waitSpecDomain(normalized) ?? workflow.domain,
    state: EventWorkflowState.EVENT_POLL_REQUIRED,
    action: EventWorkflowAction.START_EVENT_POLL,
    terminal: false,
    reason: 'event_wait_required',
    eventType: normalized.eventType,
    expectedResource: normalized.expectedResource,
    pollCommand: pollCommandForWaitSpec(normalized),
    verifyCommand: normalized.verifyCommand,
  };
}

function normalizePollObservation(observation = {}) {
  const unwrapped = unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? observation);
  const ready = booleanValue(unwrapped.ready ?? unwrapped.hasEvents ?? unwrapped.has_events);
  const timedOut = booleanValue(unwrapped.timedOut ?? unwrapped.timed_out ?? unwrapped.timeout);
  const events = [
    unwrapped.events,
    unwrapped.processedEvents,
    unwrapped.processed_events,
    unwrapped.event ? [unwrapped.event] : null,
  ].find((candidate) => Array.isArray(candidate)) || [];

  return {
    ...unwrapped,
    ready,
    timedOut,
    events,
    resumeCommand: normalizedString(
      unwrapped.resumeCommand
        ?? unwrapped.resume_command
        ?? observation.resumeCommand
        ?? observation.resume_command,
    ),
  };
}

export function classifyEventPollObservation(observation = {}, waitSpec = {}) {
  const normalized = normalizedWaitSpec(waitSpec);
  const pollCommand = pollCommandForWaitSpec(normalized);
  const parsed = normalizePollObservation(observation);
  const singleAttempt = isSingleAttemptWait(normalized) && Boolean(normalized.verifyCommand);

  if (!normalized.eventType) {
    return {
      domain: EventWorkflowDomain.UNKNOWN,
      state: EventWorkflowState.EVENT_INVALID,
      action: EventWorkflowAction.SURFACE_EVENT_ERROR,
      terminal: false,
      reason: 'missing_event_type',
      pollCommand,
    };
  }

  const exitCodeValue = observation.exitCode ?? observation.exit_code;
  const exitCode = exitCodeValue === undefined || exitCodeValue === null ? 0 : Number(exitCodeValue);
  if (!Number.isFinite(exitCode) || exitCode !== 0) {
    const errorEnvelope = unwrapCliEnvelope(observation.stderr ?? observation.stdout ?? {});
    if (singleAttempt) {
      return singleAttemptVerificationResult(normalized, 'single_attempt_event_poll_gap', {
        exitCode,
        error: errorEnvelope.error ?? errorEnvelope,
      });
    }
    return {
      domain: waitSpecDomain(normalized),
      state: EventWorkflowState.EVENT_INVALID,
      action: EventWorkflowAction.SURFACE_EVENT_ERROR,
      terminal: false,
      reason: 'event_poll_cli_error',
      eventType: normalized.eventType,
      expectedResource: normalized.expectedResource,
      exitCode,
      error: errorEnvelope.error ?? errorEnvelope,
      pollCommand,
    };
  }

  if (parsed.timedOut === true) {
    if (singleAttempt) {
      return singleAttemptVerificationResult(normalized, 'single_attempt_event_poll_timeout');
    }
    return {
      domain: waitSpecDomain(normalized),
      state: EventWorkflowState.EVENT_TIMEOUT,
      action: EventWorkflowAction.RETURN_PENDING_WITH_RESUME,
      terminal: false,
      reason: 'event_poll_timeout',
      eventType: normalized.eventType,
      expectedResource: normalized.expectedResource,
      resumeCommand: parsed.resumeCommand || pollCommand,
      pollCommand,
    };
  }

  const targetEvents = parsed.events.filter((event) => (
    eventTypesMatch(eventTypeOf(event), normalized.eventType)
  ));
  const actionableEvents = (normalized.purpose ?? normalized.eventPurpose) === 'VIC_READINESS'
    ? targetEvents.filter((event) => {
        const workflow = classifyEventWorkflow(event);
        return workflow.domain === EventWorkflowDomain.VIC
          && workflow.state === EventWorkflowState.VIC_READY;
      })
    : targetEvents;
  if (
    (normalized.purpose ?? normalized.accountEventPurpose) === 'AGENT_PAY_ACCOUNT'
      && actionableEvents.length > 0
  ) {
    const candidateResults = actionableEvents.map((event) => classifyAgentPayAccountEventCandidate({
      event,
      currentPayment: normalized.currentPayment ?? normalized.current_payment,
      activePayments: normalized.activePayments ?? normalized.active_payments,
      nowMs: normalized.nowMs ?? normalized.now_ms,
      maxAgeMs: normalized.maxAgeMs ?? normalized.max_age_ms,
    }));
    const classified = candidateResults.find((result) => result.matched === true)
      ?? candidateResults.find((result) => result.ambiguous === true)
      ?? candidateResults.at(-1);
    return {
      ...classified,
      eventType: normalized.eventType,
      expectedResource: normalized.expectedResource,
      pollCommand,
    };
  }
  for (const event of actionableEvents) {
    const correlation = correlateEventWorkflow(event, normalized.expectedResource);
    if (correlation.matched) {
      if (correlation.workflow.domain === EventWorkflowDomain.SKILL_TIP_ACCOUNT) {
        return {
          ...correlation.workflow,
          reason: 'optional_account_event_correlated',
          eventType: normalized.eventType,
          expectedResource: normalized.expectedResource,
          matched: true,
          event,
          pollCommand,
        };
      }
      if (singleAttempt) {
        return singleAttemptVerificationResult(normalized, 'single_attempt_event_correlated_verify_status', {
          matched: true,
          event,
          workflow: correlation.workflow,
        });
      }
      return {
        domain: correlation.workflow.domain,
        state: EventWorkflowState.EVENT_STATUS_VERIFY_REQUIRED,
        action: EventWorkflowAction.VERIFY_RESOURCE_STATUS,
        terminal: false,
        reason: 'event_correlated_verify_status',
        eventType: normalized.eventType,
        expectedResource: normalized.expectedResource,
        matched: true,
        event,
        workflow: correlation.workflow,
        verifyCommand: normalized.verifyCommand,
        pollCommand,
      };
    }
  }

  if (singleAttempt) {
    const reason = actionableEvents.length > 0
      ? 'single_attempt_event_not_correlated'
      : targetEvents.length > 0
        ? 'single_attempt_event_not_actionable'
        : 'single_attempt_event_not_observed';
    return singleAttemptVerificationResult(normalized, reason);
  }

  if (targetEvents.length > 0) {
    return {
      domain: waitSpecDomain(normalized),
      state: EventWorkflowState.EVENT_NOT_CORRELATED,
      action: EventWorkflowAction.WAIT_EVENT,
      terminal: false,
      reason: 'event_not_correlated',
      eventType: normalized.eventType,
      expectedResource: normalized.expectedResource,
      matched: false,
      pollCommand,
    };
  }

  return {
    domain: waitSpecDomain(normalized),
    state: EventWorkflowState.EVENT_PENDING,
    action: EventWorkflowAction.WAIT_EVENT,
    terminal: false,
    reason: parsed.ready === false ? 'event_not_ready' : 'event_not_observed',
    eventType: normalized.eventType,
    expectedResource: normalized.expectedResource,
    matched: false,
    pollCommand,
  };
}

export function correlateEventWorkflow(event = {}, expectedResource = {}) {
  const workflow = classifyEventWorkflow(event);
  const groups = correlationGroupsFor(event, workflow, expectedResource);
  const expectedEntries = Object.entries(expectedResource)
    .filter(([, value]) => normalizedString(value) !== null);

  if (groups.length === 0 || expectedEntries.length === 0) {
    return {
      matched: false,
      missingKeys: ['expectedResource'],
      mismatchedKeys: [],
      workflow,
    };
  }

  const missingKeys = [];
  const mismatchedKeys = [];
  for (const group of groups) {
    const expectedValues = expectedGroupValues(expectedResource, group);
    if (expectedValues.length === 0) {
      missingKeys.push(groupLabel(group));
      continue;
    }

    const eventValues = eventGroupValues(event, group);
    if (eventValues.length === 0) {
      missingKeys.push(groupLabel(group));
      continue;
    }

    if (!expectedValues.some((value) => eventValues.includes(value))) {
      mismatchedKeys.push(groupLabel(group));
    }
  }

  return {
    matched: missingKeys.length === 0 && mismatchedKeys.length === 0,
    missingKeys,
    mismatchedKeys,
    workflow,
  };
}
