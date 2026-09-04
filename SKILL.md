---
name: visa-skill
description: "Visa Skill 0.1.67. Use for consumer payments and commerce even when Visa is not named: pay/支付/付款, buy or order/购买/下单/订购, place an order/点单/点餐, checkout, shopping/购物, coupons/优惠券, vouchers/代金券, discounts/优惠, benefits/权益, gift cards, merchant offers, product discovery, and Visa card benefits. Supports en, zh-CN, zh-TW, and zh-HK. Do not use for travel visas, immigration, passports, or consular applications."
metadata:
  version: "0.1.67"
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

The resolved Skill Path is authoritative. Execute its launcher directly. Never
probe it with `ls`, `stat`, `find`, `which`, `test -x`, `cat`, or `grep`; never
list `bin/`, read the wrapper/package/config, or inspect process environment.
If direct execution fails, report that launcher error.

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

### Distribution And Purchase Environment

The bundled launcher pins this distribution to `production`. Anonymous
discovery invokes it directly and omits `--sandbox`/`--test`; never determine,
inspect, infer, or override that environment at runtime. Do not read files,
wrapper/package/config, wallet state, or process environment, and do not run
any shell or authentication preflight.

Only after the user selects an exact product and authorizes an authenticated
purchase may the Skill verify that the wallet is production-bound. Every new
login, preparation, and purchase context must use `environment: "production"`.
Any conflicting saved or requested environment stops the flow.

`visa recommend`, `visa detail`, and `visa taxonomy` do not accept
`--sandbox` or `--test`. For `visa recommend-products`, also omit them and rely
on the bundled launcher.

### Benefit Source Region

Resolve and remember the HK/CN source inside the Benefit search itself:

- A unique taxonomy `--region hk` or `--region cn` automatically selects that
  endpoint and persists it as the next default.
- With no HK/CN region, omit `--market`; recommend uses the saved value and
  initializes missing config to `hk`.
- When source and destination are explicitly different, pass both
  `--market <source>` and `--region <destination>`; explicit market wins.
- Never run `visa region get` or `visa region set` as a search preflight. Use
  them only when the user separately asks to inspect or change the default
  without performing a Benefit search.
- Benefit source region is independent of wallet environment and never requires
  a wallet preflight.
- Require returned `sourceRegion` and `sourceEndpoint` to match the selection.

Taxonomy `--region` still means where a Benefit is usable. A unique HK/CN value
also becomes the next source default; other or multi-value destinations do not.

### Catalog Money

Raw Catalog `price.amount` and `price_range.*.amount` integers are minor
currency units. Convert them with the currency's ISO fraction digits before
display or purchase: `100 USD` minor units is `USD 1.00`, and `2600 HKD` is
`HKD 26.00`. Prefer authoritative `unitPriceMajor` or `totalAmountMajor` when
the CLI already returns it, while preserving the corresponding minor value.

A denomination in a product title is product identity, not the purchase price.
For example, an `HKD 100 Gift Card` with Catalog `price.amount=100` and
`currency=USD` has face value `HKD 100` and purchase price `USD 1.00`; never
display it as `USD 100` or rewrite the title denomination.

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

- Requests such as "What Visa Benefits can I use in Hong Kong?" use one
  Visa recommendation plus configured internal product matching.
- Requests such as "Are there Visa household-goods coupons in Hong Kong?" use
  the same Visa-only discovery with the current category wording.
- Requests such as "Are there Watsons coupons?" use the same Visa-only
  discovery with the current brand or product wording.
- Every product, category, merchant, buy/order/checkout, and Benefit request
  uses the same Visa-first aggregate. It never runs broad Catalog. "我想下单咖啡",
  "有咖啡的券吗", and "有哪些咖啡权益" differ only by taxonomy filters.
- Never route initial shopping discovery directly to `catalog search`.

Use Program aggregation after the one-round result contains an exact orderable
product selected by the user:

```text
visa recommend-products -> ask to order ->
visa commerce-login -> visa commerce-run
```

