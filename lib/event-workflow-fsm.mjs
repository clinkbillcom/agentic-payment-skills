export const EventWorkflowDomain = Object.freeze({
  PAYMENT_METHOD: 'PAYMENT_METHOD',
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  RISK_RULE: 'RISK_RULE',
  VIC: 'VIC',
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
  ORDER_CREATED_OBSERVED: 'ORDER_CREATED_OBSERVED',
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
  IGNORE_INTERMEDIATE: 'IGNORE_INTERMEDIATE',
  LOG_ONLY: 'LOG_ONLY',
});

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

function compactValues(values) {
  return values.map(normalizedString).filter((value) => value !== null);
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
      default:
        values.push(payload?.[key], originalEvent?.[key]);
        break;
    }
  }
  if (resourceId) values.push(resourceId);
  return compactValues(values);
}

function correlationGroupsFor(event = {}, workflow = {}) {
  const type = eventTypeOf(event);
  if (workflow.domain === EventWorkflowDomain.PAYMENT) return [['orderId', 'sessionId']];
  if (workflow.domain === EventWorkflowDomain.REFUND) return [['refundOrderId', 'refundId']];
  if (workflow.domain === EventWorkflowDomain.VIC) {
    return type === 'purchase_instruction.activated'
      ? [['purchaseInstructionId', 'instructionId']]
      : [['paymentInstrumentId']];
  }
  if (workflow.domain === EventWorkflowDomain.PAYMENT_METHOD) return [['paymentInstrumentId']];
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

export function correlateEventWorkflow(event = {}, expectedResource = {}) {
  const workflow = classifyEventWorkflow(event);
  const groups = correlationGroupsFor(event, workflow);
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
