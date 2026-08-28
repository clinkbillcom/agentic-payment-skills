# UCP Checkout Product Order Flow

Read this before ordering a discovered product through `clink ucp-checkout`.

This flow is for product orders discovered by an agent, such as a Shopify storefront. Route selection happens after product parsing. First run `clink tool internal-ucp get-endpoint --product-url <item_url> --format json`. A resolved endpoint uses internal UCP checkout. Only `NOT_IN_INTERNAL_UCP_LIST` falls back to `https://domain/.well-known/ucp-clink`; a successful parseable JSON profile must then run `clink tool get-rest-endpoint --url <standard_ucp_url> --format json`. Every final route—direct internal, fallback `clinkbill`, non-clinkbill, or derived external gateway—requires successful current wallet-status evidence plus a canonical HTTPS endpoint on that exact wallet origin. HTTP, credentials, query/fragment, missing evidence, or a cross-origin endpoint stops routing before any wallet credential is sent.

The Agent never orchestrates checkout create, complete, payment-event polling, or initial order fetch. After every precondition below is frozen, the runtime atomically claims one unique `checkoutAttemptId`; only that claim winner may let `lib/ucp-checkout-run-fsm.mjs` construct exactly one environment-locked mutation command: `CLINK_BASE_URL=<frozen_wallet_origin> clink ucp-checkout run ... --confirm-purchase`. The CLI owns the internal create/complete flow, idempotency, and optional bounded digital-delivery wait.

Checkout authentication uses OAuth Bearer after OAuth has ever been enabled. Only a never-OAuth legacy configuration where `oauthRequired` is absent or exactly `false` may use the legacy customer API key.

## Boundary

Product discovery and price truth belong to the merchant/product tool. Agent owns product exploration for product URL checkout: use browser tools, page extraction, or a page request to read product details before asking the user for fields that the page can expose. This skill only runs the payment-side control flow after the target product is clear.

