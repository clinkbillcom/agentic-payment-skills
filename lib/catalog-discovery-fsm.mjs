import { formatWorkflowMarker } from './workflow-marker.mjs';

export const CatalogDiscoveryState = Object.freeze({
  MERCHANT_LIST_REQUIRED: 'MERCHANT_LIST_REQUIRED',
  MERCHANT_INTENT_MATCH_REQUIRED: 'MERCHANT_INTENT_MATCH_REQUIRED',
  MERCHANT_SCOPED_SEARCH_REQUIRED: 'MERCHANT_SCOPED_SEARCH_REQUIRED',
  BROAD_SEARCH_REQUIRED: 'BROAD_SEARCH_REQUIRED',
  CATALOG_RESULTS_READY: 'CATALOG_RESULTS_READY',
  EXTERNAL_DISCOVERY_REQUIRED: 'EXTERNAL_DISCOVERY_REQUIRED',
  CATALOG_INPUT_MISSING: 'CATALOG_INPUT_MISSING',
  CLI_ERROR: 'CLI_ERROR',
});

export const CatalogDiscoveryAction = Object.freeze({
  GET_MERCHANT_LIST: 'GET_MERCHANT_LIST',
  MATCH_MERCHANT_INTENT: 'MATCH_MERCHANT_INTENT',
  RUN_MERCHANT_SCOPED_CATALOG_SEARCH: 'RUN_MERCHANT_SCOPED_CATALOG_SEARCH',
  RUN_BROAD_CATALOG_SEARCH: 'RUN_BROAD_CATALOG_SEARCH',
  RETURN_CATALOG_RESULTS: 'RETURN_CATALOG_RESULTS',
  DELEGATE_EXTERNAL_PRODUCT_DISCOVERY: 'DELEGATE_EXTERNAL_PRODUCT_DISCOVERY',
  ASK_FOR_CATALOG_INPUT: 'ASK_FOR_CATALOG_INPUT',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

export const CATALOG_CHANNEL_EATS365 = 'eats365';
export const CATALOG_SUPPORTED_REGIONS = Object.freeze(['hk']);

// The platform store snapshot is published per channel+region, so an unlisted region cannot be
// narrowed server-side and would silently widen the search instead of failing.
const CHANNEL_ALIASES = new Map([
  ['eat365', CATALOG_CHANNEL_EATS365],
  ['eats365', CATALOG_CHANNEL_EATS365],
]);

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function parseMaybeJson(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function shellQuoteIfNeeded(value) {
  const raw = String(value);
  if (/^[A-Za-z0-9_./:@%+=-]+$/u.test(raw)) return raw;
  return `'${raw.replaceAll("'", "'\\''")}'`;
}

function firstDefined(input, keys) {
  const key = keys.find((candidate) => input[candidate] !== undefined);
  return key === undefined ? undefined : input[key];
}

function queryOf(input = {}) {
  return normalizedString(firstDefined(input, ['query', 'searchQuery', 'search_query']));
}

function envelopeOf(raw) {
  const parsed = parseMaybeJson(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false };
  }
  const error = parsed.error && typeof parsed.error === 'object' && !Array.isArray(parsed.error)
    ? parsed.error
    : null;
  const errorCode = normalizedString(
    parsed.error_code
      ?? parsed.errorCode
      ?? error?.code
      ?? error?.type
      ?? error?.message
      ?? (parsed.ok === false ? 'catalog_command_failed' : null),
  );
  if (errorCode) return { valid: true, errorCode };
  const data = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
    ? parsed.data
    : parsed;
  return { valid: true, data };
}

function messagesOf(data = {}) {
  const messages = data.messages;
  if (!Array.isArray(messages)) return [];
  return messages.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
}

function merchantCandidatesOf(data) {
  const raw = data?.merchants;
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      merchantId: normalizedString(entry.merchant_id ?? entry.merchantId),
      domainName: normalizedString(entry.domain_name ?? entry.domainName),
      description: normalizedString(entry.description),
      enabled: entry.enabled !== false,
    }))
    // Mirror the server-side candidate rule: intent matching reads `description`, so an entry
    // without one cannot be matched on anything but a guess.
    .filter((entry) => entry.merchantId && entry.enabled && entry.description);
}

