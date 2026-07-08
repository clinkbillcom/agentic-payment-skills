# UCP Checkout Product Order Flow

Read this before ordering a discovered product through `clink-cli ucp-checkout`.

This flow is for product orders discovered by an agent, such as a Shopify storefront. Route selection happens after product parsing: known standard UCP domains and successful `https://domain/.well-known/ucp-clink` JSON probes are standard UCP candidates. Candidates must run `clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json`; provider `clinkbill` uses the endpoint-aware standard checkout path, while provider values that are not `clinkbill` and endpoint-discovery failures use the external checkout path. The external path aligns with `clink-ucp` external checkout:

- create path: `/agent/ucp/external/checkout-sessions`
- create binds `instruction_id` and `mandate_id`
- complete path: `/agent/ucp/external/checkout-sessions/{checkoutId}/complete`
- external complete sends `payment_instrument_id` only
- checkout auth is customer API key only (`X-Customer-API-Key` and `X-Timestamp`)

## Boundary

Product discovery and price truth belong to the merchant/product tool. Agent owns product exploration for product URL checkout: use browser tools, page extraction, or a page request to read product details before asking the user for fields that the page can expose. This skill only runs the payment-side control flow after the target product is clear.

Do not use plain `clink-cli pay` for this flow. UCP checkout is the order path because it carries line items, merchant URL, instruction binding, and external automation context.

UCP checkout completion is not merchant fulfillment. A `completed` checkout proves only the checkout/order-side action returned terminal success; fulfillment, delivery, entitlement, or merchant receipt confirmation still belongs to the merchant/product runtime.

## Required Inputs

Before the first checkout command, have all of these in the current request:

- product URL or checkout URL
- merchant URL and merchant display context
- merchant category code when known
- currency
- user-facing unit price, quantity, and total amount, plus normalized `amountMinor` / `unitPriceMinor` as minor-unit long values for matching and the external UCP request
- one selected available item from `clink-cli tool parse-item --url <item_url> --format json`
- product title or description from the selected parsed item
- fulfillment classification: `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`
- payment instrument ID
- buyer data when required by the merchant
- standard complete shipping address for physical goods that ship

Never invent missing values. Ask the caller or user when product identity, amount, currency, merchant context, fulfillment type, shipping address, or payment instrument is missing.

## Control Model

Treat checkout as a closed-loop state machine. Use `lib/ucp-checkout-workflow-fsm.mjs` to classify each step, emit `[UCP_CHECKOUT_FSM] state=<STATE> action=<ACTION> reason=<REASON>`, and only then run the next command.

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
  -> RESOLVE_CHECKOUT_ROUTE_WITH classifyUcpCheckoutRoute
  -> IF_CHECK_STANDARD_UCP_PROFILE_RUN_CURL_AND_RECLASSIFY
  -> IF_STANDARD_CANDIDATE_GET_REST_ENDPOINT_AND_RECLASSIFY
  -> CREATE_STANDARD_OR_EXTERNAL_CHECKOUT
  -> CAPTURE_CHECKOUT_ID
  -> VERIFY_READY_FOR_COMPLETE
  -> COMPLETE_CHECKOUT
  -> POLL_PAYMENT_SUCCESS_EVENT
  -> RETURN_PAYMENT_SUCCESS_EVENT
```

Every transition has a guard. If the guard fails, stop and report the exact missing or invalid condition instead of guessing. The feedback loop is the parsed JSON response from each CLI command plus a follow-up `ucp-checkout get` when the checkout state is not terminal.

## Step 0: Find And Freeze The Product

Agent owns product exploration. For "use Clink Pay to buy <product URL>" intent, first open or request the product URL with browser tools, page extraction, merchant tools, or a direct page request. When the user gives only a product name, search or browse until one product detail URL is found or until multiple candidates require selection. Do not ask the user for product title, price, currency, availability, variant ID, or option values before browser exploration and page request attempts have failed or left multiple valid choices.

When a product detail URL is available, run:

```bash
clink-cli tool parse-item --url <item_url> --format json
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

Amount hard match means the checkout line-item total must equal the intended product total exactly after currency normalization. Carry `totalAmountMinor` through matching, idempotency, and checkout validation. The external UCP API receives a long minor-unit amount; when using `clink-cli ucp-checkout create`, its create path converts `line_items` money fields such as `price` / `amount` from user-facing decimal major-unit values into that external UCP long before the API request. Do not treat a different product total as "close enough".

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

