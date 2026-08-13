# UCP Checkout Product Order Flow

Read this before ordering a discovered product through `clink ucp-checkout`.

This flow is for product orders discovered by an agent, such as a Shopify storefront. Route selection happens after product parsing. First run `clink tool internal-ucp get-endpoint --product-url <item_url> --format json`. A resolved endpoint uses internal UCP checkout. Only `NOT_IN_INTERNAL_UCP_LIST` falls back to `https://domain/.well-known/ucp-clink`; a successful parseable JSON profile must then run `clink tool get-rest-endpoint --url <standard_ucp_url> --format json`. Fallback provider `clinkbill` uses internal checkout, while other providers and discovery failures use external checkout. The external path aligns with `clink-ucp` external checkout:

- create path: `/agent/ucp/external/checkout-sessions`
- create binds `instruction_id` and `mandate_id`
- complete path: `/agent/ucp/external/checkout-sessions/{checkoutId}/complete`
- external complete sends `payment_instrument_id` only
- checkout auth uses OAuth Bearer after OAuth has ever been enabled; only a never-OAuth legacy configuration where `oauthRequired` is absent or exactly `false` may use `X-Customer-API-Key` and `X-Timestamp`

## Boundary

Product discovery and price truth belong to the merchant/product tool. Agent owns product exploration for product URL checkout: use browser tools, page extraction, or a page request to read product details before asking the user for fields that the page can expose. This skill only runs the payment-side control flow after the target product is clear.

Do not use plain `clink pay` for this flow. UCP checkout is the order path because it carries line items, merchant URL, instruction binding, and external automation context.

UCP checkout completion is not merchant fulfillment. A `completed` checkout proves only the checkout/order-side action returned terminal success; fulfillment, delivery, entitlement, or merchant receipt confirmation still belongs to the merchant/product runtime.

## Required Inputs

Before the first checkout command, have all of these in the current request:

- product URL or checkout URL
- merchant URL and merchant display context
- merchant category code when known
- currency
- user-facing unit price, quantity, and total amount, plus normalized `amountMinor` / `unitPriceMinor` as minor-unit long values for matching and the external UCP request
- one selected available item from `clink tool parse-item --url <item_url> --format json`
- product title or description from the selected parsed item
- fulfillment classification: `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`
- payment instrument ID
- buyer data when required by the merchant
- standard complete shipping address for physical goods that ship

Never invent missing values. Ask the caller or user when product identity, amount, currency, merchant context, fulfillment type, shipping address, or payment instrument is missing.

## Control Model

Treat checkout as a closed-loop state machine. Use `lib/ucp-checkout-workflow-fsm.mjs` to classify each step, then run only the next allowed command.

```text
DISCOVER_PRODUCT
  -> RUN_PARSE_ITEM
  -> SELECT_ONE_AVAILABLE_ITEM_WITH classifyUcpParseItemObservation
  -> FREEZE_INTENT_QUANTITY_AND_AMOUNT_WITH normalizeUcpAmountToMinorUnitLong
  -> CLASSIFY_FULFILLMENT
  -> REFRESH_PAYMENT_INSTRUMENT
  -> IF_VISA_VIC_READY_LIST_AUTHORIZATIONS
  -> IF_VISA_VIC_READY_SELECT_INSTRUCTION_MANDATE
  -> IF_NO_MATCH_START_INSTRUCTION_WORKFLOW_AND_STOP
  -> IF_UNATTENDED_USE_PINNED_AUTHORIZATION_OR_SURFACE_GAP
  -> RESOLVE_CHECKOUT_ROUTE_WITH classifyUcpCheckoutRoute
  -> RUN_INTERNAL_UCP_GET_ENDPOINT
  -> IF_NOT_IN_INTERNAL_UCP_LIST_CHECK_STANDARD_UCP_PROFILE
  -> IF_PROFILE_JSON_GET_REST_ENDPOINT_AND_RECLASSIFY
  -> CREATE_INTERNAL_OR_EXTERNAL_CHECKOUT
  -> CAPTURE_CHECKOUT_ID
  -> VERIFY_READY_FOR_COMPLETE
  -> COMPLETE_CHECKOUT
  -> POLL_PAYMENT_SUCCESS_EVENT
  -> IF_UCP_ORDER_ID_MISSING_GET_CHECKOUT_WITH_ORIGINAL_ENDPOINT
  -> FETCH_UCP_ORDER_WITH_CHECKOUT_ORDER_ID
  -> RETURN_PAYMENT_SUCCESS_AND_ORDER_OR_SEPARATE_ORDER_WARNING
```

