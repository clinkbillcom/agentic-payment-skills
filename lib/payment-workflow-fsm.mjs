import { formatWorkflowMarker } from './workflow-marker.mjs';

const ACCOUNT_CREATED_POLL_COMMAND = 'clink-cli events poll --type account-created --max-wait 60 --format json';
const ACCOUNT_RELOADED_POLL_COMMAND = 'clink-cli events poll --type account-reloaded --max-wait 60 --format json';

export const PaymentWorkflowState = Object.freeze({
  PAYMENT_INPUT_MISSING: 'PAYMENT_INPUT_MISSING',
  ACCOUNT_PRECHECK: 'ACCOUNT_PRECHECK',
  READY_TO_PAY: 'READY_TO_PAY',
  PAY_SUBMITTED: 'PAY_SUBMITTED',
  PAY_SYNC_SUCCEEDED: 'PAY_SYNC_SUCCEEDED',
  PAY_SYNC_FAILED: 'PAY_SYNC_FAILED',
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
