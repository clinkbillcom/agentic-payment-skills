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

Visa Program purchases remain CLI-aggregated. The Skill does not contain
runtime workflow JavaScript, long action tables, or operation references.
General wallet, card, risk, Catalog, payment, Alipay QR, UCP, Instruction,
refund, event, Tip, and Skill installation capabilities are expressed as
short fail-closed contracts in `SKILL.md`.

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

Skill version: `0.1.26`

Vendored CLI provenance is recorded in
`vendor/visa-cli/package.json`. The generated bundle must be updated only by
the official `clink-cli` vendor synchronization flow.
