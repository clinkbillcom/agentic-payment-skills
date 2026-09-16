export const StrongAuthProtocol = Object.freeze({
  VISA: 'VISA',
  MASTERCARD: 'MASTERCARD',
});

const SUPPORTED_PROTOCOLS = new Set(Object.values(StrongAuthProtocol));
const STRONG_AUTH_READY_KEYS = Object.freeze([
  'strongAuthReady',
  'strong_auth_ready',
]);
const AUTH_PROTOCOL_KEYS = Object.freeze([
  'authProtocol',
  'auth_protocol',
]);

function valuesForAliases(source, keys) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return keys
    .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
    .map((key) => source[key])
    .filter((value) => value !== undefined);
}

export function normalizeStrongAuthProtocol(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const normalized = value.trim().toUpperCase();
  return SUPPORTED_PROTOCOLS.has(normalized) ? normalized : null;
}

/**
 * Parse the paymentMethodList strong-auth capability contract without consulting card brand or
 * legacy network-specific registration flags. Camel-case is authoritative API shape; snake-case
 * remains accepted for normalized internal envelopes. Readiness aliases always fail closed when
 * malformed or conflicting. Protocol validation is strict only once readiness is true; an absent
 * readiness field is a rollout-compatible unavailable capability, while a non-ready card keeps a
 * protocol only when its aliases resolve to one supported value.
 */
export function strongAuthCapabilityOf(source = {}) {
  const readyValues = valuesForAliases(source, STRONG_AUTH_READY_KEYS);
  if (readyValues.length === 0) {
    return {
      valid: true,
      strongAuthReady: null,
      authProtocol: null,
      reason: 'strong_auth_ready_missing',
    };
  }
  if (readyValues.some((value) => typeof value !== 'boolean')) {
    return {
      valid: false,
      strongAuthReady: null,
      authProtocol: null,
      reason: 'strong_auth_ready_invalid',
    };
  }
  if (new Set(readyValues).size !== 1) {
    return {
      valid: false,
      strongAuthReady: null,
      authProtocol: null,
      reason: 'strong_auth_ready_conflict',
    };
  }

  const strongAuthReady = readyValues[0];
  const protocolValues = valuesForAliases(source, AUTH_PROTOCOL_KEYS);
  const normalizedProtocols = protocolValues.map(normalizeStrongAuthProtocol);

  if (!strongAuthReady) {
    const authProtocol = protocolValues.length > 0
      && normalizedProtocols.every((value) => value !== null)
      && new Set(normalizedProtocols).size === 1
      ? normalizedProtocols[0]
      : null;
    return {
      valid: true,
      strongAuthReady,
      authProtocol,
      reason: 'strong_auth_not_ready',
    };
  }

  if (protocolValues.length > 0) {
    if (normalizedProtocols.some((value) => value === null)) {
      return {
        valid: false,
        strongAuthReady,
        authProtocol: null,
        reason: 'auth_protocol_invalid',
      };
    }
    if (new Set(normalizedProtocols).size !== 1) {
      return {
        valid: false,
        strongAuthReady,
        authProtocol: null,
        reason: 'auth_protocol_conflict',
      };
    }
  }

  const authProtocol = normalizedProtocols[0] ?? null;
  if (authProtocol === null) {
    return {
      valid: false,
      strongAuthReady,
      authProtocol: null,
      reason: 'auth_protocol_required_when_strong_auth_ready',
    };
  }

  return {
    valid: true,
    strongAuthReady,
    authProtocol,
    reason: 'strong_auth_ready',
  };
}
