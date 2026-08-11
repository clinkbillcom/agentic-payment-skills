import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AGENT_BROWSER_CHANNELS,
  AGENT_BROWSER_VERBS,
  LINK_COMMANDS_REQUIRING_NO_OPEN,
  LINK_COMMANDS_REQUIRING_OPEN,
  PAGE_HANDOFF_CONTRACTS,
  PageHandoffAction,
  PageHandoffActor,
  PageHandoffKind,
  PageHandoffState,
  classifyPageHandoff,
  formatPageHandoffMarker,
  resolvePageHandoffKind,
} from '../lib/page-handoff.mjs';

const HUMAN_KINDS = Object.values(PageHandoffKind)
  .filter((kind) => PAGE_HANDOFF_CONTRACTS[kind].actor !== PageHandoffActor.AGENT_ALLOWED);

test('every declared kind has a contract and every contract is declared', () => {
  const declared = new Set(Object.values(PageHandoffKind));
  const contracted = new Set(Object.keys(PAGE_HANDOFF_CONTRACTS));
  assert.deepEqual([...declared].filter((k) => !contracted.has(k)), []);
  assert.deepEqual([...contracted].filter((k) => !declared.has(k)), []);
});

test('Clink and Visa pages that need a person route to the user own device', () => {
  for (const kind of [
    PageHandoffKind.OAUTH_DEVICE_VERIFICATION,
    PageHandoffKind.CARD_BINDING,
    PageHandoffKind.CARD_SETUP,
    PageHandoffKind.CARD_MODIFY,
    PageHandoffKind.VIC_PASSKEY_REGISTRATION,
    PageHandoffKind.INSTRUCTION_PASSKEY_SIGNING,
    PageHandoffKind.INSTRUCTION_AGENT_PAGE,
    PageHandoffKind.THREE_DS_CHALLENGE,
  ]) {
    const result = classifyPageHandoff({ kind, url: 'https://example.test/page' });
    assert.equal(result.actor, PageHandoffActor.USER_DEVICE_ONLY, kind);
    assert.equal(result.state, PageHandoffState.USER_DEVICE_HANDOFF_REQUIRED, kind);
    assert.equal(result.action, PageHandoffAction.HANDOFF_TO_USER_DEVICE, kind);
    assert.equal(result.agentBrowserAllowed, false, kind);
    assert.equal(result.terminal, false, kind);
    assert.ok(result.doNotAutomateReason, `${kind} must say why it cannot be automated`);
    assert.deepEqual(
      result.cliFlags,
      kind === PageHandoffKind.OAUTH_DEVICE_VERIFICATION ? ['--open'] : ['--no-open'],
      kind,
    );
    assert.equal(result.verbatimUrl, true, kind);
  }
});

test('the risk page stays the user decision without claiming secret entry', () => {
  const result = classifyPageHandoff({ kind: PageHandoffKind.RISK_RULE_CONFIG });
  assert.equal(result.actor, PageHandoffActor.USER_PREFERRED);
  assert.equal(result.state, PageHandoffState.USER_BROWSER_HANDOFF_PREFERRED);
  assert.equal(result.action, PageHandoffAction.HANDOFF_TO_USER_BROWSER);
  assert.equal(result.agentBrowserAllowed, false);
  assert.deepEqual(result.completionEvents, ['risk_rule.updated']);
});

// The prohibition must not spill onto product exploration: parse-item and the catalog fallback
// require the agent to browse merchant pages.
test('merchant product pages stay agent work', () => {
  const result = classifyPageHandoff({
    kind: PageHandoffKind.MERCHANT_PRODUCT_PAGE,
    url: 'https://shop.example.test/products/thing',
  });
  assert.equal(result.actor, PageHandoffActor.AGENT_ALLOWED);
  assert.equal(result.state, PageHandoffState.AGENT_BROWSER_ALLOWED);
  assert.equal(result.action, PageHandoffAction.ALLOW_AGENT_BROWSER);
  assert.equal(result.agentBrowserAllowed, true);
  assert.equal(result.doNotAutomateReason, null);
  assert.deepEqual(result.cliFlags, []);
  assert.equal(result.watch, 'none');
});

test('an unattended run never emits a page only a human can finish', () => {
  for (const kind of HUMAN_KINDS) {
    const result = classifyPageHandoff({ kind, unattended: true });
    assert.equal(result.state, PageHandoffState.BROWSER_HANDOFF_UNREACHABLE, kind);
    assert.equal(result.action, PageHandoffAction.SURFACE_BROWSER_HANDOFF_GAP, kind);
    assert.equal(result.terminal, true, kind);
    assert.equal(result.reason, 'browser_handoff_required_on_unattended_run', kind);
    assert.equal(result.agentBrowserAllowed, false, kind);
  }
});

test('a runtime with no user channel is the same gap, not a wait', () => {
  const result = classifyPageHandoff({
    kind: PageHandoffKind.INSTRUCTION_PASSKEY_SIGNING,
    userReachable: false,
  });
  assert.equal(result.action, PageHandoffAction.SURFACE_BROWSER_HANDOFF_GAP);
  assert.equal(result.reason, 'browser_handoff_required_without_user_channel');
});

test('an unattended run still browses merchant pages', () => {
  const result = classifyPageHandoff({
    kind: PageHandoffKind.MERCHANT_PRODUCT_PAGE,
    unattended: true,
  });
  assert.equal(result.action, PageHandoffAction.ALLOW_AGENT_BROWSER);
  assert.equal(result.agentBrowserAllowed, true);
});

