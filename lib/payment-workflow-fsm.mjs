import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

import { formatWorkflowMarker } from './workflow-marker.mjs';
import {
  EventWorkflowDomain,
  EventWorkflowState,
  canonicalAccountEventType,
  classifyEventPollObservation,
} from './event-workflow-fsm.mjs';

const ACCOUNT_EVENT_POLL_COMMAND = 'clink events poll --type account-created,account-reloaded --max-wait 60 --format json';
const QR_EVENT_TYPES = 'agent_order.succeeded,agent_order.failed';
const QR_DEFAULT_MAX_WAIT_SECONDS = 900;

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
  QR_CODE_REQUIRED: 'QR_CODE_REQUIRED',
  QR_PAYMENT_SUCCEEDED: 'QR_PAYMENT_SUCCEEDED',
  QR_PAYMENT_FAILED: 'QR_PAYMENT_FAILED',
  QR_PAYMENT_TIMED_OUT: 'QR_PAYMENT_TIMED_OUT',
  QR_PAYMENT_UNKNOWN: 'QR_PAYMENT_UNKNOWN',
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
  SHOW_QR_AND_WAIT_EVENT: 'SHOW_QR_AND_WAIT_EVENT',
  RETURN_QR_TERMINAL_AND_CLEANUP: 'RETURN_QR_TERMINAL_AND_CLEANUP',
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

function recordValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function nonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function qrCustomerActionSource(data = {}) {
  const candidate = data.customerAction ?? data.customer_action;
  return recordValue(candidate);
}

function unredactedQrDataUrlPresent(data = {}, cpr = {}, source = {}) {
  const channelAction = recordValue(cpr.action);
  const walletAction = recordValue(
    channelAction.walletHandleRedirectOrDisplayQrCode
      ?? channelAction.wallet_handle_redirect_or_display_qr_code,
  );
  return [
    source.imageUrlPng,
    source.image_url_png,
    source.dataUrl,
    source.data_url,
    data.imageUrlPng,
    data.image_url_png,
    walletAction.imageUrlPng,
    walletAction.image_url_png,
  ].some((value) => typeof value === 'string' && /^data:image\/png(?:;|,)/iu.test(value.trim()));
}

function trustedTemporaryPath(value, extension = null) {
  const candidate = nonEmptyString(value);
  if (!candidate || !isAbsolute(candidate) || /^data:/iu.test(candidate)) return null;

  const absolutePath = resolve(candidate);
  const tempRoot = resolve(tmpdir());
  const relativePath = relative(tempRoot, absolutePath);
  if (
    !relativePath
    || relativePath === '..'
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
    || (extension && extname(absolutePath).toLowerCase() !== extension)
  ) {
    return null;
  }
  return absolutePath;
}

function nullableNonEmptyStringField(source, key) {
  if (!Object.hasOwn(source, key)) return { valid: false, value: null };
  if (source[key] === null) return { valid: true, value: null };
  const value = nonEmptyString(source[key]);
  return { valid: value !== null, value };
}

function nullableNonNegativeIntegerField(source, key) {
  if (!Object.hasOwn(source, key)) return { valid: false, value: null };
  if (source[key] === null) return { valid: true, value: null };
  const value = source[key];
  return {
    valid: typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
    value: typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? value
      : null,
  };
}

function qrExpiry(source, observedAtMs) {
  const expiresAt = nullableNonNegativeIntegerField(source, 'expiresAt');
  const expiresSecond = nullableNonNegativeIntegerField(source, 'expiresSecond');
  if (!expiresAt.valid || !expiresSecond.valid) {
    return { error: 'qr_expiry_metadata_invalid' };
  }

  const nowMs = numericValue(observedAtMs) ?? Date.now();
  const nowEpochSeconds = Math.floor(nowMs / 1000);
  const expiredByEpoch = expiresAt.value !== null && expiresAt.value <= nowEpochSeconds;
  const expiredByDuration = expiresSecond.value === 0;
  const remainingFromEpoch = expiresAt.value === null
    ? null
    : Math.max(0, expiresAt.value - nowEpochSeconds);
  const preferredWaitSeconds = expiresSecond.value ?? remainingFromEpoch;
  const maxWaitSeconds = preferredWaitSeconds === null
    ? QR_DEFAULT_MAX_WAIT_SECONDS
    : Math.min(preferredWaitSeconds, QR_DEFAULT_MAX_WAIT_SECONDS);

  return {
    expiresAt: expiresAt.value,
    expiresSecond: expiresSecond.value,
    maxWaitSeconds,
    observedAtEpochSeconds: nowEpochSeconds,
    expired: expiredByEpoch || expiredByDuration,
  };
}

