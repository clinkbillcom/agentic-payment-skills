---
name: visa-skill
description: "Visa Skill 0.1.30. Use for Visa card benefits, registered provider products, fast Visa commerce, broad Catalog shopping, and concise Clink payment capabilities. Supports en, zh-CN, zh-TW, and zh-HK. Do not use for travel visas, immigration, passports, or consular applications."
metadata:
  version: "0.1.30"
  requires:
    node: ">=20"
    bundled: "vendor/visa-cli/visa-cli.bundle.mjs"
  requiresHumanBrowser: "OAuth, card setup, Visa Passkey, 3DS, Instruction, and risk pages belong in the user's system browser"
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

Keep execution small. During an ordinary run, do not read reference files,
inspect source or workflow scripts, invoke runtime `--help`, run `date`, use a
fixed `sleep`, or load JavaScript orchestration modules. Interpret the user's
intent, collect only missing business facts, obtain the required authorization,
run the shortest matching CLI capability, and report the structured result.

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

OAuth verification, card binding/setup/modify, Visa Passkey registration and
signing, Instruction update/cancel, 3DS, and risk pages must be completed by
the user in the operating system's browser. Use CLI `--open`; when launch
fails, surface only the exact CLI-returned `manualOpenUrl`. Never open, preview,
prefetch, screenshot, inspect, fill, or submit these pages with an Agent
browser. Merchant product pages may be inspected by the Agent.

An Alipay QR is not a browser page. Display the CLI-rendered terminal QR
exactly, or use the CLI-returned private `imagePath` only when terminal QR
rendering is unavailable. Never expose or reconstruct QR payloads or Base64.

## Intent Routing

Classify the request before the first command:

- **Case 1, broad Visa availability:** requests such as "What Visa Benefits can
  I use in Hong Kong?" use Visa And Provider Catalog Joined Discovery. Present
  every returned relevant Visa Program plus matching registered provider
  products.
- **Case 2, Visa category shopping:** requests such as "Are there Visa
  household-goods coupons in Hong Kong?" use the same joined discovery with
  the current category wording.
- **Case 3, Visa merchant/product shopping:** requests such as "Are there
  Watsons coupons?" use the same joined discovery with the current brand or
  product wording.
- **Case 4, direct shopping without Visa wording or prior Benefit context:**
  requests such as "Buy me an XX coffee" use Broad Catalog Shopping. Do not
  call `visa recommend` merely because this Skill can access Visa Benefits.

Use Program aggregation only for a selected non-provider Visa Program purchase
that has an authoritative Program commerce route:

```text
visa recommend -> visa product-search -> visa commerce-login -> visa commerce-run
```

Use Catalog Purchase aggregation for every selected registered provider
product, including a product carrying the optional `PROGRAM_PROVIDER_MATCH`
relation label, and for a Case 4 product:

```text
Cases 1-3: visa recommend --include-provider-products ->
commerce-login -> visa commerce-run mode=catalog_purchase
Case 4: catalog search -> commerce-login ->
visa commerce-run mode=catalog_purchase
```

A relevant product returned by a registered Visa Benefit Catalog provider is
itself an orderable Visa Benefit product even when no separate VSRA Program
row matches it. Program eligibility or Program terms may be attached only when
an authoritative Program relationship is also proven. Do not route an
unregistered broad-Catalog product through Program `mode=purchase`.

New `mode=purchase` and `mode=catalog_purchase` contexts must omit both the
top-level `program` object and `metadata.programCode`. Older callers may still
provide `program.code` as compatibility metadata, but this Skill never authors
or requires it.

Use a Base Capability Contract only for a non-Program request whose exact
inputs and authorization satisfy that contract.

## Visa And Provider Catalog Joined Discovery

Cases 1-3 must make exactly one initial discovery call. That joined aggregate
returns both Visa Programs and directly orderable registered-provider products:

```text
<Skill Path>/bin/visa-cli visa recommend "<original request>" \
  --include-provider-products \
  --lang <language-tag> \
  --format json
```