Every transition has a guard. If the guard fails, stop and report the exact missing or invalid condition instead of guessing. The feedback loop is the parsed JSON response from each CLI command plus a follow-up `ucp-checkout get` when the checkout state is not terminal.

## Step 0: Find And Freeze The Product

Agent owns product exploration. For "use Clink Pay to buy <product URL>" intent, first open or request the product URL with browser tools, page extraction, merchant tools, or a direct page request. When the user gives only a product name, search or browse until one product detail URL is found or until multiple candidates require selection. Do not ask the user for product title, price, currency, availability, variant ID, or option values before browser exploration and page request attempts have failed or left multiple valid choices.

### Optional: Merchant UCP Catalog Search

When a merchant is already known by `merchantId` and the user is browsing rather than naming a URL, the merchant's registered UCP Catalog can be queried directly instead of scraping storefront pages:

```bash
clink ucp-catalog search --merchant-id <merchant_id> --query <text> --limit <n> --format json
clink ucp-catalog product --merchant-id <merchant_id> --product-id <product_id> --format json
```

Both send `POST /agent/ucp/{merchantId}/catalog/{search,product}` using the environment saved by `wallet init`. `--context`, `--filters`, `--signals`, and `--attribution` must each be a JSON object; Catalog price filters use minor units. `--limit` is 1 to 100 and the server default is 10; continue paging with `--cursor` from the previous response. `--request-id` defaults to a generated UUID and stays stable across an OAuth refresh retry; `--ucp-agent` defaults to `clink-cli`. `product` takes the `--product-id` returned by `search` and rejects `--query`, `--cursor`, and `--limit`.

Catalog access is merchant-scoped and optional. A merchant without Catalog enabled returns an API error carrying the backend `catalog_not_supported` message ("Catalog is not available for this merchant") with exit code 5. Treat that specific code as "this merchant has no Catalog" and continue with normal product-URL exploration instead of reporting a failure to the user; surface every other Catalog error normally. Catalog results are a product-discovery aid only; they do not replace `tool parse-item`, which remains the source of the frozen item facts used by checkout.

When a product detail URL is available, run:

```bash
clink tool parse-item --url <item_url> --format json
```

parse-item returns product-page facts only. It does not return user intent fields or payment fields.

```json
{
  "itemUrl": "https://shop.example/products/t-shirt",
  "merchantOrigin": "https://shop.example",
  "merchantDomain": "shop.example",
  "merchantName": "Shop Example",
  "currency": "USD",
  "items": [
    {
      "itemId": "123",
      "title": "T-shirt",
      "unitPriceMinor": 1000,
      "available": true,
      "itemUrl": "https://shop.example/products/t-shirt?variant=123",
      "options": { "Color": "Black" },
      "inventoryStatus": "in_stock"
    }
  ]
}
```

Required `parse-item` fields:

- top level: `itemUrl`, `merchantOrigin`, `merchantDomain`, `merchantName`, `currency`, `items`
- each item: `itemId`, `title`, `unitPriceMinor`, `available`, `itemUrl`; `options` and `inventoryStatus` are optional but should be returned when available

Fields supplied by agent/FSM, not by `parse-item`:

- `quantity`: from user intent, default `1` only when unspecified
- `totalAmountMinor`: computed as `unitPriceMinor * quantity`
- `merchantCategoryCode`: agent classification from merchant/product context, confirmed when confidence is low
- `fulfillmentType`: agent classification; ask when unclear
- `paymentInstrumentId`, `instructionId`, `mandateId`, and `checkoutId`: payment/checkout FSM state

quantity comes from the user intent. merchantCategoryCode comes from agent classification, not from `parse-item`.