Do not use plain `clink pay` for this flow. UCP checkout is the order path because it carries line items, merchant URL, authorization-gate context, and external automation context.

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
- one nonempty unique frozen `checkoutAttemptId` in runtime state `AWAITING_EXECUTION`
- a successful current wallet status whose canonical HTTPS origin is frozen as `walletBaseUrl`
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
  -> REQUEST_CLAIM_WITH classifyUcpCheckoutRunExecution
  -> ATOMICALLY_CLAIM_AWAITING_EXECUTION_TO_EXECUTING
  -> BUILD_ONE_AGGREGATE_COMMAND_FOR_THE_UNIQUE_CLAIM_WINNER
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
clink ucp-catalog search --merchant-id <merchant_id> --query <text> --language <BCP47> --limit <n> [--context <json>] [--test|--sandbox] --format json
clink ucp-catalog product --merchant-id <merchant_id> --product-id <product_id> --language <same_BCP47_as_search> [--context <json>] [--test|--sandbox] --format json
```

Both send anonymous `POST /agent/ucp/{merchantId}/catalog/{search,product}` requests. They do not require `wallet init`, do not read `~/.clink-cli/config.json`, and send no OAuth or CSK credentials. No environment flag deterministically selects production; `--sandbox` selects UAT and `--test` selects test, and the two flags are mutually exclusive. Freeze one `catalogEnvironment` and use its same flag on search and product.

The Agent must also determine one target result language before search, following `references/clink-payment-intent-contract.md`, and freeze the CLI-normalized BCP47 value. Pass it with `--language` on both search and product; never put it in `context.language`, infer it from query/product keywords, or read it from wallet config. Reusing the same flag matters because merchant-scoped search and product implement Catalog translation and otherwise the two views can disagree. The CLI sends the normalized value in request `context.language` and `Accept-Language`. A legacy caller that omits language receives merchant-original text and sends no language header; the backend/query does not guess a target language. `--context`, `--filters`, `--signals`, and `--attribution` must each be a JSON object; Catalog price filters use minor units. `--limit` is 1 to 100 and the server default is 10; continue paging with `--cursor` from the previous response. `--request-id` defaults to a generated UUID; `--ucp-agent` defaults to `clink-cli`. `product` takes the `--product-id` returned by `search` and rejects `--query`, `--cursor`, and `--limit`.

Catalog's public environment is separate from checkout's authenticated wallet environment. Preserve the candidate's `catalogEnvironment`; the pending selection is authoritative and a conflicting candidate copy must not replace it. A supplied selected product without that frozen environment is invalid and cannot fall back to a top-level value. Then require a successful current `wallet status` and verify that its API origin matches before `tool internal-ucp get-endpoint`, aggregate checkout, or payment. Every supplied `walletStatus` alias must be successful, parseable, carry a base URL, and agree. An explicit `walletBaseUrl` may only corroborate that status or create a conflict; it can never replace missing, malformed, error, or missing-origin status. Stop if top-level input conflicts with the selected candidate, an explicit wallet URL conflicts with wallet status, or the final origins mismatch. Never use a test or sandbox candidate in production checkout.

Catalog access is merchant-scoped and optional. A merchant without Catalog enabled returns an API error carrying the backend `catalog_not_supported` message ("Catalog is not available for this merchant") with exit code 5. Treat that specific code as "this merchant has no Catalog" and continue with normal product-URL exploration instead of reporting a failure to the user; surface every other Catalog error normally. Page-backed Catalog results still use `tool parse-item`. A validated `INTERNAL_UCP_CATALOG` candidate instead freezes the Catalog item ID, title, price, currency, availability, environment, merchant ID, and the anonymous merchant API's validated full `domain` as `merchantUrl`; it sets `requiresProductParse=false` and must not browse for a page that the merchant does not expose.

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
- `paymentInstrumentId`, `instructionId`, and `mandateId`: payment/authorization FSM state; the exact instruction pair is preflight evidence and is not passed as a UCP CLI flag. `checkoutId` is created and frozen inside `ucp-checkout run`, never supplied by the Agent

quantity comes from the user intent. merchantCategoryCode comes from agent classification, not from `parse-item`.

Classify the `parse-item` output with `classifyUcpParseItemObservation`. If there is one available item, select it. If there are multiple available items and the user is present, ask the user to choose. If there are multiple available items in a long task where the user is absent, select by frozen user intent and record the reason. Stop if no available item exists or required fields are missing.

Amount hard match means the checkout line-item total must equal the intended product total exactly after currency normalization. Carry `totalAmountMinor` through matching and checkout validation. `clink ucp-checkout run --line-items` accepts `item.price` as a user-facing major-unit decimal string and converts it to the external UCP minor-unit long. Every nested field named `amount` or `price` that enters this normalization must also be a decimal string, never a JavaScript Number whose original decimal spelling may already be lost. Do not treat a different product total as "close enough".

## Step 0.5: Classify Fulfillment And Shipping

Before payment refresh or instruction list, classify the frozen product/order:

- `PHYSICAL_GOODS_REQUIRES_SHIPPING`: shipped physical goods. Collect a standard complete shipping address before instruction list, instruction creation, or aggregate checkout. Do not restrict the address to the US.
- `NO_SHIPPING_REQUIRED`: services, subscriptions, hotels, tickets, bookings, reservations, and digital goods. Do not ask the user for an address; use the fixed Apple Park default address when `instruction prepare` or `instruction create` needs a shipping-address payload.
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

- CWallet Instruction preparation/creation (`clink instruction prepare|create --shipping-address`) uses the instruction shipping shape. Required fields: `name`, `line1`, `city`, `state`, `zip`, and `countryCode`; `state` holds the region/province/administrative area, `zip` holds the postal code, and `countryCode` must be ISO 3166-1 alpha-2 for the destination country.
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
clink card binding-link --no-watch --no-open --format json
```

Resolve the payment method from the refreshed `paymentMethodsVoList`: use the caller-selected card when provided, otherwise use the current/default paymentInstrumentId. Freeze this exact `paymentInstrumentId` into the aggregate command only after it is ready. If no method exists, mark `paymentInstrumentRefreshAttempted=true` and enter the foreground PENDING Instruction continuation in Step 2. Do not start `card binding-link` with a watch, emit its URL, or run checkout with a guessed card.

## Step 2: Authorization Gate And Candidate Instructions

After `parse-item` and item selection freeze the product facts, run the authorization capability gate against the refreshed selected/default card.

