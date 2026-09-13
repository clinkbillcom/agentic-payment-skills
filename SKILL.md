---
name: visa-skill
description: "Visa Skill 0.1.93. Use for consumer payments and commerce even when Visa is not named: pay/支付/付款, buy or order/购买/下单/订购, place an order/点单/点餐, checkout, shopping/购物, coupons/优惠券, vouchers/代金券, discounts/优惠, benefits/权益, gift cards, merchant offers, product discovery, and Visa card benefits. Supports en, zh-CN, zh-TW, and zh-HK. Do not use for travel visas, immigration, passports, or consular applications."
metadata:
  version: "0.1.93"
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
`visa recommend-products`, `visa product-search`, `visa commerce-login`,
`visa commerce-run`, `visa pending-instructions`, and `visa browser-open`
commands.

Keep normal execution small. Do not read reference files, inspect source or
workflow scripts, invoke runtime `--help`, run `date`, use a fixed `sleep`, or
load JavaScript orchestration modules. Interpret the user's intent, collect only
missing business facts, obtain the required authorization, run the shortest
matching CLI capability, and report the structured result.

### Aggregate Failure Diagnosis

Normal successful execution does not read references. When an aggregate command
returns an error, partial coverage, user-action state, or a non-terminal result,
read only the reference matching that command:

| Command | Reference |
| --- | --- |
| `visa recommend` | `references/visa-recommend.md` |
| `visa recommend-products` | `references/visa-recommend-products.md` |
| `visa product-search` | `references/visa-product-search.md` |
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

Only after the user selects an exact product and authorizes an authenticated
purchase may the Skill verify that wallet and purchase environments agree and
write the verified environment into purchase contexts.

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
  With an existing Quick, create zero additional Instructions in every case.
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
belong in the user's system browser. For commerce-login and commerce-run, the
aggregate returns the exact operation URL and continuation state before opening
it. Use `visa browser-open --url <operation-url>` for a separate system-browser
attempt; do not use the Agent's built-in browser.

For commerce-login and commerce-run, when a user browser operation is needed,
the aggregate returns the exact operation URL and continuation state first. Tell
the user to complete it in the system browser and never in the Agent built-in
browser. If the host Agent name is known, replace `{agent}` with that name. If
it is unknown, say `请在系统浏览器中完成操作，不要使用 Agent 内置浏览器。`
and never emit the literal placeholder.

Then use the dedicated browser-open operation to attempt the system browser:

```text
<Skill Path>/bin/visa-cli visa browser-open --url "<operation-url>" --format json
```

A successful launch is not business success. After automatic opening, continue
with the original command and check its operation state. If the user completed
the operation manually, continue with the original command and mark the manual
completion; the first step is an authoritative status check and the browser
must not be opened again. A failed launch returns the exact URL for manual use.
A closed page is not business failure. Unknown payment or authorization
results stop the flow and require read-only recovery.
Never kill/restart an unrelated running command or use shell background jobs.
After possible Checkout creation, only CLI-returned read-only recovery is
allowed.
Without these explicit continuation fields, do not infer that a command is safe
to rerun. After possible Checkout creation, only CLI-returned read-only recovery
is allowed. Browser opening success is not proof that the page appeared on a phone;
if the user reports that mismatch, explain it rather than claiming failure detection.

For standalone card-link requests, show but never auto-open an exact CLI-returned Bind Card
link. The user may click it or use an already-open Agent Portal. Never inspect,
fill, or submit protected pages with an Agent browser. Merchant product pages
may be inspected by the Agent.

An Alipay QR is not a browser page. Display the CLI-rendered terminal QR
exactly, or use the CLI-returned private `imagePath` only when terminal QR
rendering is unavailable. Never expose or reconstruct QR payloads or Base64.

### Quick Instruction Principles

For every authorized purchase:

- Freeze one purchase context and one selected PI. Use the default PI unless
  the user explicitly chooses an alternate PI; do not infer a default from the
  first, only, newest, or VIC-ready card.
- Query only the selected PI's Instructions. Reuse only a complete, usable,
  unconsumed `ACTIVE` Instruction whose amount, currency, merchant/product
  scope, MCC, expiry, recurrence, and Mandates match the frozen context.
- If no reusable ACTIVE exists, create a new ordinary PI-bound Instruction
  when the selected PI has completed VIC; otherwise create a new PENDING
  Instruction for the exact selected PI and purchase operation.
- Never reuse PENDING or CREATED as another purchase's match. The PENDING
  `instructionId` stays fixed through VIC, Passkey, and activation.