- CWallet instruction creation (`clink-cli instruction create --shipping-address`) uses the instruction shipping shape. Required fields: `name`, `line1`, `city`, `state`, `zip`, and `countryCode`; `state` holds the region/province/administrative area, `zip` holds the postal code, and `countryCode` must be ISO 3166-1 alpha-2 for the destination country.
- External UCP checkout creation (`clink-cli ucp-checkout create --shipping-address`) uses UCP Postal Address shape. Required fields: `street_address`, `address_locality`, `address_region`, `address_country`, and `postal_code`; `address_country` must be ISO 3166-1 alpha-2 for the destination country. Include `first_name`, `last_name`, and `phone_number` when available because the automation worker fills the external checkout page from this object.

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

Use the `clink-cli` prefix defined for this workflow (see `references/clink-cli-invocation.md`); the prefix already fixes the environment, so do not add environment flags here.

```bash
clink-cli card binding-link --no-watch --format json
```

Resolve the payment method from the refreshed `paymentMethodsVoList`: use the caller-selected card when provided, otherwise use the current/default paymentInstrumentId. Carry this exact `paymentInstrumentId` through the rest of the checkout workflow, including `ucp-checkout complete`. If no method exists, send the binding or setup URL from the card reference and wait for the matching event. Do not run checkout with a guessed card.

## Step 2: Authorization Gate And Candidate Instructions

After `parse-item` and item selection freeze the product facts, run the authorization capability gate against the refreshed selected/default card.

- If the selected/default card is not Visa, or it is Visa but VIC is not enabled, skip instruction and mandate matching.
- If the selected/default card is Visa + VIC ready, list candidate instructions before creating or checking out:

```bash
clink-cli instruction list \
  --valid-only \
  --payment-instrument-id <payment_instrument_id> \
  --format json
```

The `--valid-only` query is required so the CLI requests ACTIVE instructions and filters unusable one-time mandates; still filter the returned payload defensively:

- filter out inactive instructions whose `status` is absent from the active set or is not `ACTIVE` / `active`
- filter out inactive mandates whose mandate-level status is not active when the backend exposes such a field
- filter out reserve / reserved / locked / in-use instruction or mandate entries when any returned field indicates reservation or a usage lock
- filter out entries for a different `paymentInstrumentId`
- filter out entries with missing `instructionId`, `mandateId`, `currencyCode`, or amount limit

If there is no matching instruction+mandate after filtering, start the instruction creation workflow described in `references/clink-instruction.md` with the same product/order mandate scope, then stop the UCP checkout path. In this skill, that means using `clink-cli instruction create` and, when needed, `clink-cli instruction sign-url`; it is the agentic equivalent of OpenClaw's `prepare_visa_purchase_instruction`, but do not call `prepare_visa_purchase_instruction` as a local tool in this skill. Do not run checkout create or complete on this Visa + VIC branch until the created instruction is Passkey-authorized, ACTIVE, tied to the same `paymentInstrumentId`, and contains a matching ACTIVE/non-reserved mandate.

When starting the instruction creation workflow, carry over the frozen merchant URL/domain, merchant/category/title/description semantics, currency, exact amount or authorized cap, service window, and fulfillment/shipping classification. For shipped physical goods, pass the real CWallet instruction address shape to `instruction create`. For `NO_SHIPPING_REQUIRED`, pass the fixed Apple Park default address in the same CWallet instruction shape. Do not pass the UCP Postal Address shape to instruction creation. After the `purchase_instruction.activated` event is observed and correlated to the created instruction, restart this checkout flow from Step 1 so the instruction list is refreshed before matching.

## Step 3: Select One Instruction And Mandate

Select exactly one pair.

### Amount hard match

Normalize the product total and mandate amount to the same currency scale. A UCP checkout match requires:

- same currency
- product total equals the mandate's intended amount exactly when the mandate describes an exact purchase amount
- product total is within an explicitly authorized cap only when the user or mandate text clearly authorizes a limit-style scope for this merchant/product

For this product-order flow, prefer exact amount matches. Do not select a broad mandate merely because the backend might accept `amount < amountLimit`.

### Merchant semantic match

