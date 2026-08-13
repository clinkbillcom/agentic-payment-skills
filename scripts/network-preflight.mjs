#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 60_000;

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'ABORT_ERR']);
const CONNECT_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTDOWN',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ENETUNREACH',
  'EPIPE',
]);

function cleanText(value, limit = 240) {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.replace(/[\r\n\t]+/gu, ' ').slice(0, limit);
}

function cleanCode(value) {
  const code = cleanText(value, 80);
  return code && /^[A-Z0-9_]+$/u.test(code) ? code : undefined;
}

function cleanHostname(value) {
  const hostname = cleanText(value, 253)?.toLowerCase().replace(/\.$/u, '');
  return hostname && /^[a-z0-9.:-]+$/u.test(hostname) ? hostname : undefined;
}

function safeMessage(value) {
  const message = cleanText(value);
  if (!message) return undefined;
  return /(?:https?:\/\/|\/|[?&#=])/u.test(message) ? undefined : message;
}

function collectCauseChain(error) {
  const causes = [];
  const seen = new Set();
  let current = error;

  while (current && typeof current === 'object' && !seen.has(current) && causes.length < 8) {
    causes.push(current);
    seen.add(current);
    current = current.cause;
  }

  return causes;
}

function isTlsCode(code) {
  return typeof code === 'string' && (
    code.startsWith('ERR_TLS_')
    || code.startsWith('ERR_SSL_')
    || code.includes('CERT')
    || code.includes('TLS')
    || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
  );
}

export function classifyTransportError(error) {
  const causes = collectCauseChain(error);
  const entries = causes.map((cause) => ({ cause, code: cleanCode(cause.code) }));
  const codes = entries.map(({ code }) => code).filter(Boolean);

  let kind = 'TRANSPORT_UNREACHABLE';
  if (codes.some((code) => DNS_CODES.has(code))) kind = 'DNS';
  else if (codes.some((code) => TIMEOUT_CODES.has(code)) || error?.name === 'AbortError') kind = 'TIMEOUT';
  else if (codes.some((code) => isTlsCode(code))) kind = 'TLS';
  else if (codes.some((code) => CONNECT_CODES.has(code))) kind = 'CONNECT';

  const matchesKind = (code) => (
    (kind === 'DNS' && DNS_CODES.has(code))
    || (kind === 'TIMEOUT' && TIMEOUT_CODES.has(code))
    || (kind === 'TLS' && isTlsCode(code))
    || (kind === 'CONNECT' && CONNECT_CODES.has(code))
  );
  const selected = entries.findLast(({ code }) => code && matchesKind(code))?.cause
    ?? entries.findLast(({ code }) => code)?.cause
    ?? causes.at(-1)
    ?? error;
  const causeCode = cleanCode(selected?.code)
    ?? (kind === 'TIMEOUT' && error?.name === 'AbortError' ? 'ETIMEDOUT' : undefined);

  const cause = {
    name: cleanText(selected?.name, 80) ?? cleanText(error?.name, 80),
    code: causeCode,
    message: safeMessage(selected?.message) ?? safeMessage(error?.message),
    syscall: cleanText(selected?.syscall, 80),
    hostname: cleanHostname(selected?.hostname),
  };

  return {
    kind,
    cause: Object.fromEntries(Object.entries(cause).filter(([, value]) => value !== undefined)),
  };
}

export function parseTarget(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    throw new TypeError('target must be a valid HTTPS URL or origin');
  }

  if (target.protocol !== 'https:') {
    throw new TypeError('target must use HTTPS');
  }
  if (target.username || target.password) {
    throw new TypeError('target must not contain credentials');
  }

  return {
    origin: target.origin,
    host: target.hostname,
  };
}

export async function runNetworkPreflight(targetValue, options = {}) {
  let target;
  try {
    target = parseTarget(targetValue);
  } catch (error) {
    return {
      ok: false,
      kind: 'INVALID_TARGET',
      message: cleanText(error.message),
    };
  }

  const environment = options.environment ?? process.env;
  // This variable is a useful runtime hint, not an authoritative capability check: an approved
  // or escalated command can retain the value while still having network access. Always test the
  // current execution context and attach the hint only when the transport probe actually fails.
  const sandboxNetworkDisabledHint = environment.CODEX_SANDBOX_NETWORK_DISABLED === '1';

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    return {
      ok: false,
      kind: 'INVALID_TIMEOUT',
      message: `timeoutMs must be an integer from ${MIN_TIMEOUT_MS} to ${MAX_TIMEOUT_MS}`,
    };
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(target.origin, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    return {
      ok: true,
      kind: 'HTTP_REACHABLE',
      host: target.host,
      origin: target.origin,
      httpStatus: response.status,
    };
  } catch (error) {
    const classification = classifyTransportError(error);
    return {
      ok: false,
      kind: classification.kind,
      host: target.host,
      origin: target.origin,
      cause: classification.cause,
      ...(sandboxNetworkDisabledHint ? {
        sandboxNetworkDisabledHint: true,
        suggestedConfig: 'sandbox_workspace_write.network_access=true',
      } : {}),
    };
  } finally {
    clearTimeout(timer);
  }
}

function usageError(message) {
  return {
    ok: false,
    kind: 'INVALID_ARGUMENTS',
    message,
    usage: 'node scripts/network-preflight.mjs <https-url-or-origin> [--timeout <ms>]',
  };
}

function parseArguments(argv) {
  if (argv.length === 0) return { error: usageError('missing HTTPS target') };

  let target;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--timeout') {
      const rawTimeout = argv[index + 1];
      const parsedTimeout = Number(rawTimeout);
      if (!Number.isInteger(parsedTimeout) || parsedTimeout < MIN_TIMEOUT_MS || parsedTimeout > MAX_TIMEOUT_MS) {
        return { error: usageError(`--timeout must be an integer from ${MIN_TIMEOUT_MS} to ${MAX_TIMEOUT_MS}`) };
      }
      timeoutMs = parsedTimeout;
      index += 1;
    } else if (argument.startsWith('-')) {
      return { error: usageError(`unknown option: ${argument}`) };
    } else if (target === undefined) {
      target = argument;
    } else {
      return { error: usageError('only one HTTPS target is allowed') };
    }
  }

  if (target === undefined) return { error: usageError('missing HTTPS target') };
  return { target, timeoutMs };
}

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseArguments(argv);
  const result = parsed.error ?? await runNetworkPreflight(parsed.target, { timeoutMs: parsed.timeoutMs });
  const stream = result.ok ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
