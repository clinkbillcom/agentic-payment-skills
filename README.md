# Visa Skill

The UAT Skill exposes five independent commands: recommend products, login,
resolve a payment method, select/authorize an Instruction, and Checkout.
Each has a separate CLI command/file; the Agent owns orchestration, not a
mandatory five-step pipeline. Login before recommend is valid. Login-only
needs no product or purchase authorization and stops after reporting login.
Only login and
Instruction activation may use `visa browser-open` with the exact returned URL.
The entire payment-method step is URL-only, including card management and VIC.
Purchase and order-detail replies include the returned `orderUrl` as a clickable
View order link; never construct a Portal URL from an OMS/UCP order ID.

This branch is the lightweight Visa Skill distribution hosted in
`agentic-payment-skills`.

It ships one Visa Edition bundle:

```text
bin/visa-cli
vendor/visa-cli/visa-cli.bundle.mjs
```

The Visa Edition retains Base Commands and Visa Benefit discovery. The Skill
uses this purchase contract:

```text
visa recommend-products
visa login --environment sandbox [--resume <id>]
visa payment-method resolve --environment sandbox
visa instruction candidates|create|get|wait <purchase-args> <PI/source>
visa checkout <purchase-args> <PI/source> --purchase-instruction-id <id> --mandate-id <id> --confirm-purchase
```

`visa commerce-login` and `visa commerce-run` commands/exports remain
compatibility-only; do not use them as the new path or a fallback.

The lightweight shopping routes cover:

- product, category, merchant, purchase, and Visa Benefit queries through one
  `visa recommend-products` call, which immediately checks every returned
  Program against configured exact internal UCP routes
- Visa recommendation sends taxonomy filters only and no keyword; after
  Program-code merchant matching, the unchanged original query drives that
  merchant's Catalog search; Offer titles remain display only
- no `--include-broad-catalog`, broad query variants, or Catalog fallback
- Agent-selected `recommend-products` filters never infer or pass `--type`
- every filter plan requires region; categories are required for a named
  category/merchant/brand/product and omitted for a generic regional request
- one product with quantity 1; the CLI generates a reusable purchase snapshot,
  including exact amounts and required Instruction fields
- natural-language purchase replies authorize the unchanged displayed order;
  no full-order restatement or repeated confirmation
- HK/CN source changes only on an explicit user request; destination `--region`
  does not change the saved source
- one unified `products` collection plus unmatched `visaBenefits`; a Program
  represented by a product is not displayed twice
- deterministic presentation of orderable products first and relevant Benefits
  second; empty sections are omitted, and no result is reported only when both
  collections are empty
- lightweight Agent relevance filtering removes clearly unrelated products and
  Benefits while preserving plausible aliases and translations
- selected unmatched-Benefit detail through `visa detail`; no repeated
  product-search
- an order invitation only for an exact `internal-ucp-catalog` match; otherwise
  the response ends with the Visa activity introduction and authoritative link
- matched Program purchase directly from the unchanged `recommend-products`
  snapshot through the five steps, without `visa detail`
- direct shopping through the same Visa-only Offer and matched-merchant flow
- Portal owns binding and VIC; show Step3 links without opening them, then
  repeat the same resolve command when the user returns

Initial discovery never uses `--include-provider-products`,
`--include-broad-catalog`, `--broad-queries`, standalone Catalog, or an
Agent-managed merchant-list lookup. It runs Visa recommendation first, loads
the selected environment merchant list once, and routes a Program only when its
exact code equals `ext.visa_program_id`. Only then does it search that merchant
with the original query. A failed or unmatched Program remains a Visa Benefit.
Anonymous discovery executes the installed launcher directly, omits environment
flags, and never probes files, distribution, wallet, or authentication state.

Exact orderable matches are already normalized in `products`, with
major-unit price, currency, availability, merchant identity, and matched
Program provenance. That provenance is never a display source: only
`visaBenefits` may create user-facing Benefit rows. Unmatched Benefits can later
use `visa detail`, but the Skill does not rerun product-search. UAT merchant
`mcht_ftmse61a6az0` is selected only when a returned Program code exactly
matches its merchant-list `ext.visa_program_id`; Offer URLs never select it.
The selected product's CLI-generated `purchaseContext` is passed unchanged as
flat arguments to every Step4/5 command. The Agent does not infer MCC or construct Program-based
purchase fields. Missing configured input is returned as `purchaseContextUnavailable`.

