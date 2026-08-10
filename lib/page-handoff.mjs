import { formatWorkflowMarker } from './workflow-marker.mjs';

export const PageHandoffActor = Object.freeze({
  USER_DEVICE_ONLY: 'USER_DEVICE_ONLY',
  USER_PREFERRED: 'USER_PREFERRED',
  AGENT_ALLOWED: 'AGENT_ALLOWED',
});

export const PageHandoffState = Object.freeze({
  USER_DEVICE_HANDOFF_REQUIRED: 'USER_DEVICE_HANDOFF_REQUIRED',
  USER_BROWSER_HANDOFF_PREFERRED: 'USER_BROWSER_HANDOFF_PREFERRED',
  AGENT_BROWSER_ALLOWED: 'AGENT_BROWSER_ALLOWED',
  BROWSER_HANDOFF_UNREACHABLE: 'BROWSER_HANDOFF_UNREACHABLE',
  PAGE_HANDOFF_INVALID: 'PAGE_HANDOFF_INVALID',
});

export const PageHandoffAction = Object.freeze({
  HANDOFF_TO_USER_DEVICE: 'HANDOFF_TO_USER_DEVICE',
  HANDOFF_TO_USER_BROWSER: 'HANDOFF_TO_USER_BROWSER',
  ALLOW_AGENT_BROWSER: 'ALLOW_AGENT_BROWSER',
  SURFACE_BROWSER_HANDOFF_GAP: 'SURFACE_BROWSER_HANDOFF_GAP',
  SURFACE_PAGE_HANDOFF_ERROR: 'SURFACE_PAGE_HANDOFF_ERROR',
});

export const PageHandoffKind = Object.freeze({
  OAUTH_DEVICE_VERIFICATION: 'OAUTH_DEVICE_VERIFICATION',
  CARD_BINDING: 'CARD_BINDING',
  CARD_SETUP: 'CARD_SETUP',
  CARD_MODIFY: 'CARD_MODIFY',
  VIC_PASSKEY_REGISTRATION: 'VIC_PASSKEY_REGISTRATION',
  INSTRUCTION_PASSKEY_SIGNING: 'INSTRUCTION_PASSKEY_SIGNING',
  INSTRUCTION_AGENT_PAGE: 'INSTRUCTION_AGENT_PAGE',
  THREE_DS_CHALLENGE: 'THREE_DS_CHALLENGE',
  RISK_RULE_CONFIG: 'RISK_RULE_CONFIG',
  MERCHANT_PRODUCT_PAGE: 'MERCHANT_PRODUCT_PAGE',
});

/**
 * Every way a host agent can touch a URL without a human doing it. A prohibition that only says
 * "do not open the browser" is read as permission to navigate, because a host agent driving a
 * browser MCP does not call that "opening a browser" — it calls it checking the page.
 */
export const AGENT_BROWSER_CHANNELS = Object.freeze([
  'agent built-in browser',
  'headless browser',
  'CDP / Playwright / Puppeteer',
  'browser MCP server',
  'computer-use / screen control',
  'embedded webview',
  'link preview / unfurling',
]);

export const AGENT_BROWSER_VERBS = Object.freeze([
  'open',
  'navigate',
  'preview',
  'prefetch',
  'unfurl',
  'screenshot',
  'extract',
  'fill',
  'submit',
  'verify the page loads',
]);

/**
 * Link-producing commands whose browser launch must be suppressed per invocation. `defaultOpenLinks`
 * lives in the machine-wide config that every build shares, so a stored `true` silently re-arms
 * host-side auto-open for all of them.
 */
export const LINK_COMMANDS_REQUIRING_NO_OPEN = Object.freeze([
  'wallet init',
  'card binding-link',
  'card setup-link',
  'card modify-link',
  'risk link',
  'instruction create',
  'instruction sign-url',
  'instruction update',
  'instruction cancel',
]);

