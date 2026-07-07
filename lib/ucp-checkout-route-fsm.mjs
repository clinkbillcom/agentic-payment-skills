import { formatWorkflowMarker } from './workflow-marker.mjs';

export const UcpCheckoutRouteState = Object.freeze({
  STANDARD_ROUTE_SELECTED: 'STANDARD_ROUTE_SELECTED',
  EXTERNAL_ROUTE_SELECTED: 'EXTERNAL_ROUTE_SELECTED',
  CHECKOUT_ROUTE_INPUT_MISSING: 'CHECKOUT_ROUTE_INPUT_MISSING',
});

export const UcpCheckoutRoute = Object.freeze({
  STANDARD_UCP_CHECKOUT: 'STANDARD_UCP_CHECKOUT',
  EXTERNAL_UCP_CHECKOUT: 'EXTERNAL_UCP_CHECKOUT',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
});

export const UcpCheckoutRouteAction = Object.freeze({
  CREATE_STANDARD_UCP_CHECKOUT: 'CREATE_STANDARD_UCP_CHECKOUT',
  CREATE_EXTERNAL_UCP_CHECKOUT: 'CREATE_EXTERNAL_UCP_CHECKOUT',
  ASK_FOR_CHECKOUT_ROUTE_INPUT: 'ASK_FOR_CHECKOUT_ROUTE_INPUT',
});

export const STANDARD_UCP_DOMAINS = Object.freeze([
  'www.bruceleeclub.com',
]);

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
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

function merchantDomainOf(input = {}) {
  return canonicalDomain(
    input.merchantDomain
      ?? input.merchant_domain
      ?? domainFromUrl(input.merchantOrigin ?? input.merchant_origin)
      ?? domainFromUrl(input.selectedItemUrl ?? input.selected_item_url)
      ?? domainFromUrl(input.itemUrl ?? input.item_url)
      ?? domainFromUrl(input.productUrl ?? input.product_url)
      ?? domainFromUrl(input.merchantUrl ?? input.merchant_url),
  );
}

export function classifyUcpCheckoutRoute(input = {}) {
  const merchantDomain = merchantDomainOf(input);
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

  if (STANDARD_UCP_DOMAINS.includes(merchantDomain)) {
    return {
      state: UcpCheckoutRouteState.STANDARD_ROUTE_SELECTED,
      route: UcpCheckoutRoute.STANDARD_UCP_CHECKOUT,
      action: UcpCheckoutRouteAction.CREATE_STANDARD_UCP_CHECKOUT,
      terminal: false,
      reason: 'standard_ucp_domain_match',
      merchantDomain,
    };
  }

  return {
    state: UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED,
    route: UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT,
    action: UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT,
    terminal: false,
    reason: 'external_ucp_default',
    merchantDomain,
  };
}

export function formatUcpCheckoutRouteFsmMarker(workflow, marker = 'UCP_CHECKOUT_ROUTE_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