export function resolveCatalogExt(input = {}) {
  const rawChannel = normalizedString(firstDefined(input, ['channelType', 'channel_type']));
  const region = normalizedString(firstDefined(input, ['region']))?.toLowerCase() ?? null;
  const storeId = normalizedString(firstDefined(input, ['storeId', 'store_id']));

  if (!rawChannel) {
    if (region || storeId) {
      return { valid: false, reason: 'catalog_channel_type_missing', missing: ['channelType'] };
    }
    return { valid: true, ext: null };
  }

  const channelType = CHANNEL_ALIASES.get(rawChannel.toLowerCase()) ?? rawChannel;
  if (channelType === CATALOG_CHANNEL_EATS365 && region && !CATALOG_SUPPORTED_REGIONS.includes(region)) {
    return { valid: false, reason: 'unsupported_catalog_region', region };
  }

  const ext = { channel_type: channelType };
  if (region) ext.region = region;
  if (storeId) ext.store_id = storeId;
  return { valid: true, ext };
}

function merchantListCommand() {
  return 'clink-cli tool internal-ucp get-merchant-list --format json';
}

function merchantScopedSearchCommand(merchantId, query) {
  return `clink-cli ucp-catalog search --merchant-id ${shellQuoteIfNeeded(merchantId)}`
    + ` --query ${shellQuoteIfNeeded(query)} --format json`;
}

function broadSearchCommand(query, ext) {
  const extArgument = ext ? ` --ext ${shellQuoteIfNeeded(JSON.stringify(ext))}` : '';
  return `clink-cli catalog search --query ${shellQuoteIfNeeded(query)}${extArgument} --format json`;
}

function merchantMatchOf(input = {}) {
  const raw = firstDefined(input, ['merchantMatch', 'merchant_match']);
  if (raw === false) return { decided: true, matched: false };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const merchantId = normalizedString(raw.merchantId ?? raw.merchant_id);
    if (raw.matched === false) return { decided: true, matched: false };
    if (merchantId) {
      return { decided: true, matched: true, merchantId, reason: normalizedString(raw.reason) };
    }
    return { decided: true, matched: false };
  }

  const merchantId = normalizedString(
    firstDefined(input, ['matchedMerchantId', 'matched_merchant_id', 'merchantId', 'merchant_id']),
  );
  if (merchantId) return { decided: true, matched: true, merchantId };
  const matched = firstDefined(input, ['merchantMatched', 'merchant_matched']);
  if (matched === false) return { decided: true, matched: false };
  return { decided: false };
}

function merchantScopedProductsOf(data = {}) {
  return Array.isArray(data.products) ? data.products : null;
}

function broadGroupsOf(data = {}) {
  return Array.isArray(data.groups) ? data.groups : null;
}

function broadProductCountOf(data = {}, groups) {
  const declared = Number(data.total_products ?? data.totalProducts);
  if (Number.isInteger(declared) && declared >= 0) return declared;
  return groups.reduce((total, group) => {
    const products = group && typeof group === 'object' && Array.isArray(group.products)
      ? group.products
      : [];
    return total + products.length;
  }, 0);
}

function cliError(reason, errorCode) {
  return {
    state: CatalogDiscoveryState.CLI_ERROR,
    action: CatalogDiscoveryAction.SURFACE_ERROR,
    terminal: true,
    reason,
    errorCode,
  };
}

function broadSearchStep(input, query, previousReason) {
  const extResolution = resolveCatalogExt(input);
  if (!extResolution.valid) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: extResolution.reason,
      ...(extResolution.missing ? { missing: extResolution.missing } : {}),
      ...(extResolution.region ? { region: extResolution.region } : {}),
      supportedRegions: [...CATALOG_SUPPORTED_REGIONS],
    };
  }

  const ext = extResolution.ext;
  const raw = firstDefined(input, ['broadSearchOutput', 'broad_search_output', 'catalogSearchOutput', 'catalog_search_output']);
  if (raw === undefined) {
    return {
      state: CatalogDiscoveryState.BROAD_SEARCH_REQUIRED,
      action: CatalogDiscoveryAction.RUN_BROAD_CATALOG_SEARCH,
      terminal: false,
      reason: previousReason,
      query,
      ext,
      command: broadSearchCommand(query, ext),
    };
  }

  const envelope = envelopeOf(raw);
  if (!envelope.valid) return cliError('invalid_broad_catalog_search_output', 'invalid_broad_catalog_search_output');
  if (envelope.errorCode) return cliError('broad_catalog_search_error', envelope.errorCode);

  const groups = broadGroupsOf(envelope.data);
  if (!groups) return cliError('invalid_broad_catalog_search_output', 'invalid_broad_catalog_search_output');

  const messages = messagesOf(envelope.data);
  const productCount = broadProductCountOf(envelope.data, groups);
  if (productCount > 0) {
    return {
      state: CatalogDiscoveryState.CATALOG_RESULTS_READY,
      action: CatalogDiscoveryAction.RETURN_CATALOG_RESULTS,
      terminal: true,
      reason: 'broad_catalog_search_matched',
      query,
      ext,
      scope: 'BROAD',
      groups,
      productCount,
      ...(messages.length > 0 ? { messages } : {}),
    };
  }

  return {
    state: CatalogDiscoveryState.EXTERNAL_DISCOVERY_REQUIRED,
    action: CatalogDiscoveryAction.DELEGATE_EXTERNAL_PRODUCT_DISCOVERY,
    terminal: true,
    reason: 'catalog_search_exhausted',
    query,
    ext,
    ...(messages.length > 0 ? { messages } : {}),
  };
}

