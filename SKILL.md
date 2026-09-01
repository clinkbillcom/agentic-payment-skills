---
name: visa-skill
description: "Visa Skill 0.1.45. Use for consumer payments and commerce even when Visa is not named: pay/支付/付款, buy or order/购买/下单/订购, place an order/点单/点餐, checkout, shopping/购物, coupons/优惠券, vouchers/代金券, discounts/优惠, benefits/权益, gift cards, merchant offers, product discovery, and Visa card benefits. Supports en, zh-CN, zh-TW, and zh-HK. Do not use for travel visas, immigration, passports, or consular applications."
metadata:
  version: "0.1.45"
  requires:
    node: ">=20"
    bundled: "vendor/visa-cli/visa-cli.bundle.mjs"
  requiresHumanBrowser: "OAuth, Agent Portal card/VIC setup, Visa Passkey, 3DS, Instruction, and risk pages belong in the user's system browser"
---

# Visa Skill

Use only this Skill's bundled launcher:

```text
<Skill Path>/bin/visa-cli
<Skill Path>\bin\visa-cli.cmd
```

Never use a global `visa-cli`, `clink`, or `clink-cli`. The bundle is the Visa
Edition: it includes every Base Command plus Visa discovery and the CLI-owned
`visa product-search`, `visa commerce-login`, and `visa commerce-run`
aggregates.

Keep execution small. For Visa Benefit discovery, read only
`references/visa-recommend-filters.md` before selecting filters. Otherwise do
not read reference files, inspect source or workflow scripts, invoke runtime
`--help`, run `date`, use a fixed `sleep`, or load JavaScript orchestration
modules. Interpret the user's intent, collect only missing business facts,
obtain the required authorization, run the shortest matching CLI capability,
and report the structured result.

## Global Contract

### Language Lock

Lock one language for the whole run:

- English: `en`
- Simplified Chinese: `zh-CN`
- Traditional Chinese for Taiwan: `zh-TW`
- Traditional Chinese for Hong Kong: `zh-HK`

Pass it to Visa discovery as `--lang <language-tag>` and to Catalog/product
search as `--language <language-tag>`. Use the same language for guidance,
questions, errors, browser status, summaries, and the final answer. Preserve
authoritative Program, merchant, product, and Skill names exactly as returned.

### Environment Lock

Lock one environment before the first command and never mix environments:

- a sandbox/UAT distribution uses `--sandbox` for public Catalog and
  `visa product-search` commands and
  `"environment": "uat"` in contexts
- a test distribution uses `--test` for public Catalog and
  `visa product-search` commands and `"environment": "test"`
- production uses no search environment flag and `"environment": "production"`

The installed distribution lock wins when the user omits the environment.
Never let an installed UAT or test Skill silently default to production.
Authenticated commands must agree with the current wallet environment.

`visa recommend`, `visa detail`, and `visa taxonomy` do not accept
`--sandbox` or `--test`; do not add either flag. Their issuing market,
destination region, and language select the Visa source independently from the
Clink Catalog environment. "Benefits usable in Hong Kong" means destination
`--region hk`; use issuing `--market hk` only when the user explicitly says
their card is Hong Kong-issued.

### Authorization And Input

- A query, explanation, candidate number, login, card setup, or browser action
  is not payment, Tip, refund, or purchase authorization.
- Before a mutation, freeze the exact merchant or publisher, item or purpose,
  quantity, amount, currency, payment method, environment, and fulfillment
  facts that apply to that capability.
- One explicit authorization covers the unchanged frozen mutation. Ask again
  only if merchant, item, quantity, amount, currency, recipient, refund scope,
  or fulfillment materially changes.
- Never invent an amount, currency, merchant ID, session ID, order ID, payment
  instrument ID, Instruction ID, mandate ID, endpoint, product ID, shipping
  address, Skill identity, or version.
- When a complex capability lacks required input, current state, a unique safe
  match, or a supported continuation, fail closed and ask for the missing fact
  or report the limitation. This lightweight Skill does not claim complete
  behavioral equivalence with the former Agent-side orchestration.

### Mutation Safety

- Run a payment, Checkout completion, Tip, refund creation, Skill install, or
  Instruction mutation at most once for one authorization.
- Timeout, transport failure, an unknown result, or exit code 6 never authorizes
  resubmission. Verify through a bound read-only status or continuation.
- An event is a wake-up hint, not final truth. Refresh the authoritative
  resource before reporting success.
- Payment success does not prove merchant receipt, balance top-up, entitlement,
  or delivery. Report each state separately.
- Never expose Tokens, OTPs, device codes, raw card data, signatures, secrets,
  full configuration, private URLs, Base64, or raw CLI envelopes.

### Restricted Instruction Gate

Before `visa commerce-login` carries an Instruction context, or before any
standalone `instruction create`, screen the complete user request, merchant,
Program, product, URL, title, description, every mandate, and MCC.

Refuse before login or draft creation when the purchase is, or may reasonably
be, adult content/services, dating or companionship, gambling or lottery,
prescription drugs, cryptocurrency, public file-sharing/cyberlocker services,
paid skill-based prize games, securities or financial-product trading,
telemarketing, non-face-to-face tobacco, weapons, ammunition, controlled
knives, or another regulated good. MCC `7273`, `7995`, `6051`, `6211`, `5966`,
`5967`, `5993`, or an ambiguous/malformed MCC is not allowed.