const CONTRACTS = Object.freeze({
  [PageHandoffKind.OAUTH_DEVICE_VERIFICATION]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'oauth_email_code_single_load',
    doNotAutomateReason:
      'An agent load can overlap with the page load the user is doing, which triggers duplicate verification-code sends or resend throttling.',
    completionEvents: Object.freeze([]),
    watch: 'init-process-stderr',
    singleLoad: true,
    verbatimUrl: true,
  }),
  [PageHandoffKind.CARD_BINDING]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'pan_entry_must_not_enter_agent_context',
    doNotAutomateReason:
      'The page collects a card number. An agent that reads or fills it puts the PAN into model context and agent logs.',
    completionEvents: Object.freeze(['payment_method.added']),
    watch: 'built-in',
    singleLoad: true,
    verbatimUrl: true,
  }),
  [PageHandoffKind.CARD_SETUP]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'pan_entry_must_not_enter_agent_context',
    doNotAutomateReason:
      'The page collects a card number. An agent that reads or fills it puts the PAN into model context and agent logs.',
    completionEvents: Object.freeze(['payment_method.added', 'payment_method.updated']),
    watch: 'built-in',
    singleLoad: true,
    verbatimUrl: true,
  }),
  [PageHandoffKind.CARD_MODIFY]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'pan_entry_must_not_enter_agent_context',
    doNotAutomateReason:
      'The page exposes stored payment methods and card entry. An agent must not read them or change them for the user.',
    completionEvents: Object.freeze(['payment_method.updated', 'payment_method.default_change']),
    watch: 'built-in',
    singleLoad: true,
    verbatimUrl: true,
  }),
  [PageHandoffKind.VIC_PASSKEY_REGISTRATION]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'webauthn_platform_authenticator_required',
    doNotAutomateReason:
      'WebAuthn needs a platform authenticator held on the device in front of the user. An agent browser has none, and a CDP virtual authenticator would forge exactly the proof this page exists to collect.',
    completionEvents: Object.freeze(['vic_device.binding_succeeded', 'payment_method.updated']),
    watch: 'events-poll',
    singleLoad: false,
    verbatimUrl: true,
  }),
  [PageHandoffKind.INSTRUCTION_PASSKEY_SIGNING]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'webauthn_platform_authenticator_required',
    doNotAutomateReason:
      'Mandate signing needs a platform authenticator the user can approve. A credential created in an agent browser profile is absent from the browser they actually use, so signing fails there anyway.',
    completionEvents: Object.freeze(['purchase_instruction.activated']),
    watch: 'built-in',
    singleLoad: false,
    verbatimUrl: true,
  }),
  [PageHandoffKind.INSTRUCTION_AGENT_PAGE]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'authorization_scope_change_requires_user',
    doNotAutomateReason:
      'Updating or cancelling an authorization changes what may be spent later; only the user may complete that page.',
    completionEvents: Object.freeze([]),
    watch: 'built-in',
    singleLoad: false,
    verbatimUrl: true,
  }),
  [PageHandoffKind.THREE_DS_CHALLENGE]: Object.freeze({
    actor: PageHandoffActor.USER_DEVICE_ONLY,
    reason: 'acs_device_fingerprint_and_otp',
    doNotAutomateReason:
      'The issuer ACS fingerprints the device and scores automation, and the one-time code reaches a phone rather than the agent. An agent browser is soft-declined or stepped up.',
    completionEvents: Object.freeze(['agent_order.succeeded', 'agent_order.failed']),
    watch: 'built-in',
    singleLoad: true,
    verbatimUrl: true,
  }),
  [PageHandoffKind.RISK_RULE_CONFIG]: Object.freeze({
    actor: PageHandoffActor.USER_PREFERRED,
    reason: 'spending_policy_belongs_to_user',
    doNotAutomateReason:
      'No secret is entered, but the page sets spending limits that belong to the user. An agent must not choose them.',
    completionEvents: Object.freeze(['risk_rule.updated']),
    watch: 'built-in',
    singleLoad: false,
    verbatimUrl: true,
  }),
  [PageHandoffKind.MERCHANT_PRODUCT_PAGE]: Object.freeze({
    actor: PageHandoffActor.AGENT_ALLOWED,
    reason: 'product_discovery_is_agent_work',
    doNotAutomateReason: null,
    completionEvents: Object.freeze([]),
    watch: 'none',
    singleLoad: false,
    verbatimUrl: false,
  }),
});