Do not issue a separate initial `ucp-catalog search`, merchant-list request, or
second `visa recommend` to assemble the joined result. The joined command never
logs in, binds a card, creates an Instruction, or prepares payment.

For Case 1 broad availability wording such as "What Visa Benefits can I use in
Hong Kong?", always add `--all` because the required result is the complete
regional set. Also add `--all` for any other explicit all-Benefits request; do
not rely on natural language alone to widen the request:

```text
<Skill Path>/bin/visa-cli visa recommend "<original request>" \
  --include-provider-products \
  --all \
  --region hk \
  --lang <language-tag> \
  --format json
```

Use `--region hk` when Hong Kong is the requested place of use. Do not add
`--market hk` unless Hong Kong card issuance is explicit.

For Case 2 or Case 3, run the same joined command once with the current user
request and add `--all` when the user asks for every matching Benefit.

Treat both returned collections as authoritative candidate sets, not as
already-filtered display results. Independently retain only Visa Offers and
provider products that satisfy the original request's explicit brand,
category, geography, product, merchant, and other hard constraints. A generic
coupon or lifestyle Offer is not relevant to a brand-specific or
product-specific query merely because it shares the coupon reward type.
Present every semantically relevant returned Visa Offer without adding a
second Skill-side display cap; preserve their relative order while clearly
marking Offers that do not have a purchasable Catalog match. If no Visa Offer
survives this semantic filter, say that no matching Visa Offer was found and
still present relevant provider products.

For `fallback_all_offers` or `no_matching_offers`, report that no relevant
Offer was found. Do not rank, display, recommend, or purchase fallback rows,
and do not present their count as a matching total. For count-only wording,
return only the authoritative matching total.

For explicit food delivery use `--category dining_delivery_food` and exclude
`instore_only` or dine-in-only Programs. For explicit dine-in use
`dining_restaurant`. Ask one question when the intent is genuinely ambiguous.

### Joined Provider Contract

The CLI is the only authority for the Visa Benefit Catalog provider registry,
provider identity, merchant route, traversal, and pagination. The Skill must
not copy or maintain provider entries.

Read only the two dynamic structured collections returned by the joined
command:

- Visa Offer results
- `providerProducts` or `directlyOrderable` results

Both collections are authoritative for the identities and facts they carry,
but neither collection is automatically relevant to the user's query. Apply
the original query's brand, category, geography, product, merchant, and other
hard constraints independently to both collections before presentation,
ranking, selection, or relation labeling.

Do not display, number, rank, select, or count an unrelated provider product as
a matching result. Filtering it from the current presentation does not alter
its authoritative `directlyOrderable` fact: query relevance controls display,
while `directlyOrderable` describes whether that product can be purchased.

The CLI-owned joined aggregate must query providers with the original current
user query and locked language/environment, follow each opaque provider
cursor until complete, deduplicate by stable merchant, product, and variant
identities, and attach authoritative provider identity to every provider
product. The Skill must not perform that traversal itself.

Do not call `tool internal-ucp get-merchant-list` or a separate
`ucp-catalog search` for Cases 1-3. Do not infer, discover, replace, or
construct a provider merchant ID or route at runtime. If the aggregate reports
a repeated/missing cursor, failed provider page, changed environment, or
partial coverage, preserve that status and never call the result complete.

If a returned or selected provider product lacks one unambiguous
CLI-authoritative provider identity, merchant ID, or HTTPS purchase route, stop
before login with `unknown_provider`; do not fall back to a merchant-list
lookup or another storefront.

For a follow-up such as "What supermarket coupons are there?", run one new
joined command with the follow-up as the original current query. Do not reuse
old provider rows or issue separate Program/provider discovery commands. The
new joined snapshot replaces the old one.

Every displayed joined result belongs to one current snapshot containing the
environment, language, geography, CLI-returned provider identity, authoritative
purchase route, query, Program code, Catalog product/variant ID, price,
currency, availability, and classification. A new query, refreshed list,
changed environment, or changed geography invalidates the old ordering,
selection, and purchase authorization. A purchase reply must resolve one stable
ID from the latest snapshot; title-only fuzzy matching is insufficient.

### Product Type, Relation Label, And Presentation

