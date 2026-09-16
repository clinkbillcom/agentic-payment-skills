import { formatWorkflowMarker } from './workflow-marker.mjs';

export const CatalogDiscoveryState = Object.freeze({
  MERCHANT_LIST_REQUIRED: 'MERCHANT_LIST_REQUIRED',
  MERCHANT_INTENT_MATCH_REQUIRED: 'MERCHANT_INTENT_MATCH_REQUIRED',
  MERCHANT_SCOPED_SEARCH_REQUIRED: 'MERCHANT_SCOPED_SEARCH_REQUIRED',
  BROAD_SEARCH_REQUIRED: 'BROAD_SEARCH_REQUIRED',
  CATALOG_RESULTS_READY: 'CATALOG_RESULTS_READY',
  EXTERNAL_DISCOVERY_REQUIRED: 'EXTERNAL_DISCOVERY_REQUIRED',
  CATALOG_INPUT_MISSING: 'CATALOG_INPUT_MISSING',
  CATALOG_INPUT_INVALID: 'CATALOG_INPUT_INVALID',
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
export const CatalogEnvironment = Object.freeze({
  PRODUCTION: 'production',
  SANDBOX: 'sandbox',
  TEST: 'test',
});
export const INTERNAL_UCP_CATALOG_SOURCE = 'INTERNAL_UCP_CATALOG';

const CATALOG_ENVIRONMENT_ALIASES = new Map([
  ['production', CatalogEnvironment.PRODUCTION],
  ['sandbox', CatalogEnvironment.SANDBOX],
  ['test', CatalogEnvironment.TEST],
]);

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

function absoluteHttpUrl(value) {
  const raw = normalizedString(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:'].includes(parsed.protocol)
      && parsed.hostname
      && !parsed.username
      && !parsed.password
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function domainFromUrl(value) {
  const url = absoluteHttpUrl(value);
  return url ? new URL(url).hostname.toLowerCase().replace(/\.+$/u, '') : null;
}

function sameHttpUrl(left, right) {
  const normalizedLeft = absoluteHttpUrl(left);
  const normalizedRight = absoluteHttpUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function absoluteHttpRoute(value) {
  const raw = typeof value === 'string' ? normalizedString(value) : null;
  if (
    !raw
    || /[\\?#]/u.test(raw)
    || /[\u0000-\u0020\u007f]/u.test(raw)
    || /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*@/iu.test(raw)
  ) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/u, '');
  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || !hostname
    || parsed.username
    || parsed.password
    || parsed.port === '0'
    || parsed.search
    || parsed.hash
  ) return null;
  parsed.hostname = hostname;
  return parsed.pathname === '/' ? parsed.origin : `${parsed.origin}${parsed.pathname}`;
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
  const hasData = Object.hasOwn(parsed, 'data');
  const data = hasData ? parsed.data : parsed;
  if (!data || typeof data !== 'object') return { valid: false };
  return { valid: true, data };
}

function messagesOf(data = {}) {
  const messages = data.messages;
  if (!Array.isArray(messages)) return [];
  return messages.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
}

function isMerchantRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function apiMerchantCandidateOf(entry) {
  if (!isMerchantRecord(entry)) return null;
  const merchantId = typeof entry.merchant_id === 'string'
    ? normalizedString(entry.merchant_id)
    : null;
  const merchantName = typeof entry.merchant_name === 'string'
    ? normalizedString(entry.merchant_name)
    : null;
  const merchantUrl = typeof entry.domain === 'string'
    ? absoluteHttpRoute(entry.domain)
    : null;
  if (!merchantId || !merchantName || !merchantUrl) return null;

  return {
    merchantId,
    merchantName,
    domainName: domainFromUrl(merchantUrl),
    merchantUrl,
    description: typeof entry.description === 'string'
      ? normalizedString(entry.description)
      : null,
    enabled: true,
  };
}

function legacyMerchantCandidateOf(entry) {
  if (!isMerchantRecord(entry)) return null;
  const merchantId = normalizedString(entry.merchant_id ?? entry.merchantId);
  if (!merchantId) return null;

  const domainName = normalizedString(entry.domain_name ?? entry.domainName)
    ?.toLowerCase()
    .replace(/\.+$/u, '') ?? null;
  const rawMerchantUrl = absoluteHttpUrl(entry.merchant_url ?? entry.merchantUrl);
  const merchantUrl = rawMerchantUrl && domainFromUrl(rawMerchantUrl) === domainName
    ? rawMerchantUrl
    : null;
  return {
    merchantId,
    merchantName: normalizedString(entry.merchant_name ?? entry.merchantName),
    domainName,
    merchantUrl,
    description: typeof entry.description === 'string'
      ? normalizedString(entry.description)
      : null,
    enabled: entry.enabled !== false,
  };
}

function wrappedMerchantCandidateOf(entry) {
  if (!isMerchantRecord(entry)) return null;
  // Some callers wrapped the new CLI/API rows in the former `{ merchants: [...] }` envelope.
  // Preserve the new `domain` route contract for those snapshots; only rows without that field
  // belong to the legacy `domain_name` / `merchant_url` adapter.
  return Object.hasOwn(entry, 'domain')
    ? apiMerchantCandidateOf(entry)
    : legacyMerchantCandidateOf(entry);
}

function withoutConflictingHostnameBuckets(merchants) {
  const merchantIdsByHostname = new Map();
  for (const merchant of merchants) {
    if (!merchant.domainName) continue;
    const merchantIds = merchantIdsByHostname.get(merchant.domainName) ?? new Set();
    merchantIds.add(merchant.merchantId);
    merchantIdsByHostname.set(merchant.domainName, merchantIds);
  }
  return merchants.filter((merchant) => (
    !merchant.domainName || merchantIdsByHostname.get(merchant.domainName)?.size === 1
  ));
}

function merchantCandidatesOf(data) {
  // `tool internal-ucp get-merchant-list` returns `{ merchants: [...] }`. Keep a direct current-row
  // array as an input adapter for callers carrying an in-flight snapshot from the superseded
  // top-level merchant command.
  const apiArray = Array.isArray(data);
  const raw = apiArray ? data : data?.merchants;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];

  const parsed = raw
    .map(apiArray ? apiMerchantCandidateOf : wrappedMerchantCandidateOf)
    .filter((entry) => entry !== null);
  // An array with no trustworthy merchant identity is a damaged success envelope, not an empty
  // merchant list. Keep that whole-payload contract fail-closed while allowing isolated bad rows
  // to be skipped when at least one trustworthy row remains.
  if (parsed.length === 0) return null;

  const enabled = parsed.filter((entry) => entry.merchantId && entry.enabled);
  const unambiguous = withoutConflictingHostnameBuckets(enabled);
  if (enabled.length > 0 && unambiguous.length === 0) return null;
  return unambiguous
    // The endpoint already filters to active merchants. Intent matching still reads
    // `description`, so an entry without one cannot be matched on anything but a guess. The
    // legacy adapter must still honor an explicit `enabled:false` in an in-flight old snapshot.
    .filter((entry) => entry.description);
}

function internalCatalogProductCandidate(product, merchant) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return product;
  return {
    ...product,
    source: INTERNAL_UCP_CATALOG_SOURCE,
    merchantId: merchant.merchantId,
    ...(merchant.merchantName ? { merchantName: merchant.merchantName } : {}),
    ...(merchant.domainName ? { merchantDomain: merchant.domainName } : {}),
    ...(merchant.merchantUrl ? { merchantUrl: merchant.merchantUrl } : {}),
  };
}

function strictStringAliasResolution(input, keys, normalizer) {
  const supplied = keys
    .filter((key) => Object.hasOwn(input, key))
    .map((key) => input[key]);
  if (supplied.length === 0) return { valid: true, value: null };
  const normalized = supplied.map((value) => (
    typeof value === 'string' ? normalizer(value) : null
  ));
  const unique = new Set(normalized.filter((value) => value !== null));
  if (normalized.some((value) => value === null) || unique.size !== 1) {
    return { valid: false, value: null };
  }
  return { valid: true, value: normalized[0] };
}

function merchantDiscriminatorOf(input = {}) {
  const merchantUrl = strictStringAliasResolution(
    input,
    ['merchant_url', 'merchantUrl'],
    absoluteHttpRoute,
  );
  const domainName = strictStringAliasResolution(
    input,
    ['domain_name', 'domainName', 'merchant_domain', 'merchantDomain'],
    (value) => normalizedString(value)?.toLowerCase().replace(/\.+$/u, '') ?? null,
  );
  const invalidFields = [
    ...(!merchantUrl.valid ? ['merchantUrl'] : []),
    ...(!domainName.valid ? ['merchantDomain'] : []),
  ];
  return {
    valid: invalidFields.length === 0,
    merchantUrl: merchantUrl.value,
    domainName: domainName.value ?? domainFromUrl(merchantUrl.value),
    ...(invalidFields.length > 0 ? { invalidFields } : {}),
  };
}

function uniqueMerchantCandidate(merchants, merchantId, discriminator = {}) {
  const matches = merchants.filter((entry) => entry.merchantId === merchantId);
  if (matches.length === 0) return null;
  if (discriminator.valid === false) return null;

  const merchantUrl = absoluteHttpUrl(discriminator.merchantUrl);
  const domainName = normalizedString(discriminator.domainName)
    ?.toLowerCase()
    .replace(/\.+$/u, '') ?? domainFromUrl(merchantUrl);
  if (!merchantUrl && !domainName) return matches.length === 1 ? matches[0] : null;
  const discriminated = matches.filter((entry) => (
    (!merchantUrl || sameHttpUrl(entry.merchantUrl, merchantUrl))
    && (!domainName || entry.domainName === domainName)
  ));
  return discriminated.length === 1 ? discriminated[0] : null;
}

function enrichBroadGroups(groups, merchants = []) {
  return groups.map((group) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) return group;
    const merchantId = normalizedString(group.merchant_id ?? group.merchantId);
    if (!merchantId) return group;
    const merchant = uniqueMerchantCandidate(
      merchants,
      merchantId,
      merchantDiscriminatorOf(group),
    );
    if (!merchant) return group;
    const products = Array.isArray(group.products)
      ? group.products.map((product) => internalCatalogProductCandidate(product, merchant))
      : group.products;
    return {
      ...group,
      merchantId: merchant.merchantId,
      ...(merchant.merchantName ? { merchantName: merchant.merchantName } : {}),
      ...(merchant.domainName ? { merchantDomain: merchant.domainName } : {}),
      ...(merchant.merchantUrl ? { merchantUrl: merchant.merchantUrl } : {}),
      ...(products ? { products } : {}),
    };
  });
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

export function resolveCatalogEnvironment(input = {}) {
  const rawEnvironments = ['catalogEnvironment', 'catalog_environment']
    .map((key) => normalizedString(input[key]))
    .filter((value) => value !== null);
  const environments = rawEnvironments.map(
    (value) => CATALOG_ENVIRONMENT_ALIASES.get(value.toLowerCase()) ?? null,
  );
  const invalidIndex = environments.findIndex((value) => value === null);
  if (invalidIndex >= 0) {
    return {
      valid: false,
      reason: 'catalog_environment_invalid',
      value: rawEnvironments[invalidIndex],
    };
  }
  if (new Set(environments).size > 1) {
    return {
      valid: false,
      reason: 'catalog_environment_conflict',
      values: rawEnvironments,
    };
  }

  const catalogEnvironment = environments[0] ?? CatalogEnvironment.PRODUCTION;
  const flag = catalogEnvironment === CatalogEnvironment.SANDBOX
    ? '--sandbox'
    : catalogEnvironment === CatalogEnvironment.TEST
      ? '--test'
      : '';
  return { valid: true, catalogEnvironment, flag };
}

export function resolveCatalogLanguage(input = {}) {
  const rawLanguages = ['catalogLanguage', 'catalog_language', 'language']
    .map((key) => input[key])
    .filter((value) => (
      value !== undefined
      && value !== null
      && value !== ''
      && !(typeof value === 'string' && value.trim() === '')
    ));
  if (rawLanguages.length === 0) return { valid: true, catalogLanguage: null };

  const languages = [];
  for (const rawLanguage of rawLanguages) {
    try {
      if (typeof rawLanguage !== 'string') throw new RangeError('language must be a string');
      const candidate = rawLanguage.trim();
      if (candidate.length === 0 || candidate.length > 64) {
        throw new RangeError('language length is invalid');
      }
      const locale = new Intl.Locale(candidate);
      const language = locale.language;
      if (!language || language.toLowerCase() === 'und') {
        throw new RangeError('language is undefined');
      }

      let catalogLanguage;
      if (language.toLowerCase() !== 'zh') {
        catalogLanguage = locale.toString();
      } else if (locale.script === 'Hant') {
        catalogLanguage = 'zh-Hant';
      } else if (locale.script === 'Hans') {
        catalogLanguage = 'zh-Hans';
      } else if (locale.script) {
        throw new RangeError('unsupported Chinese script');
      } else if (['TW', 'HK', 'MO'].includes(locale.region ?? '')) {
        catalogLanguage = 'zh-Hant';
      } else if (['', 'CN', 'SG', 'MY'].includes(locale.region ?? '')) {
        catalogLanguage = 'zh-Hans';
      } else {
        throw new RangeError('unsupported Chinese region');
      }
      languages.push(catalogLanguage);
    } catch {
      return {
        valid: false,
        reason: 'catalog_language_invalid',
        value: rawLanguage,
      };
    }
  }
  if (new Set(languages).size > 1) {
    return {
      valid: false,
      reason: 'catalog_language_conflict',
      values: rawLanguages,
    };
  }
  return { valid: true, catalogLanguage: languages[0] };
}

function catalogLanguageArgument(catalogLanguage) {
  return catalogLanguage
    ? ` --language ${shellQuoteIfNeeded(catalogLanguage)}`
    : '';
}

function catalogContextArgument(country) {
  const context = {};
  if (country) context.address_country = country;
  return Object.keys(context).length > 0
    ? ` --context ${shellQuoteIfNeeded(JSON.stringify(context))}`
    : '';
}

function merchantListCommand(environmentFlag) {
  const flagArgument = environmentFlag ? ` ${environmentFlag}` : '';
  return `clink tool internal-ucp get-merchant-list${flagArgument} --format json`;
}

function merchantScopedSearchCommand(
  merchantId,
  query,
  environmentFlag,
  catalogLanguage,
) {
  const flagArgument = environmentFlag ? ` ${environmentFlag}` : '';
  const languageArgument = catalogLanguageArgument(catalogLanguage);
  return `clink ucp-catalog search --merchant-id ${shellQuoteIfNeeded(merchantId)}`
    + ` --query ${shellQuoteIfNeeded(query)}${languageArgument}${flagArgument} --format json`;
}

function broadSearchCommand(
  query,
  channelType,
  country,
  environmentFlag,
  catalogLanguage,
) {
  const channelArgument = channelType ? ` --channel-type ${shellQuoteIfNeeded(channelType)}` : '';
  const languageArgument = catalogLanguageArgument(catalogLanguage);
  const contextArgument = catalogContextArgument(country);
  const flagArgument = environmentFlag ? ` ${environmentFlag}` : '';
  return `clink catalog search --query ${shellQuoteIfNeeded(query)}${channelArgument}${languageArgument}${contextArgument}${flagArgument} --format json`;
}

function merchantMatchOf(input = {}) {
  const raw = firstDefined(input, ['merchantMatch', 'merchant_match']);
  if (raw === false) return { decided: true, matched: false };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.matched === false) return { decided: true, matched: false };
    const merchantId = strictStringAliasResolution(
      raw,
      ['merchantId', 'merchant_id'],
      normalizedString,
    );
    const discriminator = merchantDiscriminatorOf(raw);
    if (!merchantId.valid || !discriminator.valid) {
      return {
        decided: true,
        matched: true,
        valid: false,
        merchantId: merchantId.value,
        invalidFields: [
          ...(!merchantId.valid ? ['merchantId'] : []),
          ...(discriminator.invalidFields ?? []),
        ],
      };
    }
    if (merchantId.value) {
      return {
        decided: true,
        matched: true,
        merchantId: merchantId.value,
        ...discriminator,
        reason: normalizedString(raw.reason),
      };
    }
    return { decided: true, matched: false };
  }

  const merchantId = strictStringAliasResolution(
    input,
    ['matchedMerchantId', 'matched_merchant_id', 'merchantId', 'merchant_id'],
    normalizedString,
  );
  if (!merchantId.valid) {
    return {
      decided: true,
      matched: true,
      valid: false,
      merchantId: null,
      invalidFields: ['merchantId'],
    };
  }
  if (merchantId.value) return { decided: true, matched: true, merchantId: merchantId.value };
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

