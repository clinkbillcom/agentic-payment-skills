import { formatWorkflowMarker } from './workflow-marker.mjs';
import { canonicalAccountEventType } from './event-workflow-fsm.mjs';

const ACCOUNT_CREATED_POLL_COMMAND = 'clink-cli events poll --type account-created --max-wait 60 --format json';
const ACCOUNT_RELOADED_POLL_COMMAND = 'clink-cli events poll --type account-reloaded --max-wait 60 --format json';

export const PaymentWorkflowState = Object.freeze({
  PAYMENT_INPUT_MISSING: 'PAYMENT_INPUT_MISSING',
  ACCOUNT_PRECHECK: 'ACCOUNT_PRECHECK',
  READY_TO_PAY: 'READY_TO_PAY',
  PAY_SUBMITTED: 'PAY_SUBMITTED',
  PAY_SYNC_SUCCEEDED: 'PAY_SYNC_SUCCEEDED',
  PAY_SYNC_FAILED: 'PAY_SYNC_FAILED',
  PAY_ACCOUNT_CREATED: 'PAY_ACCOUNT_CREATED',
  PAY_ACCOUNT_RELOADED: 'PAY_ACCOUNT_RELOADED',
  PAY_ACCOUNT_EVENT_WAITING: 'PAY_ACCOUNT_EVENT_WAITING',
  PAY_ACCOUNT_EVENT_NOT_OBSERVED: 'PAY_ACCOUNT_EVENT_NOT_OBSERVED',
  PAY_ACCOUNT_EVENT_AMBIGUOUS: 'PAY_ACCOUNT_EVENT_AMBIGUOUS',
  PAY_ACCOUNT_EVENT_POLL_ERROR: 'PAY_ACCOUNT_EVENT_POLL_ERROR',
  THREE_DS_REQUIRED: 'THREE_DS_REQUIRED',
  PAY_UNKNOWN: 'PAY_UNKNOWN',
  WALLET_SETUP_REQUIRED: 'WALLET_SETUP_REQUIRED',
  CLI_ERROR: 'CLI_ERROR',
});

