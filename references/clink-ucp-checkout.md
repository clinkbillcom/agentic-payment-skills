# UCP Checkout Product Order Flow

Read this before ordering a discovered product through `clink ucp-checkout`.

This flow is for product orders discovered by an agent, such as a Shopify storefront. Route selection happens after product parsing. First run `clink tool internal-ucp get-endpoint --product-url <item_url> --format json`. A resolved endpoint uses internal UCP checkout. Only `NOT_IN_INTERNAL_UCP_LIST` falls back to `https://domain/.well-known/ucp-clink`; a successful parseable JSON profile must then run `clink tool get-rest-endpoint --url <standard_ucp_url> --format json`. Fallback provider `clinkbill` uses internal checkout, while other providers and discovery failures use external checkout.

The Agent never orchestrates checkout create, complete, payment-event polling, or initial order fetch. After every precondition below is frozen, `lib/ucp-checkout-run-fsm.mjs` constructs exactly one mutation command: `clink ucp-checkout run ... --confirm-purchase`. The CLI owns the internal create/complete/payment/order state machine, idempotency, and bounded waits.

Checkout authentication uses OAuth Bearer after OAuth has ever been enabled. Only a never-OAuth legacy configuration where `oauthRequired` is absent or exactly `false` may use the legacy customer API key.

## Boundary

Product discovery and price truth belong to the merchant/product tool. Agent owns product exploration for product URL checkout: use browser tools, page extraction, or a page request to read product details before asking the user for fields that the page can expose. This skill only runs the payment-side control flow after the target product is clear.

Do not use plain `clink pay` for this flow. UCP checkout is the order path because it carries line items, merchant URL, instruction binding, and external automation context.

UCP checkout completion is not merchant fulfillment. A `completed` checkout proves only the checkout/order-side action returned terminal success; fulfillment, delivery, entitlement, or merchant receipt confirmation still belongs to the merchant/product runtime.

## Required Inputs

Before the aggregate checkout command, have all of these in the current request:

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
- an explicit current-request purchase confirmation for the frozen product, quantity, total, and currency
- completed product, address, Instruction, restricted-category/safety, and route gates
- `digitalDeliveryExpected=true` only when the selected product or merchant contract explicitly promises a voucher, code, redemption link, QR/image, or equivalent artifact

Never invent missing values. Ask the caller or user when product identity, amount, currency, merchant context, fulfillment type, shipping address, or payment instrument is missing.

## Control Model

Treat checkout preparation as a closed-loop state machine. Use `lib/ucp-checkout-workflow-fsm.mjs` and `lib/ucp-checkout-route-fsm.mjs` for preconditions, then use `lib/ucp-checkout-run-fsm.mjs` for the single aggregate command and its result.

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
  -> REQUIRE_EXPLICIT_PURCHASE_CONFIRMATION
  -> VERIFY_PRODUCT_ADDRESS_INSTRUCTION_SAFETY_ROUTE_GATES
  -> BUILD_ONE_AGGREGATE_COMMAND_WITH classifyUcpCheckoutRunRequest
  -> RUN_UCP_CHECKOUT_ONCE
  -> CLASSIFY_AGGREGATE_RESULT_WITH classifyUcpCheckoutRunObservation
  -> RETURN_COMPLETED_OR_DELIVERY_READY_FAILED_PENDING
  -> IF_PENDING_RUN_ONLY_THE_VALIDATED_READ_ONLY_RESUME_COMMAND
