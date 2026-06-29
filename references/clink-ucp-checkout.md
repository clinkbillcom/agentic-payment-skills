# UCP Checkout Product Order Flow

Read this before ordering a discovered product through `clink-cli ucp-checkout`.

This flow is for external/shadow merchants discovered by an agent, such as a Shopify storefront. It aligns with `clink-ucp` external checkout:

- create path: `/agent/ucp/external/checkout-sessions`
- create binds `instruction_id` and `mandate_id`
- complete path: `/agent/ucp/external/checkout-sessions/{checkoutId}/complete`
- external complete sends `payment_instrument_id` only
- checkout auth is customer API key only (`X-Customer-API-Key` and `X-Timestamp`)

## Boundary

Product discovery and price truth belong to the merchant/product tool. This skill only runs the payment-side control flow after the target product is clear.

Do not use plain `clink-cli pay` for this flow. UCP checkout is the order path because it carries line items, merchant URL, instruction binding, and external automation context.

## Required Inputs

Before the first checkout command, have all of these in the current request:

- product URL or checkout URL
- merchant URL and merchant display context
- merchant category code when known
- currency
- unit price in ISO 4217 minor units, quantity, and total amount
- product title or description
- payment instrument ID
- buyer data when required by the merchant
- shipping address for physical goods that ship

Never invent missing values. Ask the caller or user when product identity, amount, currency, merchant context, or payment instrument is missing.

## Control Model

Treat checkout as a closed-loop state machine:

```text
DISCOVER_PRODUCT
  -> REFRESH_PAYMENT_INSTRUMENT
  -> LIST_AUTHORIZATIONS
  -> SELECT_INSTRUCTION_MANDATE
  -> EXTRACT_ITEM_ID
  -> CREATE_CHECKOUT
  -> VERIFY_READY_FOR_COMPLETE
  -> COMPLETE_CHECKOUT
  -> VERIFY_CHECKOUT_RESULT
```

Every transition has a guard. If the guard fails, stop and report the exact missing or invalid condition instead of guessing. The feedback loop is the parsed JSON response from each CLI command plus a follow-up `ucp-checkout get` when the checkout state is not terminal.

## Step 0: Find And Freeze The Product

The agent may use merchant tools, browser tools, search, or page extraction to identify the target product. Freeze a single target:

```json
{
  "merchant_url": "https://shop.example/products/t-shirt?variant=123",
  "merchant_name": "Shop Example",
  "merchant_category_code": "5311",
  "currency": "USD",
  "unit_price_minor": 1000,
  "quantity": 1,
  "total_minor": 1000,
  "title": "T-shirt"
}
```

Amount hard match means the checkout line-item total must equal the intended product total exactly after currency normalization. `line_items[].item.price` is minor units; instruction mandates usually express `amountLimit` as major units. Convert before comparison and do not treat a different product total as "close enough".

## Step 1: Refresh Payment Instrument

Use the selected profile and environment. For sandbox, always include `--sandbox --profile sandbox` or the caller's sandbox profile.

```bash
clink-cli card binding-link --no-watch --format json
```

Select the caller-authorized payment method. If no method exists, send the binding or setup URL from the card reference and wait for the matching event. Do not run checkout with a guessed card.

## Step 2: List Candidate Instructions

List before creating or checking out:

```bash
clink-cli instruction list \
  --status ACTIVE \
  --payment-instrument-id <payment_instrument_id> \
  --format json
```

The `--status ACTIVE` query is required, but still filter the returned payload defensively:

- filter out inactive instructions whose `status` is absent from the active set or is not `ACTIVE` / `active`
- filter out inactive mandates whose mandate-level status is not active when the backend exposes such a field
- filter out reserve / reserved / locked / in-use instruction or mandate entries when any returned field indicates reservation or a usage lock
- filter out entries for a different `paymentInstrumentId`
- filter out entries with missing `instructionId`, `mandateId`, `currencyCode`, or amount limit