export const PaymentWorkflowAction = Object.freeze({
  ASK_FOR_INPUT: 'ASK_FOR_INPUT',
  RUN_PRECHECK: 'RUN_PRECHECK',
  RUN_PAY: 'RUN_PAY',
  WAIT_EVENT: 'WAIT_EVENT',
  SEND_3DS_AND_WAIT_EVENT: 'SEND_3DS_AND_WAIT_EVENT',
  START_OPTIONAL_ACCOUNT_EVENT_WATCH: 'START_OPTIONAL_ACCOUNT_EVENT_WATCH',
  WAIT_OPTIONAL_ACCOUNT_EVENT: 'WAIT_OPTIONAL_ACCOUNT_EVENT',
  RETURN_SUCCESS_WITH_ACCOUNT_EVENT: 'RETURN_SUCCESS_WITH_ACCOUNT_EVENT',
  RETURN_SUCCESS_WITHOUT_ACCOUNT_EVENT: 'RETURN_SUCCESS_WITHOUT_ACCOUNT_EVENT',
  RETURN_SUCCESS_WITH_WARNING: 'RETURN_SUCCESS_WITH_WARNING',
  RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION: 'RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION',
  STOP_PAYMENT_FAILURE: 'STOP_PAYMENT_FAILURE',
  VERIFY_BEFORE_RETRY: 'VERIFY_BEFORE_RETRY',
  START_WALLET_SETUP: 'START_WALLET_SETUP',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function unwrapCliEnvelope(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  if (parsed.error && typeof parsed.error === 'object') return parsed.error;
  return parsed;
}

function numericValue(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const ACCOUNT_CORE_FIELDS = Object.freeze([
  'customerEmail',
  'webSite',
  'userId',
  'amount',
  'currency',
]);

function accountEventTypeOf(observation = {}) {
  return canonicalAccountEventType(
    observation.canonicalEventType
      ?? observation.canonical_event_type
      ?? observation.event?.type
      ?? observation.event?.eventType
      ?? observation.eventType
      ?? observation.event_type,
  );
}

function accountCoreInfoOf(event = {}) {
  const data = event?.data && typeof event.data === 'object' && !Array.isArray(event.data)
    ? event.data
    : {};
  const coreInfo = {};
  for (const field of ACCOUNT_CORE_FIELDS) {
    if (Object.hasOwn(data, field)) coreInfo[field] = data[field];
  }
  return coreInfo;
}

function confirmedAccountEventResult(observation, canonicalEventType) {
  const created = canonicalEventType === 'account.created';
  return {
    state: created
      ? PaymentWorkflowState.PAY_ACCOUNT_CREATED
      : PaymentWorkflowState.PAY_ACCOUNT_RELOADED,
    action: PaymentWorkflowAction.RETURN_SUCCESS_WITH_ACCOUNT_EVENT,
    terminal: true,
    reason: created ? 'account_created_correlated' : 'account_reloaded_correlated',
    paymentStatus: 'PAID',
    paymentTerminal: true,
    accountEventStatus: created ? 'CONFIRMED_CREATED' : 'CONFIRMED_RELOADED',
    messageKey: created
      ? 'ACCOUNT_CREATED_AND_MERCHANT_ORDER_CONFIRMED'
      : 'MERCHANT_ORDER_CONFIRMED',
    eventType: canonicalEventType,
    coreInfo: accountCoreInfoOf(observation.event),
    event: observation.event,
  };
}

export function classifyPaymentAccountEventObservation(input = {}) {
  const paymentStatus = input.paymentStatus ?? input.payment_status ?? 'UNKNOWN';
  if (paymentStatus !== 'PAID') {
    return {
      state: PaymentWorkflowState.CLI_ERROR,
      action: PaymentWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'account_event_without_paid_payment',
      paymentStatus,
      accountEventStatus: 'NOT_STARTED',
    };
  }

  const observations = Array.isArray(input.pollObservations ?? input.poll_observations)
    ? (input.pollObservations ?? input.poll_observations)
    : [];
  const matched = observations.filter((observation) => (
    observation?.matched === true && accountEventTypeOf(observation) !== null
  ));
  const created = matched.find((observation) => accountEventTypeOf(observation) === 'account.created');
  const reloaded = matched.find((observation) => accountEventTypeOf(observation) === 'account.reloaded');

  if (created && reloaded) {
    return {
      state: PaymentWorkflowState.PAY_ACCOUNT_EVENT_POLL_ERROR,
      action: PaymentWorkflowAction.RETURN_SUCCESS_WITH_WARNING,
      terminal: true,
      reason: 'mutually_exclusive_account_events_conflict',
      paymentStatus: 'PAID',
      paymentTerminal: true,
      accountEventStatus: 'POLL_ERROR',
      events: [created.event, reloaded.event].filter(Boolean),
    };
  }
  if (created && !reloaded) return confirmedAccountEventResult(created, 'account.created');
  if (reloaded && !created) return confirmedAccountEventResult(reloaded, 'account.reloaded');

  if (observations.some((observation) => (
    observation?.ambiguous === true
      || observation?.state === 'AGENT_PAY_ACCOUNT_EVENT_AMBIGUOUS'
  ))) {
    return {
      state: PaymentWorkflowState.PAY_ACCOUNT_EVENT_AMBIGUOUS,
      action: PaymentWorkflowAction.RETURN_SUCCESS_WITH_WARNING,
      terminal: true,
      reason: 'account_event_candidate_ambiguous',
      paymentStatus: 'PAID',
      paymentTerminal: true,
      accountEventStatus: 'AMBIGUOUS',
    };
  }

  const pollError = (observation) => (
    Boolean(observation?.error)
      || observation?.state === 'EVENT_INVALID'
      || observation?.action === 'SURFACE_EVENT_ERROR'
  );
  const pollSettled = (canonicalEventType) => observations.some((observation) => (
    accountEventTypeOf(observation) === canonicalEventType
      && (
        observation?.timedOut === true
        || observation?.state === 'EVENT_TIMEOUT'
        || pollError(observation)
      )
  ));

  if (pollSettled('account.created') && pollSettled('account.reloaded')) {
    if (observations.some(pollError)) {
      return {
        state: PaymentWorkflowState.PAY_ACCOUNT_EVENT_POLL_ERROR,
        action: PaymentWorkflowAction.RETURN_SUCCESS_WITH_WARNING,
        terminal: true,
        reason: 'optional_account_event_poll_error',
        paymentStatus: 'PAID',
        paymentTerminal: true,
        accountEventStatus: 'POLL_ERROR',
      };
    }
    return {
      state: PaymentWorkflowState.PAY_ACCOUNT_EVENT_NOT_OBSERVED,
      action: PaymentWorkflowAction.RETURN_SUCCESS_WITHOUT_ACCOUNT_EVENT,
      terminal: true,
      reason: 'optional_account_event_not_observed',
      paymentStatus: 'PAID',
      paymentTerminal: true,
      accountEventStatus: 'NOT_OBSERVED',
    };
  }

  return {
    state: PaymentWorkflowState.PAY_ACCOUNT_EVENT_WAITING,
    action: PaymentWorkflowAction.WAIT_OPTIONAL_ACCOUNT_EVENT,
    terminal: false,
    reason: 'optional_account_event_waiting',
    paymentStatus: 'PAID',
    paymentTerminal: true,
    accountEventStatus: 'PENDING',
  };
}

function threeDsRequired(reason) {
  return {
    state: PaymentWorkflowState.THREE_DS_REQUIRED,
    action: PaymentWorkflowAction.SEND_3DS_AND_WAIT_EVENT,
    terminal: false,
    reason,
  };
}

export function classifyPaymentResponse(input = {}, context = {}) {
  const data = unwrapCliEnvelope(input);
  const cpr = data?.channelPaymentResponse && typeof data.channelPaymentResponse === 'object'
    ? data.channelPaymentResponse
    : {};

  if (Number(cpr.flag3DS) === 1 || Number(data.flag3DS) === 1) {
    return threeDsRequired('3ds_required');
  }

  const status = numericValue(cpr.status ?? data.status);
  if (status === 1) {
    const currentPayment = context && typeof context === 'object' && !Array.isArray(context)
      ? { ...context }
      : {};
    return {
      state: PaymentWorkflowState.PAY_SYNC_SUCCEEDED,
      action: PaymentWorkflowAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH,
      terminal: false,
      reason: 'status_1_success',
      paymentStatus: 'PAID',
      paymentTerminal: true,
      accountEventStatus: 'PENDING',
      currentPayment,
      accountWaitSpecs: [
        {
          eventType: 'account-created',
          maxWaitSeconds: 60,
          noAck: false,
          purpose: 'AGENT_PAY_ACCOUNT',
          currentPayment,
        },
        {
          eventType: 'account-reloaded',
          maxWaitSeconds: 60,
          noAck: false,
          purpose: 'AGENT_PAY_ACCOUNT',
          currentPayment,
        },
      ],
      pollCommands: [ACCOUNT_CREATED_POLL_COMMAND, ACCOUNT_RELOADED_POLL_COMMAND],
    };
  }

  if ([3, 4, 6].includes(status)) {
    return {
      state: PaymentWorkflowState.PAY_SYNC_FAILED,
      action: PaymentWorkflowAction.STOP_PAYMENT_FAILURE,
      terminal: true,
      reason: `status_${status}_failure`,
    };
  }

  return {
    state: PaymentWorkflowState.PAY_SUBMITTED,
    action: PaymentWorkflowAction.WAIT_EVENT,
    terminal: false,
    reason: status === null ? 'status_missing_wait_event' : `status_${status}_wait_event`,
  };
}

export function classifyPaymentError(input = {}) {
  const error = unwrapCliEnvelope(input);
  const exitCode = numericValue(error.exitCode ?? error.exit_code ?? error.processExitCode ?? input.exitCode);

  if (exitCode === 7) return threeDsRequired('exit_7_3ds_required');
  if (exitCode === 6) {
    return {
      state: PaymentWorkflowState.PAY_UNKNOWN,
      action: PaymentWorkflowAction.VERIFY_BEFORE_RETRY,
      terminal: false,
      reason: 'exit_6_unknown',
    };
  }
  if (exitCode === 3 || exitCode === 4) {
    return {
      state: PaymentWorkflowState.WALLET_SETUP_REQUIRED,
      action: PaymentWorkflowAction.START_WALLET_SETUP,
      terminal: false,
      reason: `exit_${exitCode}_wallet_setup_required`,
    };
  }

  return {
    state: PaymentWorkflowState.CLI_ERROR,
    action: PaymentWorkflowAction.SURFACE_ERROR,
    terminal: true,
    reason: exitCode === null ? 'cli_error' : `exit_${exitCode}_cli_error`,
  };
}

export function classifyPaymentObservation(observation = {}) {
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  const stdout = unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? {});
  const paymentContext = observation.paymentContext
    ?? observation.payment_context
    ?? observation.expectedPayment
    ?? observation.expected_payment
    ?? {};

  if (exitCode === 0) return classifyPaymentResponse(stdout, paymentContext);
  if (exitCode === 7) {
    const response = classifyPaymentResponse(stdout, paymentContext);
    return response.state === PaymentWorkflowState.THREE_DS_REQUIRED
      ? response
      : threeDsRequired('exit_7_3ds_required');
  }
  return classifyPaymentError({
    ...(unwrapCliEnvelope(observation.stderr ?? observation.error ?? {}) || {}),
    exitCode,
  });
}

export function formatPaymentFsmMarker(workflow, marker = 'PAYMENT_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
