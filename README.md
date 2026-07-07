# clink-payment-skill

A Claude Code skill for Clink payment operations — wallet, card, payment, VIC agentic authorization, refund, and risk rules via `clink-cli`.

## Requirements

- Node.js >= 20
- The skill ships a vendored `clink-cli` bundle at `vendor/clink-cli/clink-cli.bundle.mjs`; a global `clink-cli` install is optional for local debugging
- `clink-cli` config file at `~/.clink-cli/config.json` with a valid `customerId` and `customerApiKey`

## Install Clink Payment Skills

Ask your agent to install the current Clink Payment Skills package:

```text
Install Clink Payment Skills: https://github.com/clinkbillcom/agent-payment-skills
```

After installation, the agent will guide you through the remaining setup.

## What It Does

Once installed, Claude can handle Clink payment operations on your behalf:

- Wallet readiness checks
- Card binding and management
- Payment execution (direct and session mode)
- VIC agentic authorization preparation (Visa readiness check, instruction reuse/create draft, Passkey URL for page-driven signing)
- UCP checkout for product orders — parse product-page facts with `clink-cli tool parse-item`, select one available item, classify fulfillment, require a US shipping address for shipped physical goods, use CWallet address shape for instruction creation and UCP Postal Address shape for checkout/payment context, resolve Visa/VIC instructions only when required, route known standard UCP domains such as `www.bruceleeclub.com` separately from external checkout, create checkout, then complete it with a payment instrument
- Refund submission and polling
- Risk rule configuration
- Event-driven async completion — waits for Clink event-hub webhooks (card binding, refund result, VIC activation, post-3DS order) via the CLI's built-in link watch or `clink-cli events poll`, instead of guessing or busy-retrying

## Skill Structure

`SKILL.md` contains routing and safety rules. Command-level details live under `references/`, following the same "read the operation reference before running the CLI" pattern used by the Lark skills.

For product checkout, read `references/clink-ucp-checkout.md` before running `clink-cli tool parse-item`, `clink-cli instruction list`, or `clink-cli ucp-checkout create/complete`.
