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
  WAIT_FOR_WALLET_INIT_PROGRESS: 'WAIT_FOR_WALLET_INIT_PROGRESS',
  TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT: 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT',
  SHOW_OAUTH_VERIFICATION_URL_AND_WAIT: 'SHOW_OAUTH_VERIFICATION_URL_AND_WAIT',
  RETURN_WALLET_PLAN: 'RETURN_WALLET_PLAN',
  RETURN_WALLET_READY: 'RETURN_WALLET_READY',
  START_WALLET_SETUP: 'START_WALLET_SETUP',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

const VERIFICATION_URL_PROMPT = 'Complete authorization in your browser:';
const WALLET_INIT_START_MARKER =
  'Starting wallet login; this attempt takes precedence over any earlier one.';
const BROWSER_OPEN_REQUEST_PATTERN = /Opening your browser\.\.\./iu;
const BROWSER_OPEN_FAILURE_PATTERN = /could not open (?:a|the) browser automatically/iu;
const AUTHORIZATION_WAIT_PATTERN = /Waiting for authorization\.\.\./iu;

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

function parseJsonEnvelopes(value) {
  if (typeof value !== 'string') return [value];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return [JSON.parse(trimmed)];
  } catch {
    return trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
  }
}

function nonEmptyObject(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length > 0;
}

function unwrapLastCliEnvelope(value) {
  const envelopes = parseJsonEnvelopes(value);
  for (let index = envelopes.length - 1; index >= 0; index -= 1) {
    const unwrapped = unwrapCliEnvelope(envelopes[index]);
    if (nonEmptyObject(unwrapped)) return unwrapped;
  }
  return {};
}

function walletInitError(observation) {
  const stderrError = unwrapLastCliEnvelope(latestWalletInitAttempt(observation.stderr));
  if (nonEmptyObject(stderrError)) return stderrError;
  return unwrapLastCliEnvelope(observation.error);
}

function numericValue(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : null;
  }
  return null;
}

function latestWalletInitAttempt(value) {
  if (typeof value !== 'string') return value;
  const latestStart = value.lastIndexOf(WALLET_INIT_START_MARKER);
  return latestStart >= 0 ? value.slice(latestStart) : value;
}

function inspectVerificationUrl(value) {
  if (typeof value !== 'string') {
    return {
      present: false,
      lineComplete: false,
      complete: false,
      authorizationUrl: null,
    };
  }

  const promptIndex = value.lastIndexOf(VERIFICATION_URL_PROMPT);
  if (promptIndex < 0) {
    return {
      present: false,
      lineComplete: false,
      complete: false,
      authorizationUrl: null,
    };
  }

  let lineStart = promptIndex + VERIFICATION_URL_PROMPT.length;
  if (value.startsWith('\r\n', lineStart)) {
    lineStart += 2;
  } else if (value.startsWith('\n', lineStart)) {
    lineStart += 1;
  } else {
    return {
      present: true,
      lineComplete: false,
      complete: false,
      authorizationUrl: null,
    };
  }

  const lineFeedIndex = value.indexOf('\n', lineStart);
  if (lineFeedIndex < 0) {
    return {
      present: true,
      lineComplete: false,
      complete: false,
      authorizationUrl: null,
    };
  }

  const lineEnd = lineFeedIndex > lineStart && value[lineFeedIndex - 1] === '\r'
    ? lineFeedIndex - 1
    : lineFeedIndex;
  const authorizationUrl = value.slice(lineStart, lineEnd);

  try {
    const parsed = new URL(authorizationUrl);
    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const complete = (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && hasNonEmptyString(parsed.searchParams.get('user_code'))
      && hasNonEmptyString(fragment.get('email'))
      && hasNonEmptyString(fragment.get('name'));
    return {
      present: true,
      lineComplete: true,
      complete,
      authorizationUrl: complete ? authorizationUrl : null,
    };
  } catch {
    return {
      present: true,
      lineComplete: true,
      complete: false,
      authorizationUrl: null,
    };
  }
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
      error: walletInitError(observation),
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
    const paymentMethodCount = nonNegativeInteger(data.paymentMethodCount);
    const cardReadinessKnown = data.paymentMethodsCached === true
      && paymentMethodCount !== null;
    const pendingInstructionId = hasNonEmptyString(data.pendingInstructionId)
      ? data.pendingInstructionId
      : null;
    return {
      state: WalletWorkflowState.WALLET_INITIALIZED,
      action: WalletWorkflowAction.RETURN_WALLET_READY,
      terminal: true,
      reason: 'wallet_init_succeeded',
      walletReady: true,
      pendingInstructionId,
      cardReadiness: cardReadinessKnown
        ? (paymentMethodCount > 0 ? 'ready' : 'missing')
        : 'unknown',
      data,
    };
  }

  const stderr = latestWalletInitAttempt(
    typeof observation.stderr === 'string' ? observation.stderr : '',
  );
  const verificationUrl = inspectVerificationUrl(stderr);
  const isRunning = exitCode === null || observation.running === true;

  if (verificationUrl.lineComplete && !verificationUrl.complete && isRunning) {
    return {
      state: WalletWorkflowState.WALLET_INIT_FAILED,
      action: WalletWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'wallet_init_verification_url_incomplete',
      error: {
        message: 'OAuth verification URL is incomplete; do not show or reconstruct it.',
      },
    };
  }

  if (verificationUrl.authorizationUrl && isRunning) {
    const browserOpenFailed = BROWSER_OPEN_FAILURE_PATTERN.test(stderr);
    const browserOpenRequested = BROWSER_OPEN_REQUEST_PATTERN.test(stderr);
    const waitingForAuthorization = AUTHORIZATION_WAIT_PATTERN.test(stderr);

    if (browserOpenFailed && waitingForAuthorization) {
      return {
        state: WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED,
        action: WalletWorkflowAction.SHOW_OAUTH_VERIFICATION_URL_AND_WAIT,
        terminal: false,
        reason: 'wallet_init_oauth_browser_open_failed',
        authorizationUrl: verificationUrl.authorizationUrl,
        browserOpenRequested,
        browserOpenFailed: true,
        oauthDevicePollActive: true,
      };
    }

    if (browserOpenRequested && waitingForAuthorization) {
      return {
        state: WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED,
        action: WalletWorkflowAction.TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT,
        terminal: false,
        reason: 'wallet_init_oauth_browser_open_requested',
        browserOpenRequested: true,
        browserOpenFailed: false,
        oauthDevicePollActive: true,
      };
    }

    if (waitingForAuthorization) {
      return {
        state: WalletWorkflowState.WALLET_INIT_FAILED,
        action: WalletWorkflowAction.SURFACE_ERROR,
        terminal: true,
        reason: 'wallet_init_open_flag_missing',
        error: {
          message: 'wallet init reached authorization polling without --open.',
        },
      };
    }
  }

  if (isRunning) {
    return {
      state: WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED,
      action: WalletWorkflowAction.WAIT_FOR_WALLET_INIT_PROGRESS,
      terminal: false,
      reason: 'wallet_init_progress_pending',
      browserOpenRequested: BROWSER_OPEN_REQUEST_PATTERN.test(stderr),
      browserOpenFailed: BROWSER_OPEN_FAILURE_PATTERN.test(stderr),
      oauthDevicePollActive: false,
    };
  }

  return {
    state: WalletWorkflowState.WALLET_INIT_FAILED,
    action: WalletWorkflowAction.SURFACE_ERROR,
    terminal: true,
    reason: 'wallet_init_failed',
    error: walletInitError(observation),
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
