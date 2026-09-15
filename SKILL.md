---
name: visa-skill
description: "Visa Skill 0.1.103. Use for consumer payments and commerce even when Visa is not named: pay/支付/付款, buy or order/购买/下单/订购, place an order/点单/点餐, checkout, shopping/购物, coupons/优惠券, vouchers/代金券, discounts/优惠, benefits/权益, gift cards, merchant offers, product discovery, and Visa card benefits. Supports en, zh-CN, zh-TW, and zh-HK. Do not use for travel visas, immigration, passports, or consular applications."
metadata:
  version: "0.1.103"
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
Edition: it includes every Base Command plus five independent command
capabilities: `visa recommend-products`, `visa commerce-login`, `visa payment-method resolve`,
`visa instruction candidates|create|bind-pi|get|wait`, and `visa checkout`.
Only `visa commerce-run` remains compatibility-only among the purchase
commands/exports, not the normal Skill path or a fallback for missing commands.

Keep normal execution small. Do not read reference files, inspect source or
workflow scripts, invoke runtime `--help`, run `date`, use a fixed `sleep`, or
load JavaScript orchestration modules. Interpret the user's intent, collect only
missing business facts, obtain the required authorization, run the shortest
matching CLI capability, and report the structured result.

### Independent Invocation

The Agent owns orchestration. Each capability has its own CLI command/file and
can be invoked independently; the numbered steps below are one shopping example,
not a mandatory CLI pipeline or a record of commands that must have run.
Login before recommend is valid. A login-only request needs no product,
recommendation, purchase context, or purchase authorization.

| Request/state | Agent command plan | Boundary |
| --- | --- | --- |
| Login only; no product | `visa init` | Report login; stop |
| Login, then ask for offers | `visa init` -> `visa recommend-products` | No card/Instruction/Checkout |
| Browse while logged out or logged in | `visa recommend-products` | No login preflight |
| Check card readiness; authenticated, no product | `visa payment-method resolve` | Report card state; stop |
| Resume exact authorization; complete context | `visa instruction get` or `visa instruction wait` | No rediscovery/create |
| Authorized purchase; ready PI and selected ACTIVE pair | `visa checkout` | Recheck gates; no prior-command replay |

Independent invocation does not bypass business prerequisites. Supply the
required inputs, exact IDs, current authentication/readiness, and confirmation
for mutations. Continue to another capability only when the user's intent calls
for it; a ready result or suggested nextAction does not expand that intent.

### Validation Ownership

The CLI's `purchase-context-validation.ts` checks only currency, amount/limit, and
MCC. It must not validate title/description content, compare their strings, or
classify purchase meaning from them. Titles and descriptions remain data for
the Agent's semantic purchase validation, not CLI semantic gates.

| Check | Owner |
| --- | --- |
| Currency, amount, MCC | CLI purchase-context validator |
| Intent, restricted-category meaning, title/description, merchant/SKU/denomination/region/quantity equivalence | Agent |
| Required arguments and identifiers | CLI command parser |
| Auth, PI/VIC, ACTIVE, expiry, usage/reserve, recurring | CLI command |
| Authoritative merchant/product IDs, price/currency, availability | CLI product revalidation |

Numeric/MCC validation or technical eligibility does not prove product
equivalence or user authorization. The Agent still screens the complete
purchase and stops on ambiguous evidence. Keep the CLI's per-command safety
checks; removing title/description semantic validation does not weaken them.

### Aggregate Failure Diagnosis

Normal successful execution does not read references. When an aggregate command
returns an error, partial coverage, user-action state, or a non-terminal result,
read only the reference matching that command:

| Command | Reference |
| --- | --- |
| `visa recommend` | `references/visa-recommend.md` |
| `visa recommend-products` | `references/visa-recommend-products.md` |
| `visa product-search` | `references/visa-product-search.md` |
| `visa init` | `references/visa-init.md` |
| `visa payment-method resolve` | `references/visa-payment-method.md` |
| `visa instruction candidates/create/bind-pi/get/wait` | `references/visa-instruction.md` |
| `visa checkout` | `references/visa-checkout.md` |
| `visa commerce-login` | `references/visa-commerce-login.md` |
| `visa commerce-run` | `references/visa-commerce-run.md` |
| `visa pending-instructions` | `references/visa-pending-instructions.md` |
| `visa browser-open` | `references/visa-browser-open.md` |

