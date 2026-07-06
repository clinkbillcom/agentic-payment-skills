# UCP Checkout Product Order Flow

Read this before ordering a discovered product through `clink-cli ucp-checkout`.

This flow is for external/shadow merchants discovered by an agent, such as a Shopify storefront. It aligns with `clink-ucp` external checkout:

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
- stable item ID, SKU, or Shopify variant ID when the product site exposes one
- product title or description
- fulfillment classification: `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`
- payment instrument ID
- buyer data when required by the merchant
- standard US shipping address for physical goods that ship

Never invent missing values. Ask the caller or user when product identity, amount, currency, merchant context, fulfillment type, shipping address, or payment instrument is missing.

## Control Model

Treat checkout as a closed-loop state machine. Use `lib/ucp-checkout-workflow-fsm.mjs` to classify each step, emit `[UCP_CHECKOUT_FSM] state=<STATE> action=<ACTION> reason=<REASON>`, and only then run the next command.

```text
DISCOVER_PRODUCT
  -> FREEZE_PRODUCT_AMOUNT_WITH normalizeUcpAmountToMinorUnitLong
  -> RESOLVE_PRODUCT_ITEM_ID_WITH classifyUcpItemIdResolution
  -> CLASSIFY_FULFILLMENT
  -> REFRESH_PAYMENT_INSTRUMENT
  -> LIST_AUTHORIZATIONS
  -> SELECT_INSTRUCTION_MANDATE
  -> IF_NO_MATCH_START_INSTRUCTION_WORKFLOW_AND_STOP
  -> IF_MATCH_CREATE_CHECKOUT
  -> CAPTURE_CHECKOUT_ID
  -> VERIFY_READY_FOR_COMPLETE
  -> COMPLETE_CHECKOUT
  -> POLL_PAYMENT_SUCCESS_EVENT
  -> RETURN_PAYMENT_SUCCESS_EVENT
```

Every transition has a guard. If the guard fails, stop and report the exact missing or invalid condition instead of guessing. The feedback loop is the parsed JSON response from each CLI command plus a follow-up `ucp-checkout get` when the checkout state is not terminal.

## Step 0: Find And Freeze The Product

Agent owns product exploration. For "use Clink Pay to buy <product URL>" intent, first open or request the product URL with browser tools, page extraction, merchant tools, or a direct page request. Extract title, price, currency, merchant context, availability, selected/default options, variant data, and fulfillment signals from the page or product JSON. Do not ask the user for product title, price, currency, availability, variant ID, or option values before browser exploration and page request attempts have failed or left multiple valid choices. Freeze one target:

```json
{
  "merchant_url": "https://shop.example/products/t-shirt?variant=123",
  "merchant_name": "Shop Example",
  "merchant_category_code": "5311",
  "currency": "USD",
  "unit_price_display": "10.00",
  "unitPriceMinor": 1000,
  "quantity": 1,
  "amountMinor": 1000,
  "item_id": "123",
  "variant_id": "123",
  "title": "T-shirt"
}
```

Amount hard match means the checkout line-item total must equal the intended product total exactly after currency normalization. Convert the user-facing amount to a minor-unit long with `normalizeUcpAmountToMinorUnitLong` and carry that `amountMinor` through matching, idempotency, and checkout validation. The external UCP API receives a long minor-unit amount; when using `clink-cli ucp-checkout create`, its create path converts `line_items` money fields such as `price` / `amount` from user-facing decimal major-unit values into that external UCP long before the API request. Do not treat a different product total as "close enough".

Resolve a stable item ID during product freeze with `classifyUcpItemIdResolution`. For Shopify sites:

- Direct variant links: if the URL carries a variant query parameter (`variant=<id>`), use that value as the Shopify `variant_id` / UCP `item_id`; do not fetch product JSON just to rediscover it.
- SPU product slug links: strip query/hash and fetch `<product_url>.js` (for example `/products/<slug>.js`). Parse the JSON response body `variants array`, then select the variant by explicit user selection such as exact variant ID or option values (`Color`, `Size`, etc.).
- If there is only one variant, it can be selected. If several variants remain and the user has not chosen enough options, ask for the missing selection; do not guess.
- Shopify custom domains are acceptable when product discovery identifies the platform through page evidence or CNAME; pass that as `siteType=shopify` to the FSM.

If Shopify resolution fails or the site is not Shopify, `clink-cli tool item-id --url <product_url> --format json` is the fallback. Continue only when the fallback returns a stable `data.item_id`; otherwise ask for a variant link, SKU, or product selection.

## Step 0.5: Classify Fulfillment And Shipping

Before payment refresh or instruction list, classify the frozen product/order:

- `PHYSICAL_GOODS_REQUIRES_SHIPPING`: shipped physical goods. Collect a standard US shipping address before instruction list, instruction creation, item ID extraction, or checkout create.
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

For physical goods, collect one US shipping address but serialize it differently for each downstream command:

- CWallet instruction creation (`clink-cli instruction create --shipping-address`) uses the instruction shipping shape. Required fields: `name`, `line1`, `city`, `state`, `zip`, and `countryCode`; `countryCode` must be `US`.
- External UCP checkout creation (`clink-cli ucp-checkout create --shipping-address`) uses UCP Postal Address shape. Required fields: `street_address`, `address_locality`, `address_region`, `address_country`, and `postal_code`; `address_country` must be `US`. Include `first_name`, `last_name`, and `phone_number` when available because the automation worker fills the external checkout page from this object.