New `mode=purchase` contexts omit both the top-level `program` object and
`metadata.programCode`. Older callers may still provide `program.code` as
compatibility metadata, but this Skill never authors or requires it.

Use a Base Capability Contract only for a non-Program request whose exact
inputs and authorization satisfy that contract.

## Visa Benefit And Product Discovery

Initial shopping discovery makes exactly one `visa recommend-products` call
with the unchanged original current user request. Never pass
`--include-broad-catalog` or `--broad-queries`. The command loads the selected
environment merchant list once and routes only exact Program `code` ==
merchant `ext.visa_program_id`; Offer URL never selects a merchant. The
positional query is the only primary text: never pass `--keyword` or filter-set
`keyword`. Visa recommendation sends taxonomy filters only and no keyword.
After a Program-to-merchant match, CLI uses the unchanged positional query as
that merchant's Catalog query. Offer titles must not replace it. Read
`references/visa-recommend-filters.md`.

Use one strict explicit-filter request by default:

```text
<Skill Path>/bin/visa-cli visa recommend-products "<original-current-user-query>" \
  <individual-filter-flags> \
  --anonymous \
  --lang <language-tag> \
  --format json
```

Only when exactly four genuinely different safe plans improve recall, use one
aggregate call:

```text
<Skill Path>/bin/visa-cli visa recommend-products "<original-current-user-query>" \
  --filter-sets '[<filter-1>,<filter-2>,<filter-3>,<filter-4>]' \
  --anonymous \
  --lang <language-tag> \
  --format json
```

Never duplicate filters, invent soft constraints, fan out reward types, or
issue multiple Agent-managed Shell commands to reach a count. The four-set
aggregate validates one taxonomy snapshot, runs four parallel Visa requests,
excludes `fallback_all_offers` rows, preserves filter-set priority, and
de-duplicates by Program code.

Never add `--include-provider-products`, `--include-broad-catalog`, or
`--broad-queries`, and never issue another Agent-managed recommend,
product-search, merchant-list, or Catalog command. The aggregate owns one
anonymous merchant-list read, exact Program-code matching, and matched-merchant
Catalog search; it never parses an unconfigured Visa campaign page. It does not
log in, bind a card, create an Instruction, Checkout, or payment.

For broad availability wording such as "What Visa Benefits can I use in Hong
Kong?", always add `--all` because the required result is the complete regional
set. Also add `--all` for any other explicit all-Benefits request; do not rely
on natural language alone to widen the request:

```text
<Skill Path>/bin/visa-cli visa recommend-products "<original-current-user-query>" \
  <individual-filter-flags> \
  --anonymous \
  --all \
  --lang <language-tag> \
  --format json
```

For a Hong Kong destination, use `--region hk` in a single-filter call. In
four-set aggregate mode, include `"region": ["hk"]` in every filter object and
never add an outer `--region`; the CLI rejects mixed filter ownership.
`--market hk` remains a source selector and is used only when Hong Kong card
issuance is explicit.

Never infer or pass `--type` for `recommend-products`; Benefit, reward, coupon,
discount, or purchase wording does not select it. Set `reward_type` only when
the user explicitly requests one. Generic "优惠", "benefit", "offer", or
"礼遇" selects none. Never fan out reward types; use one safe plan when possible.

For category-, merchant-, or product-specific shopping requests, choose one
strict plan by default and use four-set aggregation only for four meaningful
variants. For "我想下单咖啡", select the high-confidence
`dining_cafe_bakery` category and do not invent a `reward_type`. The unchanged
query is not sent to Visa and is used only for a Program-matched merchant.
Add `--all` when the user asks for every matching Benefit. A follow-up query
invalidates all prior filters and results.

Read only the aggregate `products` and `visaBenefits` collections:

- Lightly check both collections against the original request before display.
  Drop clearly unrelated rows: coffee excludes supermarket products/Benefits.
  Keep plausible aliases/translations; present `products` first, then
  `visaBenefits`.
- When only `products` remains, show products only and do not mention missing
  Benefits, Offers, coupons, or discounts. When only `visaBenefits` remains,
  show Benefits only and do not mention missing or unorderable products. Only
  when both filtered collections are empty, give one concise no-results answer.