The CLI owns authoritative eligibility checks and execution; the Agent owns
orchestration and semantic purchase validation, including Mandate/product
selection from eligible candidates. `purchase-context-validation.ts` checks
only currency, amount, and MCC, never title/description content or equality.
The Agent interprets those fields and checks product equivalence/restrictions;
CLI argument, PI/VIC, ACTIVE, expiry/usage/recurring, and authoritative
product ID/price/availability checks remain in their command boundaries.
The Skill contains
no runtime workflow JavaScript. General wallet, card, risk, payment, Alipay QR, UCP,
Instruction, refund, event, Tip, and Skill installation capabilities remain
short fail-closed contracts in `SKILL.md`.

Skill `0.1.101` includes Visa CLI `0.2.77` from upstream commit
`4908e9bc8e0bed639eeb5a498c7d38ae3e8b108b`. This product-match branch performs
one-round Visa recommendation followed only by exact configured merchant
matching and matched-merchant Catalog search. The separate
`wujh/visa-offer-product-broad-search-0901` branch adds parallel broad Catalog
on top of this flow. This Skill sends no `program.code` in new purchase
contexts. The official Visa bundle includes the five independent commands.
CLI tests pass 1472/1472 and bundled Skill tests pass 61/61. These are local
regression results, not backend deployment or live payment acceptance.
If a distribution lacks a required command, report the limitation; do not
fall back to legacy orchestration or invent missing purchase data.

## Five-Step Rules

Numbering illustrates one shopping journey, not required invocation history.
Card readiness may be checked without a product; exact get/wait and a fully
prepared checkout may be invoked directly with their required inputs and current
gates. Readiness or nextAction alone never authorizes an unrequested next command.

1. Keep `visa recommend-products` unchanged. Freeze merchant, productId,
   authoritative price/currency, and quantity 1.
2. `visa login` authenticates only, without instructionContext, Quick/PENDING,
   or cards. Return ready or manualOpenUrl; use the exact login resume ID.
   Do not call wallet init.
3. Resolve the persisted default without asking which card. A proactive exact-ID
   choice uses `--payment-instrument-id <id> --selection-source explicit`.
   No card returns bindCardUrl at Portal root; default selection without a
   persisted default returns manageCardUrl;
   supported but incomplete VIC returns vicUrl. Support false/unknown stops
   for manual card management. The ENTIRE Step3 never browser-opens or uses
   `--open`: show the URL and repeat the same command after the user acts.
   Ready freezes BOTH paymentInstrumentId and selectionSource default|explicit
   for Steps 4-5. Every selected card must be VIC-ready. Default changes require
   reconfirmation; explicit alternates persist despite default changes and
   do not require a persisted default.
4. Read-only candidates filters ACTIVE, PI, currency, amount >= purchase,
   MCC, expiry, usage/reserve, and recurring constraints. Return all eligible
   Instructions and eligibleMandates with mandateId, title, description,
   amount/currency/MCC, plus PI. The Agent matches merchant/SKU/denomination/
   region/quantity semantically, including translated titles; ambiguous evidence
   stops without guessing. A match selects both IDs. No match creates ONLY an
   ordinary PI-bound CREATED with `--confirm-purchase`, never PENDING or bind-pi.
   Show the system-browser notice before opening exact manualOpenUrl. Preserve
   instructionId and epoch-ms authorizationDeadline. Get checks immediately;
   wait requires `--instruction-id` and `--authorization-deadline <ms>`, at most
   600 seconds (10 minutes), never resets or recreates.
5. Checkout carries the same flat purchase/PI/source plus both exact IDs and
   confirmation. It exact-GETs ACTIVE Instruction/eligible Mandate, requires a
   ready PI, and revalidates product IDs, amount, currency, availability. No
   implicit login, card selection, matching/create, or browser operation.
   `--phase checkout_started` refuses repeats; only read-only recovery is allowed.

Instruction/Mandate IDs are client gates. The current UCP complete wire carries
PI only and the backend resolver is unchanged; do not claim the chosen IDs were
forwarded or consumed exactly by the backend. PENDING/CREATED are never reused
as another purchase's match. Unknown results never allow a replacement
Instruction or payment retry.

## Requirements

- Node.js 20 or newer
- Invoke the bundled launcher by path; do not use a global CLI
- Complete OAuth, card, Passkey, 3DS, Instruction, and risk pages in the user's
  system browser
- Continue ready steps without repeated purchase confirmation; stop for Step3
  user action, ambiguity, changed facts, timeout, or unknown state; do not expand
  login-only/readiness-only intent into a purchase

## Verification

```bash
npm test
git diff --check
```

Skill version: `0.1.101`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