Do not send a partial context to evade this gate. If meaning is obscured,
euphemistic, incomplete, or ambiguous, stop instead of trying the backend.
Never reroute a refused purchase through plain `pay` or UCP.

### Browser Boundary

OAuth, Agent Portal card/VIC, Visa Passkey, Instruction, 3DS, and risk pages
belong in the user's browser. CLI `--open` may launch OAuth/login, Instruction,
3DS, or risk; on failure, show only the exact CLI `manualOpenUrl`.

For card/VIC work, show but never auto-open an exact CLI-returned Bind Card
link. The user may click it or use an already-open Agent Portal. Never inspect,
fill, or submit protected pages with an Agent browser. Merchant product pages
may be inspected by the Agent.

An Alipay QR is not a browser page. Display the CLI-rendered terminal QR
exactly, or use the CLI-returned private `imagePath` only when terminal QR
rendering is unavailable. Never expose or reconstruct QR payloads or Base64.

### Pending Instruction Card Gate

For every authorized `visa commerce-login` purchase:

- Without an eligible Visa Payment Instrument whose
  `visaRegistrationSucceeded=true`, the aggregate creates or reuses exactly
  one no-card `PENDING` Instruction for the frozen intent. Bind every check to
  its exact returned ID; never select a latest or similar PENDING.
- It may return one exact Bind Card link. Show it without opening it. The user
  may click it or bind in an already-open Agent Portal. Showing the link is not
  completion: the same CLI process stays foreground for bounded event waiting
  and authoritative exact-ID refresh.
- Agent Portal owns binding, 3DS, Visa Passkey, and VIC. When one exact Payment
  Instrument reaches `visaRegistrationSucceeded=true`, CWallet associates that
  same card and automatically activates the exact PENDING Instruction.
- Continue only after refresh proves same-card
  `visaRegistrationSucceeded=true` and that exact Instruction is `ACTIVE`.
  Card-added, Passkey, VIC event, or another ACTIVE Instruction is insufficient.
- Timeout preserves that exact PENDING and permits only its bound read-only
  continuation. Do not create another Instruction, regenerate the link, rerun
  either aggregate, create a Checkout, or retry payment.

## Intent Routing

Classify the request silently before the first command. Acceptance-scenario
numbers, routing categories, and workflow names are internal maintenance
details. Never announce the classification or expose those labels in
user-facing text; respond directly to the user's request.

- Requests such as "What Visa Benefits can I use in Hong Kong?" use
  Agent-selected-filter Visa Benefit discovery. The aggregate recommendation
  must not query UCP or any Catalog provider.
- Requests such as "Are there Visa household-goods coupons in Hong Kong?" use
  the same Visa-only discovery with the current category wording.
- Requests such as "Are there Watsons coupons?" use the same Visa-only
  discovery with the current brand or product wording.
- An explicit buy/order/checkout request with no Visa, Benefit, coupon, voucher,
  discount, or offer signal, such as "我想下单咖啡", uses broad Catalog shopping.
  Do not call `visa recommend` merely because this Skill can access Visa
  Benefits.
- A discovery request with a Benefit signal, such as "有咖啡的券吗",
  "Visa 咖啡优惠券", or "有哪些咖啡权益", uses Visa Benefit discovery even
  though the requested subject is also a purchasable product.

Use Program aggregation only after one selected Visa Program has an
authoritative merchant commerce route and an exact internal UCP Catalog match:

```text
visa recommend -> visa detail -> visa product-search -> ask to order ->
visa commerce-login -> visa commerce-run
```

Use Catalog Purchase aggregation for an exact product selected from direct
broad-Catalog shopping or the Visa-no-match Catalog fallback:

```text
catalog search -> commerce-login ->
visa commerce-run mode=catalog_purchase
```

Catalog-fallback products are ordinary Catalog products. Never attach Visa
Program eligibility, campaign terms, or Benefit claims to them, and never
route them through Program `mode=purchase`.

New `mode=purchase` and `mode=catalog_purchase` contexts must omit both the
top-level `program` object and `metadata.programCode`. Older callers may still
provide `program.code` as compatibility metadata, but this Skill never authors
or requires it.

Use a Base Capability Contract only for a non-Program request whose exact
inputs and authorization satisfy that contract.

## Visa-Only Benefit Discovery And Catalog Fallback

Visa-related Benefit discovery must make exactly one Agent-selected-filter
aggregate call. Read `references/visa-recommend-filters.md`, preserve the
original request only as audit context, and create exactly four filter objects.
The Agent owns filter selection; the CLI validates taxonomy codes but never
derives filters from the query.

```text
<Skill Path>/bin/visa-cli visa recommend "<original request>" \
  --filter-sets '[<filter-1>,<filter-2>,<filter-3>,<filter-4>]' \
  --anonymous \
  --lang <language-tag> \
  --format json
```

Do not issue four Agent-managed Shell commands. The one CLI aggregate validates
all four sets against one taxonomy snapshot, runs four parallel Visa
recommendation requests, excludes `fallback_all_offers` rows, preserves
filter-set priority, and de-duplicates the merged `response.data.items` by
Program code. Read only that merged result.