function cliError(reason, errorCode, catalogEnvironment) {
  return {
    state: CatalogDiscoveryState.CLI_ERROR,
    action: CatalogDiscoveryAction.SURFACE_ERROR,
    terminal: true,
    reason,
    errorCode,
    ...(catalogEnvironment ? { catalogEnvironment } : {}),
  };
}

function broadSearchStep(
  input,
  query,
  previousReason,
  environmentResolution,
  catalogLanguage,
  merchantCandidates = [],
) {
  const { catalogEnvironment, flag: environmentFlag } = environmentResolution;
  const extResolution = resolveCatalogExt(input);
  if (!extResolution.valid) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: extResolution.reason,
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
      ...(extResolution.missing ? { missing: extResolution.missing } : {}),
    };
  }

  const ext = extResolution.ext;
  const channelType = extResolution.channelType ?? null;
  const storeId = extResolution.storeId ?? null;
  const countryResolution = resolveContextCountry(input);
  const country = countryResolution.country;
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
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
      command: broadSearchCommand(
        query,
        channelType,
        country,
        environmentFlag,
        catalogLanguage,
      ),
    };
  }

  const envelope = envelopeOf(raw);
  if (!envelope.valid) {
    return cliError(
      'invalid_broad_catalog_search_output',
      'invalid_broad_catalog_search_output',
      catalogEnvironment,
    );
  }
  if (envelope.errorCode) {
    return cliError('broad_catalog_search_error', envelope.errorCode, catalogEnvironment);
  }

  const responseGroups = broadGroupsOf(envelope.data);
  if (!responseGroups) {
    return cliError(
      'invalid_broad_catalog_search_output',
      'invalid_broad_catalog_search_output',
      catalogEnvironment,
    );
  }

  const messages = messagesOf(envelope.data);
  const groups = enrichBroadGroups(
    broadGroupsForStore(responseGroups, storeId),
    merchantCandidates,
  );
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
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
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
    catalogEnvironment,
    ...(catalogLanguage ? { catalogLanguage } : {}),
    ...(messages.length > 0 ? { messages } : {}),
  };
}