- If no default PI exists, do not choose a card implicitly. Create the pending
  purchase operation, return Agent Portal card management, and re-read the
  default after the user acts. An explicit alternate PI may be used without
  making it default.
- A default PI change stops a default-based purchase and requires
  reconfirmation. An explicit alternate remains selected only while it is still
  customer-owned and usable.
- Binding, VIC readiness, Passkey authorization, and PENDING activation are one
  user-operation wait stage capped at 10 minutes. Timeout never creates a
  replacement Instruction or retries Checkout/payment.
- Browser launch success is not business success. After `browser-open`, rerun
  with `--browser-opened` to wait; after manual completion, rerun with
  `--manual-completed` to check status first without reopening.
- Before Checkout, verify the exact Instruction is ACTIVE and re-check the
  selected PI/default rule. A changed default PI stops a default-based purchase
  and requires reconfirmation. Checkout is created and completed at most once;
  never repeat either operation.

- Card/VIC readiness uses `GET /agent/cwallet/card/info`.
  `cardSchemeRegistrationEnabled` means that a Visa card supports VIC;
  `visaRegistrationSucceeded` or card-level `strongAuthRegistered` means VIC
  is complete. These facts are separate. Capability false, unknown, or a
  failed card-info read must not enter VIC or Checkout.

The direct `POST /agent/cwallet/instructions/pending` capability is a
non-idempotent Pending creator. It always creates one new PENDING Instruction;
it does not match or reuse ACTIVE/PENDING/CREATED, select a card, or turn a
VIC-ready card into CREATED. Normal purchase orchestration must check the
selected PI's matching ACTIVE Instructions first and use the aggregate's
ordinary or Pending branch instead of blindly calling this creator.

These principles are the complete Skill-facing Quick contract. Detailed state
combinations and regression cases belong in the development Skill, not here.

### Pending Instruction Recovery

Run `visa pending-instructions [--open] [--instruction-id <id>]
[--payment-instrument-id <id>] [--format json]` after any `commerce-run`
not-ready exit (stages card, vic, card_selection, card_verification,
instruction_activation, instruction_authorization), when the user returns to
finish or activate an earlier purchase, or when the user reports a binding,
VIC, or Passkey problem. The CLI reads `GET /agent/cwallet/instructions/activatable`
(the current PENDING/CREATED Instructions that can still be activated), refreshes cards,
and returns one `status` from `activation_ready`, `card_selection_required`,
`portal_binding_required`, `instruction_not_activatable`, `select_in_portal`,
or `none_pending`, always with `context` (`exact` or `unknown`) and `portalUrl`,
plus `instructionId`, `instructionStatus`, `paymentInstrumentId`, `card`,
`cards[]`, `pendingInstructions[]`, `activationUrl`, `browserLaunch`,
`manualOpenUrl`, `reason`, and `nextAction` as applicable. Exact context is
`--instruction-id`, else the pending row matching a saved Quick continuation,
else the only pending row. Pass `--instruction-id` whenever the original Quick
ID is known; pass `--payment-instrument-id` only with the card the user chose
from `cards[]`. The command creates nothing and mutates nothing; only its
`--open` may open the browser. Tell the user plainly what the status means:
which Instruction is waiting, which card the CLI opened, which cards to choose
from, or that the list page is where they pick and activate. Never construct
the Passkey or Portal URL, never present the Portal home page as the
activation link, and never fall back to creating or selecting another
Instruction.

There are two distinct activation paths:

- If the user only binds a card and completes VIC without choosing an
  Instruction, backend continuation may activate exactly one PENDING
  Instruction: the newest PENDING row by descending `createTime`. This is not
  Agent selection; exact-GET the resulting ID and verify `ACTIVE` before
  Checkout.
- If the user actively chooses a PENDING Instruction, preserve that exact ID
  and use the normal `bind-pi -> ordinary activation` flow. Do not reinterpret
  this as automatic latest-PENDING activation or replace the Instruction.

`GET /agent/cwallet/instructions/activatable` is a read-only recovery/list
contract for both cases. It does not itself select, bind, or activate an
Instruction.

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
- Every initial product, category, merchant, buy/order/checkout, and Benefit request
  uses the same Visa-first aggregate. It never runs broad Catalog. "我想下单咖啡",
  "有咖啡的券吗", and "有哪些咖啡权益" differ only by taxonomy filters.
- Never route initial shopping discovery directly to `catalog search`.

Use Program aggregation after the one-round result contains an exact orderable
product selected by the user:

```text
visa recommend-products -> exact product selection and purchase authorization
-> visa commerce-login -> visa commerce-run
```

An already authorized selection proceeds directly to commerce-login with the
unchanged snapshot. Do not search again or ask to order again.

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