- If the selected/default card is non-Visa, skip instruction and mandate matching.
- If there is no card, or the selected Visa is not VIC-ready, screen the frozen purchase and run one foreground `clink instruction prepare ... --max-wait 900 --format json`. Do not pass `--payment-instrument-id`, `--open`, or `--no-watch`. Return its structured PENDING envelope's Bind Card URL only with `processRunning=true` and `terminal=false`, without auto-opening it, and keep the same process waiting for the final same-ID ready envelope.
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

Carry the frozen merchant URL/domain, merchant/category/title/description semantics, currency, exact amount or authorized cap, service window, and fulfillment/shipping classification into either Instruction command. A VIC-ready Visa with no reusable match uses ordinary `instruction create` plus Passkey. A missing/incomplete Visa uses `instruction prepare` and the PENDING continuation described in `references/clink-instruction.md`. For shipped physical goods, pass the real CWallet instruction address shape; for `NO_SHIPPING_REQUIRED`, pass the fixed Apple Park default address. The first prepare envelope is progress, not permission to return. Restart this checkout flow from Step 1 only after the final same-ID envelope reports `instructionStatus=ACTIVE` and non-empty `instruction.paymentInstrumentId`, so payment instruments and `instruction list --valid-only` are refreshed before matching.

An older Quick-capable `wallet init` may have returned a `pendingInstructionId`, but it does not drive a Skill-side continuation. `instruction prepare` authoritatively creates/reuses the frozen intent and returns the ID it waits on. A PENDING Instruction never appears in `--valid-only` and never authorizes checkout.

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

The selected or pinned `instructionId` + `mandateId` pair is the evidence allowed to set `authorizationGatePassed=true`; it is not a transport parameter. `ucp-checkout run` intentionally rejects `--instruction-id` and `--mandate-id`, so never add those flags or claim the checkout result proves that the backend consumed a particular pair. For an unattended run, verify only the pinned pair and never substitute another candidate before entering the aggregate command; backend authorization enforcement remains authoritative.

### Merchant semantic match

Merchant semantic match must cover the requested merchant or product context. Compare the available instruction and mandate fields such as title, description, merchant name, merchant URL/domain, merchant category code, product title, and product description.

Reject a candidate when the merchant semantics point to another merchant, another product family, an expired service window, or a category that conflicts with the requested product. If multiple candidates remain, choose the most specific one: same domain and product text beats category-only text.

## Step 4: Resolve Checkout Route

Resolve internal vs external checkout with `lib/ucp-checkout-route-fsm.mjs` `classifyUcpCheckoutRoute`. Merchant configuration and exact hostname matching belong to the CLI, not prompt logic or the skill FSM.

First run the `GET_INTERNAL_UCP_ENDPOINT` action returned by the FSM. Use the exact selected product/item URL; the CLI uses the environment persisted by `wallet init`:

```bash
clink tool internal-ucp get-endpoint --product-url <selected_item_url> --format json
```

- A result containing `endpoint`, `provider=clinkbill`, and `merchantId` is only a route candidate. It selects `INTERNAL_UCP_CHECKOUT` after the endpoint passes the HTTPS, canonicalization, and wallet-origin checks below.
- Only `{ "error_code": "NOT_IN_INTERNAL_UCP_LIST" }` starts standard UCP profile discovery.
- Any other error, error envelope, or malformed output stops the route and is surfaced. Do not silently probe or select external checkout.

For the list-miss fallback, derive the canonical domain from `parse-item` `merchantDomain`, `merchantOrigin`, or the selected item URL and run the returned `CHECK_STANDARD_UCP_PROFILE` action:

```bash
curl -fsSL -XGET -H 'Accept: application/json' https://<domain>/.well-known/ucp-clink
```

- If that probe returns a successful parseable JSON response, reclassify and run `GET_REST_ENDPOINT`.
- If the probe fails, returns a non-2xx response, or returns a non-JSON body, reclassify with checked/failed evidence. This can select external UCP checkout (`standard_ucp_profile_absent`) only after the current wallet-status origin passes the checks below.
- If no domain can be resolved, stop and ask for product/merchant input; do not guess.

For a successful profile, the `<standard_ucp_url>` must come from the profile shopping service endpoint (`services.*.endpoint`) when present; otherwise use the selected item/product URL:

```bash
clink tool get-rest-endpoint --url <standard_ucp_url> --format json
```

Reclassify with the `provider` and `endpoint` from that output:

- Every supplied `walletStatus` / `wallet_status` alias must be successful and parseable, include an HTTPS base URL, and normalize to one origin. An explicit `walletBaseUrl` / `wallet_base_url` can only corroborate that status, never replace it. Missing, failed, malformed, unsafe, or conflicting wallet evidence returns `SURFACE_ERROR` for every final route, including a direct internal endpoint.
- Every resolved endpoint, regardless of provider, must be an absolute HTTPS URL with a hostname and no credentials, query, or fragment. Canonicalize it exactly as the CLI target builder does: URL parsing lowercases/canonicalizes the hostname, removes the default HTTPS port and dot segments, preserves the normalized path, and strips trailing slashes. Freeze this canonical string rather than the raw spelling.
- The canonical endpoint origin must exactly equal the canonical current wallet-status origin. This applies to direct internal, fallback `clinkbill`, and non-clinkbill endpoints. A cross-origin non-clinkbill endpoint is terminal; never preserve it, fall back around it, or send OAuth/CSK credentials to it.
- Only when the resolved endpoint is missing, REST discovery returns an error, or the standard profile is absent may the FSM derive `<wallet_origin>/agent/ucp/external`; that derived URL goes through the same validation.

Every selected route therefore freezes both a canonical `walletOrigin` and a non-null canonical same-origin HTTPS `endpoint` before aggregate checkout.

Route resolution must not mutate the selected item, amount, authorization, or merchant facts.

## Step 5: Build And Run One Aggregate Checkout Command

Call `classifyUcpCheckoutRunExecution` with the frozen product, route, payment instrument, fulfillment, and gate evidence:

- `productSelectionFrozen=true`
- `fulfillmentAndAddressReady=true`
- `paymentInstrumentReady=true`
- `authorizationGatePassed=true` after either the non-Visa/VIC bypass or an exact ACTIVE Instruction match
- `restrictedCategoryGatePassed=true`
- `checkoutRouteResolved=true`
- `checkoutExecutionClaimed=false` on the pre-claim classification
- `explicitPurchaseAuthorized=true`
- one nonempty unique frozen `checkoutAttemptId`
- exact `checkoutRoute`, `merchantUrl`, canonical same-wallet-origin HTTPS `endpoint`, canonical `walletBaseUrl`, `merchantCategoryCode`, `currency`, `lineItems`, and `paymentInstrumentId`
- canonical `buyer` JSON when the merchant requires buyer fields beyond the wallet-owned email
- UCP Postal Address only for shipped physical goods
- `digitalDeliveryExpected=true` plus `digitalDeliveryContractVerified=true` only for an explicit artifact-delivery contract

The first valid pre-claim result is `CLAIM_UCP_CHECKOUT_ATTEMPT`, not a command. The pure FSM does not perform or infer atomic state changes. The stateful runtime must compare-and-set that exact attempt from `AWAITING_EXECUTION` to `EXECUTING`; only the unique winner may reclassify with `checkoutExecutionClaimed=true` and execute the returned command. An already `EXECUTING` or `CONSUMED` attempt, a lost claim, a duplicate callback, or any replay returns no command. Keep the same frozen attempt ID through observation and mark it `CONSUMED`; never generate a replacement ID to bypass the claim.

The helper canonicalizes JSON and shell-quotes every dynamic value. The returned command also freezes the wallet environment with `CLINK_BASE_URL=<canonical_wallet_origin>`. Execute only that exact returned command; do not strip its prefix or copy fields into a second hand-built command:

```bash
CLINK_BASE_URL=<frozen_wallet_origin> clink ucp-checkout run \
  --endpoint <frozen_rest_endpoint> \
  --merchant-url <frozen_selected_item_url> \
  --merchant-category-code <frozen_mcc> \
  --currency <frozen_currency> \
  --line-items '<frozen_canonical_line_items_json>' \
  [--buyer '<frozen_canonical_buyer_json>'] \
  --payment-instrument-id <frozen_payment_instrument_id> \
  [--shipping-address '<frozen_ucp_postal_address_json>'] \
  --confirm-purchase \
  [--wait-delivery --max-wait 900] \
  --format json
```

This is the only checkout mutation the Agent runs. The CLI owns checkout creation, exactly-once completion submission, and the optional initial digital-delivery wait. Never run a second aggregate command for the same attempt, including after process loss or an inconclusive response.