If there is no matching instruction and mandate after filtering, stop and tell the user:

```text
No matching instruction and mandate was found for this product order. Please create an instruction first for the exact merchant, amount, currency, and product scope, then retry checkout.
```

Do not create an instruction inside this checkout flow unless the user explicitly switches to the VIC instruction creation flow.

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

## Step 4: Extract `item_id`

Use `tool item-id` after the product URL is frozen:

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
  --line-items '[{"id":"li_<item_id>","item":{"id":"<item_id>","title":"<title>","price":1000},"quantity":1}]' \
  --buyer '{"email":"buyer@example.com"}' \
  --idempotency-key <stable_create_key> \
  --format json
```

Use `--shipping-address '<json>'` only for physical goods that ship. Services, subscriptions, hotels, tickets, reservations, bookings, and digital goods do not pass a shipping address unless the merchant explicitly requires one.

`stable_create_key` should be stable for the same product order attempt, for example a hash of merchant URL, item ID, quantity, total, instruction ID, mandate ID, and user/task correlation. Do not reuse it for a different cart.

After create, parse `data.id` / `data.checkout_id` / `data.checkoutId` as `checkoutId`. A normal create response should be `ready_for_complete` (or equivalent ready state). If it is not ready, run:

```bash
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```

Stop on `requires_escalation`, `canceled`, or errors.

## Step 6: Complete External Checkout

External complete uses the payment instrument. Do not pass instruction, mandate, or credential-token fields.

```bash
clink-cli ucp-checkout complete \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
```

`stable_complete_key` is scoped to the checkout ID and payment instrument. Reusing it for the same complete attempt is safe; do not reuse it across different checkout IDs.

## Step 7: Verify The Result

Parse the complete response and then verify state if it is not clearly terminal:

```bash
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```

Status handling:

| Status | Action |
| --- | --- |
| `completed` | Report checkout completed and include checkout/order identifiers returned by the API. |
| `complete_in_progress` | Tell the user automation is in progress; poll `ucp-checkout get` with bounded retries or leave a resumable pending state. |
| `ready_for_complete` | Complete did not start or was rejected before processing; inspect error output and do not retry blindly. |
| `requires_escalation` | Authorization did not cover the order; ask the user to create/update the instruction. |
| `canceled` | Stop; do not retry without a new checkout or explicit recovery path. |

If the CLI exits with a network or timeout error, treat the checkout state as unknown. Check by `ucp-checkout get` before retrying complete.

## Failure And Recovery Rules

- No matching instruction and mandate: tell the user to create an instruction first; do not create checkout.
- Partial authorization match: do not select it.
- More than one equally specific match: ask the user to choose.
- `ucp-checkout create` idempotency conflict: use the original response if the cart is identical; otherwise create a new checkout with a new key.
- `ucp-checkout complete` already has a payment in progress: recover with `ucp-checkout get`.
- Backend `NO_AUTHORIZATION` or `UCP_AUTHORIZATION_BINDING_INVALID`: the instruction/mandate is not valid for this checkout. Stop and request a corrected instruction.

## Minimal End-To-End Skeleton

```bash
clink-cli card binding-link --no-watch --format json
clink-cli instruction list --status ACTIVE --payment-instrument-id <payment_instrument_id> --format json
clink-cli tool item-id --url <product_url> --format json
clink-cli ucp-checkout create \
  --merchant-url <product_url> \
  --merchant-category-code <mcc> \
  --currency <currency> \
  --instruction-id <instruction_id> \
  --mandate-id <mandate_id> \
  --line-items '<line_items_json>' \
  --idempotency-key <stable_create_key> \
  --format json
clink-cli ucp-checkout complete \
  --checkout-id <checkout_id> \
  --payment-instrument-id <payment_instrument_id> \
  --idempotency-key <stable_complete_key> \
  --format json
clink-cli ucp-checkout get --checkout-id <checkout_id> --format json
```
