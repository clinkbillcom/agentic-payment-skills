import { formatWorkflowMarker } from './workflow-marker.mjs';

export const UcpCheckoutRouteState = Object.freeze({
  INTERNAL_ROUTE_SELECTED: 'INTERNAL_ROUTE_SELECTED',
  EXTERNAL_ROUTE_SELECTED: 'EXTERNAL_ROUTE_SELECTED',
  INTERNAL_ENDPOINT_REQUIRED: 'INTERNAL_ENDPOINT_REQUIRED',
  STANDARD_PROFILE_CHECK_REQUIRED: 'STANDARD_PROFILE_CHECK_REQUIRED',
  REST_ENDPOINT_REQUIRED: 'REST_ENDPOINT_REQUIRED',
  CHECKOUT_ROUTE_INPUT_MISSING: 'CHECKOUT_ROUTE_INPUT_MISSING',
  CLI_ERROR: 'CLI_ERROR',
});

export const UcpCheckoutRoute = Object.freeze({
  INTERNAL_UCP_CHECKOUT: 'INTERNAL_UCP_CHECKOUT',
  EXTERNAL_UCP_CHECKOUT: 'EXTERNAL_UCP_CHECKOUT',
  INTERNAL_UCP_ENDPOINT_DISCOVERY: 'INTERNAL_UCP_ENDPOINT_DISCOVERY',
  STANDARD_UCP_PROFILE_CHECK: 'STANDARD_UCP_PROFILE_CHECK',
  STANDARD_UCP_REST_ENDPOINT_DISCOVERY: 'STANDARD_UCP_REST_ENDPOINT_DISCOVERY',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
  ERROR: 'ERROR',
});