Classify the `parse-item` output with `classifyUcpParseItemObservation`. If there is one available item, select it. If there are multiple available items and the user is present, ask the user to choose. If there are multiple available items in a long task where the user is absent, select by frozen user intent and record the reason. Stop if no available item exists or required fields are missing.

Amount hard match means the checkout line-item total must equal the intended product total exactly after currency normalization. Carry `totalAmountMinor` through matching, idempotency, and checkout validation. The external UCP API receives a long minor-unit amount; when using `clink ucp-checkout create`, its create path converts `line_items` money fields such as `price` / `amount` from user-facing decimal major-unit values into that external UCP long before the API request. Do not treat a different product total as "close enough".

## Step 0.5: Classify Fulfillment And Shipping

Before payment refresh or instruction list, classify the frozen product/order:

- `PHYSICAL_GOODS_REQUIRES_SHIPPING`: shipped physical goods. Collect a standard complete shipping address before instruction list, instruction creation, or checkout create. Do not restrict the address to the US.
- `NO_SHIPPING_REQUIRED`: services, subscriptions, hotels, tickets, bookings, reservations, and digital goods. Do not ask the user for an address; use the fixed Apple Park default address when `instruction create` needs a shipping-address payload.
- `UNKNOWN`: stop and ask the caller or user whether the order ships a physical item. Do not run instruction list or checkout while fulfillment is unknown.

For `NO_SHIPPING_REQUIRED`, use this fixed Apple Park default address for instruction creation. It is a payment-context placeholder, not a delivery address:

```json
{
  "instructionShippingAddress": {
    "name": "Clink User",
    "line1": "One Apple Park Way",
    "city": "Cupertino",
    "state": "CA",
    "zip": "95014",
    "countryCode": "US",
    "deliveryContactDetails": {}
  },
  "payShippingAddress": {
    "street_address": "One Apple Park Way",
    "address_locality": "Cupertino",
    "address_region": "CA",
    "address_country": "US",
    "postal_code": "95014",
    "first_name": "Clink",
    "last_name": "User",
    "phone_number": "+14089961010"
  }
}
```

For physical goods, collect one standard complete shipping address but serialize it differently for each downstream command:

- CWallet instruction creation (`clink instruction create --shipping-address`) uses the instruction shipping shape. Required fields: `name`, `line1`, `city`, `state`, `zip`, and `countryCode`; `state` holds the region/province/administrative area, `zip` holds the postal code, and `countryCode` must be ISO 3166-1 alpha-2 for the destination country.
- External UCP checkout creation (`clink ucp-checkout create --shipping-address`) uses UCP Postal Address shape. Required fields: `street_address`, `address_locality`, `address_region`, `address_country`, and `postal_code`; `address_country` must be ISO 3166-1 alpha-2 for the destination country. Include `first_name`, `last_name`, and `phone_number` when available because the automation worker fills the external checkout page from this object.

```json
{
  "fulfillmentType": "PHYSICAL_GOODS_REQUIRES_SHIPPING",
  "instructionShippingAddress": {
    "name": "Buyer",
    "line1": "10 Downing Street",
    "city": "London",
    "state": "England",
    "zip": "SW1A 2AA",
    "countryCode": "GB",
    "deliveryContactDetails": {}
  },
  "ucpShippingAddress": {
    "street_address": "10 Downing Street",
    "address_locality": "London",
    "address_region": "England",
    "address_country": "GB",
    "postal_code": "SW1A 2AA",
    "first_name": "Buyer",
    "last_name": "Example",
    "phone_number": "+14155550100"
  }
}
```

## Step 1: Refresh Payment Instrument

Use the `clink` prefix defined for this workflow (see `references/clink-cli-invocation.md`); the prefix already fixes the environment, so do not add environment flags here.

```bash
clink card binding-link --no-watch --format json
```

Resolve the payment method from the refreshed `paymentMethodsVoList`: use the caller-selected card when provided, otherwise use the current/default paymentInstrumentId. Carry this exact `paymentInstrumentId` through the rest of the checkout workflow, including `ucp-checkout complete`. If no method exists, send the binding or setup URL from the card reference and wait for the matching event. Do not run checkout with a guessed card.

## Step 2: Authorization Gate And Candidate Instructions

