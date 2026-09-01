# clink-payment-skill

A Claude Code skill for Clink payment operations — wallet, card, payment, public-skill listing/tipping/installation, Visa/Mastercard strong-auth agentic authorization, refund, and risk rules via `clink`.

## Requirements

- Node.js >= 20
- The skill ships a vendored CLI bundle at `vendor/clink-cli/clink-cli.bundle.mjs` and exposes it as `clink` through `bin/clink`, which pins `wallet init` to production
- Always invoke `bin/clink` **by path**. A globally installed `clink` or `clink-cli` on `PATH` can be a different, unpinned build, and every build shares the same global `~/.clink-cli/config.json` — so an unpinned build that initialized against UAT leaves this distribution reading a UAT `baseUrl` for every later authenticated command
- New wallet initialization uses OAuth Device Authorization and derives the name from the email text before `@`; an existing complete legacy CSK wallet remains supported only if that local wallet has never completed OAuth authorization

## Install Clink Payment Skills

Ask your agent to install the current Clink Payment Skills package:

```text
Install Clink Payment Skills: https://github.com/clinkbillcom/agentic-payment-skills
```

After installation, route the user's complete semantic intent before touching the wallet. New Catalog/payment callers construct the versioned contract in `references/clink-payment-intent-contract.md`; they do not authorize purchase from regexes, keywords, raw text, legacy booleans, or ambient payment fields. A product search runs anonymously with `walletGate=SKIP`, and described-product purchase discovery uses `DEFER_UNTIL_SELECTION`; neither runs `wallet status` or `wallet init`.

Use this status-first setup path only when the validated route returns `walletGate=REQUIRE_STATUS`: immediately for an explicit wallet operation, or after anonymous discovery and user selection when a resolved purchase enters checkout/payment. A purchase description alone is not a reason to initialize the wallet.

1. Run `clink wallet status --format json`. If the wallet is already ready (OAuth or complete legacy CSK), report readiness and stop.
2. Otherwise ask the user for their email address (the only required input; the display name is derived from the email text before `@`).
3. Run `clink wallet init --email <email> --open --format json`. Keep reading the same process until it prints `Waiting for authorization...`; this activates OAuth device-token polling, not Event Hub listening. If the CLI requested a system-browser launch, tell the user to complete authorization there; show the URL only after both browser-launch failure and the wait marker. Never start `events poll` for OAuth.
4. When init succeeds with `paymentMethodsCached=true`, `paymentMethodCount=0`, and a non-empty `bindingUrl`, treat the init URL only as a signal that first-card binding is next. Start `clink card binding-link --no-open --format json` with its built-in watch enabled. Its first envelope is delayed until the scoped watch's first poll succeeds and contains a trusted Agent Portal `/payment-method-setup` `bindingUrl` with only an optional encoded `email` query, plus `watchReady=true` and `watchEventType=payment_method.added`; then you **must return that watched `bindingUrl` to the user** while keeping the same process waiting for the matching event. Do not end the flow at OAuth-ready or omit the link. A positive count means the wallet is already card-ready; a cache-refresh error does not undo successful OAuth login.

An explicit request to log in again, reauthorize, replace an expired link, or recover after missing the earlier login always starts a fresh `wallet init`. The new attempt supersedes the old one, and the agent must never reuse a login URL from chat history or earlier terminal output.

## Build The Fallback Release Artifact

The fallback package for Clink CLI auto-installation is generated from a clean Git checkout:

```bash
npm run build:fallback-artifact
```

This writes two ignored release files under `dist/`:

- `agentic-payment-skill.zip`, with the single package root `agentic-payment-skills/`
- `agentic-payment-skill.manifest.json`, the schema-v1 integrity and provenance sidecar

The ZIP is derived directly from the committed Git `HEAD` tree and keeps every tracked regular file except the root `docs/` and `tests/` trees. It therefore includes `SKILL.md`, `package.json`, both README files, `.gitignore`, and the complete runtime directories without admitting local ignored files. Symbolic links, submodules, special entries, and source-owned `.clink-install.json` or `.clink-provenance.json` files make the build fail.

The build uses the source commit timestamp for deterministic ZIP metadata. Set standard `SOURCE_DATE_EPOCH` when release infrastructure needs an explicit timestamp. No signing key or other private key is required. Publish the resulting pair together as:

```text
https://www.clinkbill.com/public/skills/agentic-payment-skill.zip
https://www.clinkbill.com/public/skills/agentic-payment-skill.manifest.json
```

`archiveSha256` hashes the exact ZIP bytes. `contentSha256` is the installer-compatible canonical tree hash: SHA-256 starts with `clink-skill-tree-v1\0`, then processes every regular file after pruning in POSIX-path order using UTF-8 byte comparison. Each record is `path + NUL + executable-bit + NUL + byte-size + NUL + file-bytes + NUL`; the executable bit is `1` when any Unix execute bit is set, otherwise `0`. Installer-owned `.clink-install.json` and `.clink-provenance.json` are excluded from this tree hash.

For the two fixed public URLs, publish and invalidate the ZIP first, confirm that its public byte size and SHA-256 match the new manifest, and publish the manifest last. Invalidate both CDN paths together and run a public download check before announcing the release. Never expose a new manifest while the public ZIP still serves another generation; the CLI deliberately fails closed on that mismatch.