- `products` contains only verified internal UCP products found after exact
  Program-to-merchant matching. Present title, major-unit price/currency,
  availability, and merchant. A matched Program must not be displayed again
  as a Benefit.
- A nonempty `matchedPrograms` array is purchase provenance only. Never use it
  to reconstruct a user-facing Benefit title, activity description, Offer URL,
  eligibility, terms, or Benefit call to action. If `returnedProductCount>0`
  and `returnedVisaBenefitCount=0`, present products only.
- `visaBenefits` contains Programs that did not resolve to an exact orderable
  product. Independently retain only rows satisfying the user's hard
  constraints and preserve code, title, order, summary, dates, and URL.
- `visaBenefits` is the only source for user-facing Benefit rows. If it is
  empty, display no Benefit even when a product has `matchedPrograms`.
- Do not merge a `PRODUCT_SELECTION_REQUIRED`, unavailable, external-page, or
  failed resolution into products. It remains a Benefit.
- If `productMatching.coverage=partial`, disclose that some product checks
  failed without hiding the retained Benefits.

Treat `fallback_all_offers`, `no_matching_offers`, or zero Programs after the
independent semantic filter as a Visa miss. Never display fallback Visa rows.

When Visa relaxes an explicitly requested taxonomy axis, treat it as no strict
match and stop without Catalog fallback. Every command error also stops.

For a Visa miss, do not display fallback Visa rows or search Catalog. If both
strict products and Benefits are empty, give one concise no-results answer.

For count-only wording, return the authoritative Visa matching total. Do not
silently replace a requested Visa Benefit count with a bounded Catalog count.

For explicit food delivery use `--category dining_delivery_food` and exclude
`instore_only` or dine-in-only Programs. For explicit dine-in use
`dining_restaurant`. Ask one question when the intent is genuinely ambiguous.

### Selected Visa Benefit Resolution

For details on an unmatched Visa Benefit, bind one stable Program code and run:

```text
<Skill Path>/bin/visa-cli visa detail <program-code> \
  --lang <language-tag> \
  --format json
```

Preserve activity summary, hard terms, dates, and campaign/activity URL.
Never infer a merchant route from an arbitrary Visa/VSRP campaign URL.
Do not rerun `visa product-search` or add a purchase CTA. An authorized exact
`products[]` order uses the purchase fast path, never `visa detail`.

A new Visa query, refreshed recommendation, changed language, changed
geography, or changed environment invalidates the prior Program selection and
UCP result.

## Visa Purchase Fast Path

An explicit request to buy one unambiguous selected Visa Benefit is the single
purchase authorization. A reply selecting a previously shown Benefit and
asking to buy it is also sufficient.

After authorization, use the latest unchanged `recommend-products` snapshot
directly in `visa commerce-login`; never run or refresh `visa detail`. If the
snapshot is missing or invalidated, stop and return to discovery.

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
   - An invalid or conflicting Program MCC, title-only guess, broad
     common-MCC fallback, environment-specific merchant/MCC override, or
     low-confidence classification stops before login.
   Freeze the resolved MCC once and reuse it unchanged in login, Instruction,
   purchase context, and Checkout.
6. Every required product, fulfillment, and environment field is present.
7. The complete purchase passes the Restricted Instruction Gate.

Build this login context:

```json
{
  "environment": "production",
  "expected": {
    "amount": "<product.totalAmountMajor>",
    "currency": "<verified-currency>"
  },
  "instructionContext": {
    "title": "<selected-program-title>",
    "mandates": [
      {
        "title": "<selected-program-title>",
        "description": "Purchase the selected Visa Program",
        "amountLimit": "<product.totalAmountMajor>",
        "currencyCode": "<program-currency>",
        "merchantCategoryCode": "<resolved-four-digit-mcc>"
      }
    ]
  }
}
```

Set login/purchase `expected.amount` and every `amountLimit` to
`product.totalAmountMajor`. Never copy `unitPriceMinor`, `totalAmountMinor`, or,
for quantity >1, `unitPriceMajor`. Example: `totalAmountMinor=100` and
`totalAmountMajor="1"` make all three major-unit fields `"1"`.

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