Use returned `stage`, `status`, `reason`, `error`, `detail`, `instructionId`,
`paymentInstrumentId`, `resumeCommand`, and `recovery` to identify the failed
stage. Run an atomic command only when the matching reference marks it as safe
read-only diagnosis or the user explicitly authorizes that mutation. Never
decompose an uncertain purchase into manual payment calls, create a replacement
Instruction, or retry Checkout.

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

The bundled launcher already pins the distribution search environment.
Anonymous discovery invokes it directly and omits `--sandbox`/`--test`; never
determine, inspect, infer, or override that environment at runtime. Do not read
files, wrapper/package/config, wallet state, or process environment, and do not
run any shell or authentication preflight.

Purchase login, payment-method, Instruction, and Checkout commands use
`--environment sandbox` for this UAT distribution. Standalone login uses
`visa init --sandbox --start --no-open` before any recommendation. Preserve that environment
through all continuations. Do not inspect config or switch to production to
repair a failed command.

`visa recommend`, `visa detail`, and `visa taxonomy` do not accept
`--sandbox` or `--test`. For `visa recommend-products`, also omit them and rely
on the bundled launcher.

### Benefit Source Region

Only the user changes the HK/CN Benefit source. A search never changes it:

- Omit `--market` in every Benefit search. Recommend uses the saved source and
  defaults missing config to `hk`.
- A taxonomy `--region` is a destination, never a source. `--region hk`,
  `--region cn`, and `--region jp` all leave the saved source unchanged, and the
  CLI writes no config during a search.
- Run `visa region set <hk|cn>` only when the user explicitly asks to switch the
  Benefit market, and `visa region get` only when the user asks which market is
  active. Neither is ever a search preflight, and a request to see offers in a
  place is not a request to switch markets.
- Pass `--market <source>` only when the user explicitly names the card-issuing
  market for that one call; it overrides the source for that call only and
  persists nothing.
- Benefit source region is independent of wallet environment and never requires
  a wallet preflight.
- Require returned `sourceRegion` and `sourceEndpoint` to match the selection.
  `sourceRegionReason` is `explicit_market` or `saved_or_default`.

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
For flat `visa instruction` and `visa checkout` arguments, `--amount` must equal
the authoritative `product.totalAmountMajor` value. Never pass
`product.totalAmountMinor`; this example uses `--amount 1`, not `--amount 100`.

### Authorization And Input

- A query, explanation, candidate number, login, card setup, or browser action
  is not payment, Tip, refund, or purchase authorization.
- Before a mutation, freeze the exact merchant or publisher, item or purpose,
  quantity, amount, currency, payment method, environment, and fulfillment
  facts that apply to that capability.
- One explicit authorization covers the unchanged frozen mutation. Ask again
  only if merchant, item, quantity, amount, currency, recipient, refund scope,
  or fulfillment materially changes.
- When one exact product and its displayed order facts are unchanged, "买这个",
  "帮我下单", "确认购买", "buy this", and "confirm purchase" are sufficient.
  Resolve short replies against that displayed order. Never require the user
  to repeat the full order or follow a confirmation template. Ask only for
  genuinely missing or materially changed facts.
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
  With an existing Instruction continuation, create zero additional Instructions.
- Timeout, transport failure, an unknown result, or exit code 6 never authorizes
  resubmission. Verify through a bound read-only status or continuation.
- An event is a wake-up hint, not final truth. Refresh the authoritative
  resource before reporting success.
- Payment success does not prove merchant receipt, balance top-up, entitlement,
  or delivery. Report each state separately.