Never add `--include-provider-products`. During this aggregate recommendation,
do not issue `catalog search`, `ucp-catalog search`, a merchant-list request,
or another UCP command. It uses only the Visa recommendation service and never
logs in, binds a card, creates an Instruction, or prepares payment.

For broad availability wording such as "What Visa Benefits can I use in Hong
Kong?", always add `--all` because the required result is the complete regional
set. Also add `--all` for any other explicit all-Benefits request; do not rely
on natural language alone to widen the request:

```text
<Skill Path>/bin/visa-cli visa recommend "<original request>" \
  --filter-sets '[<filter-1>,<filter-2>,<filter-3>,<filter-4>]' \
  --anonymous \
  --all \
  --region hk \
  --lang <language-tag> \
  --format json
```

Use `--region hk` when Hong Kong is the requested place of use. Do not add
`--market hk` unless Hong Kong card issuance is explicit.

For category-, merchant-, or product-specific Visa requests, select four new
filter sets and run the same aggregate once with the current user request. Add
`--all` when the user asks for every matching Benefit. A follow-up query
invalidates all prior filter sets and merged results.

Treat returned Programs as Visa candidate rows, not as already-filtered display
results. Retain only Programs that satisfy the original request's explicit
brand, category, geography, product, merchant, eligibility, dates, status,
channel, and other hard constraints. A generic coupon or lifestyle Program is
not relevant to a brand-specific or product-specific query merely because it
shares the coupon reward type.

When at least one relevant Program remains in `matching_offers` or
`all_offers_requested`, present those Visa Programs and do not call Catalog
during initial discovery. Preserve each Program's stable code, authoritative
title, relative order, and relevant terms. Selection must resolve one stable
Program code from the latest snapshot; title-only fuzzy matching is
insufficient.

Treat `fallback_all_offers`, `no_matching_offers`, or zero Programs after the
independent semantic filter as a Visa miss. Never display, rank, count,
recommend, or purchase fallback Visa rows. Instead, make exactly one
all-channel broad Catalog fallback with the original current user request:

```text
<Skill Path>/bin/visa-cli catalog search \
  --query "<original-current-user-query>" \
  --language <language-tag> \
  --context '{"address_region":"HK"}' \
  <environment-flag> \
  --format json
```

Use the locked geography instead of hardcoding `HK` when the user selected
another region. Omit `--channel-type` so the fallback searches every available
Catalog channel, including Eats365; add it only when the user explicitly
restricts the channel. This endpoint returns a bounded, non-exhaustive window
and currently has no pagination, so never describe the result as complete
inventory.

Independently retain only Catalog products that satisfy the original request's
product, brand, merchant, geography, channel, and other hard constraints. If
one or more relevant products remain, present them as ordinary Catalog
products without Visa eligibility or campaign terms. Ask the user to select or
order only an exact currently orderable product. If no relevant Catalog product
remains, report that no matching result was found.

For count-only wording, return the authoritative Visa matching total. Do not
silently replace a requested Visa Benefit count with a bounded Catalog count.

For explicit food delivery use `--category dining_delivery_food` and exclude
`instore_only` or dine-in-only Programs. For explicit dine-in use
`dining_restaurant`. Ask one question when the intent is genuinely ambiguous.

### Selected Visa Benefit Resolution

When the user selects or names one previously displayed Visa Benefit, bind it
to one stable Program code from the latest recommendation snapshot. Then fetch
the authoritative activity detail from Visa before any UCP or browser work:

```text
<Skill Path>/bin/visa-cli visa detail <program-code> \
  --lang <language-tag> \
  --format json
```

Preserve the detail's authoritative title, activity summary, hard terms, dates,
and campaign/activity URL. Never infer a merchant route from an arbitrary
Visa/VSRP campaign URL.

Only when the selected Program exposes one actual merchant commerce URL, or
when its URL is exactly the UAT alias
`https://vsrp.hk/p/o5s`, run the existing token-free product resolver:

```text
<Skill Path>/bin/visa-cli visa product-search \
  --merchant-url "<authoritative-program-commerce-url>" \
  --query "<localized-selected-program-title>" \
  --language <language-tag> \
  --limit 1 \
  <environment-flag> \
  --format json
```

- Use the selected Program's authoritative merchant commerce URL unchanged.
  The one UAT alias above must also be passed unchanged; the bundled CLI maps
  only that exact offer path to `mcht_ftmse61a6az0`. Query/fragment tracking
  state may vary, but another path on `vsrp.hk` is not an alias.
  Never use any other Visa/VSRP campaign URL or a hardcoded brand URL.
- Use `selectedProgram.title.trim()` unchanged as the query. Do not translate,
  summarize, or replace it with a generic product phrase.
- Use the locked search environment and language.
- The CLI owns internal-first merchant routing, Catalog lookup, external
  fallback, availability filtering, and exact product normalization.
- On `PRODUCT_SELECTION_REQUIRED`, rerun once with
  `--selected-product-id <id>` only when one candidate is uniquely closest by
  geography/market and merchant/product identity. Otherwise ask one neutral
  product clarification question without suggesting Checkout.
- Treat the Benefit as internally orderable only when the result is
  `PRODUCT_VERIFIED` with `CONTINUE_TO_COMMERCE_LOGIN` and
  `productResolution=internal-ucp-catalog`, and the Program and product have the
  same merchant and product identity with complete price, currency, and
  availability.