After `parse-item` and item selection freeze the product facts, run the authorization capability gate against the refreshed selected/default card.

- If the selected/default card is not Visa, or it is Visa but VIC is not enabled, skip instruction and mandate matching.
- If the selected/default card is Visa + VIC ready, list candidate instructions before creating or checking out:

```bash
clink instruction list \
  --valid-only \
  --payment-instrument-id <payment_instrument_id> \
  --format json
```

The `--valid-only` query is required so the CLI requests ACTIVE instructions and filters unusable one-time mandates; still filter the returned payload defensively:

- filter out inactive instructions whose `status` is absent from the active set or is not `ACTIVE` / `active`
- filter out inactive mandates whose mandate-level status is not active when the backend exposes such a field
- filter out reserve / reserved / locked / in-use mandate entries **only on one-time instructions**. A recurring instruction (`isRecurring` truthy) keeps its mandates regardless of `reserveStatus`, because a recurring mandate is reusable by design; `--valid-only` deliberately leaves them in place. Applying the reservation filter there discards the exact mandate a scheduled task depends on and produces a false no-match.
- filter out entries for a different `paymentInstrumentId`
- filter out entries with missing `instructionId`, `mandateId`, `currencyCode`, or amount limit

If there is no matching instruction+mandate after filtering, screen the purchase with `classifyInstructionRestriction` from `lib/restricted-categories.mjs` (see `references/clink-restricted-categories.md`) — a restricted category refuses here and ends the checkout attempt without a draft — then start the instruction creation workflow described in `references/clink-instruction.md` with the same product/order mandate scope, then stop the UCP checkout path. In this skill, that means using `clink instruction create` and, when needed, `clink instruction sign-url`; it is the agentic equivalent of OpenClaw's `prepare_visa_purchase_instruction`, but do not call `prepare_visa_purchase_instruction` as a local tool in this skill. Do not run checkout create or complete on this Visa + VIC branch until the created instruction is Passkey-authorized, ACTIVE, tied to the same `paymentInstrumentId`, and contains a matching ACTIVE/non-reserved mandate.

When starting the instruction creation workflow, carry over the frozen merchant URL/domain, merchant/category/title/description semantics, currency, exact amount or authorized cap, service window, and fulfillment/shipping classification. For shipped physical goods, pass the real CWallet instruction address shape to `instruction create`. For `NO_SHIPPING_REQUIRED`, pass the fixed Apple Park default address in the same CWallet instruction shape. Do not pass the UCP Postal Address shape to instruction creation. After `instruction create` / `sign-url`, run `classifyAuthorizationDraftObservation` on the draft envelope and send the Passkey URL at once; those commands keep their built-in watch, so the same process is the listener and no separate `events poll` belongs beside it. Pass the watch's second envelope back through the classifier as `watchStdout`. After the activation event is observed and correlated to the created instruction, run `clink instruction get --purchase-instruction-id <instructionId> --format json` and `classifyAuthorizationActiveVerification`; restart this checkout flow from Step 1 only after the instruction is ACTIVE so the instruction list is refreshed before matching.

### Scheduled and unattended checkouts

A checkout started by a scheduled task has no user present, so it can neither collect a Passkey signature nor safely substitute a different mandate. It skips the list-and-match path entirely and uses the `instructionId` + `mandateId` pinned when the schedule was created (see `references/clink-instruction.md`):

```bash
clink instruction get --purchase-instruction-id <pinned_instruction_id> --format json
```

Pass that result plus the pinned ids to `classifyUnattendedAuthorization`. Only an `ACTIVE` instruction carrying the pinned mandate on the same `paymentInstrumentId` may proceed to Step 3. Anything else — expired, cancelled, exhausted, mandate missing, card changed — returns `SURFACE_UNATTENDED_AUTHORIZATION_GAP`: stop this run, report the reason, and ask the user to authorize a new instruction. Passing `unattended: true` to `classifyAuthorizationSelection` enforces the same rule: it returns `SURFACE_UNATTENDED_AUTHORIZATION_GAP` instead of `START_AUTHORIZATION_DRAFT_AND_WAIT` when no pinned authorization is present. Never create a draft, never re-run `instruction list` to find a substitute, and never report a checkout as merely pending when the authorization is the thing that failed.