// An unlabeled URL is the dangerous default. If it fell through to "agent may open it", every
// hand-built Clink or Visa URL would be one missing argument away from being automated.
test('an unlabeled URL is an error, never agent-openable', () => {
  for (const request of [
    {},
    { url: '' },
    { url: 'https://merchant.example.test/checkout' },
    { kind: 'NOT_A_KIND' },
  ]) {
    const result = classifyPageHandoff(request);
    assert.equal(result.action, PageHandoffAction.SURFACE_PAGE_HANDOFF_ERROR, JSON.stringify(request));
    assert.equal(result.state, PageHandoffState.PAGE_HANDOFF_INVALID, JSON.stringify(request));
    assert.equal(result.agentBrowserAllowed, false, JSON.stringify(request));
    assert.equal(result.actor, null, JSON.stringify(request));
  }
});

test('the two URL shapes this skill hand-builds are recognized from the string alone', () => {
  assert.equal(
    resolvePageHandoffKind('https://agent.clinkbill.com/passkey-auth/pi_123?type=visa'),
    PageHandoffKind.VIC_PASSKEY_REGISTRATION,
  );
  assert.equal(
    resolvePageHandoffKind('https://auth.example.test/device?user_code=ABCD-EFGH#f=1'),
    PageHandoffKind.OAUTH_DEVICE_VERIFICATION,
  );
  assert.equal(resolvePageHandoffKind('https://shop.example.test/p/1'), null);
  assert.equal(resolvePageHandoffKind(undefined), null);
  assert.equal(resolvePageHandoffKind(''), null);
});

test('a bare Passkey URL classifies without being told its kind', () => {
  const result = classifyPageHandoff({
    url: 'https://agent.clinkbill.com/passkey-auth/pi_123?type=visa',
  });
  assert.equal(result.kind, PageHandoffKind.VIC_PASSKEY_REGISTRATION);
  assert.equal(result.action, PageHandoffAction.HANDOFF_TO_USER_DEVICE);
  assert.match(result.doNotAutomateReason, /virtual authenticator/u);
  assert.equal(result.watch, 'events-poll', 'the hand-built registration URL has no built-in watch');
});

test('single-load pages are marked so they are never re-sent as a nudge', () => {
  for (const kind of [
    PageHandoffKind.OAUTH_DEVICE_VERIFICATION,
    PageHandoffKind.CARD_BINDING,
    PageHandoffKind.CARD_SETUP,
    PageHandoffKind.CARD_MODIFY,
    PageHandoffKind.THREE_DS_CHALLENGE,
  ]) {
    assert.equal(classifyPageHandoff({ kind }).singleLoad, true, kind);
  }
});

test('completion events match the flows that prove them', () => {
  assert.deepEqual(
    classifyPageHandoff({ kind: PageHandoffKind.THREE_DS_CHALLENGE }).completionEvents,
    ['agent_order.succeeded', 'agent_order.failed'],
  );
  assert.deepEqual(
    classifyPageHandoff({ kind: PageHandoffKind.INSTRUCTION_PASSKEY_SIGNING }).completionEvents,
    ['purchase_instruction.activated'],
  );
  assert.deepEqual(
    classifyPageHandoff({ kind: PageHandoffKind.VIC_PASSKEY_REGISTRATION }).completionEvents,
    ['vic_device.binding_succeeded', 'payment_method.updated'],
  );
  assert.deepEqual(
    classifyPageHandoff({ kind: PageHandoffKind.CARD_BINDING }).completionEvents,
    ['payment_method.added'],
  );
});

// "Do not open a browser" is not what a host agent driving a browser MCP thinks it is doing when it
// calls navigate. The channels and verbs have to be enumerated for the prohibition to land.
test('the prohibition enumerates channels and verbs, not just opening', () => {
  for (const channel of ['browser MCP server', 'computer-use / screen control', 'embedded webview']) {
    assert.ok(AGENT_BROWSER_CHANNELS.includes(channel), channel);
  }
  for (const verb of ['navigate', 'preview', 'prefetch', 'screenshot', 'verify the page loads']) {
    assert.ok(AGENT_BROWSER_VERBS.includes(verb), verb);
  }

  const result = classifyPageHandoff({ kind: PageHandoffKind.CARD_BINDING });
  assert.deepEqual(result.doNotAutomateChannels, AGENT_BROWSER_CHANNELS);
  assert.deepEqual(result.doNotAutomateVerbs, AGENT_BROWSER_VERBS);
});

test('wallet init requires --open and every other link command requires --no-open', () => {
  assert.deepEqual(LINK_COMMANDS_REQUIRING_OPEN, ['wallet init']);
  assert.equal(LINK_COMMANDS_REQUIRING_NO_OPEN.includes('wallet init'), false);

  for (const command of [
    'card binding-link',
    'card setup-link',
    'card modify-link',
    'risk link',
    'instruction create',
    'instruction sign-url',
    'instruction update',
    'instruction cancel',
  ]) {
    assert.ok(LINK_COMMANDS_REQUIRING_NO_OPEN.includes(command), command);
  }
});

test('the marker stays an internal diagnostic shape', () => {
  const marker = formatPageHandoffMarker(
    classifyPageHandoff({ kind: PageHandoffKind.THREE_DS_CHALLENGE }),
  );
  assert.equal(
    marker,
    '[PAGE_HANDOFF_FSM] state=USER_DEVICE_HANDOFF_REQUIRED action=HANDOFF_TO_USER_DEVICE reason=acs_device_fingerprint_and_otp',
  );
});