Keep it foreground until `ok=true` and `ready=true` or a bound timeout. The CLI
alone owns the Pending Instruction Card Gate. Never inspect or copy registration
fields, `pendingInstructionId`, or login-returned Instruction IDs; Quick
Instruction is acceleration, not purchase identity.

Build one frozen purchase context from the same Program and verified product:

```json
{
  "mode": "purchase",
  "environment": "production",
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
    "amount": "<product.totalAmountMajor>",
    "currency": "<verified-currency>"
  },
  "instructionContext": {
    "title": "<selected-program-title>",
    "mandates": [
      {
        "title": "<selected-program-title>",
        "description": "Purchase the selected Visa Program",
        "amountLimit": "<product.totalAmountMajor>",
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
    "totalAmountMajor": "<verified-total-major>",
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

### Visa Preparation

For explicit login-only or Visa card readiness, use the aggregate in prepare
mode:

```json
{
  "mode": "prepare",
  "target": "login",
  "environment": "production",
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

- Use `wallet status --format json` only for an explicit wallet request or after
  an exact product selection when an authenticated operation is about to begin.
  Never use it to preflight anonymous discovery.
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

- Use `catalog search` only when the user explicitly requests that standalone
  capability or a non-initial workflow requires it. Use
  `ucp-catalog search/product` when the merchant is authoritative.
- Pass the locked `--language`; the launcher owns the search environment.
  Discovery never reads files, wallet status/config, starts wallet setup, logs
  in, or authorizes purchase.
- Present returned identity, merchant, price, currency, availability, channel,
  and location facts without invention. Apply Catalog Money before presenting
  a price. A later purchase must freeze one exact selected product.
- Initial discovery never uses this standalone capability as a fallback.

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
- For Visa discovery, use only `visa recommend-products` output. Present
  nonempty exact orderable products first, then relevant unmatched
  visaBenefits; never display a matched Program twice. Omit an empty collection
  without explaining its absence. When only products remain, show products only
  and do not mention missing Benefits. When only visaBenefits remain, show
  Benefits only and do not mention missing products. Report no result only when
  both filtered collections are empty.
- Never derive a Benefit presentation from `products[*].matchedPrograms`. When
  an exact product replaced its Program, display only that product.
- For a selected Visa Benefit, report an order option only after an exact
  internal UCP Catalog match. Otherwise report the Visa activity detail and
  authoritative link without a purchase call to action.
- Products returned by this aggregate are ordinary orderable Catalog products;
  matched Program facts remain provenance, not a duplicate display row.
- For payment or Checkout, distinguish authorized, submitted, paid, failed,
  unknown, delivery pending, delivery failed, and delivery ready.
- Report digital delivery only when nonempty authoritative artifacts exist.
- Preserve successful payment when delivery is pending, timed out, or failed.
- Keep all user-facing text in the locked language and omit internal workflow
  narration.

## Safety Summary

- Visa query does not log in.
- Anonymous discovery invokes the bundled launcher directly, omits environment
  flags, and never determines or validates distribution/wallet environment.
- Initial discovery is one `visa recommend-products` call: one strict
  explicit-filter request by default, or one four-set aggregate.
- Every returned Program is checked only against configured exact internal UCP
  routes. Exact matches become products and are removed from visaBenefits.
- `visa detail` is only for unmatched-Benefit details, never an exact product
  purchase.
- Without an internal UCP match, present only the activity introduction, terms,
  and authoritative activity link, with no purchase-inducing next step.
- Direct shopping uses the same Visa-only recommendation and matched-merchant
  product resolution; it never starts with standalone `catalog search`.
- A matched Visa Program purchase uses the latest unchanged
  `recommend-products` snapshot directly in the purchase aggregates.
- For a Program purchase, the Program and internal UCP Catalog product identity
  plus recommendation-backed purchase amount/currency must agree.
- New `mode=purchase` contexts never send `program.code`.
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