## Step 3: Select One Instruction And Mandate

Select exactly one pair.

### Amount hard match

Normalize the product total and mandate amount to the same currency scale. A UCP checkout match requires:

- same currency
- product total equals the mandate's intended amount exactly when the mandate describes an exact purchase amount
- product total is within an explicitly authorized cap only when the user or mandate text clearly authorizes a limit-style scope for this merchant/product

For this product-order flow, prefer exact amount matches. Do not select a broad mandate merely because the backend might accept `amount < amountLimit`.

For a pinned scheduled authorization, the limit-style scope is the per-run cap written into the mandate `description` at creation, and the order total must be within it. A recurring mandate's `amountLimit` is the cycle budget, not the per-order ceiling, so never treat `amountLimit` as the per-order cap. This does not relax the rule above for any other flow: a mandate that was not pinned by this schedule is still matched by the ordinary exact/authorized-cap rules.

### Merchant semantic match

Merchant semantic match must cover the requested merchant or product context. Compare the available instruction and mandate fields such as title, description, merchant name, merchant URL/domain, merchant category code, product title, and product description.

Reject a candidate when the merchant semantics point to another merchant, another product family, an expired service window, or a category that conflicts with the requested product. If multiple candidates remain, choose the most specific one: same domain and product text beats category-only text.

## Step 4: Resolve Checkout Route

Resolve internal vs external checkout with `lib/ucp-checkout-route-fsm.mjs` `classifyUcpCheckoutRoute`. Merchant configuration and exact hostname matching belong to the CLI, not prompt logic or the skill FSM.

First run the `GET_INTERNAL_UCP_ENDPOINT` action returned by the FSM. Use the exact selected product/item URL; the CLI uses the environment persisted by `wallet init`:

```bash
clink tool internal-ucp get-endpoint --product-url <selected_item_url> --format json
```

- A result containing `endpoint`, `provider=clinkbill`, and `merchantId` selects `INTERNAL_UCP_CHECKOUT`. Carry the returned endpoint through checkout create/get/complete.
- Only `{ "error_code": "NOT_IN_INTERNAL_UCP_LIST" }` starts standard UCP profile discovery.
- Any other error, error envelope, or malformed output stops the route and is surfaced. Do not silently probe or select external checkout.

For the list-miss fallback, derive the canonical domain from `parse-item` `merchantDomain`, `merchantOrigin`, or the selected item URL and run the returned `CHECK_STANDARD_UCP_PROFILE` action:

```bash
curl -fsSL -XGET -H 'Accept: application/json' https://<domain>/.well-known/ucp-clink
```

- If that probe returns a successful parseable JSON response, reclassify and run `GET_REST_ENDPOINT`.
- If the probe fails, returns a non-2xx response, or returns a non-JSON body, reclassify with checked/failed evidence and route to external UCP checkout (`standard_ucp_profile_absent`).
- If no domain can be resolved, stop and ask for product/merchant input; do not guess.

For a successful profile, the `<standard_ucp_url>` must come from the profile shopping service endpoint (`services.*.endpoint`) when present; otherwise use the selected item/product URL:

```bash
clink tool get-rest-endpoint --url <standard_ucp_url> --format json
```

Reclassify with the `provider` and `endpoint` from that output. If `provider` is `clinkbill`, route to internal UCP checkout and carry `rest_endpoint` through create/get/complete. If provider is not `clinkbill`, route to external UCP checkout. If endpoint discovery returns `NO_UCP_REST_ENDPOINT` or another failure payload, route to external UCP checkout.

Route resolution must not mutate the selected item, amount, authorization, or merchant facts.

## Step 5: Create Internal Or External Checkout

Create the checkout with the selected item:

```bash
clink ucp-checkout create \
  [--endpoint <rest_endpoint>] \
  --merchant-url <selected_item_url> \
  --merchant-category-code <mcc> \
  --currency <currency> \
  [--instruction-id <instruction_id> --mandate-id <mandate_id>] \
  --line-items '[{"id":"li_<item_id>","item":{"id":"<item_id>","title":"<title>","price":"10.00"},"quantity":1}]' \
  --buyer '{"email":"buyer@example.com"}' \
  --idempotency-key <stable_create_key> \
  --format json
```

