import test from 'node:test';
import assert from 'node:assert/strict';

import { strongAuthCapabilityOf } from '../lib/strong-auth.mjs';

test('missing readiness is a rollout-compatible unavailable capability and ignores protocol data', () => {
  for (const source of [
    {},
    { authProtocol: 'VISA' },
    { authProtocol: 'AMEX' },
    { authProtocol: 'VISA', auth_protocol: 'MASTERCARD' },
  ]) {
    assert.deepEqual(strongAuthCapabilityOf(source), {
      valid: true,
      strongAuthReady: null,
      authProtocol: null,
      reason: 'strong_auth_ready_missing',
    });
  }
});

test('false readiness preserves only one unambiguous supported protocol', () => {
  assert.deepEqual(strongAuthCapabilityOf({
    strongAuthReady: false,
    authProtocol: ' mastercard ',
  }), {
    valid: true,
    strongAuthReady: false,
    authProtocol: 'MASTERCARD',
    reason: 'strong_auth_not_ready',
  });

  for (const source of [
    { strongAuthReady: false },
    { strongAuthReady: false, authProtocol: 'AMEX' },
    { strongAuthReady: false, authProtocol: 1 },
    {
      strongAuthReady: false,
      authProtocol: 'VISA',
      auth_protocol: 'MASTERCARD',
    },
  ]) {
    assert.deepEqual(strongAuthCapabilityOf(source), {
      valid: true,
      strongAuthReady: false,
      authProtocol: null,
      reason: 'strong_auth_not_ready',
    });
  }
});

test('true readiness requires exactly one supported protocol', () => {
  assert.deepEqual(strongAuthCapabilityOf({
    strongAuthReady: true,
    authProtocol: 'visa',
  }), {
    valid: true,
    strongAuthReady: true,
    authProtocol: 'VISA',
    reason: 'strong_auth_ready',
  });

  for (const [source, reason] of [
    [{ strongAuthReady: true }, 'auth_protocol_required_when_strong_auth_ready'],
    [{ strongAuthReady: true, authProtocol: 'AMEX' }, 'auth_protocol_invalid'],
    [{
      strongAuthReady: true,
      authProtocol: 'VISA',
      auth_protocol: 'MASTERCARD',
    }, 'auth_protocol_conflict'],
  ]) {
    const capability = strongAuthCapabilityOf(source);
    assert.equal(capability.valid, false);
    assert.equal(capability.reason, reason);
  }
});

test('present readiness remains a strict Boolean contract', () => {
  for (const value of [null, 'true', 'false', 0, 1]) {
    const capability = strongAuthCapabilityOf({
      strongAuthReady: value,
      authProtocol: 'VISA',
    });
    assert.equal(capability.valid, false);
    assert.equal(capability.reason, 'strong_auth_ready_invalid');
  }

  const conflict = strongAuthCapabilityOf({
    strongAuthReady: true,
    strong_auth_ready: false,
    authProtocol: 'VISA',
  });
  assert.equal(conflict.valid, false);
  assert.equal(conflict.reason, 'strong_auth_ready_conflict');
});
