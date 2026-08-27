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

- broad, category, and merchant-specific Visa Benefit queries joined with the
  paginated Fuhui internal Catalog
- explicit `EXACT_MATCH`, `BENEFIT_ONLY`, and `CATALOG_ONLY` classification
- the existing Program purchase path through `product-search`,
  `commerce-login`, and `commerce-run`
- broad non-Visa Catalog discovery for direct shopping requests
- a Catalog-only purchase contract using `commerce-login` followed by
  `commerce-run` with `mode=catalog_purchase`

Visa Program and Catalog-only purchases remain CLI-aggregated. The Skill does
not contain runtime workflow JavaScript, long action tables, or operation
references. General wallet, card, risk, payment, Alipay QR, UCP, Instruction,
refund, event, Tip, and Skill installation capabilities remain short
fail-closed contracts in `SKILL.md`.

The vendored Visa CLI `0.2.32` supports `mode=catalog_purchase`. The Skill
still stops instead of falling back to Program mode or atomic payment commands
when an older or incompatible installation rejects that mode.

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

Skill version: `0.1.27`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