For external checkout, the current `clink ucp-checkout create` command sends the selected item URL through `--merchant-url`; this flag name is a CLI/API legacy name, not proof that the value is a merchant origin. Pass `--instruction-id` and `--mandate-id` only when the authorization resolver produced them and the selected checkout path requires them. For internal checkout, use the same `ucp-checkout create` command and selected item payload, but pass `--endpoint <rest_endpoint>` from either `internal-ucp get-endpoint` or fallback `get-rest-endpoint`. If provider is not `clinkbill`, use the external UCP checkout path without `--endpoint`.

For `ucp-checkout create`, use `--shipping-address '<json>'` only for physical goods that ship. The JSON must be the UCP Postal Address shape (`street_address`, `extended_address`, `address_locality`, `address_region`, `address_country`, `postal_code`, optional `first_name`, `last_name`, `phone_number`). `address_country` is the destination country as ISO 3166-1 alpha-2, not a fixed country. Services, subscriptions, hotels, tickets, reservations, bookings, and digital goods do not pass a UCP checkout shipping address unless the merchant explicitly requires one; this does not change the rule above that `NO_SHIPPING_REQUIRED` instruction creation uses the fixed Apple Park default address.

`stable_create_key` should be stable for the same product order attempt, for example a hash of selected item URL, item ID, quantity, total, instruction ID, mandate ID, and user/task correlation. Do not reuse it for a different cart.

This is a continuous create then complete handoff. After create, parse `data.id` / `data.checkout_id` / `data.checkoutId` as `checkoutId`; do not ask the user to provide it. A normal create response should be `ready_for_complete` (or equivalent ready state). If it is not ready, run:

```bash
clink ucp-checkout get --checkout-id <checkout_id> --format json
```

Stop on `requires_escalation`, `canceled`, or errors.

## Step 6: Complete Checkout

Complete uses the current/default paymentInstrumentId resolved in Step 1. Complete uses that `checkoutId`, the resolved payment instrument, and the same optional `--endpoint <rest_endpoint>` selected by route resolution. Do not pass instruction, mandate, or credential-token fields to complete; create binds instruction and mandate.

```bash
clink ucp-checkout complete \
  [--endpoint <rest_endpoint>] \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
```

`stable_complete_key` is scoped to the checkout ID and payment instrument. Reusing it for the same complete attempt is safe; do not reuse it across different checkout IDs.

## Step 7: Poll Payment Success Event

Parse the complete response. There are two distinct identifiers and their string prefixes are not a type system:

- `ucpOrderId`: checkout complete/get `data.order.id`. This is the only value allowed in `clink ucp-order get --order-id`.
- `paymentOrderId`: `agent_order.succeeded` `data.orderId` or `resourceId`. This is Clink Payment success evidence and must never be used for UCP order lookup.

Complete may return `complete_in_progress` without `order`; a later checkout GET exposes `order.id` after projection reaches `completed`. `order.permalink_url` may carry the merchant order page; pass it through as-is and treat absence as normal. The FSM accepts only the trusted legacy checkout-response aliases `omsOrderId` / `oms_order_id` and canonicalizes them to `ucpOrderId`; `merchantOrderId` is an external merchant reference, never a UCP ID alias. Freeze `checkoutId`, the route, and the original internal `endpoint`. Classify only explicit `{ok:true,data:{...}}` checkout and event-poll envelopes; an error or malformed envelope fails closed even if its error payload resembles completed checkout or success-event data. Bind every complete/get response with `expectedCheckoutId` or `expectedResource.checkoutId`; every present `id`, `checkoutId`, and `checkout_id` alias must agree with each other and with that frozen ID, and every present checkout/context UCP-order-ID alias must agree before order lookup. A missing frozen binding, conflicting aliases, or a response for another checkout fails closed. When complete returns `completed`, immediately start the payment success event poll:

```bash
clink events poll --type agent_order.succeeded --checkout-id <checkoutId> --max-wait 900 --format json
```