- An external-page resolution, `PRODUCT_UNAVAILABLE`, no authoritative merchant
  commerce URL or exact UAT alias, an unresolved selection, or any
  identity/price/currency mismatch means there is no internal UCP match for this
  flow. Do not substitute another product or infer a route.
- With an internal UCP match, present the exact product title, price, currency,
  and availability and ask whether the user wants to order it. This invitation
  is not purchase authorization; wait for an explicit buy/order reply before
  `visa commerce-login`.
- Without an internal UCP match, present the Visa activity introduction, useful
  terms, and authoritative activity link only. Do not end with "buy", "order",
  "checkout", "continue purchasing", or equivalent purchase-inducing language.

A new Visa query, refreshed recommendation, changed language, changed
geography, or changed environment invalidates the prior Program selection and
UCP result.

## Visa Purchase Fast Path

An explicit request to buy one unambiguous selected Visa Benefit is the single
purchase authorization. A reply selecting a previously shown Benefit and
asking to buy it is also sufficient.

Before login, require all of the following:

1. `PRODUCT_VERIFIED` and `CONTINUE_TO_COMMERCE_LOGIN`.
2. `productResolution=internal-ucp-catalog`; an external-page product is not
   orderable through this Visa Benefit flow.
3. Program and Catalog identify the same merchant and product.
4. Catalog total and currency exactly equal the recommendation-backed purchase
   facts; missing or different price/currency stops the flow.
5. Resolve one four-digit MCC with this strict priority:
   - Use a valid Program-provided `commerce.merchantCategoryCode` unchanged.
   - When the Program omits MCC, classify one only from the exact frozen
     Program, merchant ID, merchant URL, merchant name, product title/source
     title, category, and fulfillment context. The classification must be
     high-confidence and must pass the Restricted Instruction Gate.
   - For the exact UAT route `https://vsrp.hk/p/o5s`, merchant
     `mcht_ftmse61a6az0`, and the verified Wellcome supermarket gift-card
     product, use MCC `5411`.
   - An invalid or conflicting Program MCC, title-only guess, broad
     common-MCC fallback, or low-confidence classification stops before login.
   Freeze the resolved MCC once and reuse it unchanged in login, Instruction,
   purchase context, and Checkout.
6. Every required product, fulfillment, and environment field is present.
7. The complete purchase passes the Restricted Instruction Gate.

Create a login context containing only the locked environment and exact
Instruction context:

```json
{
  "environment": "uat",
  "instructionContext": {
    "title": "<selected-program-title>",
    "description": "Purchase the selected Visa Program",
    "mandates": [
      {
        "title": "<selected-program-title>",
        "description": "Purchase the selected Visa Program",
        "amountLimit": "<exact-program-price>",
        "currencyCode": "<program-currency>",
        "merchantCategoryCode": "<resolved-four-digit-mcc>"
      }
    ]
  }
}
```

Mandate descriptions must be at most 150 characters. The amount is the exact
authorized price with no buffer.

Say that login, card, VIC, and Instruction readiness are being checked. Login
may open in the browser. Show but never open a returned Bind Card link; an
already-open Agent Portal also works. Then run once in the foreground:

```text
<Skill Path>/bin/visa-cli visa commerce-login \
  --context-file <login-context.json> \
  --confirm-purchase \
  --open \
  --format json
```

Keep this process foreground until `ok=true` and `ready=true` or a bound
timeout continuation. The CLI alone owns the Pending Instruction Card Gate.
The Agent must not inspect, persist, infer, or copy registration fields,
`pendingInstructionId`, or any login-returned Instruction ID. Quick
Instruction is an internal acceleration path, not purchase identity.

Build one frozen purchase context from the same Program and verified product:

```json
{
  "mode": "purchase",
  "environment": "uat",
  "requestText": "<original purchase request>",
  "selection": {
    "merchantUrl": "<authoritative-program-commerce-url>",
    "merchantId": "<verified-merchant-id>",
    "endpoint": "<verified-endpoint>",
    "productId": "<verified-item-id>",
    "productQuery": "<selected-program-title>",
    "quantity": 1
  },
  "expected": {
    "merchantName": "<verified-merchant-name>",
    "itemTitle": "<provider-source-title>",
    "amount": "<verified-total-major>",
    "currency": "<verified-currency>"
  },
  "instructionContext": {
    "title": "<selected-program-title>",
    "mandates": [
      {
        "title": "<selected-program-title>",
        "description": "Purchase the selected Visa Program",
        "amountLimit": "<exact-program-price>",
        "currencyCode": "<program-currency>",
        "merchantCategoryCode": "<resolved-four-digit-mcc>"
      }
    ]
  },
  "digitalDeliveryExpected": true,
  "metadata": {
    "productResolution": "<verified-resolution>",
    "productUrl": "<verified-product-url>",
    "displayTitle": "<localized-display-title>",
    "unitPriceMajor": "<verified-unit-major>",
    "unitPriceMinor": "<verified-unit-minor>",
    "totalAmountMinor": "<verified-total-minor>",
    "availability": "<verified-availability>"
  }
}
```

Do not include a top-level `program` object or `metadata.programCode`.
`commerce-run` may accept legacy Program metadata for compatibility, but this
Skill never sends it and never treats it as a purchase prerequisite.