Evaluate all returned Visa Programs and all registered-provider products from
the same joined response:

- Preserve `productType=VISA_PROVIDER_PRODUCT` on every relevant, available
  product in the provider-product collection. A Program match is not required.
- Preserve `PROGRAM_PROVIDER_MATCH` only when the joined CLI result proves that
  optional relation. Never synthesize or force it from titles, categories, or
  presentation needs, and never replace `VISA_PROVIDER_PRODUCT` with it.
- Report a relevant Program as `VISA_PROGRAM_ONLY` when it has no verified
  orderable provider-product relationship.

Keep the Visa Offer collection and directly orderable provider-product
collection visibly distinct. The Agent may organize, sort, number, and phrase
the two groups from the actual returned results. Do not impose fixed headings,
letters, numbering, counts, or a fixed display template. Preserve authoritative
titles and stable IDs. Do not hide a relevant Program merely because it cannot
be ordered, and do not hide an orderable provider product merely because it
lacks a Program row.

An entry Offer, campaign URL, similar title, shared category, or merchant-level
association never proves `PROGRAM_PROVIDER_MATCH`. It does not, however,
remove the constant `VISA_PROVIDER_PRODUCT` product type of a relevant
registered item. Never force a Program/provider match merely to combine the two
display groups.

Treat voucher denomination and purchase price as separate facts. Text such as
`HKD 100` in a title or description is the voucher face value. The structured
Catalog `price.amount` and `price.currency` are the actual purchase price and
payment currency. Do not reject a provider product merely because its HKD face
value is purchased using USD. Convert the structured minor-unit amount once
to the major-unit decimal used by Instruction and Checkout.

### Selected Program Resolution

Before purchasing one selected non-provider Program route, bind it through the
existing token-free Program product resolver before any browser login:

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
  Never use a Visa/VSRP campaign URL or a hardcoded brand URL.
- Use `selectedProgram.title.trim()` unchanged as the query. Do not translate,
  summarize, or replace it with a generic product phrase.
- Use the locked search environment and language.
- The CLI owns internal-first merchant routing, Catalog lookup, external
  fallback, availability filtering, and exact product normalization.
- On `PRODUCT_SELECTION_REQUIRED`, rerun once with
  `--selected-product-id <id>` only when one candidate is uniquely closest by
  geography/market and merchant/product identity. Otherwise ask one selection
  question.
- On `PRODUCT_UNAVAILABLE`, report a Program-Catalog mismatch and stop that
  candidate. Do not substitute another product or a campaign link.
- The verified product must be the same product associated with the selected
  Program. A different closest product does not inherit the Program.
- For a query-only request, present the classified joined results and stop even
  when one result could continue to login.

## Visa Purchase Fast Path

An explicit request to buy one unambiguous selected Visa Benefit is the single
purchase authorization. A reply selecting a previously shown Benefit and
asking to buy it is also sufficient.

Before login, require all of the following:

1. `PRODUCT_VERIFIED` and `CONTINUE_TO_COMMERCE_LOGIN`.
2. Program and Catalog identify the same merchant and product.
3. Catalog total and currency exactly equal the recommendation-backed purchase
   facts; missing or different price/currency stops the flow.
4. The Program supplies one authoritative four-digit
   `commerce.merchantCategoryCode`. Missing, invalid, or ambiguous MCC stops
   before login; do not infer it from Catalog data or a local lookup table.
5. Every required product, fulfillment, and environment field is present.
6. The complete purchase passes the Restricted Instruction Gate.

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
        "merchantCategoryCode": "<four-digit-program-mcc>"
      }
    ]
  }
}
```

Mandate descriptions must be at most 150 characters. The amount is the exact
authorized price with no buffer.

Tell the user in the locked language that Visa login, card binding, and VIC
status are being checked and that, if a browser opens, they should complete
only the missing step shown there. This is status, not another confirmation.
Then run once in the foreground:

```text
<Skill Path>/bin/visa-cli visa commerce-login \
  --context-file <login-context.json> \
  --confirm-purchase \
  --open \
  --format json
