# Browser Page Handoff

Read this before emitting any URL a person has to act on: OAuth device verification, card binding/setup/modify, Visa Passkey registration or signing, instruction update/cancel, a 3DS redirect, or a risk-rule link.

## Why This Boundary Exists

This skill is installed by many different host agents. Some drive a browser themselves — a built-in browser, a headless Chromium over CDP, a browser MCP server, computer-use, an embedded webview — and some habitually preview or unfurl any link they see. On merchant product pages that capability is exactly right and this skill depends on it. On Clink's own pages and on Visa's pages it breaks the flow, and for two of them it cannot possibly succeed:

- **Passkey pages (registration and signing).** WebAuthn requires a platform authenticator bound to the user's device keychain, scoped to the relying-party origin. An agent browser has none. The only way to make one "work" is a CDP virtual authenticator, which forges precisely the proof the page exists to collect. Even when a credential is created in an agent browser profile, it does not exist in the user's own browser, so later signing fails there.
- **3DS challenge.** The issuer ACS fingerprints the device and scores automation; the one-time code reaches the user's phone. An agent browser gets soft-declined or stepped up.
- **Card binding/setup/modify.** The page collects a card number. An agent that reads or fills it moves the PAN into model context and agent logs.
- **OAuth device verification.** An agent load races the user's page load and triggers duplicate verification-code sends or resend throttling.
- **Any of them, opened by the CLI.** Browser launch happens on the host where `clink` runs. `wallet init --open` is an explicit system-browser handoff; all other link commands remain suppressed with `--no-open`.

The fix is not to support every browser. It is to label each URL with who must act on it, and to keep every automatic-open path closed.

## What Makes This Host-Agnostic Already

Completion of these flows is proven by a webhook event, never by anything a browser reports — see `references/clink-async-events.md`. The listener starts the moment the URL is emitted, so a user who opens the link on a phone, on a second machine, or hours later still converges.

That is the real portability guarantee: the skill does not care which browser the user chose. So do not add browser-side verification to "confirm the page opened". There is nothing to confirm, and looking is the failure mode.

## Actor Model

Classify every URL with `classifyPageHandoff` from `lib/page-handoff.mjs` before sending it. `kind` comes from the command that produced the URL; `resolvePageHandoffKind` recognizes only the two shapes that are identifiable from the string alone (a `/passkey-auth/` path and an OAuth URL carrying `user_code`).

| Actor | Meaning |
| --- | --- |
| `USER_DEVICE_ONLY` | Only the user, in their own browser on their own device. No agent navigation of any kind. |
| `USER_PREFERRED` | No secret is entered, but the decision is the user's. Still do not automate it. |
| `AGENT_ALLOWED` | The agent's browser is the correct tool. |

| Page | Kind | Actor | Completion event |
| --- | --- | --- | --- |
| OAuth device verification (`wallet init` live stderr) | `OAUTH_DEVICE_VERIFICATION` | `USER_DEVICE_ONLY`, single load | none; the original init process polls the OAuth device-token endpoint and resolves |
| First card binding (`card binding-link`) | `CARD_BINDING` | `USER_DEVICE_ONLY` | `payment_method.added` |
| Add a payment method (`card setup-link`) | `CARD_SETUP` | `USER_DEVICE_ONLY` | `payment_method.added` / `payment_method.updated` |
| Manage payment methods (`card modify-link`) | `CARD_MODIFY` | `USER_DEVICE_ONLY` | `payment_method.updated` / `payment_method.default_change` |
| Visa Passkey registration (`https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa`) | `VIC_PASSKEY_REGISTRATION` | `USER_DEVICE_ONLY` | `vic_device.binding_succeeded` / same-card `payment_method.updated` |
| Mandate signing (`instruction create` / `sign-url` `passkeyUrl`) | `INSTRUCTION_PASSKEY_SIGNING` | `USER_DEVICE_ONLY` | `purchase_instruction.activated` |
| Authorization update/cancel page (`instruction update` / `cancel`) | `INSTRUCTION_AGENT_PAGE` | `USER_DEVICE_ONLY` | flow-specific |
| 3DS challenge (`pay` exit 7 `redirectUrl`) | `THREE_DS_CHALLENGE` | `USER_DEVICE_ONLY`, single load | `agent_order.succeeded` / `agent_order.failed` |
| Risk-rule config (`risk link`) | `RISK_RULE_CONFIG` | `USER_PREFERRED` | `risk_rule.updated` |
| Merchant product page (`parse-item`, catalog fallback) | `MERCHANT_PRODUCT_PAGE` | `AGENT_ALLOWED` | none |

## Agent-Side Prohibition

For any non-`AGENT_ALLOWED` URL, the agent must not open, navigate, preview, prefetch, unfurl, screenshot, extract, fill, submit, or "verify the page loads" — through a built-in browser, a headless browser, CDP/Playwright/Puppeteer, a browser MCP server, computer-use or screen control, an embedded webview, or link preview/unfurling.

Naming the channels matters. A host agent driving a browser MCP does not classify `navigate` as "opening a browser"; it classifies it as checking. A prohibition phrased only as "do not open the browser" reads as permission.

Never satisfy a Passkey page with a CDP virtual authenticator, and never fabricate the payloads behind it (`authResult`, `appInstance`, `fidoBlob`, `dfpSessionId`). A forged signature is worse than a stalled flow.

`AGENT_ALLOWED` is not weakened by any of this: product exploration through browser, MCP, or page extraction stays required where the checkout and catalog flows call for it.

