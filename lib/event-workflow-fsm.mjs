export const EventWorkflowDomain = Object.freeze({
  PAYMENT_METHOD: 'PAYMENT_METHOD',
  PAYMENT: 'PAYMENT',
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
  START_EVENT_POLL: 'START_EVENT_POLL',
  VERIFY_RESOURCE_STATUS: 'VERIFY_RESOURCE_STATUS',
  RETURN_PENDING_WITH_RESUME: 'RETURN_PENDING_WITH_RESUME',
  WAIT_EVENT: 'WAIT_EVENT',
  SURFACE_EVENT_ERROR: 'SURFACE_EVENT_ERROR',
  IGNORE_INTERMEDIATE: 'IGNORE_INTERMEDIATE',
  LOG_ONLY: 'LOG_ONLY',
});

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
  if (/^[A-Za-z0-9._:/=-]+$/u.test(stringValue)) return stringValue;
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

function eventGroupValues(event = {}, group = []) {
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
  if (resourceId) values.push(resourceId);
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
    if (expectedGroupValues(expectedResource, ['orderId']).length > 0) return [['orderId']];
    const identityGroups = [
      ['customerId'],
      ['merchantId'],
      ['skillId'],
    ].filter((group) => expectedGroupValues(expectedResource, group).length > 0);
    return identityGroups.length >= 2 ? identityGroups : [];
  }
  return [];
}

export function classifyEventWorkflow(event = {}) {
  const type = eventTypeOf(event);
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
    case 'account-created':
      return {
        domain: EventWorkflowDomain.SKILL_TIP_ACCOUNT,
        state: EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED,
        action: EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT,
        terminal: true,
        reason: type,
      };
    case 'account-reloaded':
      return {
        domain: EventWorkflowDomain.SKILL_TIP_ACCOUNT,
        state: EventWorkflowState.SKILL_TIP_ACCOUNT_RELOADED,
        action: EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT,
        terminal: true,
        reason: type,
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

  const command = ['clink-cli', 'events', 'poll'];
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
    domain: workflow.domain,
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

  if (parsed.timedOut === true) {
    return {
      domain: classifyEventWorkflow({ eventType: normalized.eventType }).domain,
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

  const targetEvents = parsed.events.filter((event) => eventTypeOf(event) === normalized.eventType);
  for (const event of targetEvents) {
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

  if (targetEvents.length > 0) {
    return {
      domain: classifyEventWorkflow({ eventType: normalized.eventType }).domain,
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
    domain: classifyEventWorkflow({ eventType: normalized.eventType }).domain,
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
