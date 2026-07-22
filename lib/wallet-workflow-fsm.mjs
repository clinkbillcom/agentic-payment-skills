import { formatWorkflowMarker } from './workflow-marker.mjs';

export const WalletWorkflowState = Object.freeze({
  OAUTH_AUTHORIZATION_REQUIRED: 'OAUTH_AUTHORIZATION_REQUIRED',
  WALLET_INIT_PLANNED: 'WALLET_INIT_PLANNED',
  WALLET_INITIALIZED: 'WALLET_INITIALIZED',
  WALLET_INIT_FAILED: 'WALLET_INIT_FAILED',
  WALLET_OAUTH_READY: 'WALLET_OAUTH_READY',
  WALLET_OAUTH_REAUTHORIZATION_REQUIRED: 'WALLET_OAUTH_REAUTHORIZATION_REQUIRED',
  WALLET_LEGACY_CSK_READY: 'WALLET_LEGACY_CSK_READY',
  WALLET_SETUP_REQUIRED: 'WALLET_SETUP_REQUIRED',
  WALLET_STATUS_FAILED: 'WALLET_STATUS_FAILED',
});

export const WalletWorkflowAction = Object.freeze({
  SHOW_OAUTH_VERIFICATION_URL_AND_WAIT: 'SHOW_OAUTH_VERIFICATION_URL_AND_WAIT',
  RETURN_WALLET_PLAN: 'RETURN_WALLET_PLAN',
  RETURN_WALLET_READY: 'RETURN_WALLET_READY',
  START_WALLET_SETUP: 'START_WALLET_SETUP',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

const VERIFICATION_URL_PATTERN =
  /Complete authorization in your browser:\s*(https?:\/\/[^\s]+)/u;
const BROWSER_OPEN_FAILURE_PATTERN = /could not open (?:a|the) browser automatically/iu;

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

function extractVerificationUrl(value) {
  if (typeof value !== 'string') return null;
  return value.match(VERIFICATION_URL_PATTERN)?.[1] ?? null;
}

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function hasNonZeroExitCode(exitCode) {
  return exitCode !== null && exitCode !== 0;
}

export function classifyWalletInitObservation(observation = {}) {
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  const stdout = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const data = unwrapCliEnvelope(stdout);

  if (hasNonZeroExitCode(exitCode)) {
    return {
      state: WalletWorkflowState.WALLET_INIT_FAILED,
      action: WalletWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'wallet_init_failed',
      error: unwrapCliEnvelope(observation.stderr ?? observation.error ?? {}),
    };
  }

  if (stdout?.ok === true && data.dryRun === true) {
    return {
      state: WalletWorkflowState.WALLET_INIT_PLANNED,
      action: WalletWorkflowAction.RETURN_WALLET_PLAN,
      terminal: true,
      reason: 'wallet_init_dry_run_planned',
      data,
    };
  }

  if (
    (exitCode === 0 || stdout?.ok === true)
    && data.hasAuthorization === true
    && data.authorizationType === 'oauth'
    && data.hasCustomerApiKey === false
    && (!Object.prototype.hasOwnProperty.call(data, 'oauthRequired')
      || data.oauthRequired === true)
    && typeof data.customerId === 'string'
    && data.customerId.length > 0
  ) {
    return {
      state: WalletWorkflowState.WALLET_INITIALIZED,
      action: WalletWorkflowAction.RETURN_WALLET_READY,
      terminal: true,
      reason: 'wallet_init_succeeded',
      data,
    };
  }

  const stderr = typeof observation.stderr === 'string' ? observation.stderr : '';
  const authorizationUrl = extractVerificationUrl(stderr);
  if (authorizationUrl && (exitCode === null || observation.running === true)) {
    return {
      state: WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED,
      action: WalletWorkflowAction.SHOW_OAUTH_VERIFICATION_URL_AND_WAIT,
      terminal: false,
      reason: 'wallet_init_oauth_authorization_required',
      authorizationUrl,
      browserOpenFailed: BROWSER_OPEN_FAILURE_PATTERN.test(stderr),
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

export function classifyWalletStatusObservation(observation = {}) {
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  const stdout = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const data = unwrapCliEnvelope(stdout);

  if (
    hasNonZeroExitCode(exitCode)
    || (exitCode === null && stdout?.ok !== true)
  ) {
    return {
      state: WalletWorkflowState.WALLET_STATUS_FAILED,
      action: WalletWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'wallet_status_failed',
      error: unwrapCliEnvelope(observation.stderr ?? observation.error ?? {}),
    };
  }

  const hasCustomerId = hasNonEmptyString(data.customerId);
  const markerTypesAreValid = typeof data.hasAuthorization === 'boolean'
    && typeof data.hasStoredAuthorization === 'boolean'
    && (typeof data.authorizationEnvironmentMatches === 'boolean'
      || data.authorizationEnvironmentMatches === null)
    && (data.authorizationType === 'oauth'
      || data.authorizationType === 'csk'
      || data.authorizationType === null)
    && typeof data.oauthRequired === 'boolean'
    && typeof data.hasCustomerApiKey === 'boolean';
  const storedAuthorizationShapeIsValid = data.hasStoredAuthorization === true
    ? typeof data.authorizationEnvironmentMatches === 'boolean'
    : data.authorizationEnvironmentMatches === null;
  if (!markerTypesAreValid || !storedAuthorizationShapeIsValid) {
    return {
      state: WalletWorkflowState.WALLET_STATUS_FAILED,
      action: WalletWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'wallet_oauth_state_invalid',
      error: data,
    };
  }

  const oauthRequired = data.oauthRequired;
  if (
    data.hasAuthorization === true
    && data.hasStoredAuthorization === true
    && data.authorizationEnvironmentMatches === true
    && data.authorizationType === 'oauth'
    && oauthRequired
    && data.hasCustomerApiKey === false
    && hasCustomerId
  ) {
    return {
      state: WalletWorkflowState.WALLET_OAUTH_READY,
      action: WalletWorkflowAction.RETURN_WALLET_READY,
      terminal: true,
      reason: 'wallet_oauth_ready',
      authenticationMode: 'oauth',
      migrationRecommended: false,
      data,
    };
  }

  const reauthorizationShapeIsValid = (
    data.hasStoredAuthorization === false
      && data.authorizationEnvironmentMatches === null
  ) || (
    data.hasStoredAuthorization === true
      && data.authorizationEnvironmentMatches === false
  );
  if (
    oauthRequired
    && data.hasAuthorization !== true
    && data.hasCustomerApiKey === false
    && (data.authorizationType === null || data.authorizationType === undefined)
    && reauthorizationShapeIsValid
  ) {
    const environmentMismatch = data.hasStoredAuthorization === true
      && data.authorizationEnvironmentMatches === false;
    return {
      state: WalletWorkflowState.WALLET_OAUTH_REAUTHORIZATION_REQUIRED,
      action: WalletWorkflowAction.START_WALLET_SETUP,
      terminal: false,
      reason: environmentMismatch
        ? 'wallet_oauth_environment_mismatch'
        : 'wallet_oauth_reauthorization_required',
      authenticationMode: 'oauth',
      migrationRecommended: false,
      environmentMismatch,
      data,
    };
  }

  const hasOAuthMarker = oauthRequired
    || data.hasAuthorization === true
    || data.hasStoredAuthorization === true
    || data.authorizationEnvironmentMatches !== null
    || data.authorizationType === 'oauth'
    || (data.accessTokenExpiresAt !== null && data.accessTokenExpiresAt !== undefined)
    || (data.refreshTokenExpiresAt !== null && data.refreshTokenExpiresAt !== undefined);
  if (hasOAuthMarker) {
    return {
      state: WalletWorkflowState.WALLET_STATUS_FAILED,
      action: WalletWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'wallet_oauth_state_invalid',
      error: data,
    };
  }

  if (
    data.oauthRequired === false
    && data.hasAuthorization === false
    && data.hasStoredAuthorization === false
    && data.authorizationEnvironmentMatches === null
    && data.authorizationType === 'csk'
    && data.hasCustomerApiKey === true
    && hasCustomerId
  ) {
    return {
      state: WalletWorkflowState.WALLET_LEGACY_CSK_READY,
      action: WalletWorkflowAction.RETURN_WALLET_READY,
      terminal: true,
      reason: 'wallet_legacy_csk_ready',
      authenticationMode: 'csk',
      migrationRecommended: true,
      data,
    };
  }

  const incompleteLegacyOrEmptyWallet = data.oauthRequired === false
    && data.hasAuthorization === false
    && data.hasStoredAuthorization === false
    && data.authorizationEnvironmentMatches === null
    && (
      (data.authorizationType === null && data.hasCustomerApiKey === false)
      || (data.authorizationType === 'csk' && data.hasCustomerApiKey === true)
    );
  if (!incompleteLegacyOrEmptyWallet) {
    return {
      state: WalletWorkflowState.WALLET_STATUS_FAILED,
      action: WalletWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'wallet_credential_state_invalid',
      error: data,
    };
  }

  return {
    state: WalletWorkflowState.WALLET_SETUP_REQUIRED,
    action: WalletWorkflowAction.START_WALLET_SETUP,
    terminal: false,
    reason: 'wallet_credentials_missing',
    authenticationMode: null,
    migrationRecommended: false,
    data,
  };
}

export function formatWalletFsmMarker(workflow, marker = 'WALLET_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