- Never expose Tokens, OTPs, device codes, raw card data, signatures, secrets,
  full configuration, private URLs, Base64, or raw CLI envelopes.

### Restricted Instruction Gate

Before a purchase mutation or any standalone `instruction create`, the Agent
screens the complete user request, merchant, Program, product, URL, title,
description, every mandate, and MCC. Do not delegate semantic screening to
the CLI purchase-context validator. Standalone login needs no purchase context.

Refuse the purchase before draft creation or Checkout when it is, or may reasonably
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

OAuth, card/VIC, Passkey, Instruction, 3DS, and risk pages belong in the user's
system browser. Never inspect, fill, or submit them with an Agent browser.
Within the five-step purchase, `visa browser-open` is allowed only for Step2
login and Step4 Instruction activation, using the exact returned `manualOpenUrl`.

The ENTIRE Step3 is URL-only: show `bindCardUrl`, `manageCardUrl`, or `vicUrl`;
never use `browser-open`, `--open`, an OS opener, preview, or an Agent browser.
This includes VIC and card management, not just binding. Bind Card is URL-only
in every flow, including standalone card setup.

Before an allowed opener, tell the user to use the system browser and avoid
the actual host's built-in browser. If the host Agent name is known, use that
name. If it is unknown, say `请在系统浏览器中完成操作，不要使用 Agent 内置浏览器。`
and never emit the literal placeholder; never emit {agent}.

```text
<Skill Path>/bin/visa-cli visa browser-open --url "<manualOpenUrl>" --format json
```

A successful browser launch is not business success; a closed page or failed
browser launch is not business failure. After manual completion, check state
first without reopening: resume the same login, repeat the same payment-method
resolve, or exact-get the same Instruction as appropriate. A failed opener
leaves the exact URL available for manual use. Never kill/restart an unrelated
command or use shell background jobs.

An Alipay QR is not a browser page. Display the CLI-rendered terminal QR
exactly, or use the CLI-returned private `imagePath` only when terminal QR
rendering is unavailable. Never expose or reconstruct QR payloads or Base64.

### Purchase Identity

Freeze the selected merchant, productId, price, currency, and all other
purchase facts from discovery. Payment-method readiness freezes BOTH `paymentInstrumentId`
and `selectionSource=default|explicit`; carry both unchanged through Steps 4-5.
Never infer a default from the first, only, newest, or VIC-ready card.

A changed default PI stops a default-based purchase and requires reconfirmation.
An explicitly chosen alternate PI remains selected despite a later default
change, provided it is still owned, usable, and VIC-ready. Do not ask which card
to use or whether to make an alternate default; the user may proactively supply
an exact PI ID.

Never reuse PENDING or CREATED as another purchase's match. commerce-login
retains the exact Quick pendingInstructionId for this authorized purchase.
ACTIVE verifies the same PI and eligible Mandate; PENDING explicitly binds the
SAME ID via `visa instruction bind-pi` to the Step3 ready PI/source; CREATED
continues same-ID ordinary activation. No replacement ordinary Instruction.
Only when no Quick ID exists and ACTIVE candidates have no semantic match may
`visa instruction create` create an ordinary PI-bound CREATED Instruction.
Preserve its exact ID and original authorization deadline; timeout or
unknown state never authorizes a replacement Instruction.

Continuation belongs to the current Agent conversation, not a context file or
CLI config. Retain purchase facts, PI, selectionSource, instructionId,
mandateId, authorizationDeadline, and returned phase explicitly. When
`phase=checkout_started`, Checkout may already exist; only exact CLI-returned
read-only recovery is allowed.

### Compatibility Recovery

`visa commerce-run` and `visa pending-instructions`
remain available for existing callers, not as the new purchase path. Diagnose
an existing legacy operation with its matching reference and preserve its exact
IDs. Do not transfer an unresolved legacy purchase into a new Checkout.
The read-only `GET /agent/cwallet/instructions/activatable` recovery list is
not an Instruction creator or permission to select the latest row.

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
- Every initial product, category, merchant, buy/order/checkout, and Benefit discovery request
  uses the same Visa-first aggregate. It never runs broad Catalog. "我想下单咖啡",
  "有咖啡的券吗", and "有哪些咖啡权益" differ only by taxonomy filters.
