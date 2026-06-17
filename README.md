# clink-payment-skill

A Claude Code skill for Clink payment operations — wallet, card, payment, VIC agentic authorization, refund, and risk rules via `clink-cli`.

## Requirements

- Node.js >= 20
- `clink-cli` installed and configured — see the [Clink Payment Skills setup guide](https://github.com/clinkbillcom/agent-payment-skills)
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
- Refund submission and polling
- Risk rule configuration
- Event-driven async completion — waits for Clink event-hub webhooks (card binding, refund result, VIC activation, post-3DS order) via the CLI's built-in link watch or `clink-cli events poll`, instead of guessing or busy-retrying