Use native JSON types: `quantity` is a positive integer and
`digitalDeliveryExpected` is a boolean. Use `true` only for a verified digital
artifact. Keep Program, Catalog, expected, and Instruction facts unchanged.
Never add an Instruction ID or caller-generated Checkout ID.

Run exactly once in the foreground:

```text
<Skill Path>/bin/visa-cli visa commerce-run \
  --context-file <frozen-context.json> \
  --confirm-purchase \
  --open \
  --format json
```

The CLI owns card refresh and VIC readiness, restricted-category enforcement,
eligible ACTIVE Instruction selection or exact-price regular Instruction
creation, product revalidation, one Checkout creation, at most one completion,
non-retriable payment handling, and bounded delivery waiting.

Never rerun `visa commerce-run` after it may have created a Checkout. Execute
only an exact CLI-returned aggregate read-only continuation, once. Never
reconstruct `card`, `instruction`, `events`, `pay`, `ucp-checkout`, or
`ucp-order` component commands for this Visa Program purchase.

## Catalog Purchase Fast Path

Use this path for an exact product selected from direct broad-Catalog shopping
or the Visa-no-match Catalog fallback. It is ordinary Catalog shopping and
must not inherit Visa Program eligibility, campaign terms, or Benefit claims.

Broad-Catalog discovery is anonymous. Direct shopping must not call
`visa recommend`; Visa-no-match fallback runs only after the Visa-only
recommendation has no relevant Program:

```text
<Skill Path>/bin/visa-cli catalog search \
  --query "<original-current-user-query>" \
  --language <language-tag> \
  --context '{"address_region":"HK"}' \
  <environment-flag> \
  --format json
```

Use the locked geography instead of hardcoding `HK` when the user selected
another market. Broad Catalog results are bounded and non-exhaustive; say so.
Agent-rank only products that satisfy the user's actual product, brand,
geography, channel, and other hard constraints.

Before login, resolve the selected item to one authoritative orderable product.
For a direct-shopping internal merchant, use the selected `merchant_id`,
`ucp-catalog product`, and the normal authoritative merchant-route resolution.
Do not purchase directly from a broad-search display row when the exact product
detail has not been resolved. Never accept a route from a Visa Program,
campaign URL, product title, hostname familiarity, or caller input.

For an external/platform result, use its exact returned product URL with
`tool parse-item`. For an Eats365 platform-store candidate,
`manual_item_facts` with an empty items array is the expected success result:
use the broad Catalog candidate's frozen product ID, title, structured price,
currency, availability, channel, store ID, and returned product/store URL. Do
not browse for a nonexistent detail page or ask for a replacement URL.

During `mode=catalog_purchase`, the CLI must resolve a frozen Eats365 platform
candidate without requesting the internal merchant list. It starts from the
trusted product URL, accepts only the exact Eats365 manual-item signal, and
then calls the anonymous extra Catalog product endpoint with the exact frozen
channel, store, URL-derived region, and product ID. It must not depend on broad
Catalog discovery selecting that store again. The exact response revalidates
the menu route, title, structured price/currency, availability, and platform
metadata. The frozen selection URL may carry `product_id` while the exact
response returns the same menu URL without that query; this is valid when host,
region, store path, and the separately verified product ID match. This
exception does not apply to `mode=purchase` or to ordinary internal merchants.

Freeze all of these authoritative facts:

- `merchantUrl`: returned internal merchant URL, or for a platform-store item
  its returned product/store ordering URL carrying the same `product_id`;
  never a constructed, campaign, Visa, or VSRP URL
- `productId`: exact orderable Catalog product or variant ID
- `title`: exact provider `sourceTitle` when returned, otherwise the exact
  authoritative Catalog title; keep a distinct localized title separately as
  `metadata.displayTitle` when available
- `price`: exact `unitPriceMajor` and exact total for the quantity; never raw
  `unitPriceMinor` or Catalog `price.amount`
- `currency`: authoritative three-letter currency
- `availability`: currently orderable status
- `merchantCategoryCode`: one four-digit MCC classified from the exact frozen
  merchant/product context; ask when confidence is low
- for Eats365, only `channelType` and `storeId` are required route fields.
  `catalogQuery`, `catalogEnvironment`, and `catalogLanguage` are optional
  compatibility metadata and must not block purchase when omitted

Also freeze merchant/store identity, channel, quantity, fulfillment, endpoint
when returned, and whether digital delivery is actually expected. The Agent
classifies MCC and fulfillment from the exact product context, matching the
existing Agentic payment capability. Ask when either classification is
uncertain. Never reuse an unrelated Program MCC, add a price buffer, or
substitute a similar product.

Use these high-confidence fulfillment rules:

- An authoritative digital coupon or voucher with an explicit artifact
  delivery contract: `NO_SHIPPING_REQUIRED`,
  `digitalDeliveryExpected=true`.
- Eats365 coffee or quick-service food is high-confidence MCC `5814`,
  `NO_SHIPPING_REQUIRED`, and
  `digitalDeliveryExpected=false`; the meal itself is not a digital artifact.
- Shipped physical goods: `PHYSICAL_GOODS_REQUIRES_SHIPPING` with the complete
  address contract below.

For any other merchant or product, use a high-confidence MCC and fulfillment
classification or ask once. Stop when either remains uncertain after that
clarification.