Merchant semantic match must cover the requested merchant or product context. Compare the available instruction and mandate fields such as title, description, merchant name, merchant URL/domain, merchant category code, product title, and product description.

Reject a candidate when the merchant semantics point to another merchant, another product family, an expired service window, or a category that conflicts with the requested product. If multiple candidates remain, choose the most specific one: same domain and product text beats category-only text.

## Step 4: Resolve Checkout Route

Resolve standard vs external checkout with `lib/ucp-checkout-route-fsm.mjs` `classifyUcpCheckoutRoute`. This keeps merchant-specific routing out of prompt-only behavior.

The resolver derives a canonical domain from `parse-item` output in this order: `merchantDomain`, `merchantOrigin`, selected item URL, item URL, product URL, or merchant URL.

- If the domain is in the known standard UCP domain allowlist, treat it as a standard UCP candidate. The current allowlist contains `www.bruceleeclub.com`.
- If the domain is resolved but not allowlisted, first run the `CHECK_STANDARD_UCP_PROFILE` action returned by the FSM:

```bash
curl -fsSL -XGET -H 'Accept: application/json' https://<domain>/.well-known/ucp-clink
```

- If that probe returns a successful parseable JSON response, reclassify with the JSON response and treat it as a standard UCP candidate.
- If the probe fails, returns a non-2xx response, or returns a non-JSON body, reclassify with checked/failed evidence and route to external UCP checkout (`standard_ucp_profile_absent`).
- If no domain can be resolved, stop and ask for product/merchant input; do not guess.

For every standard UCP candidate, run the `GET_REST_ENDPOINT` action returned by the FSM. The `<standard_ucp_url>` must come from the profile shopping service endpoint (`services.*.endpoint`) when present; otherwise use the selected item/product/merchant URL that led to the candidate:

```bash
clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json
```

Reclassify with the `provider` and `endpoint` from that output. If `provider` is `clinkbill`, route to standard UCP checkout and carry `rest_endpoint` through create/get/complete. If provider is not `clinkbill`, route to external UCP checkout. If endpoint discovery returns `NO_UCP_REST_ENDPOINT` or another failure payload, route to external UCP checkout.

Do not treat `bruceleeclub.com` as equivalent to `www.bruceleeclub.com` unless it is explicitly added to the allowlist. Route resolution must not mutate the selected item, amount, or merchant facts.

## Step 5: Create Standard Or External Checkout

Create the checkout with the selected item:

```bash
clink-cli ucp-checkout create \
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

For external checkout, the current `clink-cli ucp-checkout create` command sends the selected item URL through `--merchant-url`; this flag name is a CLI/API legacy name, not proof that the value is a merchant origin. Pass `--instruction-id` and `--mandate-id` only when the authorization resolver produced them and the selected checkout path requires them. For standard checkout, use the same `ucp-checkout create` command and selected item payload, but pass `--endpoint <rest_endpoint>` when the clinkbill REST endpoint returned by `get-rest-endpoint` is non-empty. If the clinkbill endpoint is empty, omit `--endpoint` and keep the provider evidence in the FSM state. If provider is not `clinkbill`, use the external UCP checkout path without `--endpoint`.

For `ucp-checkout create`, use `--shipping-address '<json>'` only for physical goods that ship. The JSON must be the UCP Postal Address shape (`street_address`, `extended_address`, `address_locality`, `address_region`, `address_country`, `postal_code`, optional `first_name`, `last_name`, `phone_number`). `address_country` is the destination country as ISO 3166-1 alpha-2, not a fixed country. Services, subscriptions, hotels, tickets, reservations, bookings, and digital goods do not pass a UCP checkout shipping address unless the merchant explicitly requires one; this does not change the rule above that `NO_SHIPPING_REQUIRED` instruction creation uses the fixed Apple Park default address.

`stable_create_key` should be stable for the same product order attempt, for example a hash of selected item URL, item ID, quantity, total, instruction ID, mandate ID, and user/task correlation. Do not reuse it for a different cart.

This is a continuous create then complete handoff. After create, parse `data.id` / `data.checkout_id` / `data.checkoutId` as `checkoutId`; do not ask the user to provide it. A normal create response should be `ready_for_complete` (or equivalent ready state). If it is not ready, run:

```bash
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```

Stop on `requires_escalation`, `canceled`, or errors.

## Step 6: Complete Checkout

Complete uses the current/default paymentInstrumentId resolved in Step 1. Complete uses that `checkoutId`, the resolved payment instrument, and the same optional `--endpoint <rest_endpoint>` selected by route resolution. Do not pass instruction, mandate, or credential-token fields to complete; create binds instruction and mandate.

```bash
clink-cli ucp-checkout complete \
  [--endpoint <rest_endpoint>] \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