```

Continue only on `ok=true` and `ready=true`. The CLI alone decides whether
authoritative REGISTER facts permit a bounded Quick Instruction activation
wait. The Agent must not inspect, persist, infer, or copy registration fields,
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
        "merchantCategoryCode": "<four-digit-program-mcc>"
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

Use this path for a selected `VISA_PROVIDER_PRODUCT` from Cases 1-3 or a
selected Case 4 broad-Catalog result. A registered provider purchase is a Visa
Benefit product purchase. An unregistered Case 4 product is ordinary Catalog
shopping and must not inherit unrelated Program eligibility or terms.

Case 4 discovery is anonymous and must not call `visa recommend` or pass
`--include-provider-products`:

```text
<Skill Path>/bin/visa-cli catalog search \
  --query "<original-current-user-query>" \
  --language <language-tag> \
  --context '{"address_country":"HK"}' \
  <environment-flag> \
  --format json
```

Use the locked geography instead of hardcoding `HK` when the user selected
another market. Broad Catalog results are bounded and non-exhaustive; say so.
Agent-rank only products that satisfy the user's actual product, brand,
geography, channel, and other hard constraints.

Before login, resolve the selected item to one authoritative orderable product.
For a Cases 1-3 provider product, use `ucp-catalog product` with the exact
CLI-returned provider merchant ID and freeze the exact authoritative purchase
route from that same joined result. Never query the merchant list or accept a
route from the product title, Program, broad-search row, hostname familiarity,
or caller input. Missing or ambiguous CLI provider identity is
`unknown_provider` and must stop.
For a Case 4 internal merchant, use the selected `merchant_id`,
`ucp-catalog product`, and the normal authoritative merchant-route resolution.
Do not purchase directly from a broad-search display row when the exact product
detail has not been resolved.

For an external/platform result, use its exact returned product URL with
`tool parse-item`. For an Eats365 platform-store candidate,
`manual_item_facts` with an empty items array is the expected success result:
use the broad Catalog candidate's frozen product ID, title, structured price,
currency, availability, channel, store ID, original Catalog query, Catalog
environment, Catalog language, and returned product/store URL. Do not browse
for a nonexistent detail page or ask for a replacement URL.

Freeze all of these authoritative facts:

- `merchantUrl`: returned internal merchant URL, or for a platform-store item
  its returned product/store ordering URL carrying the same `product_id`;
  never a constructed, campaign, Visa, or VSRP URL
- `productId`: exact orderable Catalog product or variant ID
- `title`: provider-authoritative product title
- `price`: exact major-unit unit price and exact total for the quantity
- `currency`: authoritative three-letter currency
- `availability`: currently orderable status
- `merchantCategoryCode`: one four-digit MCC classified from the exact frozen
  merchant/product context; ask when confidence is low
- for Eats365, `channelType`, `storeId`, `catalogQuery`,
  `catalogEnvironment`, and `catalogLanguage`: exact values from the same broad
  Catalog snapshot
- for a registered provider product, `merchantId` and `merchantUrl`: the exact
  CLI-returned provider identity from the same joined snapshot, never
  caller-supplied

Also freeze merchant/store identity, channel, quantity, fulfillment, endpoint
when returned, and whether digital delivery is actually expected. The Agent
classifies MCC and fulfillment from the exact product context, matching the
existing Agentic payment capability. Ask when either classification is
uncertain. Never reuse an unrelated Program MCC, add a price buffer, or
substitute a similar product.

Use these high-confidence fulfillment rules:

- Registered provider coupons/vouchers: `NO_SHIPPING_REQUIRED`,
  `digitalDeliveryExpected=true`.
- Eats365 coffee or quick-service food is high-confidence MCC `5814`,
  `NO_SHIPPING_REQUIRED`, and
  `digitalDeliveryExpected=false`; the meal itself is not a digital artifact.
- Shipped physical goods: `PHYSICAL_GOODS_REQUIRES_SHIPPING` with the complete
  address contract below.

For any other merchant or product, use a high-confidence MCC and fulfillment
classification or ask once. Stop when either remains uncertain after that
clarification.

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
`--confirm-purchase --open --format json`. Continue only when it returns
`ok=true` and `ready=true`.

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

For a registered provider product, replace the shared `merchantId` and
`merchantUrl` placeholders with the exact values carried by the selected
product's CLI-returned provider identity. The selected product, provider
identity, merchant route, and Catalog detail must all belong to the same joined
snapshot. Unknown or mismatched provider identity stops before login.

Before writing the context file, add exactly one route-specific top-level
fulfillment contract. For a registered provider digital coupon:

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
    "catalogQuery": "<original-current-user-query>",
    "catalogEnvironment": "<locked-catalog-environment>",
    "catalogLanguage": "<locked-language-tag>",
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
  "fulfillmentType": "NO_SHIPPING_REQUIRED",
  "digitalDeliveryExpected": false
}
```