```

Every transition has a guard. If the guard fails, stop and report the exact missing or invalid condition instead of guessing. Never probe command support with `--help`, insert a fixed `sleep`, or reconstruct create/complete/payment steps from an aggregate result.

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

Amount hard match means the checkout line-item total must equal the intended product total exactly after currency normalization. Carry `totalAmountMinor` through matching and checkout validation. `clink ucp-checkout run --line-items` accepts `item.price` as a user-facing major-unit decimal string and converts it to the external UCP minor-unit long. Do not treat a different product total as "close enough".

## Step 0.5: Classify Fulfillment And Shipping

Before payment refresh or instruction list, classify the frozen product/order:

- `PHYSICAL_GOODS_REQUIRES_SHIPPING`: shipped physical goods. Collect a standard complete shipping address before instruction list, instruction creation, or aggregate checkout. Do not restrict the address to the US.
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
- Aggregate UCP checkout (`clink ucp-checkout run --shipping-address`) uses UCP Postal Address shape. Required fields: `street_address`, `address_locality`, `address_region`, `address_country`, and `postal_code`; `address_country` must be ISO 3166-1 alpha-2 for the destination country. Include `first_name`, `last_name`, and `phone_number` when available because the automation worker fills the external checkout page from this object.

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

Resolve the payment method from the refreshed `paymentMethodsVoList`: use the caller-selected card when provided, otherwise use the current/default paymentInstrumentId. Freeze this exact `paymentInstrumentId` into the aggregate command. If no method exists, send the binding or setup URL from the card reference and wait for the matching event. Do not run checkout with a guessed card.

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

If there is no matching instruction+mandate after filtering, screen the purchase with `classifyInstructionRestriction` from `lib/restricted-categories.mjs` (see `references/clink-restricted-categories.md`) — a restricted category refuses here and ends the checkout attempt without a draft — then start the instruction creation workflow described in `references/clink-instruction.md` with the same product/order mandate scope, then stop the UCP checkout path. In this skill, that means using `clink instruction create` and, when needed, `clink instruction sign-url`; it is the agentic equivalent of OpenClaw's `prepare_visa_purchase_instruction`, but do not call `prepare_visa_purchase_instruction` as a local tool in this skill. Do not build or run the aggregate checkout command on this Visa + VIC branch until the created instruction is Passkey-authorized, ACTIVE, tied to the same `paymentInstrumentId`, and contains a matching ACTIVE/non-reserved mandate.

When starting the instruction creation workflow, carry over the frozen merchant URL/domain, merchant/category/title/description semantics, currency, exact amount or authorized cap, service window, and fulfillment/shipping classification. For shipped physical goods, pass the real CWallet instruction address shape to `instruction create`. For `NO_SHIPPING_REQUIRED`, pass the fixed Apple Park default address in the same CWallet instruction shape. Do not pass the UCP Postal Address shape to instruction creation. After `instruction create` / `sign-url`, run `classifyAuthorizationDraftObservation` on the draft envelope and send the Passkey URL at once; those commands keep their built-in watch, so the same process is the listener and no separate `events poll` belongs beside it. Pass the watch's second envelope back through the classifier as `watchStdout`. After the activation event is observed and correlated to the created instruction, run `clink instruction get --purchase-instruction-id <instructionId> --format json` and `classifyAuthorizationActiveVerification`; restart this checkout flow from Step 1 only after the instruction is ACTIVE so the instruction list is refreshed before matching.

A quick instruction activated during wallet setup needs no special handling here: once the binding ceremony activates it, Step 2's `clink instruction list --valid-only` listing picks it up naturally, so do not start the instruction creation workflow for an intent that already carries an `ACTIVE` quick instruction. If the quick instruction is still `PENDING` when checkout reaches Step 2, it will not appear in the valid-only listing — fall back to the regular instruction creation workflow above rather than waiting here.

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

- A result containing `endpoint`, `provider=clinkbill`, and `merchantId` selects `INTERNAL_UCP_CHECKOUT`. Freeze the returned endpoint into the aggregate run request.
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

Reclassify with the `provider` and `endpoint` from that output. If `provider` is `clinkbill`, route to internal UCP checkout and freeze `rest_endpoint` into the aggregate command. If provider is not `clinkbill`, route to external UCP checkout and freeze that resolved external endpoint. If endpoint discovery returns `NO_UCP_REST_ENDPOINT`, another failure payload, or no trusted endpoint, do not enter aggregate checkout until the effective external checkout endpoint has been resolved and frozen. An external route with `endpoint=null` is invalid.

Route resolution must not mutate the selected item, amount, authorization, or merchant facts.

## Step 5: Build And Run One Aggregate Checkout Command

Call `classifyUcpCheckoutRunRequest` with the frozen product, route, payment instrument, fulfillment, and gate evidence:

- `productSelectionFrozen=true`
- `fulfillmentAndAddressReady=true`
- `paymentInstrumentReady=true`
- `authorizationGatePassed=true` after either the non-Visa/VIC bypass or an exact ACTIVE Instruction match
- `restrictedCategoryGatePassed=true`
- `checkoutRouteResolved=true`
- `explicitPurchaseAuthorized=true`
- exact `checkoutRoute`, `merchantUrl`, resolved `endpoint` for either route, `merchantCategoryCode`, `currency`, `lineItems`, and `paymentInstrumentId`
- UCP Postal Address only for shipped physical goods
- `digitalDeliveryExpected=true` plus `digitalDeliveryContractVerified=true` only for an explicit artifact-delivery contract

The helper canonicalizes JSON and shell-quotes every dynamic value. Execute only its returned `command`; do not copy fields into a second hand-built command:

```bash
clink ucp-checkout run \
  --endpoint <frozen_rest_endpoint> \
  --merchant-url <frozen_selected_item_url> \
  --merchant-category-code <frozen_mcc> \
  --currency <frozen_currency> \
  --line-items '<frozen_canonical_line_items_json>' \
  --payment-instrument-id <frozen_payment_instrument_id> \
  [--shipping-address '<frozen_ucp_postal_address_json>'] \
  --confirm-purchase \
  [--wait-delivery --max-wait 900] \
  --format json