## Visa Purchase Fast Path

An explicit request to buy one unambiguous selected product is the single
purchase authorization. The short replies in Authorization And Input are valid.
This path supports one product with quantity 1 only. For a multi-item or
multi-quantity request, explain this limit; never silently reduce the quantity
or split the purchase into several orders.

After authorization, use the latest unchanged `recommend-products` snapshot
directly in `visa commerce-login`; never run or refresh `visa detail`. If the
snapshot is missing or invalidated, stop and return to discovery.

Require `PRODUCT_VERIFIED`, `CONTINUE_TO_COMMERCE_LOGIN`, and
`productResolution=internal-ucp-catalog`. Keep that selected row's
`purchaseContext` unchanged in memory. It uses `mode=selected_product` and
contains the single-item facts already displayed to the user. Do not create a
local JSON file just to pass context between CLI commands.

Do not build an Instruction context, infer MCC, copy Program fields, or
recalculate amounts. The CLI constructs and validates these inputs. If
`purchaseContext` is absent, report `purchaseContextUnavailable`; do not
invent the missing data or use `visa detail` to repair it.

After the user's purchase request, start login once without another conversation
checkpoint. Before the command, say once in the locked language:
"现在启动登录流程，可能打开浏览器登录页面。" An already-ready login does not
need another login page. This is a notice, not a question; execute immediately:

```text
<Skill Path>/bin/visa-cli visa commerce-login \
  --context '<purchase-context-json>' \
  --confirm-purchase \
  --format json
```

The command returns before browser opening when user action is required. Show the
exact operation URL, tell the user to use the system browser rather than the
Agent built-in browser, then run `visa browser-open --url <operation-url>`.
After a successful launch, rerun this command with `--browser-opened`. If the
user completed the operation manually, rerun it with `--manual-completed`; the
CLI checks status first and does not reopen the browser. Do not copy
login-returned Instruction IDs into the purchase context.

When login is ready, immediately run commerce-run once with the same inline
JSON context, without asking for authorization or another user reply. Browser authorization
is completed on the opened page, not through a conversation checkpoint.
Before the command, say once in the locked language:
"登录已就绪，直接执行购买流程，可能打开浏览器授权页面。" Then execute immediately:

```text
<Skill Path>/bin/visa-cli visa commerce-run \
  --context '<purchase-context-json>' \
  --confirm-purchase \
  --format json
```

The CLI owns card refresh, waiting for Portal VIC readiness, restricted-category enforcement,
original Quick continuation (or normal Instruction selection only without a Quick),
product revalidation, one Checkout creation, at most one completion,
non-retriable payment handling, and bounded delivery waiting.
The command returns before browser opening when user action is required. Use
`visa browser-open --url <operation-url>` for a system-browser attempt, then
rerun with `--browser-opened` to wait. For a user-completed operation, rerun
with `--manual-completed` so the CLI checks status first without reopening.
Missing/changed facts, a real error, refusal, cancellation, or timeout require
a user-facing interruption.

After `commerce-login` creates a Quick Instruction, apply the Quick Instruction
Card Gate: preserve the exact ID in every card/VIC state. Never create another
Instruction merely because a wait timed out, a card became VIC-ready, or
another ACTIVE Instruction exists.
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
  --context '<frozen-context-json>' \
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
- `pending-instruction create` is an explicit atomic/test command only. It
  always creates a new PENDING Instruction and returns its exact ID; it is not
  a normal-purchase fallback and must not be retried blindly.
- If that non-idempotent create returns an unknown result, reconcile with the
  read-only `activatable` query first. Retry at most once only when the
  expected new Instruction is not found; otherwise stop and preserve the
  identified Instruction.

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
  `recommend-products` snapshot directly in the purchase aggregates.
- Purchase facts come from the CLI-generated single-item product snapshot;
  the Agent never derives purchase fields from Program metadata.
- New `mode=purchase` contexts never send `program.code`.
- One unchanged purchase authorization is enough; changed facts require a new
  authorization.
- Portal owns binding and VIC; the CLI never opens Bind Card. Timed-out card,
  VIC, or Passkey waits (10 minutes) exit through the pending-instruction
  recovery, never through a VIC URL or the Portal home page.
- Only same-card VIC readiness plus exact-Instruction `ACTIVE` permits
  Checkout; timeout permits only the bound read-only continuation.
- `visa commerce-run` is never rerun after possible Checkout creation.
- Generic capabilities execute only with complete, authoritative input and
  fail closed otherwise.
- No payment, Tip, refund, Checkout completion, or Instruction mutation is
  blindly retried.