- Never route initial shopping discovery directly to `catalog search`.

For a shopping request without prepared state, the Agent may use this sequence
after selecting an exact orderable product. It is not enforced command order:

```text
visa recommend-products -> exact product selection and purchase authorization
-> visa commerce-login -> visa payment-method resolve
-> exact Quick ID bind-pi/get/wait, or candidates/create when no Quick ID exists
-> visa checkout
```

An already authorized selection keeps the unchanged snapshot. The Agent invokes
login only if needed, then the needed readiness/authorization capability, or
checkout directly when the current gates and exact IDs are available. Do not
search again, replay completed commands, or ask to order again.

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
that merchant's Catalog query. Offer titles must not replace it.

Keep `region` and Catalog routing in this Skill:

- Every recommendation request carries `--region`.
- Add `--category` when the user names a category, merchant, brand, or product.
- Omit `--category` for a genuinely generic regional request.
- Do not guess taxonomy values. If another axis or code is needed, run
  `visa taxonomy` and use the current enum returned by
  `GET {base_url}/api/v1/taxonomy`.
- Never fill `reward_type` or pass `--reward-type` unless the current taxonomy
  and the user's request explicitly require it.
- Use one strict filter plan by default. Use `--filter-sets` only for four
  genuinely different safe plans, each carrying its own `region`.
- Recommendation never logs in, binds a card, creates an Instruction, or
  prepares payment.

Use one strict explicit-filter request by default:

```text
<Skill Path>/bin/visa-cli visa recommend-products "<original-current-user-query>" \
  --region <region> [--category <category>] \
  --anonymous \
  --lang <language-tag> \
  --format json
```

Every call carries `--region`. `--category` is required whenever the request
names a category, merchant, brand, or product, and natural language never
replaces that flag: supermarket / grocery / 超市 / 街市 map to
`shopping_supermarket`, department store / mall / 百货 / 商场 to
`shopping_department_mall`, coffee / 咖啡 to `dining_cafe_bakery`. Omit
`--category` only for a genuinely generic regional request such as
`日本有什么优惠`, `有什么权益`, or `any offers`, which names no category,
merchant, brand, or product; that call returns the region's first page.

Never invent a category for a generic request. When no offer satisfies every
requested filter, the server drops one axis and returns offers that do not match,
so the CLI fails the call with `reason=no_offer_for_filter_combination` in
`error.details`. That means the axes are too narrow together, not that the
region has no Benefit at all: rerun once with the `retryFilters` object from
those details (the same filters minus `relaxedAxes`), then answer from that
result. Never guess a different category, never repeat the same filters, and
never report "no offers" from the failed call alone. Report no results only
after the narrower rerun also returns none.

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

In aggregate mode an unmatchable set does not fail the command: it degrades to
no-match, its `filterSelection.sources` row carries `strictMatchFailure`, and
the result lists `strictMatchFailures`. Present the Programs the other sets
returned, and never describe a degraded set's axes as unavailable Benefits.

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
issuance is explicit; it never becomes the saved market.

Never infer or pass `--type` for `recommend-products`; Benefit, reward, coupon,
discount, or purchase wording does not select it. Never fill `reward_type` in
filter objects or pass `--reward-type`, even for coupon or discount requests.
Keep region, category, and explicitly requested purpose such as local.
Use one safe plan when possible.

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

## Visa Purchase Five-Step Flow

The step numbers label capabilities, not invocation prerequisites. The Agent
orchestrates this shopping example and owns semantic purchase validation;
independent login, discovery, readiness, and exact-ID continuation remain valid.

An explicit request to buy one unambiguous selected product is the single
purchase authorization. The short replies in Authorization And Input are valid.
This path supports one product with quantity 1 only. For a multi-item or
multi-quantity request, explain this limit; never silently reduce the quantity
or split the purchase into several orders.