```

This is the only checkout mutation the Agent runs. The CLI owns checkout creation, exactly-once completion submission, and the optional initial digital-delivery wait. Never run a second aggregate command for the same attempt.

For a digital product, `--wait-delivery` and `--max-wait 900` are part of this same command. Do not run a later hand-built delivery command unless the aggregate result returns a validated read-only `resumeCommand`.

## Step 6: Classify The Aggregate Result

Pass the aggregate `{ok:true,data:{...}}` envelope and the exact `frozenRequest` to `classifyUcpCheckoutRunObservation`. Before any `paymentConfirmed=true` result, the classifier requires the real create/complete stage objects, consistent nested status, and matching checkout/order identifiers.

| Aggregate result | Required action |
| --- | --- |
| `stage=create|complete,status=completed`, no expected digital delivery | Return payment/order completion. Run no additional Agent command. |
| `stage=create|complete,status=complete_in_progress|processing|pending` | Return pending with immutable `resumeContext`. Execute only the classifier-validated `resumeCommand`, which must be `clink ucp-checkout get` bound to the same checkout ID and frozen endpoint. Classify its ordinary checkout envelope with `classifyUcpCheckoutRunResumeObservation`. |
| `stage=delivery,status=ready` | Require completed checkout context and nonempty `digital_delivery.artifacts`; only then return delivery evidence. |
| `stage=delivery,status=failed` | Return payment success and delivery failure separately. Do not retry payment or checkout. |
| `stage=delivery,status=timeout` | Preserve payment success, the last order snapshot, and immutable `resumeContext`. Execute only the validated `clink ucp-order wait-delivery --order-id <same_ucp_order_id> --max-wait 900 --format json` resume command, then classify its ordinary delivery envelope with `classifyUcpCheckoutRunResumeObservation`. |
| `requires_escalation`, `failed`, `cancelled`, or `expired` | Stop and surface the checkout failure. |
| malformed envelope, unknown status, mismatched ID/endpoint, or unsafe resume | Fail closed with `paymentConfirmed=false`; do not synthesize a recovery mutation. |

The read-only resume validator rejects `ucp-checkout run`, create, complete, update, cancel, `pay`, event polling, shell operators, a different checkout/order ID, endpoint drift, and a delivery wait other than 900 seconds. Never pass a resume output back to the aggregate classifier: use its `resumeContext` with `classifyUcpCheckoutRunResumeObservation` until the same resource reaches a terminal state.

Legacy event evidence remains type-safe: checkout correlation accepts only nested payload `data.checkoutId` / `data.checkout_id`; a payment event order ID is never a UCP order ID and must not be used for order lookup.

## Failure And Recovery Rules

- No matching instruction and mandate: start the instruction creation workflow, then stop checkout until ACTIVE evidence exists.
- No matching instruction and mandate on an unattended/scheduled run: `SURFACE_UNATTENDED_AUTHORIZATION_GAP`. Do not create a draft.
- Partial authorization match: do not select it.
- More than one equally specific match: ask the user to choose.
- Missing explicit purchase confirmation or any incomplete gate: produce no checkout command.
- Aggregate command timeout or exit 6 without a trusted read-only resume: state is unknown. Do not rerun the aggregate command.
- Never rerun the aggregate command merely because its result is incomplete or inconclusive.
- `complete_in_progress`: use only the returned same-checkout GET. Never rerun create, complete, payment, or `ucp-checkout run`.
- Never resubmit complete merely because that GET is inconclusive.
- Digital delivery timeout/pending: use only the returned same-order `wait-delivery --max-wait 900`.
- Digital delivery failure: payment remains successful; report fulfillment failure separately.
- Never use a fixed `sleep`, runtime `--help`, terminal log scraping, or manual create-to-complete-to-wait orchestration.

## Minimal End-To-End Skeleton

```bash
clink tool parse-item --url <item_url> --format json
clink card binding-link --no-watch --format json
classifyInstructionRestriction <frozen_purchase_context>
clink instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json
clink tool internal-ucp get-endpoint --product-url <selected_item_url> --format json

# Resolve every gate, obtain explicit purchase confirmation, then execute exactly
# the single command returned by classifyUcpCheckoutRunRequest:
clink ucp-checkout run ... --confirm-purchase --format json

# Digital artifact product: the same command also includes:
#   --wait-delivery --max-wait 900
#
# Pending result: execute only classifyUcpCheckoutRunObservation.resumeCommand,
# then call classifyUcpCheckoutRunResumeObservation(output, resumeContext).
```
