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

The CLI is the sole authority for the Visa Benefit Catalog provider registry
and provider identity. Visa-related Benefit discovery makes one joined CLI
call; the CLI traverses and paginates providers internally. The Skill never
copies provider entries or assembles those results with a second Catalog or
merchant-list request.

The Skill reads the joined Visa Offer and directly orderable provider-product
collections as authoritative candidate groups. The Agent independently filters
both by the original query's brand, category, geography, product, merchant, and
other hard constraints, then organizes the relevant results without a fixed
display template or count. An unrelated provider product is not shown, but its
CLI-returned `directlyOrderable` fact is not changed. Provider products keep
`VISA_PROVIDER_PRODUCT`; `PROGRAM_PROVIDER_MATCH` is preserved only when the
CLI proves the relation.

Visa Program, provider, and other Catalog purchases remain CLI-aggregated. The
Skill does not contain runtime workflow JavaScript, long action tables, or
operation references. General wallet, card, risk, payment, Alipay QR, UCP,
Instruction, refund, event, Tip, and Skill installation capabilities remain
short fail-closed contracts in `SKILL.md`.

Skill `0.1.33` vendors Visa CLI `0.2.36` from upstream commit
`9cc700b840ba383a04fd295c1b0c680bee674636`. It supports joined Visa Offer and
provider-product discovery, optional legacy
`program.code`, complete Eats365 `manual_item_facts` revalidation, and
`mode=catalog_purchase`; this Skill sends no `program.code` in new purchase
contexts. Vendor provenance is refreshed only through the official `clink-cli`
synchronization flow. An incompatible installation must stop instead of
falling back to Program mode or atomic payment commands.

## Requirements

- Node.js 20 or newer
- Invoke the bundled launcher by path; do not use a global CLI
- Complete OAuth, card, Passkey, 3DS, Instruction, and risk pages in the user's
  system browser

## Verification

```bash
npm test
git diff --check
```

Skill version: `0.1.33`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