The 900-second window matches the 15-minute built-in watch used elsewhere; async order success can take minutes, so do not shorten it.

Classify the poll output with `classifyUcpPaymentSuccessEventObservation`. Pass `expectedResource: { checkoutId, ucpOrderId, checkoutEndpoint }` (omit absent fields; `omsOrderId` remains a compatibility alias):

- Let the CLI filter and ACK only exact `checkoutId`. A same-type event for another checkout stays queued for its own concurrent workflow. A generic event `orderId` is the payment ID and cannot substitute. Type-only UCP matching is unsafe and remains pending.
- Require every checkout-ID alias on the event to match the frozen checkout ID and every payment-order alias to agree. Store the matched event ID as `paymentOrderId`; do not overwrite `ucpOrderId`.

If `ucpOrderId` is already present, the FSM returns `FETCH_UCP_ORDER`. Otherwise it returns `GET_CHECKOUT_FOR_UCP_ORDER`; execute the exact `checkoutCommand` it provides:

```bash
clink ucp-checkout get \
  [--endpoint <original_rest_endpoint>] \
  --checkout-id <checkoutId> \
  --format json
```

Pass the exact event-bearing output from `classifyUcpPaymentSuccessEventObservation` plus that response to `classifyUcpOrderResolutionObservation`; never reconstruct post-payment context from `checkoutId` and `paymentOrderId`. The resolution and fetch classifiers require the original `agent_order.succeeded` event, its exact checkout correlation, and a matching supplied `paymentOrderId` when one is present. Missing or inconsistent evidence fails closed with `paymentConfirmed=false` and cannot emit a payment-success warning. On `complete_in_progress`, `processing`, or `completed` without `order.id`, retry only this read-only checkout GET with the returned bounded schedule (immediate, then 1/2/4/8 seconds). Network errors, HTTP 429, and HTTP 5xx use the same bound; validation, authentication/authorization, identifier conflicts, and malformed responses do not retry automatically. Do not re-poll the acknowledged event, re-run complete, or retry payment. After the bound is exhausted, return confirmed payment plus the resumable checkout GET warning.

Only after checkout complete/get yields `ucpOrderId` run:

```bash
clink ucp-order get --order-id <ucpOrderId> --format json
```

Classify `ucp-order get` with `classifyUcpOrderFetchObservation`, carrying forward the exact correlated event context returned by the preceding classifier. `message`, `orderPermalinkUrl`, and `checkoutEndpoint` stay attached across resolution retries, resolution success, fetch success, and fetch warnings. A successful result includes OMS success-page data at `data.ucp.success_info` when OMS stored it. If UCP ID resolution or order fetch fails after valid event correlation, the classifier returns confirmed payment with a separate order warning; never retry payment or claim merchant fulfillment, delivery, or entitlement.

If complete is not clearly terminal, verify state first:

```bash
clink ucp-checkout get [--endpoint <original_rest_endpoint>] --checkout-id <checkout_id> --format json
```

Status handling:

| Status | Action |
| --- | --- |
| `completed` | Poll the success event. After it matches, fetch with `ucpOrderId` or resolve it from this checkout; never use event `paymentOrderId`. |
| `complete_in_progress` | Keep checkoutId + original endpoint, poll the success event as the active workflow requires, then use bounded checkout GET recovery for `data.order.id`. |
| `ready_for_complete` | Complete did not start or was rejected before processing; inspect error output and do not retry blindly. |
| `requires_escalation` | Authorization did not cover the order; ask the user to create/update the instruction. |
| `canceled` | Stop; do not retry without a new checkout or explicit recovery path. |

If complete/get exits with a network or timeout error, treat the checkout state as unknown and execute only the FSM's returned read-only `resumeCommand`, which binds `ucp-checkout get` to the frozen checkout ID and original endpoint. A create exit 6 has no synthesized resume command when no trusted checkout ID exists. Treat checkout GET as recovery-only: never resubmit complete merely because that GET is inconclusive, and never resubmit create without a trusted checkout ID and an authoritative idempotency contract. Reuse the frozen mutation request only when an authoritative checkout state or idempotency contract proves that doing so is safe.

## Failure And Recovery Rules