export function classifyCatalogDiscovery(input = {}) {
  const query = queryOf(input);
  if (!query) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: 'catalog_query_missing',
      missing: ['query'],
    };
  }

  const merchantListRaw = firstDefined(input, ['merchantListOutput', 'merchant_list_output']);
  if (merchantListRaw === undefined) {
    return {
      state: CatalogDiscoveryState.MERCHANT_LIST_REQUIRED,
      action: CatalogDiscoveryAction.GET_MERCHANT_LIST,
      terminal: false,
      reason: 'merchant_list_required',
      query,
      command: merchantListCommand(),
    };
  }

  const merchantListEnvelope = envelopeOf(merchantListRaw);
  if (!merchantListEnvelope.valid) return cliError('invalid_merchant_list_output', 'invalid_merchant_list_output');
  if (merchantListEnvelope.errorCode) return cliError('merchant_list_error', merchantListEnvelope.errorCode);

  const candidates = merchantCandidatesOf(merchantListEnvelope.data);
  if (!candidates) return cliError('invalid_merchant_list_output', 'invalid_merchant_list_output');
  if (candidates.length === 0) {
    return broadSearchStep(input, query, 'no_matchable_merchant_candidate');
  }

  const match = merchantMatchOf(input);
  if (!match.decided) {
    return {
      state: CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED,
      action: CatalogDiscoveryAction.MATCH_MERCHANT_INTENT,
      terminal: false,
      reason: 'merchant_intent_match_required',
      query,
      candidates,
    };
  }

  if (match.matched) {
    // The matched id must come from the list we just loaded; an unlisted id would send the search
    // to a merchant the wallet never enumerated.
    const candidate = candidates.find((entry) => entry.merchantId === match.merchantId);
    if (!candidate) {
      return {
        state: CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED,
        action: CatalogDiscoveryAction.MATCH_MERCHANT_INTENT,
        terminal: false,
        reason: 'merchant_match_not_in_candidates',
        query,
        rejectedMerchantId: match.merchantId,
        candidates,
      };
    }

    const raw = firstDefined(input, ['merchantSearchOutput', 'merchant_search_output', 'ucpCatalogSearchOutput', 'ucp_catalog_search_output']);
    if (raw === undefined) {
      return {
        state: CatalogDiscoveryState.MERCHANT_SCOPED_SEARCH_REQUIRED,
        action: CatalogDiscoveryAction.RUN_MERCHANT_SCOPED_CATALOG_SEARCH,
        terminal: false,
        reason: 'merchant_intent_matched',
        query,
        merchantId: candidate.merchantId,
        domainName: candidate.domainName,
        ...(match.reason ? { matchReason: match.reason } : {}),
        command: merchantScopedSearchCommand(candidate.merchantId, query),
      };
    }

    const envelope = envelopeOf(raw);
    if (!envelope.valid) return cliError('invalid_merchant_catalog_search_output', 'invalid_merchant_catalog_search_output');
    if (envelope.errorCode) return cliError('merchant_catalog_search_error', envelope.errorCode);

    const products = merchantScopedProductsOf(envelope.data);
    if (!products) return cliError('invalid_merchant_catalog_search_output', 'invalid_merchant_catalog_search_output');

    const messages = messagesOf(envelope.data);
    if (products.length > 0) {
      return {
        state: CatalogDiscoveryState.CATALOG_RESULTS_READY,
        action: CatalogDiscoveryAction.RETURN_CATALOG_RESULTS,
        terminal: true,
        reason: 'merchant_scoped_search_matched',
        query,
        scope: 'MERCHANT_SCOPED',
        merchantId: candidate.merchantId,
        domainName: candidate.domainName,
        products,
        productCount: products.length,
        ...(messages.length > 0 ? { messages } : {}),
      };
    }

    return broadSearchStep(input, query, 'merchant_scoped_search_empty');
  }

  return broadSearchStep(input, query, 'merchant_intent_match_failed');
}

export function formatCatalogDiscoveryFsmMarker(workflow, marker = 'CATALOG_DISCOVERY_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