Before `visa commerce-login` for an Eats365 purchase, collect the buyer's
`first_name`, `last_name`, and E.164 `phone_number`. Do not create an
Instruction until these required Checkout facts are present. The CLI adds the
current wallet email automatically; include `buyer.email` only when the user
explicitly selected a different order-contact email. Treat buyer data as
private: never place it in metadata or echo it in summaries.

An explicit request to buy the unambiguous displayed product is one purchase
authorization. Build the same minimal login shape, using only the Catalog
product facts:

```json
{
  "environment": "uat",
  "instructionContext": {
    "title": "<authoritative-catalog-title>",
    "description": "Purchase the selected Catalog product",
    "mandates": [
      {
        "title": "<authoritative-catalog-title>",
        "description": "Purchase the selected Catalog product",
        "amountLimit": "<structured-catalog-purchase-price>",
        "currencyCode": "<structured-catalog-purchase-currency>",
        "merchantCategoryCode": "<classified-four-digit-mcc>"
      }
    ]
  }
}
```

For `PHYSICAL_GOODS_REQUIRES_SHIPPING`, include the same complete authoritative
`shippingAddress` inside this login `instructionContext`.

Apply the Restricted Instruction Gate, then run `visa commerce-login` once with
`--confirm-purchase --open --format json`. Apply the Pending Instruction Card
Gate unchanged and continue only on `ok=true` and `ready=true`.

Build one frozen Catalog purchase context without a Program. Start with these
shared fields:

```json
{
  "mode": "catalog_purchase",
  "environment": "uat",
  "requestText": "<original purchase request>",
  "selection": {
    "merchantUrl": "<authoritative-merchant-url>",
    "merchantId": "<authoritative-merchant-id>",
    "endpoint": "<authoritative-endpoint-if-returned>",
    "productId": "<authoritative-product-id>",
    "productQuery": "<authoritative-product-title>",
    "quantity": 1
  },
  "expected": {
    "merchantName": "<authoritative-merchant-name>",
    "itemTitle": "<authoritative-product-title>",
    "amount": "<structured-catalog-purchase-price>",
    "currency": "<structured-catalog-purchase-currency>",
    "availability": "<authoritative-orderable-status>"
  },
  "instructionContext": {
    "title": "<authoritative-catalog-title>",
    "mandates": [
      {
        "title": "<authoritative-catalog-title>",
        "description": "Purchase the selected Catalog product",
        "amountLimit": "<structured-catalog-purchase-price>",
        "currencyCode": "<structured-catalog-purchase-currency>",
        "merchantCategoryCode": "<classified-four-digit-mcc>"
      }
    ]
  }
}
```

Before writing the context file, add exactly one route-specific top-level
fulfillment contract. For an authoritative digital coupon:

```json
{
  "fulfillmentType": "NO_SHIPPING_REQUIRED",
  "digitalDeliveryExpected": true
}
```

For an Eats365 coffee or quick-service food result, keep the same shared
context and use this complete route-specific selection and fulfillment
contract:

```json
{
  "selection": {
    "merchantUrl": "<exact-returned-eats365-product-or-store-url>",
    "channelType": "eats365",
    "storeId": "<frozen-store-id>",
    "productId": "<frozen-product-id>",
    "productQuery": "<frozen-provider-title>",
    "quantity": 1
  },
  "instructionContext": {
    "title": "<frozen-provider-title>",
    "mandates": [
      {
        "title": "<frozen-provider-title>",
        "description": "Purchase the selected Catalog product",
        "amountLimit": "<structured-catalog-purchase-price>",
        "currencyCode": "<structured-catalog-purchase-currency>",
        "merchantCategoryCode": "5814"
      }
    ]
  },
  "buyer": {
    "first_name": "<buyer-first-name>",
    "last_name": "<buyer-last-name>",
    "phone_number": "<e164-phone-number>"
  },
  "fulfillmentType": "NO_SHIPPING_REQUIRED",
  "digitalDeliveryExpected": false
}
```

Merge the route-specific fields into the shared object; do not send either
fragment separately. The Eats365 `merchantUrl` must carry the same product ID
as `selection.productId`, and the frozen title, structured price, currency,
availability, channel, store, and URL must all come from one broad Catalog
snapshot. Do not add `catalogQuery`, `catalogEnvironment`, or `catalogLanguage`
merely to satisfy CLI validation. A real mismatch in required identity or
purchase facts stops before login.

Use `PHYSICAL_GOODS_REQUIRES_SHIPPING` only with an authoritative complete
shipping address. Put that identical object both at final-context top level as
`shippingAddress` and inside final `instructionContext.shippingAddress`; the
CLI rejects a missing or different Quick/Checkout address.
`digitalDeliveryExpected=true` is valid only with `NO_SHIPPING_REQUIRED` and
an explicit artifact-delivery contract. A high-confidence Agent classification
is valid; low confidence requires one question, and no answer stops the
purchase.

Run exactly once:

```text
<Skill Path>/bin/visa-cli visa commerce-run \
  --context-file <catalog-purchase-context.json> \
  --confirm-purchase \
  --open \
  --format json
```

The distributed Visa Edition must support `mode=catalog_purchase` before this
path is released. If the command rejects that mode, stop and report that the
installed distribution does not yet support aggregate Catalog purchase. Never
fall back to Program `mode=purchase`, `ucp-checkout run`, atomic Instruction,
Checkout, events, or pay commands.