function qrExpectedResource(source = {}, context = {}) {
  const orderId = nonEmptyString(source.orderId);
  const paymentExecutionDetailId = nonEmptyString(source.paymentExecutionDetailId);
  const sessionId = nonEmptyString(
    context.sessionId
      ?? context.session_id,
  );
  return {
    ...(orderId ? { orderId } : {}),
    ...(paymentExecutionDetailId ? { paymentExecutionDetailId } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
}

function normalizeQrCustomerAction(source = {}, context = {}, observedAtMs) {
  if (source.type !== 'QR_CODE_REQUIRED') return { error: 'qr_action_type_invalid' };

  const imagePath = trustedTemporaryPath(source.imagePath, '.png');
  const cleanupPath = trustedTemporaryPath(source.cleanupPath);
  const orderId = nullableNonEmptyStringField(source, 'orderId');
  const paymentExecutionDetailId = nullableNonEmptyStringField(
    source,
    'paymentExecutionDetailId',
  );
  const expiry = qrExpiry(source, observedAtMs);

  if (!imagePath) return { error: 'qr_temporary_png_path_invalid', cleanupPath };
  if (!cleanupPath) return { error: 'qr_cleanup_path_invalid' };
  const imageRelativePath = relative(cleanupPath, imagePath);
  if (
    !imageRelativePath
    || imageRelativePath === '..'
    || imageRelativePath.startsWith(`..${sep}`)
    || isAbsolute(imageRelativePath)
  ) {
    return { error: 'qr_image_outside_cleanup_path', cleanupPath };
  }
  if (
    source.mediaType !== 'image/png'
    || source.temporary !== true
    || source.cleanupRequired !== true
  ) {
    return { error: 'qr_file_metadata_invalid', cleanupPath };
  }
  if (!orderId.valid || !paymentExecutionDetailId.valid) {
    return { error: 'qr_payment_identifier_invalid', cleanupPath };
  }
  if (expiry.error) return { error: expiry.error, cleanupPath };

  const customerAction = {
    type: 'QR_CODE_REQUIRED',
    imagePath,
    mediaType: 'image/png',
    temporary: true,
    cleanupRequired: true,
    orderId: orderId.value,
    paymentExecutionDetailId: paymentExecutionDetailId.value,
    expiresAt: expiry.expiresAt,
    expiresSecond: expiry.expiresSecond,
    cleanupPath,
  };
  const expectedResource = qrExpectedResource(customerAction, context);
  if (Object.keys(expectedResource).length === 0) {
    return { error: 'qr_event_correlation_missing', cleanupPath };
  }

  return {
    customerAction,
    expectedResource,
    maxWaitSeconds: expiry.maxWaitSeconds,
    observedAtEpochSeconds: expiry.observedAtEpochSeconds,
    expired: expiry.expired,
    cleanupPath,
  };
}

function qrCustomerAction(data = {}, cpr = {}, context = {}, observedAtMs) {
  const source = qrCustomerActionSource(data);
  if (Object.keys(source).length === 0) return null;
  const normalized = normalizeQrCustomerAction(source, context, observedAtMs);
  if (unredactedQrDataUrlPresent(data, cpr, source)) {
    return {
      error: 'qr_inline_image_not_redacted',
      cleanupPath: normalized.cleanupPath,
    };
  }
  return normalized;
}

function qrPollCommand(maxWaitSeconds) {
  return `clink events poll --type ${QR_EVENT_TYPES} --max-wait ${maxWaitSeconds} --format json`;
}

function normalizedQrExpectedResource(value = {}) {
  const source = recordValue(value);
  const normalized = {};
  for (const key of ['orderId', 'paymentExecutionDetailId', 'sessionId']) {
    const item = nonEmptyString(source[key]);
    if (item) normalized[key] = item;
  }
  return normalized;
}

function sameQrExpectedResource(left, right) {
  const leftEntries = Object.entries(normalizedQrExpectedResource(left)).sort(([a], [b]) => (
    a.localeCompare(b)
  ));
  const rightEntries = Object.entries(normalizedQrExpectedResource(right)).sort(([a], [b]) => (
    a.localeCompare(b)
  ));
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

function qrWaitSecondsMatchAction(waitSpec, customerAction) {
  const maxWaitSeconds = waitSpec.maxWaitSeconds;
  const observedAtEpochSeconds = waitSpec.observedAtEpochSeconds;
  if (
    !Number.isSafeInteger(maxWaitSeconds)
    || maxWaitSeconds <= 0
    || maxWaitSeconds > QR_DEFAULT_MAX_WAIT_SECONDS
    || !Number.isSafeInteger(observedAtEpochSeconds)
    || observedAtEpochSeconds < 0
  ) {
    return false;
  }

  if (customerAction.expiresSecond !== null) {
    return maxWaitSeconds === Math.min(
      customerAction.expiresSecond,
      QR_DEFAULT_MAX_WAIT_SECONDS,
    );
  }
  if (customerAction.expiresAt === null) {
    return maxWaitSeconds === QR_DEFAULT_MAX_WAIT_SECONDS;
  }

  return maxWaitSeconds === Math.min(
    Math.max(0, customerAction.expiresAt - observedAtEpochSeconds),
    QR_DEFAULT_MAX_WAIT_SECONDS,
  );
}

function qrWaitSpecMatchesAction(waitSpec, normalizedQr) {
  return waitSpec.eventType === QR_EVENT_TYPES
    && qrWaitSecondsMatchAction(waitSpec, normalizedQr.customerAction)
    && waitSpec.noAck === false
    && waitSpec.pollCommand === qrPollCommand(waitSpec.maxWaitSeconds)
    && waitSpec.purpose === 'AGENT_PAY_QR'
    && sameQrExpectedResource(waitSpec.expectedResource, normalizedQr.expectedResource);
}

function qrTerminalResult({
  state,
  reason,
  paymentStatus,
  qrEventStatus,
  customerAction,
  event,
}) {
  return {
    state,
    action: PaymentWorkflowAction.RETURN_QR_TERMINAL_AND_CLEANUP,
    terminal: true,
    reason,
    paymentStatus,
    paymentTerminal: true,
    qrEventStatus,
    retryAllowed: false,
    customerAction,
    cleanupRequired: true,
    cleanupPath: customerAction.cleanupPath,
    cleanupRecursive: true,
    ...(event ? { event } : {}),
  };
}

function qrActionError(reason, cleanupPath) {
  return {
    state: PaymentWorkflowState.CLI_ERROR,
    action: PaymentWorkflowAction.SURFACE_ERROR,
    terminal: true,
    reason,
    paymentStatus: 'UNKNOWN',
    paymentTerminal: true,
    retryAllowed: false,
    ...(cleanupPath
      ? {
          cleanupRequired: true,
          cleanupPath,
          cleanupRecursive: true,
        }
      : {}),
  };
}

function paymentWatchContext(context, observedAtMs) {
  const source = context && typeof context === 'object' && !Array.isArray(context)
    ? context
    : {};
  const startedAtMs = numericValue(source.startedAtMs ?? source.started_at_ms)
    ?? numericValue(observedAtMs)
    ?? Date.now();
  const paymentId = source.paymentId ?? source.payment_id;
  const existingWatchId = source.accountWatchId ?? source.account_watch_id;
  if (existingWatchId !== undefined && existingWatchId !== null && existingWatchId !== '') {
    return { ...source, startedAtMs, accountWatchId: String(existingWatchId) };
  }
  if (paymentId !== undefined && paymentId !== null && paymentId !== '') {
    return { ...source, startedAtMs };
  }
  return { ...source, startedAtMs, accountWatchId: randomUUID() };
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
    observation?.domain === EventWorkflowDomain.AGENT_PAY_ACCOUNT
      && observation?.state === EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED
      && observation?.matched === true
      && accountEventTypeOf(observation) !== null
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

export function classifyPaymentResponse(input = {}, context = {}, observedAtMs) {
  const data = unwrapCliEnvelope(input);
  const cpr = data?.channelPaymentResponse && typeof data.channelPaymentResponse === 'object'
    ? data.channelPaymentResponse
    : {};

  if (Number(cpr.flag3DS) === 1 || Number(data.flag3DS) === 1) {
    return threeDsRequired('3ds_required');
  }

  const status = numericValue(cpr.status ?? data.status);
  const qrAction = status === 5
    ? qrCustomerAction(data, cpr, context, observedAtMs)
    : null;
  if (qrAction?.error) return qrActionError(qrAction.error, qrAction.cleanupPath);
  if (qrAction?.customerAction) {
    if (qrAction.expired) {
      return qrTerminalResult({
        state: PaymentWorkflowState.QR_PAYMENT_TIMED_OUT,
        reason: 'qr_customer_action_expired',
        paymentStatus: 'UNKNOWN',
        qrEventStatus: 'TIMED_OUT',
        customerAction: qrAction.customerAction,
      });
    }

    const pollCommand = qrPollCommand(qrAction.maxWaitSeconds);
    const orderWaitSpec = {
      eventType: QR_EVENT_TYPES,
      maxWaitSeconds: qrAction.maxWaitSeconds,
      observedAtEpochSeconds: qrAction.observedAtEpochSeconds,
      noAck: false,
      pollCommand,
      purpose: 'AGENT_PAY_QR',
      expectedResource: qrAction.expectedResource,
    };
    return {
      state: PaymentWorkflowState.QR_CODE_REQUIRED,
      action: PaymentWorkflowAction.SHOW_QR_AND_WAIT_EVENT,
      terminal: false,
      reason: 'qr_customer_action_required',
      paymentStatus: 'PENDING_CUSTOMER_ACTION',
      paymentTerminal: false,
      qrEventStatus: 'PENDING',
      retryAllowed: false,
      customerAction: qrAction.customerAction,
      orderWaitSpec,
      pollCommands: [pollCommand],
      cleanupPending: true,
    };
  }

  if (status === 1) {
    const currentPayment = paymentWatchContext(context, observedAtMs);
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
          pollCommand: ACCOUNT_EVENT_POLL_COMMAND,
          purpose: 'AGENT_PAY_ACCOUNT',
          currentPayment,
        },
        {
          eventType: 'account-reloaded',
          maxWaitSeconds: 60,
          noAck: false,
          pollCommand: ACCOUNT_EVENT_POLL_COMMAND,
          purpose: 'AGENT_PAY_ACCOUNT',
          currentPayment,
        },
      ],
      pollCommands: [ACCOUNT_EVENT_POLL_COMMAND],
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

export function classifyPaymentQrEventObservation(input = {}) {
  const qrWorkflow = recordValue(
    input.qrWorkflow
      ?? input.qr_workflow
      ?? input.paymentWorkflow
      ?? input.payment_workflow,
  );
  const customerAction = recordValue(
    qrWorkflow.customerAction
      ?? qrWorkflow.customer_action
      ?? input.customerAction
      ?? input.customer_action,
  );
  const orderWaitSpec = recordValue(
    qrWorkflow.orderWaitSpec
      ?? qrWorkflow.order_wait_spec
      ?? input.orderWaitSpec
      ?? input.order_wait_spec,
  );
  const pollObservation = input.pollObservation
    ?? input.poll_observation
    ?? input.eventObservation
    ?? input.event_observation
    ?? {};
  const normalizedQr = normalizeQrCustomerAction(
    customerAction,
    recordValue(orderWaitSpec.expectedResource),
    input.observedAtMs ?? input.observed_at_ms,
  );

  if (
    qrWorkflow.state !== PaymentWorkflowState.QR_CODE_REQUIRED
    || normalizedQr.error
    || !qrWaitSpecMatchesAction(orderWaitSpec, normalizedQr)
  ) {
    return qrActionError(
      normalizedQr.error ?? 'invalid_qr_workflow_context',
      normalizedQr.cleanupPath,
    );
  }

  const normalizedCustomerAction = normalizedQr.customerAction;
  const eventResult = classifyEventPollObservation(pollObservation, orderWaitSpec);

  if (
    eventResult.matched === true
    && eventResult.workflow?.state === EventWorkflowState.PAY_ASYNC_SUCCEEDED
  ) {
    return qrTerminalResult({
      state: PaymentWorkflowState.QR_PAYMENT_SUCCEEDED,
      reason: 'qr_payment_event_succeeded',
      paymentStatus: 'PAID',
      qrEventStatus: 'SUCCEEDED',
      customerAction: normalizedCustomerAction,
      event: eventResult.event,
    });
  }
  if (
    eventResult.matched === true
    && eventResult.workflow?.state === EventWorkflowState.PAY_ASYNC_FAILED
  ) {
    return qrTerminalResult({
      state: PaymentWorkflowState.QR_PAYMENT_FAILED,
      reason: 'qr_payment_event_failed',
      paymentStatus: 'FAILED',
      qrEventStatus: 'FAILED',
      customerAction: normalizedCustomerAction,
      event: eventResult.event,
    });
  }
  if (eventResult.state === EventWorkflowState.EVENT_TIMEOUT) {
    return qrTerminalResult({
      state: PaymentWorkflowState.QR_PAYMENT_TIMED_OUT,
      reason: 'qr_payment_event_timeout',
      paymentStatus: 'UNKNOWN',
      qrEventStatus: 'TIMED_OUT',
      customerAction: normalizedCustomerAction,
    });
  }
  if (eventResult.state === EventWorkflowState.EVENT_INVALID) {
    return qrTerminalResult({
      state: PaymentWorkflowState.QR_PAYMENT_UNKNOWN,
      reason: 'qr_payment_event_poll_error',
      paymentStatus: 'UNKNOWN',
      qrEventStatus: 'POLL_ERROR',
      customerAction: normalizedCustomerAction,
    });
  }
  if (normalizedQr.expired) {
    return qrTerminalResult({
      state: PaymentWorkflowState.QR_PAYMENT_TIMED_OUT,
      reason: 'qr_customer_action_expired',
      paymentStatus: 'UNKNOWN',
      qrEventStatus: 'TIMED_OUT',
      customerAction: normalizedCustomerAction,
    });
  }

  return {
    state: PaymentWorkflowState.QR_CODE_REQUIRED,
    action: PaymentWorkflowAction.WAIT_EVENT,
    terminal: false,
    reason: eventResult.reason ?? 'qr_payment_event_pending',
    paymentStatus: 'PENDING_CUSTOMER_ACTION',
    paymentTerminal: false,
    qrEventStatus: 'PENDING',
    retryAllowed: false,
    customerAction: normalizedCustomerAction,
    orderWaitSpec,
    pollCommands: [orderWaitSpec.pollCommand],
    cleanupPending: true,
  };
}

export function classifyPaymentError(input = {}) {
  const error = unwrapCliEnvelope(input);
  const exitCode = numericValue(error.exitCode ?? error.exit_code ?? error.processExitCode ?? input.exitCode);

  if (exitCode === 5 && error.type === 'payment_state_unknown') {
    const details = recordValue(error.details);
    const orderId = nonEmptyString(details.orderId);
    const paymentExecutionDetailId = nonEmptyString(
      details.paymentExecutionDetailId
        ?? details.payment_execution_detail_id,
    );
    const reportedPaymentStatus = numericValue(
      details.paymentStatus
        ?? details.payment_status,
    );
    const failure = nonEmptyString(details.failure);
    return {
      state: PaymentWorkflowState.PAY_UNKNOWN,
      action: PaymentWorkflowAction.VERIFY_BEFORE_RETRY,
      terminal: false,
      reason: 'payment_state_unknown',
      paymentStatus: 'UNKNOWN',
      paymentTerminal: false,
      paymentSubmitted: true,
      retryAllowed: false,
      ...(orderId ? { orderId } : {}),
      ...(paymentExecutionDetailId ? { paymentExecutionDetailId } : {}),
      ...(reportedPaymentStatus === null ? {} : { reportedPaymentStatus }),
      ...(failure ? { failure } : {}),
    };
  }
  if (exitCode === 7) return threeDsRequired('exit_7_3ds_required');
  if (exitCode === 6) {
    return {
      state: PaymentWorkflowState.PAY_UNKNOWN,
      action: PaymentWorkflowAction.VERIFY_BEFORE_RETRY,
      terminal: false,
      reason: 'exit_6_unknown',
      paymentStatus: 'UNKNOWN',
      paymentTerminal: false,
      retryAllowed: false,
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
  const observedAtMs = observation.observedAtMs
    ?? observation.observed_at_ms
    ?? observation.nowMs
    ?? observation.now_ms;

  if (exitCode === 0) return classifyPaymentResponse(stdout, paymentContext, observedAtMs);
  if (exitCode === 7) {
    const response = classifyPaymentResponse(stdout, paymentContext, observedAtMs);
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