```

`stable_complete_key` is scoped to the checkout ID and payment instrument. Reusing it for the same complete attempt is safe; do not reuse it across different checkout IDs.

## Step 7: Poll Payment Success Event

Parse the complete response. When complete returns `completed`, immediately start the payment success event poll:

```bash
clink-cli events poll --type agent_order.succeeded --format json
```

Classify the poll output with `classifyUcpPaymentSuccessEventObservation`. Correlate the returned `agent_order.succeeded` event to the current `checkoutId`, `orderId`, or `sessionId` when those identifiers are available. Once matched, return or surface the success event/message to the caller. Do not claim merchant fulfillment, delivery, or entitlement.

If complete is not clearly terminal, verify state first:

```bash
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```

Status handling:

| Status | Action |
| --- | --- |
| `completed` | Immediately run `clink-cli events poll --type agent_order.succeeded --format json`, then return the matched payment success event/message. |
| `complete_in_progress` | Tell the user automation is in progress; poll `ucp-checkout get` with bounded retries or leave a resumable pending state. |
| `ready_for_complete` | Complete did not start or was rejected before processing; inspect error output and do not retry blindly. |
| `requires_escalation` | Authorization did not cover the order; ask the user to create/update the instruction. |
| `canceled` | Stop; do not retry without a new checkout or explicit recovery path. |

If the CLI exits with a network or timeout error, treat the checkout state as unknown. Check by `ucp-checkout get` before retrying complete.

## Failure And Recovery Rules

- No matching instruction and mandate: start the instruction creation workflow, then stop checkout until instruction activation event proves a matching instruction+mandate is ACTIVE.
- Partial authorization match: do not select it.
- More than one equally specific match: ask the user to choose.
- `ucp-checkout create` idempotency conflict: use the original response if the cart is identical; otherwise create a new checkout with a new key.
- `ucp-checkout complete` already has a payment in progress: recover with `ucp-checkout get`.
- Payment success event poll timeout: return the pending state and `resumeCommand`; do not claim payment success until a matching `agent_order.succeeded` event is observed.
- Backend `NO_AUTHORIZATION` or `UCP_AUTHORIZATION_BINDING_INVALID`: the instruction/mandate is not valid for this checkout. Stop and request a corrected instruction.

## Minimal End-To-End Skeleton

```bash
clink-cli card binding-link --no-watch --format json
clink-cli tool parse-item --url <item_url> --format json

# Select one available parsed item.
# Agent/FSM supplies quantity, merchantCategoryCode, fulfillmentType, and shipping when required.

# Authorization branch:
# If selected/default card is non-Visa or Visa without VIC readiness:
#   skip instruction matching.
# If selected/default card is Visa + VIC ready:
#   1. clink-cli instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json
#   2. match amount, reusability, merchantCategoryCode, and merchant/product semantics
#   3. if no match, create/sign instruction and wait for purchase_instruction.activated
#   4. restart from card refresh + instruction list after activation

# Resolve checkout route:
#   www.bruceleeclub.com -> standard UCP candidate
#   every other resolved domain -> curl https://domain/.well-known/ucp-clink
#   successful parseable JSON profile -> standard UCP candidate
#   standard candidate -> clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json
#   provider=clinkbill -> standard UCP checkout, carrying optional --endpoint <rest_endpoint>
#   provider not clinkbill or standard_ucp_profile_absent -> external UCP checkout

clink-cli ucp-checkout create \
  [--endpoint <rest_endpoint>] \
  --merchant-url <selected_item_url> \
  --merchant-category-code <mcc> \
  --currency <currency> \
  [--instruction-id <instruction_id> --mandate-id <mandate_id>] \
  --line-items '<line_items_json>' \
  --shipping-address '<ucp_postal_address_json_if_required>' \
  --idempotency-key <stable_create_key> \
  --format json
clink-cli ucp-checkout complete \
  [--endpoint <rest_endpoint>] \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
clink-cli events poll --type agent_order.succeeded --format json
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```
