# Visa Skill

During login/run, use the Host's early running-result mechanism: show the CLI's
`manualOpenUrl` before the next wait, then observe the same command without restarting.
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
- Portal owns binding and VIC; CLI never opens Bind Card. It may open existing
  card-only VIC once for a verified pre-browser unready card; new cards and
  unknown/in-progress state only wait

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

Skill `0.1.75` vendors Visa CLI `0.2.59` from upstream commit
`a55dea14b8562c30b47722e82b4cc1338a77ced1`. This product-match branch performs
one-round Visa recommendation followed only by exact configured merchant
matching and matched-merchant Catalog search. The separate
`wujh/visa-offer-product-broad-search-0901` branch adds parallel broad Catalog
on top of this flow. This Skill sends no `program.code` in new purchase
contexts. The aggregate missing-card flow waits for Portal on one exact PENDING
Instruction, with conditional existing-card VIC opening and no new Portal route, and continues after same-card
`visaRegistrationSucceeded=true` plus exact-Instruction `ACTIVE`.

The vendored bundle was refreshed through the official `clink-cli`
synchronization flow. If another distribution does not implement the required
purchase-snapshot contract, it must report the limitation instead of inferring
missing purchase data or decomposing the purchase into atomic commands.

## Requirements

- Node.js 20 or newer
- Invoke the bundled launcher by path; do not use a global CLI
- Complete OAuth, card, Passkey, 3DS, Instruction, and risk pages in the user's
  system browser
- Login and purchase execution have brief advance notices, not repeated purchase
  confirmations; card binding and VIC remain in Portal

## Verification

```bash
npm test
git diff --check
```

Skill version: `0.1.75`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
