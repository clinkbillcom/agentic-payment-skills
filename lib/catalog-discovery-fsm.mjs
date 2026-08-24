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
export const CATALOG_SUPPORTED_COUNTRIES = Object.freeze(['HK', 'SG']);

// Only these buyer countries currently map to a catalog location context. Other countries are
// deliberately treated as unknown location so they do not block or accidentally narrow search.
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

function languageOf(input = {}) {
  return normalizedString(firstDefined(input, [
    'language',
    'languageTag',
    'language_tag',
    'locale',
  ]));
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
  const storeId = normalizedString(firstDefined(input, ['storeId', 'store_id']));

  if (!rawChannel) {
    if (storeId) {
      return { valid: false, reason: 'catalog_channel_type_missing', missing: ['channelType'] };
    }
    return { valid: true, ext: null };
  }

  const channelType = CHANNEL_ALIASES.get(rawChannel.toLowerCase()) ?? rawChannel;
  return {
    valid: true,
    // catalog search records --ext but does not use it as a search predicate. Keep it empty and
    // expose the actual top-level channel selector plus the store identity used after the response.
    ext: null,
    channelType,
    ...(storeId ? { storeId } : {}),
  };
}

export function resolveContextCountry(input = {}) {
  const explicitCountry = normalizedString(firstDefined(input, ['addressCountry', 'address_country']));
  // Compatibility for pending discovery objects created before addressCountry became the input
  // contract. New callers and documentation use addressCountry; only HK/SG legacy regions map.
  const legacyRegion = explicitCountry ? null : normalizedString(firstDefined(input, ['region']));
  const countryCode = (explicitCountry ?? legacyRegion)?.toUpperCase() ?? null;

  if (!countryCode) {
    return { valid: true, country: null };
  }

  if (!CATALOG_SUPPORTED_COUNTRIES.includes(countryCode)) {
    return { valid: true, country: null };
  }

  return { valid: true, country: countryCode };
}

function merchantListCommand() {
  return 'clink tool internal-ucp get-merchant-list --format json';
}

function merchantScopedSearchCommand(merchantId, query, language) {
  return `clink ucp-catalog search --merchant-id ${shellQuoteIfNeeded(merchantId)}`
    + ` --query ${shellQuoteIfNeeded(query)}`
    + ` --language ${shellQuoteIfNeeded(language)} --format json`;
}

function broadSearchCommand(query, channelType, country, language) {
  const channelArgument = channelType ? ` --channel-type ${shellQuoteIfNeeded(channelType)}` : '';
  let contextArgument = '';
  if (country) {
    const context = { address_country: country };
    contextArgument = ` --context ${shellQuoteIfNeeded(JSON.stringify(context))}`;
  }
  return `clink catalog search --query ${shellQuoteIfNeeded(query)}`
    + ` --language ${shellQuoteIfNeeded(language)}${channelArgument}${contextArgument} --format json`;
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

function broadGroupsForStore(groups, storeId) {
  if (!storeId) return groups;
  return groups.filter((group) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) return false;
    return normalizedString(group.store_id ?? group.storeId) === storeId;
  });
}

function broadProductCountOf(data = {}, groups, storeId) {
  // The server total covers its whole response. Once a store target is present, only the locally
  // filtered groups are authoritative and their products must be counted again.
  if (!storeId) {
    const declared = Number(data.total_products ?? data.totalProducts);
    if (Number.isInteger(declared) && declared >= 0) return declared;
  }
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
    };
  }

  const ext = extResolution.ext;
  const channelType = extResolution.channelType ?? null;
  const storeId = extResolution.storeId ?? null;
  const countryResolution = resolveContextCountry(input);
  const country = countryResolution.country;
  const language = languageOf(input);
  const raw = firstDefined(input, ['broadSearchOutput', 'broad_search_output', 'catalogSearchOutput', 'catalog_search_output']);
  if (raw === undefined) {
    return {
      state: CatalogDiscoveryState.BROAD_SEARCH_REQUIRED,
      action: CatalogDiscoveryAction.RUN_BROAD_CATALOG_SEARCH,
      terminal: false,
      reason: previousReason,
      query,
      ext,
      channelType,
      storeId,
      country,
      language,
      command: broadSearchCommand(query, channelType, country, language),
    };
  }

  const envelope = envelopeOf(raw);
  if (!envelope.valid) return cliError('invalid_broad_catalog_search_output', 'invalid_broad_catalog_search_output');
  if (envelope.errorCode) return cliError('broad_catalog_search_error', envelope.errorCode);

  const responseGroups = broadGroupsOf(envelope.data);
  if (!responseGroups) return cliError('invalid_broad_catalog_search_output', 'invalid_broad_catalog_search_output');

  const messages = messagesOf(envelope.data);
  const groups = broadGroupsForStore(responseGroups, storeId);
  const productCount = broadProductCountOf(envelope.data, groups, storeId);
  if (productCount > 0) {
    return {
      state: CatalogDiscoveryState.CATALOG_RESULTS_READY,
      action: CatalogDiscoveryAction.RETURN_CATALOG_RESULTS,
      terminal: true,
      reason: 'broad_catalog_search_matched',
      query,
      ext,
      channelType,
      storeId,
      country,
      language,
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
    channelType,
    storeId,
    country,
    language,
    ...(messages.length > 0 ? { messages } : {}),
  };
}

export function classifyCatalogDiscovery(input = {}) {
  const query = queryOf(input);
  const language = languageOf(input);
  if (!query) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: 'catalog_query_missing',
      missing: ['query'],
    };
  }
  if (!language) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: 'catalog_language_missing',
      missing: ['language'],
    };
  }

  // A store id is meaningful only within its platform channel. Validate that invariant before
  // doing any discovery work so a merchant-scoped match cannot bypass the requested store.
  const targetResolution = resolveCatalogExt(input);
  if (!targetResolution.valid) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: targetResolution.reason,
      ...(targetResolution.missing ? { missing: targetResolution.missing } : {}),
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
      language,
      command: merchantListCommand(),
    };
  }

  const merchantListEnvelope = envelopeOf(merchantListRaw);
  if (!merchantListEnvelope.valid) return cliError('invalid_merchant_list_output', 'invalid_merchant_list_output');
  if (merchantListEnvelope.errorCode) return cliError('merchant_list_error', merchantListEnvelope.errorCode);

  const candidates = merchantCandidatesOf(merchantListEnvelope.data);
  if (!candidates) return cliError('invalid_merchant_list_output', 'invalid_merchant_list_output');

  // A known platform channel/store is already a stronger target than merchant-intent inference.
  // Keep the merchant-list preflight, then go straight to the only endpoint that accepts the
  // channel selector and returns store identity. Merchant-scoped products carry neither.
  if (targetResolution.channelType) {
    return broadSearchStep(
      input,
      query,
      targetResolution.storeId ? 'store_target_established' : 'channel_target_established',
    );
  }

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
      language,
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
        language,
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
        language,
        merchantId: candidate.merchantId,
        domainName: candidate.domainName,
        ...(match.reason ? { matchReason: match.reason } : {}),
        command: merchantScopedSearchCommand(candidate.merchantId, query, language),
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
        language,
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
