# Visa Skill

This branch is the lightweight Visa Skill distribution hosted in
`agentic-payment-skills`.

It is the `wujh/visa-offer-product-match-0901` flow plus parallel broad
Catalog search. The product-match branch stops after Visa Offer discovery,
exact Program-code merchant matching, and that merchant's Catalog search;
this branch additionally searches all-channel Catalog in parallel.

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
- Visa recommendation sends taxonomy filters only and no keyword; one unchanged
  original query drives matched-merchant Catalog search and the first broad
  Catalog search; Offer titles remain display metadata only
- Agent-selected `recommend-products` filters never infer or pass `--type`
- every filter plan requires region and one or more OR-combined categories;
  other taxonomy axes are used only when explicitly requested
- login and purchase mandates use `product.totalAmountMajor`; minor-unit
  Catalog amounts are never copied into `amountLimit`
- automatic HK/CN source persistence from a unique `visa recommend --region`,
  with explicit `--market` reserved for cross-source searches
- one unified `products` collection plus unmatched `visaBenefits`; a Program
  represented by a product is not displayed twice
- deterministic presentation of orderable products first and relevant Benefits
  second; empty sections are omitted, and no result is reported only when both
  collections are empty
- lightweight Agent relevance filtering removes clearly unrelated products and
  Benefits while preserving plausible aliases and translations
- parallel all-channel Catalog search whose available products merge into that
  same collection without source grouping
- URL-less internal broad products retained only when their exact merchant ID
  matches the environment-locked provider registry; the registry supplies the
  merchant URL and endpoint used for exact product revalidation
- selected unmatched-Benefit detail through `visa detail`; no repeated
  product-search
- an order invitation only for an exact `internal-ucp-catalog` match; otherwise
  the response ends with the Visa activity introduction and authoritative link
- matched Program purchase directly from the unchanged `recommend-products`
  snapshot through `commerce-login` and `commerce-run`, without `visa detail`
- direct shopping through the same Visa recommendation plus parallel broad
  Catalog discovery; no Catalog-only initial route
- a Catalog purchase contract using `commerce-login`
  followed by `commerce-run` with `mode=catalog_purchase`
- one aggregate missing-card contract: create or reuse an exact no-card
  `PENDING` Instruction, optionally show but never auto-open the Bind Card link,
  keep the CLI in the foreground, and continue only after the same card is
  VIC-ready and CWallet activates that exact Instruction

Initial discovery never uses `--include-provider-products` or an Agent-managed
merchant-list lookup. It starts all-channel Catalog search in parallel with Visa
recommendation, anonymously loads the selected environment merchant list once,
and routes a Program only when its exact code equals `ext.visa_program_id`.
Linked and broad products share one products collection; a failed or unmatched
Program resolution remains a Visa Benefit.
Anonymous discovery executes the installed launcher directly, omits environment
flags, and never probes files, distribution, wallet, or authentication state.

Exact orderable matches are already normalized in `products`, with
major-unit price, currency, availability, merchant identity, and matched
Program provenance. That provenance is never a display source: only
`visaBenefits` may create user-facing Benefit rows. Unmatched Benefits can later
use `visa detail`, but the Skill does not rerun product-search. UAT merchant
`mcht_ftmse61a6az0` is selected only when a returned Program code exactly
matches its merchant-list `ext.visa_program_id`; Offer URLs never select it.
For a verified Program purchase, a valid Program MCC remains authoritative.
When it is missing, the Skill may classify one high-confidence MCC from the
complete frozen merchant/product context. The exact UAT Wellcome gift-card
route above uses MCC `5411`; malformed/conflicting Program MCCs and
low-confidence or title-only guesses still stop before login.

For a registered URL-less broad product, the Skill preserves the exact returned
product ID and provider-registry provenance, never invents an item URL, and
requires `mode=catalog_purchase` to revalidate through the registered Catalog
product API before any purchase mutation. Unregistered URL-less rows remain
excluded.

Eats365 purchase revalidation uses the exact frozen store and product endpoint,
so it does not depend on broad discovery selecting the same store twice.
Only `channelType` and `storeId` are required platform route fields;
query, duplicate environment, and language metadata are optional.
Eats365 buyer name and E.164 phone are collected before login; the CLI injects
the wallet email and forwards buyer data only to Checkout.

Visa Program and other Catalog purchases remain CLI-aggregated. The
Skill does not contain runtime workflow JavaScript, long action tables, or
operation references. General wallet, card, risk, payment, Alipay QR, UCP,
Instruction, refund, event, Tip, and Skill installation capabilities remain
short fail-closed contracts in `SKILL.md`.

Skill `0.1.70` vendors Visa CLI `0.2.56` from upstream commit
`8b1b3ca579f2b83d2549163e63b056b9d13dbf30`. It uses one-round Visa
recommendation, exact configured internal matching, and parallel broad Catalog,
optional
legacy `program.code`, complete Eats365 `manual_item_facts` revalidation, and
`mode=catalog_purchase`; this Skill sends no `program.code` in new purchase
contexts. It also requires the aggregate missing-card flow to show rather than
auto-open a Bind Card link, remain in the foreground after showing it, wait on
one exact PENDING Instruction, and continue only after same-card
`visaRegistrationSucceeded=true` plus exact-Instruction `ACTIVE`.

The vendored bundle was refreshed through the official `clink-cli`
synchronization flow. If another distribution does not implement the required
missing-card contract, the installation is incompatible and must stop instead
of opening a card/VIC page, returning after a link, falling back to Program
mode, or decomposing the purchase into atomic commands.

## Requirements

- Node.js 20 or newer
- Invoke the bundled launcher by path; do not use a global CLI
- Complete OAuth, card, Passkey, 3DS, Instruction, and risk pages in the user's
  system browser
- A Bind Card link may be displayed, but the CLI must not auto-open it or stop
  waiting for the same PENDING Instruction after displaying it

## Verification

```bash
npm test
git diff --check
```

Skill version: `0.1.70`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