The CLI generates the create idempotency key internally. The CLI also generates the complete idempotency key internally. Do not pass `--idempotency-key` or construct a second mutation command; `ucp-checkout run` rejects caller-supplied keys.

For `ucp-checkout run`, use `--shipping-address '<json>'` only for physical goods that ship. The JSON must be the UCP Postal Address shape (`street_address`, `extended_address`, `address_locality`, `address_region`, `address_country`, `postal_code`, optional `first_name`, `last_name`, `phone_number`). `address_country` is the destination country as ISO 3166-1 alpha-2, not a fixed country. Services, subscriptions, hotels, tickets, reservations, bookings, and digital goods do not pass a UCP checkout shipping address unless the merchant explicitly requires one; this does not change the rule above that `NO_SHIPPING_REQUIRED` instruction creation uses the fixed Apple Park default address.

For a digital product, `--wait-delivery` and `--max-wait 900` are part of this same command. Do not run a later hand-built delivery command unless the aggregate result returns a validated read-only `resumeCommand`.

## Step 6: Classify The Aggregate Result

Pass the aggregate `{ok:true,data:{...}}` envelope and the exact `frozenRequest` to `classifyUcpCheckoutRunObservation`. Before any `paymentConfirmed=true` result, the classifier requires the real create/complete stage objects, consistent nested status, and matching checkout/order identifiers.

| Aggregate result | Required action |
| --- | --- |
| `stage=create|complete,status=completed`, no expected digital delivery | Return payment/order completion. Run no additional Agent command. |
| `stage=create,status=ready_for_complete|processing|pending` | The create request returned a checkout, but payment was not submitted (`attempts.complete=0`, `paymentConfirmed=false`). Never construct or execute `complete` or another `run`. A returned same-checkout GET is read-only reconciliation only; it cannot become permission to submit payment. |
| `stage=complete,status=unknown` | Complete transport/submission outcome is unknown. Execute only the classifier-validated same-checkout GET reconciliation. Never rerun the aggregate or complete command, even if GET remains inconclusive. |
| `stage=complete,status=complete_in_progress|processing|pending|ready_for_complete` | Return pending with immutable `resumeContext`, including any already observed UCP order ID. Execute only the classifier-validated `resumeCommand`, which must be `clink ucp-checkout get` bound to the same checkout ID, canonical endpoint, and frozen wallet environment. Classify its ordinary checkout envelope with `classifyUcpCheckoutRunResumeObservation`; a different returned order ID fails closed, while a response that omits the ID cannot erase the frozen value. |
| `stage=delivery,status=ready` | Require `ready=true`, `timedOut=false`, completed checkout context, a delivery object with `status=ready`, and nonempty `digital_delivery.artifacts`; only then return delivery evidence. |
| `stage=delivery,status=failed` | Require `ready=false`, `timedOut=false`, and delivery `status=failed`. Return payment success and delivery failure separately. Do not retry payment or checkout. |
| `stage=delivery,status=timeout` | Require `ready=false` and `timedOut=true`. `delivery` may be null (the order can omit `digital_delivery`) or a pending/syncing/retryable object; it must not claim ready/failed. Preserve payment success, the last order snapshot, and immutable `resumeContext`. Execute only the validated environment-locked `clink ucp-order wait-delivery --order-id <same_ucp_order_id> --max-wait 900 --format json` resume command, then classify its ordinary delivery envelope with `classifyUcpCheckoutRunResumeObservation`. |
| `requires_escalation`, `failed`, `cancelled`, `canceled`, `rejected`, or `expired` | Stop and surface the checkout failure. |
| malformed envelope, unsupported status, inconsistent delivery tuple, mismatched ID/environment/endpoint, or unsafe resume | Fail closed with `paymentConfirmed=false`; do not synthesize a recovery mutation. |

Identifier evidence is strict at every stage. Top-level `checkoutId` / `checkout_id`, create `id` / `checkoutId` / `checkout_id`, and complete `id` / `checkoutId` / `checkout_id` must all be nonempty strings and agree with the frozen checkout. UCP order aliases across top level, `order`, and `complete.order` must also agree; a normal completed bundle places the order under `complete.order`, so do not require a duplicate top-level order. Any supplied blank, null, non-string, or conflicting alias fails closed before payment confirmation. Never substitute `paymentOrderId` or `merchantOrderId`.

