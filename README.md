# clink-payment-skill

A Claude Code skill for Clink payment operations — wallet, card, payment, public-skill listing/tipping/installation, VIC agentic authorization, refund, and risk rules via `clink`.

## Requirements

- Node.js >= 20
- The skill ships a vendored CLI bundle at `vendor/clink-cli/clink-cli.bundle.mjs` and exposes it as `clink` through `bin/clink`, which pins `wallet init` to production
- Always invoke `bin/clink` **by path**. A globally installed `clink` or `clink-cli` on `PATH` can be a different, unpinned build, and every build shares the same global `~/.clink-cli/config.json` — so an unpinned build that initialized against UAT leaves this distribution reading a UAT `baseUrl` for every later command
- New wallet initialization uses OAuth Device Authorization and derives the name from the email text before `@`; an existing complete legacy CSK wallet remains supported only if that local wallet has never completed OAuth authorization

## Install Clink Payment Skills

Ask your agent to install the current Clink Payment Skills package:

```text
Install Clink Payment Skills: https://github.com/clinkbillcom/agent-payment-skills
```

After installation, the agent must immediately continue with wallet initialization instead of waiting for another command:

1. Run `clink wallet status --format json`. If the wallet is already ready (OAuth or complete legacy CSK), report readiness and stop.
2. Otherwise ask the user for their email address (the only required input; the display name is derived from the email text before `@`).
3. Run `clink wallet init --email <email> --no-open --format json`, send the verification URL from the process's live stderr to the user exactly once, keep that same process running, and wait for the user to complete browser authorization.
4. When init succeeds with a non-empty `bindingUrl`, proactively send that card-binding URL as the next step.

## What It Does

Once installed, Claude can handle Clink payment operations on your behalf:

- Wallet readiness checks
- Card binding and management
- Payment execution (direct and session mode)
- Tippable skill discovery with `clink skills list --all --tippable`, rendered as exactly Number, publisher, and Skill name with headers matching the user's language
- Explicitly authorized USD tips with `clink skills tip` by publisher/name without a version, or by resolving a Number from the same-context list displayed within two hours; synchronous agent-pay success is payment success, while optional `account-created` / `account-reloaded` events only enrich the result
- Explicitly authorized public Skill installs with `clink skills install publisher/name[@version]`: omit version for latest, use `@version` for an exact release, or resolve a Number from the newest same-context two-hour list and confirm the frozen publisher/name/version before installation
- VIC agentic authorization preparation (Visa readiness check, instruction reuse/create draft, Passkey URL for page-driven signing)
- UCP checkout for product orders — parse product-page facts with `clink tool parse-item`, select one available item, classify fulfillment, require a complete standard shipping address for shipped physical goods, resolve Visa/VIC authorization when required, then call `clink tool internal-ucp get-endpoint` with the product URL. A configured endpoint uses internal checkout; only `NOT_IN_INTERNAL_UCP_LIST` falls back to `/.well-known/ucp-clink` plus `get-rest-endpoint`, where provider `clinkbill` uses internal checkout and other providers or discovery failures use external checkout
- Refund submission and polling
- Risk rule configuration
- Event-driven async completion — waits for Clink event-hub webhooks (card binding, refund result, VIC activation, post-3DS order) via the CLI's built-in link watch or `clink events poll`, instead of guessing or busy-retrying

## Skill Structure

`SKILL.md` contains routing and safety rules. Command-level details live under `references/`, following the same "read the operation reference before running the CLI" pattern used by the Lark skills.

For product checkout, read `references/clink-ucp-checkout.md` before running `clink tool parse-item`, `clink instruction list`, or `clink ucp-checkout create/complete`.

For public skill listing or tipping, read `references/clink-skill-tip.md` before running `clink skills list --all --tippable` or `clink skills tip`. A Number is resolved only from the same user/session/environment snapshot displayed within two hours, then executed as publisher/name without a version. Without a valid snapshot, the agent lists Skills and requires confirmation before payment.

For public Skill installation, read `references/clink-skill-install.md` before running `clink skills install`. Direct publisher/name installs use latest by omitting version; publisher/name@version installs the exact release. Number installs use the newest scoped snapshot from the same user/session/environment within two hours and require confirmation before execution.