As with Program purchase, never rerun `visa commerce-run` after possible
Checkout creation. Use only the exact CLI-returned bound read-only
continuation, and report payment and delivery separately.

A product-resolution title or price mismatch is not a discovery mechanism.
Do not edit the title or amount by trial and error and rerun
`visa commerce-run`. Stop, return to the latest authoritative snapshot or
read-only product detail, rebuild the frozen context from exact normalized
facts, and obtain new purchase authorization whenever title or amount changes.

### Visa Preparation

For explicit login-only or Visa card readiness, use the aggregate in prepare
mode:

```json
{
  "mode": "prepare",
  "target": "login",
  "environment": "uat",
  "requestText": "Log in to Visa Benefit"
}
```

Use `target: "visa_card_ready"` for card/VIC preparation. The aggregate may
show but never auto-open a Bind Card link and must stay foreground.

```text
<Skill Path>/bin/visa-cli visa commerce-run \
  --context-file <frozen-context.json> \
  --open \
  --format json
```

Prepare mode must not receive `--confirm-purchase`, an Instruction context, or
permission to create an Instruction, Checkout, or payment.

## Base Capability Contracts

These capabilities are available through the same Visa Edition bundle for
non-Program requests. They are deliberately concise. Do not expand them into a
general workflow engine.

### CAP-WALLET: Wallet And Config

- Use `wallet status --format json` for readiness and environment.
- Use `wallet init --email <email> --open --format json` only for an explicit
  setup, login, re-login, or authenticated operation that needs a wallet. Keep
  that one process alive while OAuth completes.
- Use `wallet logout --format json` exactly once for explicit logout.
- Use `config get/set` only for requested local settings. Never print secrets
  or switch environment to recover from a network error.

### CAP-CARD: Card Management

- Use `card binding-link`, `setup-link`, `modify-link`, or `passkey-link` only
  for the requested card action. Show the exact link but never pass `--open`,
  Agent-open it, or claim that showing it completed the action.
- During an authorized aggregate purchase, do not decompose the Pending
  Instruction Card Gate into atomic card commands.
- Refresh current card state before selecting a payment instrument. Require one
  exact enabled instrument; never choose from stale or ambiguous data.
- Card and Passkey pages are user-browser handoffs. A returned event must be
  followed by an authoritative card refresh.

### CAP-RISK: Risk Rules

- Use `risk get --format json` for inspection and `risk link --open --format
  json` only for an explicit request to change risk settings.
- The user completes the risk page. Verify the resulting rule state before
  reporting an update.

### CAP-CATALOG: General Catalog Discovery

- Search anonymously with `catalog search` when no merchant is known, or
  `ucp-catalog search/product` when the merchant is authoritative.
- Pass the locked `--language` and search environment. Discovery never starts
  wallet setup and never authorizes purchase.
- Present returned identity, merchant, price, currency, availability, channel,
  and location facts without invention. A later purchase must freeze one exact
  selected product.
- Visa-related Benefit requests use Visa-only discovery. A Visa miss or direct
  shopping request uses broad Catalog discovery and, after an exact selection,
  the Catalog Purchase Fast Path.

### CAP-PAY: Direct Or Session Pay

- Direct Pay requires exact `merchantId`, amount, currency, payment instrument,
  and explicit payment authorization. Session Pay requires an exact current
  `sessionId` and the same authorization.
- Refresh the selected card before payment. For a VIC-ready Visa, proceed only
  with one current matching ACTIVE Instruction and Mandate whose payment
  instrument, amount, currency, MCC, merchant scope, validity, and use state
  all match. Otherwise stop or complete CAP-INSTRUCTION while the user is
  present.
- Execute one `pay ... --format json`. A 3DS URL belongs to the user's browser;
  verify the bound order afterward. Never retry an unknown charge.

### CAP-ALIPAY-QR: Alipay QR Pay

- Require exact merchant, amount, currency, selected Alipay method, and explicit
  authorization.
- Execute one `pay` with `--payment-method-type ALIPAY --terminal-qr
  --format json`; do not inject a Card.
- Make the CLI QR visible to the user, then wait only for the correlated order
  result. Unknown or expired state stops without another charge.

### CAP-UCP: Aggregate UCP Checkout

- Use only for one exact non-Program product with authoritative merchant URL or
  Catalog identity, item, quantity, price, currency, fulfillment, required
  shipping address, payment instrument, canonical HTTPS endpoint, and explicit
  purchase authorization.
- Do not use this legacy aggregate for a product selected through broad Catalog
  discovery; those products use Catalog Purchase Fast Path so
  login, Instruction, card/VIC, Checkout, payment, and delivery stay
  CLI-aggregated.
- Refresh the selected payment instrument first. If it is Visa with VIC
  enabled, stop: this lightweight generic aggregate cannot carry or safely
  resolve an Instruction and Mandate. Visa Program purchases must use
  `visa commerce-run`; another generic Visa+VIC UCP purchase remains
  unsupported until the CLI owns an authorization aggregate.
- Run one foreground `ucp-checkout run ... --confirm-purchase --format json`.
  Add bounded delivery waiting only for verified digital goods.
