# Visa Skill

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
- automatic HK/CN source persistence from a unique `visa recommend --region`,
  with explicit `--market` reserved for cross-source searches
- one unified `products` collection plus unmatched `visaBenefits`; a Program
  represented by a product is not displayed twice
- deterministic presentation of orderable products first and relevant Benefits
  second; empty sections are omitted, and no result is reported only when both
  collections are empty
- selected unmatched-Benefit detail through `visa detail`; no repeated
  product-search
- an order invitation only for an exact `internal-ucp-catalog` match; otherwise
  the response ends with the Visa activity introduction and authoritative link
- the existing matched Program purchase path through `commerce-login` and
  `commerce-run`
- no Catalog-only initial shopping route; direct shopping uses the same Visa
  aggregate and this branch intentionally has no broad Catalog discovery
- a non-Program Catalog purchase contract using `commerce-login`
  followed by `commerce-run` with `mode=catalog_purchase`
- one aggregate missing-card contract: create or reuse an exact no-card
  `PENDING` Instruction, optionally show but never auto-open the Bind Card link,
  keep the CLI in the foreground, and continue only after the same card is
  VIC-ready and CWallet activates that exact Instruction

Initial discovery never uses `--include-provider-products` or an Agent-managed
merchant-list lookup. The aggregate anonymously loads the selected environment
merchant list once and routes a Program only when its exact code equals
`ext.visa_program_id`. A failed or unmatched resolution remains a Visa Benefit.
This branch does not run broad Catalog fallback for a Visa Benefit request.
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

Skill `0.1.58` vendors Visa CLI `0.2.49` from upstream commit
`82cbcc474ac6c7d1b66f0061646f3f5c978779e2`. It uses one-round Visa
recommendation and exact configured internal product matching, optional
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

Skill version: `0.1.58`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