export const UcpCheckoutRouteAction = Object.freeze({
  CREATE_INTERNAL_UCP_CHECKOUT: 'CREATE_INTERNAL_UCP_CHECKOUT',
  CREATE_EXTERNAL_UCP_CHECKOUT: 'CREATE_EXTERNAL_UCP_CHECKOUT',
  GET_INTERNAL_UCP_ENDPOINT: 'GET_INTERNAL_UCP_ENDPOINT',
  CHECK_STANDARD_UCP_PROFILE: 'CHECK_STANDARD_UCP_PROFILE',
  GET_REST_ENDPOINT: 'GET_REST_ENDPOINT',
  ASK_FOR_CHECKOUT_ROUTE_INPUT: 'ASK_FOR_CHECKOUT_ROUTE_INPUT',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

const STANDARD_UCP_PROFILE_PATH = '/.well-known/ucp-clink';
const INTERNAL_UCP_LIST_MISS = 'NOT_IN_INTERNAL_UCP_LIST';

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

function booleanValue(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function domainFromUrl(value) {
  const raw = normalizedString(value);
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

function canonicalDomain(value) {
  const raw = normalizedString(value);
  if (!raw) return null;
  const withoutProtocol = raw.includes('://') ? domainFromUrl(raw) : raw;
  return normalizedString(withoutProtocol)?.toLowerCase().replace(/\.+$/u, '') || null;
}

function productUrlOf(input = {}) {
  return normalizedString(
    input.selectedItemUrl
      ?? input.selected_item_url
      ?? input.itemUrl
      ?? input.item_url
      ?? input.productUrl
      ?? input.product_url
      ?? input.merchantUrl
      ?? input.merchant_url,
  );
}

function merchantDomainOf(input = {}, productUrl) {
  return canonicalDomain(
    input.merchantDomain
      ?? input.merchant_domain
      ?? domainFromUrl(input.merchantOrigin ?? input.merchant_origin)
      ?? domainFromUrl(productUrl),
  );
}

function shellQuoteIfNeeded(value) {
  const raw = String(value);
  if (/^[A-Za-z0-9_./:@%+=-]+$/u.test(raw)) return raw;
  return `'${raw.replaceAll("'", "'\\''")}'`;
}

function internalEndpointCommandForUrl(url) {
  return `clink tool internal-ucp get-endpoint --product-url ${shellQuoteIfNeeded(url)} --format json`;
}

function profileUrlForDomain(merchantDomain) {
  return `https://${merchantDomain}${STANDARD_UCP_PROFILE_PATH}`;
}

function profileCommandForDomain(merchantDomain) {
  return `curl -fsSL -XGET -H 'Accept: application/json' ${profileUrlForDomain(merchantDomain)}`;
}

function restEndpointCommandForUrl(url) {
  return `clink tool get-rest-endpoint --url ${shellQuoteIfNeeded(url)} --format json`;
}

function internalEndpointOutputOf(input = {}) {
  const candidates = [
    input.internalUcpEndpointOutput,
    input.internal_ucp_endpoint_output,
    input.getInternalUcpEndpointOutput,
    input.get_internal_ucp_endpoint_output,
  ];
  const observed = candidates.some((value) => value !== undefined);
  if (!observed) return { observed: false };

  const raw = candidates.find((value) => value !== undefined);
  const parsed = parseMaybeJson(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      observed: true,
      status: 'error',
      reason: 'invalid_internal_ucp_endpoint_output',
      errorCode: 'invalid_internal_ucp_endpoint_output',
    };
  }

  const data = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
    ? parsed.data
    : parsed;
  const error = parsed.error && typeof parsed.error === 'object' && !Array.isArray(parsed.error)
    ? parsed.error
    : null;
  const errorCode = normalizedString(
    data.error_code
      ?? data.errorCode
      ?? error?.code
      ?? error?.errorCode
      ?? error?.type
      ?? error?.message
      ?? (parsed.ok === false ? 'internal_ucp_endpoint_failed' : null),
  );

  if (errorCode === INTERNAL_UCP_LIST_MISS) {
    return { observed: true, status: 'not_in_list', errorCode };
  }
  if (errorCode) {
    return {
      observed: true,
      status: 'error',
      reason: 'internal_ucp_endpoint_error',
      errorCode,
    };
  }

  const endpoint = normalizedString(data.endpoint ?? data.restEndpoint ?? data.rest_endpoint);
  const provider = normalizedString(data.provider ?? data.ucpProvider ?? data.ucp_provider);
  const merchantId = normalizedString(data.merchantId ?? data.merchant_id);
  const domainName = normalizedString(data.domainName ?? data.domain_name);
  if (!endpoint || provider?.toLowerCase() !== 'clinkbill' || !merchantId) {
    return {
      observed: true,
      status: 'error',
      reason: 'invalid_internal_ucp_endpoint_output',
      errorCode: 'invalid_internal_ucp_endpoint_output',
    };
  }

  return {
    observed: true,
    status: 'resolved',
    endpoint,
    provider,
    merchantId,
    domainName,
  };
}

function profileCandidateValues(input = {}) {
  return [
    input.standardUcpProfile,
    input.standard_ucp_profile,
    input.standardUcpProfileResponse,
    input.standard_ucp_profile_response,
    input.ucpClinkProfile,
    input.ucp_clink_profile,
    input.wellKnownUcpClinkJson,
    input.well_known_ucp_clink_json,
    input.wellKnownUcpClinkResponse,
    input.well_known_ucp_clink_response,
  ];
}

function statusCodeOf(input = {}) {
  const raw = input.standardUcpProfileStatus
    ?? input.standard_ucp_profile_status
    ?? input.wellKnownUcpClinkStatus
    ?? input.well_known_ucp_clink_status
    ?? input.statusCode
    ?? input.status_code;
  if (raw === undefined || raw === null || raw === '') return null;
  const statusCode = Number(raw);
  return Number.isInteger(statusCode) ? statusCode : null;
}

function isSuccessfulStatus(input = {}) {
  const statusCode = statusCodeOf(input);
  return statusCode === null || (statusCode >= 200 && statusCode < 300);
}

function standardProfileObservation(input = {}) {
  const jsonFlag = booleanValue(
    input.standardUcpProfileJson
      ?? input.standard_ucp_profile_json
      ?? input.wellKnownUcpClinkJson
      ?? input.well_known_ucp_clink_json,
  );
  if (jsonFlag === true) return { checked: true, hasJson: isSuccessfulStatus(input) };
  if (jsonFlag === false) return { checked: true, hasJson: false };

  const candidates = profileCandidateValues(input);
  const hasCandidate = candidates.some((value) => value !== undefined && value !== null && value !== '');
  const hasJson = candidates.some((value) => {
    const parsed = parseMaybeJson(value);
    return parsed !== null && typeof parsed === 'object';
  });
  if (hasJson) return { checked: true, hasJson: isSuccessfulStatus(input) };

  const checked = booleanValue(
    input.standardUcpProfileChecked
      ?? input.standard_ucp_profile_checked
      ?? input.wellKnownUcpClinkChecked
      ?? input.well_known_ucp_clink_checked,
  );
  return {
    checked: checked === true || hasCandidate || statusCodeOf(input) !== null,
    hasJson: false,
  };
}

function profileShoppingEndpointOf(input = {}) {
  for (const value of profileCandidateValues(input)) {
    const parsed = parseMaybeJson(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

    const directEndpoint = normalizedString(parsed.endpoint ?? parsed.restEndpoint ?? parsed.rest_endpoint);
    if (directEndpoint) return directEndpoint;

    const services = parsed.services && typeof parsed.services === 'object' ? parsed.services : null;
    if (!services) continue;

    for (const serviceDefinition of Object.values(services)) {
      const entries = Array.isArray(serviceDefinition) ? serviceDefinition : [serviceDefinition];
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const endpoint = normalizedString(entry.endpoint ?? entry.restEndpoint ?? entry.rest_endpoint);
        if (!endpoint) continue;
        const transport = normalizedString(entry.transport)?.toLowerCase();
        if (!transport || transport === 'rest') return endpoint;
      }
    }
  }
  return null;
}

function routeUrlOf(input = {}, productUrl, merchantDomain) {
  return profileShoppingEndpointOf(input)
    ?? productUrl
    ?? `https://${merchantDomain}`;
}

function restEndpointDataOf(input = {}) {
  const direct = input.restEndpointOutput
    ?? input.rest_endpoint_output
    ?? input.getRestEndpointOutput
    ?? input.get_rest_endpoint_output;
  const parsed = parseMaybeJson(direct);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    const error = parsed.error && typeof parsed.error === 'object' ? parsed.error : null;
    return {
      provider: normalizedString(data.provider ?? data.ucpProvider ?? data.ucp_provider),
      endpoint: normalizedString(data.endpoint ?? data.restEndpoint ?? data.rest_endpoint),
      errorCode: normalizedString(
        data.error_code
          ?? data.errorCode
          ?? error?.code
          ?? error?.errorCode
          ?? error?.type
          ?? error?.message
          ?? (parsed.ok === false ? 'get_rest_endpoint_failed' : null),
      ),
    };
  }
  if (direct !== undefined && direct !== null && direct !== '') {
    return { provider: null, endpoint: null, errorCode: 'invalid_get_rest_endpoint_output' };
  }
  return {
    provider: normalizedString(
      input.restEndpointProvider
        ?? input.rest_endpoint_provider
        ?? input.ucpProvider
        ?? input.ucp_provider
        ?? input.provider,
    ),
    endpoint: normalizedString(
      input.restEndpoint
        ?? input.rest_endpoint
        ?? input.ucpRestEndpoint
        ?? input.ucp_rest_endpoint
        ?? input.endpoint,
    ),
    errorCode: normalizedString(
      input.restEndpointErrorCode
        ?? input.rest_endpoint_error_code
        ?? input.error_code
        ?? input.errorCode,
    ),
  };
}

function classifyProfileCandidate(input, productUrl, merchantDomain, profileUrl) {
  const endpointData = restEndpointDataOf(input);
  if (endpointData.provider) {
    if (endpointData.provider.toLowerCase() === 'clinkbill') {
      return {
        state: UcpCheckoutRouteState.INTERNAL_ROUTE_SELECTED,
        route: UcpCheckoutRoute.INTERNAL_UCP_CHECKOUT,
        action: UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT,
        terminal: false,
        reason: 'internal_ucp_clinkbill_provider',
        merchantDomain,
        profileUrl,
        provider: endpointData.provider,
        endpoint: endpointData.endpoint,
      };
    }
    return {
      state: UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED,
      route: UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT,
      action: UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT,
      terminal: false,
      reason: 'standard_ucp_provider_not_clinkbill_external',
      merchantDomain,
      profileUrl,
      provider: endpointData.provider,
      endpoint: endpointData.endpoint,
    };
  }
  if (endpointData.errorCode) {
    return {
      state: UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED,
      route: UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT,
      action: UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT,
      terminal: false,
      reason: 'standard_ucp_rest_endpoint_unavailable_external',
      merchantDomain,
      profileUrl,
      errorCode: endpointData.errorCode,
    };
  }

  const restEndpointUrl = routeUrlOf(input, productUrl, merchantDomain);
  return {
    state: UcpCheckoutRouteState.REST_ENDPOINT_REQUIRED,
    route: UcpCheckoutRoute.STANDARD_UCP_REST_ENDPOINT_DISCOVERY,
    action: UcpCheckoutRouteAction.GET_REST_ENDPOINT,
    terminal: false,
    reason: 'standard_ucp_rest_endpoint_required',
    merchantDomain,
    profileUrl,
    restEndpointUrl,
    command: restEndpointCommandForUrl(restEndpointUrl),
  };
}

export function classifyUcpCheckoutRoute(input = {}) {
  const productUrl = productUrlOf(input);
  if (!productUrl) {
    return {
      state: UcpCheckoutRouteState.CHECKOUT_ROUTE_INPUT_MISSING,
      route: UcpCheckoutRoute.INPUT_REQUIRED,
      action: UcpCheckoutRouteAction.ASK_FOR_CHECKOUT_ROUTE_INPUT,
      terminal: false,
      reason: 'product_url_missing',
      missing: ['productUrl'],
    };
  }

  const internalEndpoint = internalEndpointOutputOf(input);
  if (!internalEndpoint.observed) {
    return {
      state: UcpCheckoutRouteState.INTERNAL_ENDPOINT_REQUIRED,
      route: UcpCheckoutRoute.INTERNAL_UCP_ENDPOINT_DISCOVERY,
      action: UcpCheckoutRouteAction.GET_INTERNAL_UCP_ENDPOINT,
      terminal: false,
      reason: 'internal_ucp_endpoint_required',
      productUrl,
      command: internalEndpointCommandForUrl(productUrl),
    };
  }

  if (internalEndpoint.status === 'resolved') {
    return {
      state: UcpCheckoutRouteState.INTERNAL_ROUTE_SELECTED,
      route: UcpCheckoutRoute.INTERNAL_UCP_CHECKOUT,
      action: UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT,
      terminal: false,
      reason: 'internal_ucp_cli_endpoint_resolved',
      productUrl,
      endpoint: internalEndpoint.endpoint,
      provider: internalEndpoint.provider,
      merchantId: internalEndpoint.merchantId,
      domainName: internalEndpoint.domainName,
    };
  }

  if (internalEndpoint.status === 'error') {
    return {
      state: UcpCheckoutRouteState.CLI_ERROR,
      route: UcpCheckoutRoute.ERROR,
      action: UcpCheckoutRouteAction.SURFACE_ERROR,
      terminal: true,
      reason: internalEndpoint.reason,
      errorCode: internalEndpoint.errorCode,
    };
  }

  const merchantDomain = merchantDomainOf(input, productUrl);
  if (!merchantDomain) {
    return {
      state: UcpCheckoutRouteState.CHECKOUT_ROUTE_INPUT_MISSING,
      route: UcpCheckoutRoute.INPUT_REQUIRED,
      action: UcpCheckoutRouteAction.ASK_FOR_CHECKOUT_ROUTE_INPUT,
      terminal: false,
      reason: 'merchant_domain_missing',
      missing: ['merchantDomain'],
    };
  }

  const profileObservation = standardProfileObservation(input);
  const profileUrl = profileUrlForDomain(merchantDomain);
  if (profileObservation.hasJson) {
    return classifyProfileCandidate(input, productUrl, merchantDomain, profileUrl);
  }
  if (!profileObservation.checked) {
    return {
      state: UcpCheckoutRouteState.STANDARD_PROFILE_CHECK_REQUIRED,
      route: UcpCheckoutRoute.STANDARD_UCP_PROFILE_CHECK,
      action: UcpCheckoutRouteAction.CHECK_STANDARD_UCP_PROFILE,
      terminal: false,
      reason: 'standard_ucp_profile_check_required',
      merchantDomain,
      profileUrl,
      command: profileCommandForDomain(merchantDomain),
    };
  }
  return {
    state: UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED,
    route: UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT,
    action: UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT,
    terminal: false,
    reason: 'standard_ucp_profile_absent',
    merchantDomain,
    profileUrl,
  };
}

export function formatUcpCheckoutRouteFsmMarker(workflow, marker = 'UCP_CHECKOUT_ROUTE_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