- Never split the aggregate into manual create/complete calls. After it starts,
  use only a CLI-returned read-only continuation bound to the same Checkout,
  order, endpoint, and environment.

### CAP-INSTRUCTION: Purchase Instructions

- Use `instruction list/get` for read-only inspection.
- Create, sign, update, or cancel only with exact payment instrument, title,
  complete mandates, amount limits, currency, merchant scope, validity, and
  explicit authorization.
- Apply the Restricted Instruction Gate to the complete context before
  creation. Mandate descriptions are at most 150 characters. Never add an
  amount buffer.
- Passkey and edit pages belong to the user. Only an authoritative `ACTIVE`
  result makes an Instruction usable.
- Recurring or scheduled use requires explicit cadence, per-run cap, currency,
  validity horizon, and pinned Instruction plus Mandate IDs. Missing scope
  stops; unattended execution never substitutes another authorization.

### CAP-REFUND: Refund

- Current CLI support is full refund only. Require the exact original order ID
  and explicit full-refund authorization; never claim partial-refund support.
- Run `refund create` once. Use `refund get` or a bound event only to wake a
  read-only verification. Do not infer completion from submission alone.

### CAP-EVENTS: Async Events

- Poll only for named event types with the exact resource selector returned by
  the initiating operation. Do not use broad uncorrelated polling.
- Acknowledge or consume according to the CLI result, then refresh the
  authoritative card, Instruction, refund, Checkout, or order state.
- OAuth Device Authorization is handled by the original `wallet init` process,
  not `events poll`.

### CAP-SKILLS-LIST: Public Skill Discovery

- Use `skills list --all` for public Skills and add `--tippable` when the user
  asks what can receive a Tip.
- Present Number, publisher, Skill name, and requested version facts in the
  locked language. A displayed Number is selection context, not authorization.

### CAP-SKILLS-TIP: Skill Tips

- Require exact `publisher/name`, USD amount, recipient list, and explicit Tip
  authorization. Do not attach a version to the Tip identity.
- Resolve a Number only from the most recent list shown in the same user,
  session, and environment context. If that snapshot is unavailable or
  ambiguous, list again and confirm the resolved identity.
- Run each authorized Tip once and report partial batch results honestly.

### CAP-SKILLS-INSTALL: Public Skill Install

- Install by exact `publisher/name` for latest or
  `publisher/name@version` for a pinned release.
- Resolve a Number only from the same current list context and confirm the
  frozen publisher, name, and version before installation.
- Report the CLI's installed, updated, unchanged, planned, or failed result.
  Do not run the installed Skill's tests unless the user separately asks.

## Result Contract

- Continue only from structured `ok=true` results or an exact documented
  read-only continuation.
- For Visa discovery, use only the CLI's four-filter-set merged Program set, then
  independently filter it by the original query's hard constraints. A relevant
  Visa result suppresses initial Catalog work; a Visa miss triggers the one
  broad Catalog fallback.
- For a selected Visa Benefit, report an order option only after an exact
  internal UCP Catalog match. Otherwise report the Visa activity detail and
  authoritative link without a purchase call to action.
- Catalog fallback results are ordinary Catalog products. Never present them as
  Visa Benefits or attach Program eligibility and terms.
- For payment or Checkout, distinguish authorized, submitted, paid, failed,
  unknown, delivery pending, delivery failed, and delivery ready.
- Report digital delivery only when nonempty authoritative artifacts exist.
- Preserve successful payment when delivery is pending, timed out, or failed.
- Keep all user-facing text in the locked language and omit internal workflow
  narration.

## Safety Summary

- Visa query does not log in.
- Initial Visa recommendation is one Visa-only aggregate: four Agent-selected
  filter sets, four parallel Visa requests, Program-code de-duplication, and no
  query inference, `--include-provider-products`, or UCP/Catalog call.
- Relevant Visa Programs are presented without an initial Catalog call.
- A Visa miss triggers one all-channel UAT broad Catalog fallback with the
  original request; its bounded result window is never described as complete
  inventory.
- Selecting a Visa Benefit fetches Visa detail first. Only an exact
  `internal-ucp-catalog` product match permits an order invitation.
- Without an internal UCP match, present only the activity introduction, terms,
  and authoritative activity link, with no purchase-inducing next step.
- Direct shopping skips Visa recommendation and starts with broad Catalog
  discovery.
- A matched Visa Program purchase uses the three purchase aggregates in Program
  mode after `visa detail` and internal product verification.
- Direct and Visa-fallback Catalog purchase use login plus
  `mode=catalog_purchase`, never atomic UCP.
- For a Program purchase, the Program and internal UCP Catalog product identity
  plus recommendation-backed purchase amount/currency must agree.
- New `mode=purchase` and `mode=catalog_purchase` contexts never send
  `program.code`.
- One unchanged purchase authorization is enough; changed facts require a new
  authorization.
- `visa commerce-login` owns the Pending Instruction Card Gate; showing a Bind
  Card link never ends its foreground exact-ID wait.
- Only same-card VIC readiness plus exact-Instruction `ACTIVE` permits
  Checkout; timeout permits only the bound read-only continuation.
- `visa commerce-run` is never rerun after possible Checkout creation.
- Generic capabilities execute only with complete, authoritative input and
  fail closed otherwise.
- No payment, Tip, refund, Checkout completion, or Instruction mutation is
  blindly retried.
