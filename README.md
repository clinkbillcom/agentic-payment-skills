# clink-payment-skill

A Claude Code skill for Clink payment operations — wallet, card, payment, public-skill listing/tipping/installation, VIC agentic authorization, refund, and risk rules via `clink-cli`.

## Requirements

- Node.js >= 20
- The skill ships a vendored `clink-cli` bundle at `vendor/clink-cli/clink-cli.bundle.mjs`; a global `clink-cli` install is optional for local debugging
- New wallet initialization uses OAuth Device Authorization and derives the name from the email text before `@`; an existing complete legacy CSK wallet remains supported only if that local wallet has never completed OAuth authorization

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
- Tippable skill discovery with `clink-cli skills list --all --tippable`, rendered as exactly Number, publisher, and Skill name with headers matching the user's language
- Explicitly authorized USD tips with `clink-cli skills tip` by publisher/name without a version, or by resolving a Number from the same-context list displayed within two hours; synchronous agent-pay success is payment success, while optional `account-created` / `account-reloaded` events only enrich the result
- Explicitly authorized public Skill installs with `clink-cli skills install publisher/name[@version]`: omit version for latest, use `@version` for an exact release, or resolve a Number from the newest same-context two-hour list and confirm the frozen publisher/name/version before installation
- VIC agentic authorization preparation (Visa readiness check, instruction reuse/create draft, Passkey URL for page-driven signing)
- UCP checkout for product orders — parse product-page facts with `clink-cli tool parse-item`, select one available item, classify fulfillment, require a complete standard shipping address for shipped physical goods, resolve Visa/VIC authorization when required, then call `clink-cli tool internal-ucp get-endpoint` with the product URL. A configured endpoint uses internal checkout; only `NOT_IN_INTERNAL_UCP_LIST` falls back to `/.well-known/ucp-clink` plus `get-rest-endpoint`, where provider `clinkbill` uses internal checkout and other providers or discovery failures use external checkout
- Refund submission and polling
- Risk rule configuration
- Event-driven async completion — waits for Clink event-hub webhooks (card binding, refund result, VIC activation, post-3DS order) via the CLI's built-in link watch or `clink-cli events poll`, instead of guessing or busy-retrying

## Skill Structure

`SKILL.md` contains routing and safety rules. Command-level details live under `references/`, following the same "read the operation reference before running the CLI" pattern used by the Lark skills.

For product checkout, read `references/clink-ucp-checkout.md` before running `clink-cli tool parse-item`, `clink-cli instruction list`, or `clink-cli ucp-checkout create/complete`.

For public skill listing or tipping, read `references/clink-skill-tip.md` before running `clink-cli skills list --all --tippable` or `clink-cli skills tip`. A Number is resolved only from the same user/session/environment snapshot displayed within two hours, then executed as publisher/name without a version. Without a valid snapshot, the agent lists Skills and requires confirmation before payment.

For public Skill installation, read `references/clink-skill-install.md` before running `clink-cli skills install`. Direct publisher/name installs use latest by omitting version; publisher/name@version installs the exact release. Number installs use the newest scoped snapshot from the same user/session/environment within two hours and require confirmation before execution.
