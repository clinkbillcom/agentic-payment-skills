# clink-payment-skill

A Claude Code skill for Clink payment operations — wallet, card, payment, refund, and risk rules via `clink-cli`.

## Requirements

- Node.js >= 20
- `clink-cli` installed and configured — see the [clink-cli setup guide](https://github.com/clinkbillcom/agentic-payment-skills)
- `clink-cli` config file at `~/.clink-cli/config.json` with a valid `customerId` and `customerApiKey`

## Install the Skill

```bash
# Personal (all projects)
git clone https://github.com/clinkbillcom/agentic-payment-skills ~/.claude/skills/clink-payment-skill

# Project-level (current project only)
git clone https://github.com/clinkbillcom/agentic-payment-skills .claude/skills/clink-payment-skill
```

The skill is available to your Claude agent immediately after cloning.

## What It Does

Once installed, Claude can handle Clink payment operations on your behalf:

- Wallet readiness checks
- Card binding and management
- Payment execution (direct and session mode)
- Refund submission and polling
- Risk rule configuration