After authorization, use the latest unchanged `recommend-products` snapshot;
never run or refresh `visa detail`. If the
snapshot is missing or invalidated, stop and return to discovery.

Require `PRODUCT_VERIFIED` and `productResolution=internal-ucp-catalog`.
Discovery's compatibility action `CONTINUE_TO_COMMERCE_LOGIN` is a purchase
handoff hint, not a command-order requirement. Use commerce-login only for an
authorized purchase, not as an anonymous discovery preflight.
Keep that selected row's
`purchaseContext` unchanged in memory. It uses `mode=selected_product` and
contains the single-item facts already displayed to the user. Do not create a
local JSON file just to pass context between CLI commands.

Do not build an Instruction context, infer MCC, copy Program fields, or
recalculate amounts. The CLI constructs the Instruction data and checks
currency/amount/MCC; the Agent validates purchase meaning and title/description.
If `purchaseContext` is absent, report `purchaseContextUnavailable`; do not
invent the missing data or use `visa detail` to repair it.

### Step1: Recommend And Freeze

Discovery is unchanged: `visa recommend-products` returns `products` and
`visaBenefits`. Freeze the selected merchant + productId + authoritative
price/currency and quantity 1. Do not search again for an already authorized
unchanged selection.

### Step2: Purchase Login

```text
<Skill Path>/bin/visa-cli visa commerce-login <purchase-args> \
  --confirm-purchase --no-open --format json
```

This command first inspects login status with the authorized instructionContext.
Already authenticated: check ONLY the persisted default PI. Proven usable and
VIC-ready means no new Instruction. Known no default, missing/unusable card,
unsupported card or confirmed incomplete VIC means direct PENDING creation.
Failed card query, multiple explicit defaults, or unknown default support or
completion returns a structured read-only error, never blind PENDING creation.
Other cards never affect Quick. Do not repeat OAuth for an authenticated user.

Unauthenticated: send instructionContext through Benefit OAuth. Show the exact
manualOpenUrl and system-browser notice before separate visa browser-open.
Repeat the same purchase command with --manual-completed after user completion,
or --browser-opened after a successful separate opener. Resume the original
OAuth, check status first, and do not reopen. Retain pendingInstructionId,
instructionStatus, PI when returned, and original authorizationDeadline.
Step3 never discards this continuation; Step4 must continue its exact ID.

### Standalone Login

For pure login without purchase context, use `visa init`, independently callable
before recommend. No product, purchase authorization or instructionContext is needed.

```text
<Skill Path>/bin/visa-cli visa init --sandbox --start --no-open --format json
```

```text
<Skill Path>/bin/visa-cli visa init --sandbox --resume <id> --no-open --format json
```

Show manualOpenUrl, give the system-browser notice, then open that exact URL
separately. Resume only the returned ID; no reopening on manual completion.
The --no-open flag prevents defaultOpenLinks=true from opening before the notice.
Report and stop for login-only intent. Never call `wallet init`.

### Step3: Resolve Payment Method

```text
<Skill Path>/bin/visa-cli visa payment-method resolve \
  --environment sandbox --format json
```

Use the persisted default PI without asking which card. Only when the user
proactively chooses an alternate by exact ID, pass:

```text
<Skill Path>/bin/visa-cli visa payment-method resolve \
  --environment sandbox --payment-instrument-id <id> \
  --selection-source explicit --format json
```

For a frozen default recheck, supply its exact ID with `--selection-source default`.
Never label an Agent-selected card `explicit`.
This command needs authentication, not a selected product or a prior recommend
call. For a readiness-only request, report its result without starting Step4.
The purchase actions in the table apply only to an authorized purchase.

| Card state | Result | Agent action |
| --- | --- | --- |
| No card | `bindCardUrl` at the Agent Portal root | Show URL; stop for user setup |
| Cards but no persisted default, using default selection | `manageCardUrl` | Show URL; stop for user card management |
| Selected card supports VIC but is not ready | `vicUrl` | Show URL; stop for user VIC |
| VIC support false or unknown, or card-info read fails | Stop/manual card management | Never enter VIC or Checkout |
| Selected card is owned, usable, and VIC-ready | `ready`, `paymentInstrumentId`, `selectionSource` | Freeze BOTH values; advance to Step4 |