## What It Does

Once installed, Claude can handle Clink payment operations on your behalf:

- Wallet readiness checks
- Explicit fresh wallet login and reauthorization
- Card binding and management
- Payment execution (direct and session mode)
- Agent Alipay QR payments: render a CLI-generated character QR directly in the terminal, fall back to the private PNG when needed, wait for the correlated success/failure event, and recursively clean up the temporary directory on every terminal result
- Semantic v2 intent routing with derived wallet gates: anonymous public Catalog discovery does not read wallet state or `~/.clink-cli/config.json`; purchase discovery also remains anonymous until one candidate is semantically authorized and selected. Candidate numbers identify products but never authorize purchase by themselves. The agent chooses the Catalog result language from conversation intent and passes the frozen BCP47 tag with `--language`; query text and the backend do not guess it
- Tippable skill discovery with `clink skills list --all --tippable`, rendered as exactly Number, publisher, and Skill name with headers matching the user's language
- Explicitly authorized USD tips with `clink skills tip` by publisher/name without a version, or by resolving a Number from the same-context list displayed within two hours; synchronous agent-pay success is payment success, while optional `account-created` / `account-reloaded` events only enrich the result
- Explicitly authorized public Skill installs with `clink skills install publisher/name[@version]`: omit version for latest, use `@version` for an exact release, or resolve a Number from the newest same-context two-hour list and confirm the frozen publisher/name/version before installation
- Strong-auth agentic authorization preparation (`strongAuthReady` plus `authProtocol=VISA|MASTERCARD`, instruction reuse/create draft, protocol-specific Passkey URL for page-driven signing)
- UCP checkout for product orders — parse and freeze one item, classify fulfillment, require a complete standard shipping address for shipped physical goods, resolve Visa/Mastercard strong-auth authorization, then use `clink tool internal-ucp get-endpoint`. Only `NOT_IN_INTERNAL_UCP_LIST` falls back to `get-rest-endpoint`; every provider, including `clinkbill` and non-clinkbill providers, must resolve to a canonical HTTPS endpoint whose origin exactly matches successful current wallet-status evidence. After the runtime atomically claims one unique `checkoutAttemptId`, execute one foreground `clink ucp-checkout run ... --confirm-purchase --format json` under the frozen `CLINK_BASE_URL`; read-only resumes retain that environment lock. Digital delivery alone adds `--wait-delivery --max-wait 900`; the agent never manually chains create, complete, event polling, or delivery polling
- Refund submission and polling
- Risk rule configuration
- Event-driven async completion — waits for Clink event-hub webhooks (card binding, refund result, strong-auth readiness/instruction activation, post-3DS order) via the CLI's built-in link watch or `clink events poll`, instead of guessing or busy-retrying

## Pages The User Must Open Themselves

Different agents install this skill, and some drive a browser of their own. OAuth device verification, card binding/setup/modify, Visa/Mastercard Passkey registration and signing, instruction update/cancel, the 3DS challenge, and the risk-rule page must be completed by the user in their own browser — not opened, navigated, previewed, screenshotted, or filled by an agent browser, headless browser, browser MCP, computer-use, or embedded webview. Passkey pages cannot succeed in an agent browser at all: WebAuthn needs the user's own platform authenticator. Merchant product pages are the opposite case and remain agent work.

Because completion is proven by a webhook event rather than by anything the browser reports, the user may finish on any browser or device — including a phone — and the flow still converges. `references/clink-browser-handoff.md` holds the per-page contract, and `lib/page-handoff.mjs` classifies each URL before it is sent.

An Agent Alipay QR is not one of these pages. The Skill invokes `clink pay` with `--terminal-qr`, preserves the CLI's UTF-8 character QR, and keeps the local `image/png` file action as fallback. It never opens that file in Agent Browser, prints Base64, or exposes raw QR content. The Skill starts the order-event wait immediately and recursively removes the caller-owned cleanup directory after success, failure, expiry, timeout, or polling error.

## Skill Structure

`SKILL.md` contains routing and safety rules. Command-level details live under `references/`, following the same "read the operation reference before running the CLI" pattern used by the Lark skills.

For Catalog/payment routing, read `references/clink-payment-intent-contract.md` first. It defines the semantic v2 envelope, Direct/Session Pay scope, and `SKIP` / `DEFER_UNTIL_SELECTION` / `REQUIRE_STATUS` wallet gates.

For product checkout, read `references/clink-ucp-checkout.md` before running `clink tool parse-item`, `clink instruction list`, or the one aggregate `clink ucp-checkout run` command. Keep that command in the foreground; do not query `--help` at runtime, sleep, background it, or split it into manual create/complete/wait steps.

For public skill listing or tipping, read `references/clink-skill-tip.md` before running `clink skills list --all --tippable` or `clink skills tip`. A Number is resolved only from the same user/session/environment snapshot displayed within two hours, then executed as publisher/name without a version. Without a valid snapshot, the agent lists Skills and requires confirmation before payment.

For public Skill installation, read `references/clink-skill-install.md` before running `clink skills install`. Direct publisher/name installs use latest by omitting version; publisher/name@version installs the exact release. Number installs use the newest scoped snapshot from the same user/session/environment within two hours and require confirmation before execution.
