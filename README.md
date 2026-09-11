# Visa Skill

During login/run, successful browser opening is silent and the CLI keeps waiting.
Failed or explicitly disabled opening returns `manualOpenUrl` promptly. Show it
once and pause; after the user completes the page, rerun the identical command
only when `rerunAllowed=true`, `resumeMode=same_command`, and `checkoutStarted=false`.
The CLI resumes the existing login or exact Instruction, never a possible Checkout.
Purchase and order-detail replies include the returned `orderUrl` as a clickable
View order link; never construct a Portal URL from an OMS/UCP order ID.

This branch is the lightweight Visa Skill distribution hosted in
`agentic-payment-skills`.

It ships one Visa Edition bundle:

```text
bin/visa-cli
vendor/visa-cli/visa-cli.bundle.mjs
```

The Visa Edition retains all Base Commands and adds Visa Benefit discovery plus
the fast aggregate commerce path:

```text
visa recommend
visa detail
visa taxonomy
visa product-search
visa commerce-login
visa commerce-run
```

The lightweight shopping routes cover:

- product, category, merchant, purchase, and Visa Benefit queries through one
  `visa recommend-products` call, which immediately checks every returned
  Program against configured exact internal UCP routes
- Visa recommendation sends taxonomy filters only and no keyword; after
  Program-code merchant matching, the unchanged original query drives that
  merchant's Catalog search; Offer titles remain display only
- no `--include-broad-catalog`, broad query variants, or Catalog fallback
- Agent-selected `recommend-products` filters never infer or pass `--type`
- every filter plan requires region and one or more OR-combined categories;
  other taxonomy axes are used only when explicitly requested
- one product with quantity 1; the CLI generates a reusable purchase snapshot,
  including exact amounts and required Instruction fields
- natural-language purchase replies authorize the unchanged displayed order;
  no full-order restatement or repeated confirmation
- automatic HK/CN source persistence from a unique `visa recommend --region`,
  with explicit `--market` reserved for cross-source searches
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
  snapshot through `commerce-login` and `commerce-run`, without `visa detail`
- direct shopping through the same Visa-only Offer and matched-merchant flow
- Portal owns binding and VIC; CLI never opens Bind Card. Card/VIC/Passkey
  waits are capped at 10 minutes and exit through `visa pending-instructions`
  recovery; unknown/in-progress ceremonies must not trigger another automatic
  opening

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
The selected product's CLI-generated `purchaseContext` is used unchanged by
both purchase commands. The Agent does not infer MCC or construct Program-based
purchase fields. Missing configured input is returned as `purchaseContextUnavailable`.

Visa Program purchases remain CLI-aggregated. The
Skill does not contain runtime workflow JavaScript, long action tables, or
operation references. General wallet, card, risk, payment, Alipay QR, UCP,
Instruction, refund, event, Tip, and Skill installation capabilities remain
short fail-closed contracts in `SKILL.md`.

Skill `0.1.85` vendors Visa CLI `0.2.65` from upstream commit
`25458a7d20d4cdecfc6ea3ef5c3053924ccb7a80`. This product-match branch performs
one-round Visa recommendation followed only by exact configured merchant
matching and matched-merchant Catalog search. The separate
`wujh/visa-offer-product-broad-search-0901` branch adds parallel broad Catalog
on top of this flow. This Skill sends no `program.code` in new purchase
contexts. The bundle is unchanged in this rules-only update; the contract
below is not a claim of new CLI runtime acceptance or backend deployment.

The vendored bundle was refreshed through the official `clink-cli`
synchronization flow. If another distribution does not implement the required
purchase-snapshot contract, it must report the limitation instead of inferring
missing purchase data or decomposing the purchase into atomic commands.

## Quick Instruction Contract

- At Quick creation, an eligible selected VIC-ready Visa card yields a CREATED
  Quick bound to its `paymentInstrumentId`, without activation; otherwise the
  new Quick is PENDING. LOGIN and REGISTER both support these outcomes.
- The legacy response field `pendingInstructionId` carries an ID, not a status.
  Use the actual Instruction `status` from the response and exact-GET;
  never infer PENDING from the field name. Preserve existing matching Quicks
  as-is; do not relabel a historical PENDING when card readiness changes.
- Login saves the original ID and returns ready for CREATED, PENDING, or ACTIVE
  without waiting for activation. `commerce-run` owns continuation.
- CREATED opens the CLI-returned
  `/passkey-auth/{pi}?type=visa&instructionId={ORIGINAL_QUICK_ID}` URL immediately,
  with the original Quick ID and its bound `paymentInstrumentId`.
  Do not wait for binding or VIC or substitute a different card. Portal's
  existing `/sign` activates that same original ID.
- Card binding, VIC, and Passkey waits are capped at 10 minutes. Binding
  failure, a non-VIC card, and an unfinished Passkey cannot be told apart; only
  the timeout counts as failure and every case exits through the same
  recovery: follow the `commerce-run` `recovery` object or run
  `visa pending-instructions --instruction-id {ORIGINAL_QUICK_ID}`.
  `activation_ready` opens the original ID's Passkey URL directly with the
  bound/default/unique VIC-ready card; `card_selection_required` asks the user
  which card in `cards[]` to use; `portal_binding_required` and
  `select_in_portal` return the `{agent portal}/agent-authorization` list link
  where the user re-binds, picks, and activates; `instruction_not_activatable`
  and `none_pending` mean exact-GET the original ID, never pick another. No VIC
  URL, Bind Card link, or Portal home page is the exit.
- A historical PENDING with a VIC-ready card opens the original ID's exact
  CLI Passkey URL without binding wait or replacement.
- ACTIVE reuses the original ID without another authorization. Another matching
  ACTIVE never replaces an existing Quick. Checkout requires exact-GET proof
  of the original Quick ACTIVE and bound to the same VIC-ready card.
- With an existing Quick, create zero additional Instructions in every case.
  Without a Quick, normal matching ACTIVE reuse and ordinary Instruction
  creation remain unchanged. Do not discard a Quick ID to enter that path.
- Only the CLI opens authorization pages. Success waits silently; failure
  returns the original exact manual link. An explicitly permitted pre-Checkout
  rerun preserves the same command, context, and ID with zero creates.
  Possible Checkout creation permits read-only recovery only.

Maintainers: the regression matrix is in
[quick-instruction-cases.md](references/quick-instruction-cases.md); rule changes
are recorded first in [change-log.md](references/change-log.md). These are
maintenance references, not extra runtime steps.

## Requirements

- Node.js 20 or newer
- Invoke the bundled launcher by path; do not use a global CLI
- Complete OAuth, card, Passkey, 3DS, Instruction, and risk pages in the user's
  system browser
- Login and purchase continue without another conversation checkpoint; browser
  authorization stays in Portal, and only a failed opener needs a fallback link

## Verification

```bash
npm test
git diff --check
```

Skill version: `0.1.85`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