The ENTIRE Step3 NEVER browser-opens or uses `--open`, including `vicUrl` and
`manageCardUrl`. Show only the exact returned URL. When the user returns,
repeat the same resolve command to recheck authoritative state; no automatic
card/VIC wait or Instruction creation. An explicit alternate must become
VIC-ready too and need not become default.
An exact explicit selection can be ready even when no persisted default exists.

Card readiness uses `GET /agent/cwallet/card/info`.
`cardSchemeRegistrationEnabled` is support, not completion;
`visaRegistrationSucceeded` or card-level `strongAuthRegistered` is completion.
Capability false/unknown and failed reads stop even if a cached card looked ready.

### Shared Purchase Arguments

In Steps 2, 4-5, `<purchase-args>` denotes these same flat arguments from the
frozen `purchaseContext`, not a literal CLI flag or a context file:

```text
--mode selected_product --environment sandbox \
  --request-text "<original request>" \
  --merchant-id <merchant-id> --endpoint "<endpoint>" \
  --merchant-url "<merchant-url>" --merchant-name "<merchant-name>" \
  --product-id <product-id> --title "<product title>" \
  --amount <total amount> --currency <currency> --quantity 1 \
  --availability in_stock --digital-delivery-expected <true|false> \
  [--mandate-mcc <mcc>]
```

Preserve any authoritative optional merchant, recurrence, buyer, shipping, or
Catalog fields using the existing selected_product flat arguments. Never mix
legacy `--context <json>` with flat input. No Program fields or amount buffer.

### Step4: Select Or Authorize An Instruction

Invoke the requested subcommand directly with complete inputs; an existing
exact-ID get/wait does not rerun candidates or create. Candidate selection and
the decision to create belong to the Agent, not an automatic CLI transition.

An existing Quick pendingInstructionId takes priority over candidates/create.
ACTIVE: exact get verifies the same PI and eligible Mandate; the Agent checks
semantic equivalence before reusing that pair. CREATED: same-ID get/ordinary
activation. PENDING: after Step3 ready, explicitly bind the SAME ID:

```text
<Skill Path>/bin/visa-cli visa instruction bind-pi <purchase-args> \
  --payment-instrument-id <pi> --selection-source <default|explicit> \
  --instruction-id <id> --authorization-deadline <ms> \
  --confirm-purchase --format json
```

Preserve the original authorizationDeadline on binding. `get/wait` are read-only:
PENDING returns binding_required, never a hidden POST. Bind returns same-ID
activation URL; continue the ordinary activation/get/wait below. Unknown binding
requires read-only reconciliation. Never create a replacement ordinary Instruction.
Only without a Quick ID use the candidate path below; other purchases' PENDING
or CREATED Instructions are not candidate reuse.

```text
<Skill Path>/bin/visa-cli visa instruction candidates <purchase-args> \
  --payment-instrument-id <pi> --selection-source <default|explicit> --format json
```

`candidates` is read-only. CLI filters ACTIVE status, the frozen PI, currency,
amount limit >= purchase amount, MCC, future expiry, usage/reserve, and recurring
constraints. It returns all eligible candidate Instructions, their
`eligibleMandates` (`mandateId`, `title`, `description`, amount/currency/MCC),
and the PI. It does not pick a product by text equality.
Purchase-context validation checks only currency/amount/MCC, not title/description;
the command separately enforces technical eligibility.

The Agent selects semantically from that eligible set: require the same merchant
and SKU, denomination, region, and quantity. Equivalent translated titles are
not required to be string-equal. Inspect title and description with authoritative
product facts; a matching amount alone is insufficient. Ambiguous evidence
means stop for clarification, not guess or create. Never select by list order.