export const PAGE_HANDOFF_CONTRACTS = CONTRACTS;

const PASSKEY_AUTH_PATH = /\/passkey-auth\//u;
const OAUTH_USER_CODE = /[?&]user_code=/u;

/**
 * Only the two URL shapes this skill knows verbatim are recognizable from the string alone. Every
 * other kind is known by the command that printed it, so the caller passes `kind` instead of
 * hoping a hosted origin can be guessed.
 */
export function resolvePageHandoffKind(url) {
  if (typeof url !== 'string' || url.length === 0) return null;
  if (PASSKEY_AUTH_PATH.test(url)) return PageHandoffKind.VIC_PASSKEY_REGISTRATION;
  if (OAUTH_USER_CODE.test(url)) return PageHandoffKind.OAUTH_DEVICE_VERIFICATION;
  return null;
}

function invalid(reason, detail) {
  return {
    state: PageHandoffState.PAGE_HANDOFF_INVALID,
    action: PageHandoffAction.SURFACE_PAGE_HANDOFF_ERROR,
    terminal: true,
    reason,
    detail: detail ?? null,
    actor: null,
    agentBrowserAllowed: false,
  };
}

export function classifyPageHandoff(request = {}) {
  const url = typeof request.url === 'string' && request.url.length > 0 ? request.url : null;
  const kind = request.kind ?? resolvePageHandoffKind(url);

  if (!kind) return invalid('page_handoff_kind_unknown', url);

  const contract = CONTRACTS[kind];
  if (!contract) return invalid('page_handoff_kind_unsupported', kind);

  const base = {
    kind,
    url,
    actor: contract.actor,
    completionEvents: contract.completionEvents,
    watch: contract.watch,
    singleLoad: contract.singleLoad,
    verbatimUrl: contract.verbatimUrl,
  };

  if (contract.actor === PageHandoffActor.AGENT_ALLOWED) {
    return {
      ...base,
      state: PageHandoffState.AGENT_BROWSER_ALLOWED,
      action: PageHandoffAction.ALLOW_AGENT_BROWSER,
      terminal: true,
      reason: contract.reason,
      agentBrowserAllowed: true,
      doNotAutomateReason: null,
      cliFlags: Object.freeze([]),
    };
  }

  const humanRequired = {
    ...base,
    agentBrowserAllowed: false,
    doNotAutomateReason: contract.doNotAutomateReason,
    doNotAutomateChannels: AGENT_BROWSER_CHANNELS,
    doNotAutomateVerbs: AGENT_BROWSER_VERBS,
    cliFlags: Object.freeze(['--no-open']),
  };

  // A page that only a human can complete is not a prompt worth emitting when no human is there to
  // read it. The URL would expire unread while the run reported itself as waiting.
  if (request.unattended === true || request.userReachable === false) {
    return {
      ...humanRequired,
      state: PageHandoffState.BROWSER_HANDOFF_UNREACHABLE,
      action: PageHandoffAction.SURFACE_BROWSER_HANDOFF_GAP,
      terminal: true,
      reason: request.unattended === true
        ? 'browser_handoff_required_on_unattended_run'
        : 'browser_handoff_required_without_user_channel',
    };
  }

  if (contract.actor === PageHandoffActor.USER_DEVICE_ONLY) {
    return {
      ...humanRequired,
      state: PageHandoffState.USER_DEVICE_HANDOFF_REQUIRED,
      action: PageHandoffAction.HANDOFF_TO_USER_DEVICE,
      terminal: false,
      reason: contract.reason,
    };
  }

  return {
    ...humanRequired,
    state: PageHandoffState.USER_BROWSER_HANDOFF_PREFERRED,
    action: PageHandoffAction.HANDOFF_TO_USER_BROWSER,
    terminal: false,
    reason: contract.reason,
  };
}

export function formatPageHandoffMarker(workflow, marker = 'PAGE_HANDOFF_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