```json
{
  "fulfillmentType": "PHYSICAL_GOODS_REQUIRES_SHIPPING",
  "instructionShippingAddress": {
    "name": "Buyer",
    "line1": "123 Market St",
    "line2": "Apt 201",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "countryCode": "US",
    "deliveryContactDetails": {}
  },
  "ucpShippingAddress": {
    "street_address": "123 Market St",
    "extended_address": "Apt 201",
    "address_locality": "San Francisco",
    "address_region": "CA",
    "address_country": "US",
    "postal_code": "94105",
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

## Step 2: List Candidate Instructions

List before creating or checking out:

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

If there is no matching instruction+mandate after filtering, start the instruction creation workflow described in `references/clink-instruction.md` with the same product/order mandate scope, then stop the UCP checkout path. In this skill, that means using `clink-cli instruction create` and, when needed, `clink-cli instruction sign-url`; it is the agentic equivalent of OpenClaw's `prepare_visa_purchase_instruction`, but do not call `prepare_visa_purchase_instruction` as a local tool in this skill. Do not run `ucp-checkout create` or `ucp-checkout complete` until the created instruction is Passkey-authorized, ACTIVE, tied to the same `paymentInstrumentId`, and contains a matching ACTIVE/non-reserved mandate.

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

## Step 4: Resolve `item_id`

Use the product-freeze result from `classifyUcpItemIdResolution` before checkout create. If it already returned `ITEM_ID_EXTRACTED`, carry that `itemId` into the line item. If it returned `shopify_product_json_required`, fetch `productJsonUrl`, parse the `variants array`, and re-run the classifier with the user's variant selection.

For non-Shopify URLs or unresolved product URLs, use the CLI fallback after the product URL is frozen:

```bash
clink-cli tool item-id --url <product_url> --format json
```

Use `data.item_id` as the UCP item ID. If it is `unknown`, continue only if the product discovery step produced another stable SKU or variant ID. Otherwise stop and ask for a product URL or SKU that can identify the item.

## Step 5: Create External Checkout

Create the checkout with the selected instruction and mandate:

```bash
clink-cli ucp-checkout create \
  --merchant-url <product_or_checkout_url> \
  --merchant-category-code <mcc> \
  --currency <currency> \
  --instruction-id <instruction_id> \
  --mandate-id <mandate_id> \
  --line-items '[{"id":"li_<item_id>","item":{"id":"<item_id>","title":"<title>","price":"10.00"},"quantity":1}]' \
  --buyer '{"email":"buyer@example.com"}' \
  --idempotency-key <stable_create_key> \
  --format json
```

For `ucp-checkout create`, use `--shipping-address '<json>'` only for physical goods that ship. The JSON must be the UCP Postal Address shape (`street_address`, `extended_address`, `address_locality`, `address_region`, `address_country`, `postal_code`, optional `first_name`, `last_name`, `phone_number`). Services, subscriptions, hotels, tickets, reservations, bookings, and digital goods do not pass a UCP checkout shipping address unless the merchant explicitly requires one; this does not change the rule above that `NO_SHIPPING_REQUIRED` instruction creation uses the fixed Apple Park default address.

`stable_create_key` should be stable for the same product order attempt, for example a hash of merchant URL, item ID, quantity, total, instruction ID, mandate ID, and user/task correlation. Do not reuse it for a different cart.

This is a continuous create then complete handoff. After create, parse `data.id` / `data.checkout_id` / `data.checkoutId` as `checkoutId`; do not ask the user to provide it. A normal create response should be `ready_for_complete` (or equivalent ready state). If it is not ready, run:

```bash
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```

Stop on `requires_escalation`, `canceled`, or errors.

## Step 6: Complete External Checkout

External complete uses the current/default paymentInstrumentId resolved in Step 1. Complete uses that `checkoutId` and the resolved payment instrument. Do not pass instruction, mandate, or credential-token fields.

```bash
clink-cli ucp-checkout complete \
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
clink-cli instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json

# Branch gate:
# If no active instruction+mandate matches:
#   1. start the VIC instruction creation flow with the same mandate scope
#      using clink-cli instruction create / instruction sign-url
#   2. wait for purchase_instruction.activated for that instruction
#   3. STOP this checkout attempt here
#   4. restart from card refresh + instruction list after activation
# Do NOT run tool item-id, ucp-checkout create, or ucp-checkout complete on this branch.

# Only the IF_MATCH branch continues:
clink-cli tool item-id --url <product_url> --format json
clink-cli ucp-checkout create \
  --merchant-url <product_url> \
  --merchant-category-code <mcc> \
  --currency <currency> \
  --instruction-id <instruction_id> \
  --mandate-id <mandate_id> \
  --line-items '<line_items_json>' \
  --shipping-address '<ucp_postal_address_json_if_required>' \
  --idempotency-key <stable_create_key> \
  --format json
clink-cli ucp-checkout complete \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
clink-cli events poll --type agent_order.succeeded --format json
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```