A clear match freezes its exact `instructionId` and eligible `mandateId` and
lets the Agent invoke Step5 for the authorized purchase, without creation or
browser activation. Only a verified no-match
allows one ordinary PI-bound CREATED draft:

```text
<Skill Path>/bin/visa-cli visa instruction create <purchase-args> \
  --payment-instrument-id <pi> --selection-source <default|explicit> \
  --confirm-purchase --format json
```

`create` requires `--confirm-purchase` and a ready PI. It creates ONLY an
ordinary PI-bound CREATED Instruction, never PENDING and never `bind-pi`.
It returns `manualOpenUrl`, `instructionId`, and `authorizationDeadline`
(epoch milliseconds). Retain all three. Tell the user to complete authorization
in the system browser, avoiding the actual host's built-in browser or the
generic Agent built-in browser when unknown, then run:

```text
<Skill Path>/bin/visa-cli visa browser-open --url "<manualOpenUrl>" --format json
```

Next check immediately, without reopening:

```text
<Skill Path>/bin/visa-cli visa instruction get <purchase-args> \
  --payment-instrument-id <pi> --selection-source <default|explicit> \
  --instruction-id <id> --format json
```

Or wait on that exact ID with the original deadline:

```text
<Skill Path>/bin/visa-cli visa instruction wait <purchase-args> \
  --payment-instrument-id <pi> --selection-source <default|explicit> \
  --instruction-id <id> --authorization-deadline <ms> --format json
```

`get` and `wait` require the same purchase, PI, source, and exact
`--instruction-id`. Both are read-only and never reopen or recreate.
`get` checks immediately. `wait` checks state first and waits at most 600 seconds
(10 minutes), bounded by the original epoch-ms `authorizationDeadline`.
No resume, manual completion, or reopening resets it. Timeout preserves the
same ID for read-only recovery. Require exact ACTIVE state and choose an
eligible Mandate before Step5; CREATED is not authorization.

### Step5: Checkout Once

```text
<Skill Path>/bin/visa-cli visa checkout <purchase-args> \
  --payment-instrument-id <pi> --selection-source <default|explicit> \
  --purchase-instruction-id <id> --mandate-id <id> \
  --confirm-purchase --format json
```

Checkout requires the frozen ready PI and exact-GET verification of the ACTIVE
Instruction and chosen eligible Mandate. Recheck PI/source consistency and
product merchant/product IDs, amount, currency, and availability. Changed facts
require reconfirmation; failed/unknown gates stop.
Invoke checkout directly when its complete authorized context and current gates
are available; it does not require replaying the other commands. The Agent
validates purchase semantics; CLI title/description comparisons are not a gate.

There is no implicit login, card selection, Instruction matching, creation, or
browser opening in Step5. Run one Checkout creation, at most one completion.
Never rerun `visa checkout` after possible Checkout creation:
`--phase checkout_started` refuses repeats and permits only exact returned
read-only recovery. Never clear the phase to retry an uncertain purchase.

The chosen `instructionId` and `mandateId` are CLIENT GATE IDs. The current
UCP complete wire carries PI only; it does not forward these chosen IDs or
prove that the backend consumed that exact Instruction/Mandate. The backend
resolver is unchanged in this scope. Do not claim backend exact-ID enforcement.
Payment and delivery must still be verified and reported separately.

### Visa Preparation

For explicit login-only requests, use `visa init --sandbox --start --no-open`
before or after recommend with no purchase or card context, then report and stop.
For explicit card readiness, invoke Step3 with current authentication; login
only if needed. Neither may create an Instruction, Checkout, or payment.
Continue ready capabilities only within the requested scope, without repeated
purchase confirmation; stop for URL-only card setup,
material changes, ambiguous evidence, refusal, timeout, or unknown results.

## Base Capability Contracts

These capabilities are available through the same Visa Edition bundle for
non-Program requests. They are deliberately concise. Do not expand them into a
general workflow engine.

### CAP-WALLET: Wallet And Config

- Use `wallet status --format json` only for an explicit wallet request or after
  an exact product selection when an authenticated operation is about to begin.
  Never use it to preflight anonymous discovery.