The read-only resume validator requires and preserves the exact `CLINK_BASE_URL=<frozen_wallet_origin>` prefix. It rejects a missing/different environment lock, `ucp-checkout run`, create, complete, update, cancel, `pay`, event polling, shell operators or unquoted shell expansions, parser/argv drift, a different checkout/order ID, endpoint drift, and a delivery wait other than 900 seconds. Never strip or rebuild the returned prefix. Never pass a resume output back to the aggregate classifier: use its `resumeContext` with `classifyUcpCheckoutRunResumeObservation` until the same resource reaches a terminal state.

### Legacy/direct event compatibility only

The current aggregate run result is authoritative for checkout payment/order state; the Agent must not start a second UCP poll. The rules below apply only when interoperating with an older event-only bundle:

- Freeze `ucpOrderId` only from checkout `data.ucp.ucp_order_id`; a mutually consistent completed-checkout `data.order.id` is a compatibility alias. Freeze `paymentOrderId` separately from the `agent_order.succeeded` payload. A payment event order ID is never a UCP order ID and must not be used for order lookup.
- Correlate checkout only through canonical nested payload `data.checkoutId` / `data.checkout_id`. Never fall back to event top-level checkout fields or `resourceId`.
- If the old classifier returns a read-only checkout fallback, execute only its bound `clink ucp-checkout get --endpoint <original_rest_endpoint> --checkout-id <checkoutId> --format json`, then execute its exact `clink ucp-order get --order-id <ucpOrderId> --format json` only after resolving that checkout-frozen identifier.
- During a composite legacy poll, a same-type event for another checkout stays queued. For the exact match, the CLI keeps it unacknowledged while it fetches the UCP order and ACKs immediately before output; an uncertain ACK returns `eventAckWarning` and may produce a harmless duplicate.
- A timed-out legacy poll resumes only with the safely quoted opaque cursor, preserving `nextToken` exactly.
- Preserve the full order, including OMS data at `data.ucp.success_info` when present. `merchantOrderId` is an external merchant reference, never a UCP ID alias. Do not re-poll the acknowledged event, re-run complete, or retry payment.

## Failure And Recovery Rules

- No matching instruction and mandate: start the instruction creation workflow, then stop checkout until ACTIVE evidence exists.
- No matching instruction and mandate on an unattended/scheduled run: `SURFACE_UNATTENDED_AUTHORIZATION_GAP`. Do not create a draft.
- Partial authorization match: do not select it.
- More than one equally specific match: ask the user to choose.
- Missing explicit purchase confirmation or any incomplete gate: produce no checkout command.
- Missing, blank, conflicting, already executing, or consumed `checkoutAttemptId`: produce no checkout command. Only the atomic `AWAITING_EXECUTION -> EXECUTING` winner may dispatch once.
- Aggregate command timeout or exit 6 without a trusted read-only resume: state is unknown. Do not rerun the aggregate command.
- Never rerun the aggregate command merely because its result is incomplete or inconclusive.
- Create-stage `ready_for_complete`, `processing`, or `pending`: payment was not submitted. Use at most the returned read-only same-checkout GET; never invent a mutation continuation.
- Complete-stage `unknown`, `ready_for_complete`, `complete_in_progress`, `processing`, or `pending`: use only the returned same-checkout GET reconciliation. Never rerun create, complete, payment, or `ucp-checkout run`.
- Never resubmit complete merely because that GET is inconclusive.
- Every run and read-only resume remains bound to the frozen `CLINK_BASE_URL`; environment drift is terminal.
- Digital delivery timeout/pending: require `ready=false,timedOut=true`; use only the returned same-order `wait-delivery --max-wait 900`. A null delivery is valid while the order still lacks `digital_delivery`.
- Digital delivery failure: payment remains successful; report fulfillment failure separately.
- Backend `NO_AUTHORIZATION` or `UCP_AUTHORIZATION_BINDING_INVALID`: the instruction/mandate is not valid for this checkout. Stop and request a corrected instruction.
- Never use a fixed `sleep`, runtime `--help`, terminal log scraping, or manual create-to-complete-to-wait orchestration.

## Minimal End-To-End Skeleton

```bash
clink tool parse-item --url <item_url> --format json
# Finish fulfillment classification and freeze any required address
# before touching payment readiness.
clink card binding-link --no-watch --no-open --format json
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
