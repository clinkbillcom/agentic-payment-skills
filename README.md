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

- broad, category, and merchant-specific Visa Benefit queries joined with
  every registered Visa Benefit Catalog provider through one
  `visa recommend --include-provider-products` aggregate
- constant `VISA_PROVIDER_PRODUCT` typing for every registered provider
  product, with `PROGRAM_PROVIDER_MATCH` only as an optional proven relation
  label and
  `VISA_PROGRAM_ONLY` for unmatched Program rows
- the existing Program purchase path through `product-search`,
  `commerce-login`, and `commerce-run`
- broad non-Visa Catalog discovery for direct shopping requests
- a provider/platform Catalog purchase contract using `commerce-login`
  followed by `commerce-run` with `mode=catalog_purchase`
- one aggregate missing-card contract: create or reuse an exact no-card
  `PENDING` Instruction, optionally show but never auto-open the Bind Card link,
  keep the CLI in the foreground, and continue only after the same card is
  VIC-ready and CWallet activates that exact Instruction

The CLI is the sole authority for the Visa Benefit Catalog provider registry
and provider identity. Visa-related Benefit discovery makes one joined CLI
call; the CLI traverses and paginates providers internally. The Skill never
copies provider entries or assembles those results with a second Catalog or
merchant-list request.

The Skill reads the joined Visa Offer and directly orderable provider-product
collections as authoritative candidate groups. The Agent independently filters
both by the original query's brand, category, geography, product, merchant, and
other hard constraints. Relevant orderable products take presentation priority;
Visa Offers are shown only when no relevant orderable product remains. The
user-facing answer does not expose the internal collection distinction and has no fixed
display template or count. An unrelated provider product is not shown, but its
CLI-returned `directlyOrderable` fact is not changed. Provider products keep
`VISA_PROVIDER_PRODUCT`; `PROGRAM_PROVIDER_MATCH` is preserved only when the
CLI proves the relation.

Joined orderable products expose normalized purchase facts: a localized display
title, provider `sourceTitle`, minor-unit audit amount, major-unit purchase
amount, currency, and availability. Purchase contexts use `sourceTitle` and the
major-unit amount directly, without reinterpreting raw Catalog fields.
Eats365 purchase revalidation uses the exact frozen store and product endpoint,
so it does not depend on broad discovery selecting the same store twice.
Only `channelType` and `storeId` are required platform route fields;
query, duplicate environment, and language metadata are optional.
Eats365 buyer name and E.164 phone are collected before login; the CLI injects
the wallet email and forwards buyer data only to Checkout.

Visa Program, provider, and other Catalog purchases remain CLI-aggregated. The
Skill does not contain runtime workflow JavaScript, long action tables, or
operation references. General wallet, card, risk, payment, Alipay QR, UCP,
Instruction, refund, event, Tip, and Skill installation capabilities remain
short fail-closed contracts in `SKILL.md`.

Skill `0.1.39` vendors Visa CLI `0.2.44` from upstream commit
`70b7a98d532436672cdc905108ac2956b4b650d4`. It supports joined Visa Offer and
provider-product discovery, optional legacy
`program.code`, complete Eats365 `manual_item_facts` revalidation, and
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

Skill version: `0.1.39`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