- Use `visa init --sandbox --start --no-open --format json` for standalone login;
  resume with `--sandbox --resume <id> --no-open`. Authorized purchases instead
  use `visa commerce-login` with purchase context. Do not use `wallet init`.
- Use `wallet logout --format json` exactly once for explicit logout.
  It resets Visa-local state in `~/.visa-cli/config.json`; Main CLI state in
  `~/.clink-cli/config.json` is independent. Do not use `visa wallet logout`.
- Use `config get/set` only for requested local settings. Never print secrets
  or switch environment to recover from a network error.

### CAP-CARD: Card Management

- Use `card binding-link`, `setup-link`, `modify-link`, or `passkey-link` only
  for the requested card action. Show the exact link but never pass `--open`,
  Agent-open it, or claim that showing it completed the action.
- During an authorized purchase, use Step3 `visa payment-method resolve`;
  all its card-management and VIC links are URL-only.
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
  the five-step path ending in `visa checkout`; another generic Visa+VIC UCP purchase remains
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
- A normal `instruction create` creates a `CREATED` draft: the Instruction
  exists and is bound to a PI, but is not authorized and cannot be used for
  Checkout. For an explicitly requested standalone Instruction, use the atomic
  capability only with complete authorized inputs and a ready selected/default
  PI. Verify the exact ID is `ACTIVE` after user authorization. This capability
  is not a substitute for Step4's flat `visa instruction create|get|wait`.
- Recurring or scheduled use requires explicit cadence, per-run cap, currency,
  validity horizon, and pinned Instruction plus Mandate IDs. Missing scope
  stops; unattended execution never substitutes another authorization.
- `pending-instruction create` is an explicit atomic/test command only. It
  always creates a new PENDING Instruction and returns its exact ID; it is not
  a normal-purchase fallback and must not be retried blindly.
- If an explicit atomic create returns an unknown result, reconcile read-only
  and stop. An empty recovery list is not proof that creation failed.
- Purchase continuation must not be restored from CLI files. The five-step
  path preserves both PI/source and the exact Instruction/Mandate IDs in the
  current conversation; no latest-ID recovery or replacement.

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
- OAuth Device Authorization is handled by `visa init` and its exact resume,
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
- Whenever the CLI returns `orderUrl`, include a clickable "View order" link in
  the locked language in the purchase result or order-detail reply, without
  another question. The CLI owns its environment and Clink payment-order identity.
  Never build `/transaction/` from a UCP `order.id`, Checkout ID, or the example
  in this Skill. If `orderUrlUnavailable` is returned, explain that the Portal
  link is not available yet; do not invent an ID or retry the purchase.
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
  `recommend-products` snapshot through the five-step path.
- Purchase facts come from the CLI-generated single-item product snapshot;
  the Agent never derives purchase fields from Program metadata.
- New `mode=purchase` contexts never send `program.code`.
- One unchanged purchase authorization is enough; changed facts require a new
  authorization.
- Portal owns binding and VIC. The whole Step3 is URL-only and creates no
  Instruction. Login and Step4 activation are the only purchase browser-open
  operations.
- The Agent owns orchestration and semantic purchase validation. Five independent
  commands do not force a sequence; login before recommend is valid.
- CLI purchase-context validation checks only currency/amount/MCC, not
  title/description. Step4 separately checks technical eligibility; the Agent
  selects a product-matching Mandate. Ambiguous evidence stops without guessing.
- Only frozen PI/source readiness plus exact ACTIVE Instruction/Mandate checks
  permit Step5. Timeout preserves the same ID and original 600-second deadline.
- `visa checkout` is never rerun after possible Checkout creation.
- Instruction/Mandate IDs are client gates; the backend UCP wire still carries
  PI only and the backend resolver is unchanged.
- Generic capabilities execute only with complete, authoritative input and
  fail closed otherwise.
- No payment, Tip, refund, Checkout completion, or Instruction mutation is
  blindly retried.