export function classifyCatalogDiscovery(input = {}) {
  const environmentResolution = resolveCatalogEnvironment(input);
  if (!environmentResolution.valid) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_INVALID,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: environmentResolution.reason,
      ...(environmentResolution.value ? { value: environmentResolution.value } : {}),
      ...(environmentResolution.values ? { values: environmentResolution.values } : {}),
    };
  }
  const { catalogEnvironment, flag: environmentFlag } = environmentResolution;
  const languageResolution = resolveCatalogLanguage(input);
  if (!languageResolution.valid) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_INVALID,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: languageResolution.reason,
      ...(languageResolution.value ? { value: languageResolution.value } : {}),
      ...(languageResolution.values ? { values: languageResolution.values } : {}),
      catalogEnvironment,
    };
  }
  const { catalogLanguage } = languageResolution;
  if (!catalogLanguage) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: 'catalog_language_missing',
      catalogEnvironment,
      missing: ['catalogLanguage'],
    };
  }
  const query = queryOf(input);
  if (!query) {
    return {
      state: CatalogDiscoveryState.CATALOG_INPUT_MISSING,
      action: CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT,
      terminal: false,
      reason: 'catalog_query_missing',
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
      missing: ['query'],
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
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
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
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
      command: merchantListCommand(environmentFlag),
    };
  }

  const merchantListEnvelope = envelopeOf(merchantListRaw);
  if (!merchantListEnvelope.valid) {
    return cliError(
      'invalid_merchant_list_output',
      'invalid_merchant_list_output',
      catalogEnvironment,
    );
  }
  if (merchantListEnvelope.errorCode) {
    return cliError('merchant_list_error', merchantListEnvelope.errorCode, catalogEnvironment);
  }

  const candidates = merchantCandidatesOf(merchantListEnvelope.data);
  if (!candidates) {
    return cliError(
      'invalid_merchant_list_output',
      'invalid_merchant_list_output',
      catalogEnvironment,
    );
  }

  // A known platform channel/store is already a stronger target than merchant-intent inference.
  // Keep the merchant-list preflight, then go straight to the only endpoint that accepts the
  // channel selector and returns store identity. Merchant-scoped products carry neither.
  if (targetResolution.channelType) {
    return broadSearchStep(
      input,
      query,
      targetResolution.storeId ? 'store_target_established' : 'channel_target_established',
      environmentResolution,
      catalogLanguage,
      candidates,
    );
  }

  if (candidates.length === 0) {
    return broadSearchStep(
      input,
      query,
      'no_matchable_merchant_candidate',
      environmentResolution,
      catalogLanguage,
      candidates,
    );
  }

  const match = merchantMatchOf(input);
  if (!match.decided) {
    return {
      state: CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED,
      action: CatalogDiscoveryAction.MATCH_MERCHANT_INTENT,
      terminal: false,
      reason: 'merchant_intent_match_required',
      query,
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
      candidates,
    };
  }

  if (match.valid === false) {
    return {
      state: CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED,
      action: CatalogDiscoveryAction.MATCH_MERCHANT_INTENT,
      terminal: false,
      reason: 'merchant_match_invalid_discriminator',
      query,
      catalogEnvironment,
      ...(catalogLanguage ? { catalogLanguage } : {}),
      ...(match.merchantId ? { rejectedMerchantId: match.merchantId } : {}),
      ...(match.invalidFields ? { invalidFields: match.invalidFields } : {}),
      candidates,
    };
  }

  if (match.matched) {
    // The matched id must come from the list we just loaded; an unlisted id would send the search
    // to a merchant the wallet never enumerated.
    const candidate = uniqueMerchantCandidate(candidates, match.merchantId, match);
    if (!candidate) {
      const duplicateMerchantId = candidates.filter(
        (entry) => entry.merchantId === match.merchantId,
      ).length > 1;
      return {
        state: CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED,
        action: CatalogDiscoveryAction.MATCH_MERCHANT_INTENT,
        terminal: false,
        reason: duplicateMerchantId
          ? 'merchant_match_ambiguous'
          : 'merchant_match_not_in_candidates',
        query,
        catalogEnvironment,
        ...(catalogLanguage ? { catalogLanguage } : {}),
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
        catalogEnvironment,
        ...(catalogLanguage ? { catalogLanguage } : {}),
        merchantId: candidate.merchantId,
        domainName: candidate.domainName,
        ...(candidate.domainName ? { merchantDomain: candidate.domainName } : {}),
        ...(candidate.merchantUrl ? { merchantUrl: candidate.merchantUrl } : {}),
        ...(match.reason ? { matchReason: match.reason } : {}),
        command: merchantScopedSearchCommand(
          candidate.merchantId,
          query,
          environmentFlag,
          catalogLanguage,
        ),
      };
    }

    const envelope = envelopeOf(raw);
    if (!envelope.valid) {
      return cliError(
        'invalid_merchant_catalog_search_output',
        'invalid_merchant_catalog_search_output',
        catalogEnvironment,
      );
    }
    if (envelope.errorCode) {
      return cliError('merchant_catalog_search_error', envelope.errorCode, catalogEnvironment);
    }

    const products = merchantScopedProductsOf(envelope.data);
    if (!products) {
      return cliError(
        'invalid_merchant_catalog_search_output',
        'invalid_merchant_catalog_search_output',
        catalogEnvironment,
      );
    }

    const messages = messagesOf(envelope.data);
    if (products.length > 0) {
      return {
        state: CatalogDiscoveryState.CATALOG_RESULTS_READY,
        action: CatalogDiscoveryAction.RETURN_CATALOG_RESULTS,
        terminal: true,
        reason: 'merchant_scoped_search_matched',
        query,
        catalogEnvironment,
        ...(catalogLanguage ? { catalogLanguage } : {}),
        scope: 'MERCHANT_SCOPED',
        merchantId: candidate.merchantId,
        domainName: candidate.domainName,
        products: products.map((product) => internalCatalogProductCandidate(product, candidate)),
        productCount: products.length,
        ...(messages.length > 0 ? { messages } : {}),
      };
    }

    return broadSearchStep(
      input,
      query,
      'merchant_scoped_search_empty',
      environmentResolution,
      catalogLanguage,
      candidates,
    );
  }

  return broadSearchStep(
    input,
    query,
    'merchant_intent_match_failed',
    environmentResolution,
    catalogLanguage,
    candidates,
  );
}

export function formatCatalogDiscoveryFsmMarker(workflow, marker = 'CATALOG_DISCOVERY_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