- No matching instruction and mandate: start the instruction creation workflow, then stop checkout until instruction activation event proves a matching instruction+mandate is ACTIVE.
- No matching instruction and mandate on an unattended/scheduled run: `SURFACE_UNATTENDED_AUTHORIZATION_GAP`. Stop the run and report it; do not create a draft, because no user is present to sign the Passkey.
- Partial authorization match: do not select it.
- More than one equally specific match: ask the user to choose.
- `ucp-checkout create` idempotency conflict: use the original response if the cart is identical; otherwise create a new checkout with a new key.
- `ucp-checkout complete` already has a payment in progress: recover with `ucp-checkout get`.
- Payment success event poll timeout: return the pending state and `resumeCommand`; do not claim payment success until a matching `agent_order.succeeded` event is observed.
- Payment event matched but checkout has not exposed `order.id`: pass the exact event-bearing classifier output forward, keep payment confirmed, and retry only original-route `ucp-checkout get`; never reconstruct context from IDs, use event `paymentOrderId` for lookup, re-poll the event, or retry payment.
- UCP order lookup fails after valid correlated event context: return payment success with a separate order warning and preserve the message, order permalink, and checkout endpoint; payment status must not be downgraded. Missing or inconsistent event context is an input error with `paymentConfirmed=false`, not a payment-success warning.
- Backend `NO_AUTHORIZATION` or `UCP_AUTHORIZATION_BINDING_INVALID`: the instruction/mandate is not valid for this checkout. Stop and request a corrected instruction.

## Minimal End-To-End Skeleton

```bash
clink card binding-link --no-watch --format json
clink tool parse-item --url <item_url> --format json

# Select one available parsed item.
# Agent/FSM supplies quantity, merchantCategoryCode, fulfillmentType, and shipping when required.

# Authorization branch:
# If selected/default card is non-Visa or Visa without VIC readiness:
#   skip instruction matching.
# If selected/default card is Visa + VIC ready:
#   1. clink instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json
#   2. match amount, reusability, merchantCategoryCode, and merchant/product semantics
#   3. if no match, classifyInstructionRestriction over the complete purchase context
#   4. only CONTINUE_INSTRUCTION_CREATION may create/sign and wait for purchase_instruction.activated
#   5. restart from card refresh + instruction list after activation
# If this run is unattended/scheduled:
#   1. clink instruction get --purchase-instruction-id <pinned_instruction_id> --format json
#   2. classifyUnattendedAuthorization with the pinned instructionId + mandateId
#   3. anything other than ACTIVE with that mandate -> SURFACE_UNATTENDED_AUTHORIZATION_GAP and stop

# Resolve checkout route:
#   clink tool internal-ucp get-endpoint --product-url <selected_item_url> --format json
#   endpoint result -> internal UCP checkout with --endpoint <rest_endpoint>
#   NOT_IN_INTERNAL_UCP_LIST -> curl https://domain/.well-known/ucp-clink
#   successful parseable JSON profile -> clink tool get-rest-endpoint --url <standard_ucp_url> --format json
#   fallback provider=clinkbill -> internal UCP checkout with optional --endpoint <rest_endpoint>
#   fallback provider not clinkbill or standard_ucp_profile_absent -> external UCP checkout
#   any other internal endpoint error -> stop and surface the error

clink ucp-checkout create \
  [--endpoint <rest_endpoint>] \
  --merchant-url <selected_item_url> \
  --merchant-category-code <mcc> \
  --currency <currency> \
  [--instruction-id <instruction_id> --mandate-id <mandate_id>] \
  --line-items '<line_items_json>' \
  --shipping-address '<ucp_postal_address_json_if_required>' \
  --idempotency-key <stable_create_key> \
  --format json
clink ucp-checkout complete \
  [--endpoint <rest_endpoint>] \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
clink events poll --type agent_order.succeeded --checkout-id <checkout_id> --max-wait 900 --format json
# If complete had no data.order.id, resolve it after the event from the same checkout route.
clink ucp-checkout get [--endpoint <rest_endpoint>] --checkout-id <checkout_id> --format json
clink ucp-order get --order-id <ucpOrderId_from_checkout_order_id> --format json
```
