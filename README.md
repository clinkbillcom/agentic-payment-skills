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

- broad, category, and merchant-specific Visa Benefit queries through one
  Visa-only `visa recommend` call with no initial UCP or Catalog request
- one all-channel UAT `catalog search` fallback when Visa returns no relevant
  Program; the bounded result can include Eats365 products such as coffee
- selected-Benefit detail through `visa detail`, followed by one token-free
  `product-search` check against internal UCP
- an order invitation only for an exact `internal-ucp-catalog` match; otherwise
  the response ends with the Visa activity introduction and authoritative link
- the existing matched Program purchase path through `commerce-login` and
  `commerce-run`
- broad Catalog discovery for direct shopping requests
- a Catalog purchase contract using `commerce-login`
  followed by `commerce-run` with `mode=catalog_purchase`
- one aggregate missing-card contract: create or reuse an exact no-card
  `PENDING` Instruction, optionally show but never auto-open the Bind Card link,
  keep the CLI in the foreground, and continue only after the same card is
  VIC-ready and CWallet activates that exact Instruction

Initial Visa discovery never uses `--include-provider-products`. The Agent
filters only the returned Visa Programs against the original request. When no
relevant Visa Program remains, it runs one anonymous broad Catalog search with
the same query, language, geography, and UAT environment. Broad Catalog search
checks every channel when the user did not constrain one, but it is a bounded,
non-exhaustive result window rather than a complete inventory export.

After the user selects a Visa Benefit, the Skill fetches its authoritative Visa
detail and activity link. A merchant commerce URL may then be checked through
`visa product-search`. Only an exact internal UCP Catalog match with complete
identity, price, currency, and availability may produce an order prompt.
External-page resolution, no match, or incomplete facts produce activity-only
presentation with no purchase call to action. UAT additionally recognizes only
`https://vsrp.hk/p/o5s` as a CLI-owned alias for merchant
`mcht_ftmse61a6az0`; no other path on that host inherits the mapping.
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

Skill `0.1.43` vendors Visa CLI `0.2.43` from upstream commit
`de1327a837d40f99db5e5a01e99f84e5fc7eed93`. It uses Visa-only recommendation,
internal-UCP-gated Program ordering, Visa-miss broad Catalog fallback, optional
legacy `program.code`, complete Eats365 `manual_item_facts` revalidation, and
`mode=catalog_purchase`; this Skill sends no `program.code` in new purchase
contexts. It also requires the aggregate missing-card flow to show rather than
auto-open a Bind Card link, remain in the foreground after showing it, wait on
one exact PENDING Instruction, and continue only after same-card
`visaRegistrationSucceeded=true` plus exact-Instruction `ACTIVE`.

The vendored bundle and its provenance are intentionally unchanged in this
branch. They may be refreshed only through the official `clink-cli`
synchronization flow. Until a synchronized CLI implements the required
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

Skill version: `0.1.43`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
