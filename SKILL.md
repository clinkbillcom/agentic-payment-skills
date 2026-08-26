---
name: visa-skill
description: "Visa Skill 0.1.26. Use for Visa card benefits and commerce plus concise Clink wallet, card, risk, Catalog, payment, UCP, Instruction, refund, event, Skill tipping, and Skill installation capabilities. Supports en, zh-CN, zh-TW, and zh-HK. Do not use for travel visas, immigration, passports, or consular applications."
metadata:
  version: "0.1.26"
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

- a sandbox/UAT distribution uses `--sandbox` for public search and
  `"environment": "uat"` in contexts
- a test distribution uses `--test` and `"environment": "test"`
- production uses no search environment flag and `"environment": "production"`

The installed distribution lock wins when the user omits the environment.
Never let an installed UAT or test Skill silently default to production.
Authenticated commands must agree with the current wallet environment.

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

Use Visa aggregation whenever the target originates from a Visa Program:

```text
visa recommend -> visa product-search -> visa commerce-login -> visa commerce-run
```

Do not route a Visa Program purchase through generic Catalog, `pay`, atomic
Instruction, events, or UCP commands. The Visa aggregates preserve Program
identity, price and currency checks, Quick Instruction handling, Card/VIC
readiness, Instruction selection, Checkout safety, and delivery.

Use a Base Capability Contract only for a non-Program request whose exact
inputs and authorization satisfy that contract.

## Visa Benefit Discovery

Queries never proactively log in, bind a card, create an Instruction, or
prepare payment:

```text
<Skill Path>/bin/visa-cli visa recommend "<original request>" \
  --lang <language-tag> --format json
<Skill Path>/bin/visa-cli visa detail <program-code> \
  --lang <language-tag> --format json
<Skill Path>/bin/visa-cli visa taxonomy \
  --lang <language-tag> --format json
```

For `matching_offers`, evaluate all returned rows against the user's wording,
geography, eligibility, status, dates, channel, and hard terms. Present at most
the five best matches and preserve the authoritative matching total. Do not
rerun recommendation merely to shrink the list.

For `fallback_all_offers` or `no_matching_offers`, report that no relevant
Offer was found. Do not rank, display, recommend, or purchase fallback rows,
and do not present their count as a matching total. For count-only wording,
return only the authoritative matching total.

For explicit food delivery use `--category dining_delivery_food` and exclude
`instore_only` or dine-in-only Programs. For explicit dine-in use
`dining_restaurant`. Ask one question when the intent is genuinely ambiguous.

### Token-Free Product Resolution

Immediately product-resolve each of the at-most-five selected query Offers, or
the one selected purchase Program, before any browser login:

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
- For a query-only request, present the enriched results and stop even when the
  result could continue to login.

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
  "program": {
    "code": "<program-code>"
  },
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
- For Visa discovery, report only verified matching Programs and enriched
  Catalog availability.
- For payment or Checkout, distinguish authorized, submitted, paid, failed,
  unknown, delivery pending, delivery failed, and delivery ready.
- Report digital delivery only when nonempty authoritative artifacts exist.
- Preserve successful payment when delivery is pending, timed out, or failed.
- Keep all user-facing text in the locked language and omit internal workflow
  narration.

## Safety Summary

- Visa query does not log in.
- Visa Program purchase always uses the three CLI aggregates.
- Program and Catalog product, amount, and currency must agree.
- One unchanged purchase authorization is enough; changed facts require a new
  authorization.
- Quick Instruction is owned by `visa commerce-login`.
- `visa commerce-run` is never rerun after possible Checkout creation.
- Generic capabilities execute only with complete, authoritative input and
  fail closed otherwise.
- No payment, Tip, refund, Checkout completion, or Instruction mutation is
  blindly retried.