## CLI-Side Suppression

Pass `--open` on every `wallet init` invocation. Pass `--no-open` on every other link-producing command:

`card binding-link`, `card setup-link`, `card modify-link`, `risk link`, `instruction create`, `instruction sign-url`, `instruction update`, `instruction cancel`.

`--no-open` is a global flag and overrides both `--open` and the stored `default-open-links`. It suppresses browser launch only; it does not touch the built-in event watch, which `--no-watch` controls separately and which must stay on.

Do not rely on the stored default being `false`. It lives in the machine-wide config every build shares (`~/.clink-cli/config.json`, see `references/clink-cli-invocation.md`), so one earlier `config set default-open-links true` — from this skill's host or any other build — silently re-arms host-side auto-open for all of those commands. Check it once per workflow:

```bash
clink config get --format json
```

If `defaultOpenLinks` is `true`, either turn it off or treat `--no-open` as mandatory on every link command other than `wallet init` for the rest of the workflow:

```bash
clink config set default-open-links false --format json
```

## Handoff Payload

The skill cannot know whether the host renders clickable links, runs in a terminal, posts to a chat surface, or is read on a phone. For every `USER_DEVICE_ONLY` and `USER_PREFERRED` page other than OAuth while `wallet init --open` manages the system-browser request, emit:

1. The URL **verbatim on its own line** — no shortening, re-encoding, origin reduction, or dropped query/fragment.
2. One line telling the user to open it in **their own browser, not this agent's browser**.
3. What they will do there, in one clause (enter the emailed code, enter the card, approve with Face ID / Touch ID / Windows Hello, enter the code from their bank).
4. Nothing about waiting for them to report back — the listener is already running.

Offering to continue on a phone is often right rather than a fallback: Passkey approval and 3DS codes usually live there. A QR rendering of the same URL is a legitimate transfer channel when the host can display one.

The trusted card-setup `bindingUrl` returned by `wallet init` is not yet a handoff payload because init obtained it through a refresh whose Event Hub watch is disabled. Only when that refresh also reports `paymentMethodsCached=true` and `paymentMethodCount=0` should you launch `card binding-link --no-open --format json` without `--no-watch`. After the new command's first envelope reports an official Agent Portal HTTPS URL with the exact `/payment-method-setup` path, no fragment, and no query except one optional non-empty `email` parameter, plus `data.watchReady=true` and `data.watchEventType=payment_method.added`, proving the first scoped Event Hub poll succeeded while the same process remains alive, you **must hand that watched URL to the user**. Do not omit the link or return only OAuth success. A positive count already has a card, and a refresh error is not evidence that binding is required.

`OAUTH_DEVICE_VERIFICATION`, `CARD_BINDING`, `CARD_SETUP`, `CARD_MODIFY`, and `THREE_DS_CHALLENGE` are single-load pages. For OAuth, `DEFER_OAUTH_TO_WALLET_WORKFLOW` keeps the URL hidden unless the browser launch reports failure; then emit it once through `SHOW_OAUTH_VERIFICATION_URL_AND_WAIT`. Emit the other single-load URLs exactly once and never re-send any of them as a nudge. A second load can invalidate a one-time token or re-trigger code sending.

## Unattended Runs

`classifyPageHandoff` returns `SURFACE_BROWSER_HANDOFF_GAP` whenever `unattended: true` or `userReachable: false` meets a page a human must complete. Stop the run and report which authorization is missing. Do not emit the URL into an empty room and report the run as waiting.

This is why VIC authorization is collected before a schedule exists (`references/clink-instruction.md`): a correctly prepared scheduled run never reaches a browser page at all. Reaching one means the pre-authorization step was skipped or its instruction is no longer usable.

## FSM Contract

| Action | Required behavior |
| --- | --- |
| `DEFER_OAUTH_TO_WALLET_WORKFLOW` | Do not emit the OAuth URL. Let `classifyWalletInitObservation` keep it hidden after a system-browser request or surface it once after a reported launch failure. |
| `HANDOFF_TO_USER_DEVICE` | Emit the non-OAuth verbatim URL once with the handoff payload above, keep the built-in watch or `events poll` running, and do not touch the page from the agent runtime by any channel. |
| `HANDOFF_TO_USER_BROWSER` | Same handoff and same listener; the page holds no secret entry, but the agent still must not complete it on the user's behalf. |
| `ALLOW_AGENT_BROWSER` | Merchant/product page. Use browser, MCP, or page extraction normally; no handoff and no event watch. |
| `SURFACE_BROWSER_HANDOFF_GAP` | No human can act — unattended run or no user channel. Report the missing authorization and stop. Do not emit the URL, do not create a draft, do not substitute another mandate. |
| `SURFACE_PAGE_HANDOFF_ERROR` | The URL's kind is unknown or unsupported, so its actor cannot be established. Surface that instead of guessing; an unlabeled URL must never default to agent-openable. |

## Rules

- Label the URL before sending it; an unlabeled URL is not sendable.
- `--open` on `wallet init`, `--no-open` on every other link command, and verify `defaultOpenLinks` once per workflow.
- Never automate a `USER_DEVICE_ONLY` page through any channel, including "just checking that it loads".
- Never use a virtual authenticator or fabricated Passkey payload.
- Emit non-OAuth single-load URLs exactly once; emit OAuth only once after a reported system-browser launch failure.
- Proof of completion is the event, never the browser.
- An unattended run that needs a browser page is a reported gap, not a wait.