Merge the route-specific fields into the shared object; do not send either
fragment separately. The Eats365 `merchantUrl` must carry the same product ID
as `selection.productId`, and the frozen title, structured price, currency,
availability, channel, store, query, environment, language, and URL must all
come from one broad Catalog snapshot. Any mismatch, missing provenance field,
or changed snapshot stops before login.

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

Use `target: "visa_card_ready"` for card/VIC preparation.

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
  for the card action the user requested.
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
- Cases 1-3 use Visa And Provider Catalog Joined Discovery. Case 4 uses Broad
  Catalog Shopping and, after an exact selection, Catalog Purchase Fast Path.

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
- Do not use this legacy aggregate for a product selected by Cases 1-4; those
  products use Catalog Purchase Fast Path so login, Instruction, card/VIC,
  Checkout, payment, and delivery stay CLI-aggregated.
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
- For Cases 1-3, independently filter both authoritative candidate collections
  by the original query's hard constraints, then report every relevant returned
  Visa Offer and provider product. Every displayed provider row keeps
  `productType=VISA_PROVIDER_PRODUCT`; add `PROGRAM_PROVIDER_MATCH` only as a
  proven optional relation label, and use `VISA_PROGRAM_ONLY` for an unmatched
  relevant Offer.
- Excluding an unrelated provider product from the current result does not
  negate or modify its CLI-returned `directlyOrderable` fact.
- Registered provider products are Visa Benefit products. Program-specific
  eligibility and terms require a proven Program relationship.
- For payment or Checkout, distinguish authorized, submitted, paid, failed,
  unknown, delivery pending, delivery failed, and delivery ready.
- Report digital delivery only when nonempty authoritative artifacts exist.
- Preserve successful payment when delivery is pending, timed out, or failed.
- Keep all user-facing text in the locked language and omit internal workflow
  narration.

## Safety Summary

- Visa query does not log in.
- Cases 1-3 receive authoritative Visa Offer and provider-product candidate
  collections, then independently filter both by the original query's brand,
  category, geography, product, merchant, and other hard constraints.
- Unrelated provider products are not displayed or counted as matches, but
  filtering never changes their CLI-returned `directlyOrderable` fact.
- Case 4 skips Visa recommendation and starts with broad Catalog discovery.
- Non-provider Visa Program purchase uses the three CLI aggregates in Program
  mode.
- Every registered provider product, including a Program-associated one, uses
  Catalog mode with the structured Catalog purchase price/currency.
- Provider and non-Program Catalog purchase use login plus
  `mode=catalog_purchase`, never atomic UCP.
- For a non-provider Program purchase, the Program and resolved Catalog product
  identity plus recommendation-backed purchase amount/currency must agree.
  For registered provider products, Instruction and Checkout use only the
  structured Catalog purchase price/currency; a title or description's voucher
  face value may use another currency and is never compared as the purchase
  price.
- New `mode=purchase` and `mode=catalog_purchase` contexts never send
  `program.code`.
- One unchanged purchase authorization is enough; changed facts require a new
  authorization.
- Quick Instruction is owned by `visa commerce-login`.
- `visa commerce-run` is never rerun after possible Checkout creation.
- Generic capabilities execute only with complete, authoritative input and
  fail closed otherwise.
- No payment, Tip, refund, Checkout completion, or Instruction mutation is
  blindly retried.
