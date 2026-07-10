import { formatWorkflowMarker } from './workflow-marker.mjs';

export const WalletWorkflowState = Object.freeze({
  WALLET_INITIALIZED: 'WALLET_INITIALIZED',
  EMAIL_OTP_REQUIRED: 'EMAIL_OTP_REQUIRED',
  WALLET_INIT_FAILED: 'WALLET_INIT_FAILED',
});

export const WalletWorkflowAction = Object.freeze({
  RETURN_WALLET_READY: 'RETURN_WALLET_READY',
  ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT: 'ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

const OTP_REQUIRED_MARKERS = [
  'BOOTSTRAP_OTP_REQUIRED',
  '71160015',
  'cwallet.bootstrap.otp.required',
  'Verification code has been sent to this email. Please retry with otp.',
];

const WALLET_INIT_OTP_RETRY_COMMAND =
  'clink-cli wallet init --email <same_email> --name <same_name> --otp <email_otp> --format json';

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

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function collectScalarValues(value, values = []) {
  const parsed = parseMaybeJson(value);

  if (parsed === undefined || parsed === null) return values;
  if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
    values.push(String(parsed));
    return values;
  }
  if (Array.isArray(parsed)) {
    for (const item of parsed) collectScalarValues(item, values);
    return values;
  }
  if (typeof parsed === 'object') {
    for (const [key, item] of Object.entries(parsed)) {
      values.push(key);
      collectScalarValues(item, values);
    }
  }
  return values;
}

function hasOtpRequiredMarker(...sources) {
  const values = sources.flatMap((source) => collectScalarValues(source));
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return OTP_REQUIRED_MARKERS.some((marker) => normalized.includes(marker.toLowerCase()));
  });
}

export function classifyWalletInitObservation(observation = {}) {
  if (hasOtpRequiredMarker(observation.stderr, observation.error, observation.stdout, observation.data, observation.result)) {
    return {
      state: WalletWorkflowState.EMAIL_OTP_REQUIRED,
      action: WalletWorkflowAction.ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT,
      terminal: false,
      reason: 'wallet_init_email_otp_required',
      email: normalizedString(observation.email),
      name: normalizedString(observation.name),
      retryCommand: WALLET_INIT_OTP_RETRY_COMMAND,
    };
  }

  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  const stdout = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const data = unwrapCliEnvelope(stdout);

  if (exitCode === 0 || stdout?.ok === true) {
    return {
      state: WalletWorkflowState.WALLET_INITIALIZED,
      action: WalletWorkflowAction.RETURN_WALLET_READY,
      terminal: true,
      reason: 'wallet_init_succeeded',
      data,
    };
  }

  return {
    state: WalletWorkflowState.WALLET_INIT_FAILED,
    action: WalletWorkflowAction.SURFACE_ERROR,
    terminal: true,
    reason: 'wallet_init_failed',
    error: unwrapCliEnvelope(observation.stderr ?? observation.error ?? {}),
  };
}

export function formatWalletFsmMarker(workflow, marker = 'WALLET_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
