# Wallet, Config, Card, And Risk Commands

Read this before wallet setup, local config work, card readiness checks, payment-method management, or risk-rule links.

## Wallet Setup

Select and lock the `clink` environment during wallet initialization (see `references/clink-cli-invocation.md`). Wallet init requires the email; the display name is optional:

```bash
clink wallet init --email <email> --open --format json
```

The CLI derives the display name from the email text before `@`. There is no `--name` flag on `wallet init`; passing it exits 2. Use `config set name` to change the local name afterwards.

This distribution pins `wallet init` to production, so `--sandbox` and `--test` exit 2 here; other distributions pin sandbox/UAT or test the same way. The selected environment is saved, so later commands carry no environment flag. Verify it through `wallet status` and use credentials that belong to that environment, never mixing production with sandbox/UAT/test credentials.

Before the ordinary status-first setup path, classify wallet-login language with `classifyWalletIntent` from `lib/wallet-intent-fsm.mjs`. An affirmative request such as `重新登录`, `再登录一次`, `重新授权钱包`, `登录链接过期了`, `忘记登录了`, `log in again`, or `fresh login link` is `WALLET_RELOGIN`: start a fresh init even if `wallet status` is ready or an older init is pending. Prefer an email stated in the current request, then the current wallet-status email; ask only for email when neither exists. Negated, questioned, hypothetical, historical, and bug/test discussion language starts no command.

`START_FRESH_WALLET_INIT` always creates one new process. The CLI records that generation and cancels an older wallet-init attempt, so do not preserve or resend any earlier login URL. Capture stderr from the new child process rather than terminal scrollback or chat history. Do not start another init merely to recover the URL for the same active attempt; explicit re-login, expiry, or terminal process exit is what authorizes a fresh attempt.

`wallet init` starts OAuth Device Authorization and polls until authorization completes. Always pass `--open`; it requests that the system browser handle the authorization URL. The original process prints live progress to stderr. Stream that stderr while the process is running.

When the current process prints `Complete authorization in your browser:` followed by `Opening your browser...`, keep reading progress without repeating the URL or claiming either that a visible window was confirmed or that login monitoring is active. Only after the current attempt also prints the complete `Waiting for authorization...` marker may you set `oauthDevicePollActive=true`, tell the user the CLI requested the system browser, and ask them to complete email verification and click Confirm while keeping that same token-polling process alive. If browser launch fails, wait for that same marker, then read the verified URL only from the latest `Starting wallet login; this attempt takes precedence over any earlier one.` segment of the process's live stderr and send it once. This is OAuth device-token polling, not Event Hub listening; never start `events poll` for it. Do not navigate to, preview, or prefetch the URL with an Agent browser — built-in, headless, CDP/Playwright/Puppeteer, a browser MCP server, computer-use, an embedded webview, or link unfurling all count and can trigger duplicate verification-code sends or resend throttling. The user completes email verification and confirmation in the browser; never ask them to send an OTP to the agent and never add `--otp`.

Successful initialization stores `customerId`, `email`, `name`, an environment-bound OAuth authorization, and sticky `oauthRequired=true` in the single local config. Final init output requires `hasAuthorization=true`, `authorizationType=oauth`, `hasCustomerApiKey=false`, and a non-empty `customerId`; it no longer echoes `oauthRequired`. Use `wallet status` to classify the persisted credential policy. The CLI refreshes expiring Access Tokens and atomically rotates Refresh Tokens. Never read, print, copy, or refresh either token directly.

After OAuth succeeds, `wallet init` calls the card binding-link endpoint only to refresh cached payment methods. It rebuilds the returned URL on the trusted Agent Portal origin with the exact `/payment-method-setup` path and only the optional configured `email` query, but this internal refresh runs with its event watch disabled. Never emit that unprotected init copy. Only `paymentMethodsCached=true` plus `paymentMethodCount=0` and a non-empty `bindingUrl` is exact evidence that first-card binding is next. Start a fresh `clink card binding-link --no-open --format json` process without `--no-watch`; it scopes a watch to `payment_method.added` and delays its first JSON envelope until the first Event Hub poll succeeds. When that envelope has the trusted `/payment-method-setup` `data.bindingUrl` with no query except one optional non-empty `email`, `data.watchReady=true`, `data.watchEventType=payment_method.added`, and the same process remains alive, you must return that watched link to the user; do not end the workflow after OAuth success. Keep the process running for the matching second envelope and do not start a competing `events poll`. A positive count means a card already exists, so return ready without starting first-card binding even if init returned a URL. If refresh fails, report `paymentMethodsCacheError` without inventing a URL or undoing successful OAuth initialization.

Classify live stderr and final init output with `classifyWalletInitObservation` from `lib/wallet-workflow-fsm.mjs`:

- `WAIT_FOR_WALLET_INIT_PROGRESS`: keep the original process running and do not show the URL while stderr is incomplete or the browser-open result has not been reported.
- `TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT`: use only after the current attempt prints both `Opening your browser...` and `Waiting for authorization...`; return `oauthDevicePollActive=true`. The original process is polling the OAuth device-token endpoint, not Event Hub. Do not show the URL or claim the page opened; ask the user to complete email verification and click Confirm, keep that process alive, and do not start `events poll`.
- `SHOW_OAUTH_VERIFICATION_URL_AND_WAIT`: use only after browser-launch failure plus the current attempt's complete `Waiting for authorization...` marker; return `oauthDevicePollActive=true`. Read the URL only from that attempt's live stderr, send it once, keep the same OAuth polling process alive, and do not start `events poll`.
- `RETURN_WALLET_PLAN`: report `--dry-run` as planned, not initialized.
- `START_WATCHED_CARD_BINDING`: accept the final OAuth evidence above only with `paymentMethodsCached=true`, `paymentMethodCount=0`, and a non-empty `bindingUrl`; keep `walletReady=true`, set `bindingUrlRequired=true`, and do not emit the unprotected init copy or mark the workflow terminal. Start the watched binding command first, require its `watchReady=true` handshake, then return its watched `bindingUrl` as a mandatory handoff.
- `RETURN_WALLET_READY`: accept the final OAuth evidence when a card already exists or exact first-card evidence is absent; do not require an `oauthRequired` field from `wallet init`, and do not turn `paymentMethodsCacheError` into a login failure.
- `SURFACE_ERROR`: return the terminal CLI error without inventing recovery.

## Quick Instruction Setup

When a frozen purchase intent meets an uninitialized wallet, first run `classifyInstructionRestriction` over the complete intent and its nested `instructionContext`; only `CONTINUE_INSTRUCTION_CREATION` may proceed. Then pass the instruction context through `clink wallet init` so login, first-card binding, and instruction activation can complete in one browser journey. Context flags: `--title`, `--description`, `--mandates`, `--is-recurring`, `--shipping-address`, `--effective-until-time`. When any context flag is present, `--title` and `--mandates` become required together. `wallet init` deliberately rejects `--payment-instrument-id` and `--extra`: no card exists yet, and the unauthenticated entry point keeps its input surface tight.

Assemble the context from the frozen purchase intent: `--title` from the product name, mandate `amountLimit` from the order total, `currencyCode` from the order currency, a short mandate `description` of what the purchase covers, and merchant name/category from the merchant context. Title must be non-blank and at most 256 characters, description at most 1024 characters, shipping address a JSON object, mandates non-empty with at most 10 entries, and the serialized context at most 16384 UTF-8 bytes. Every mandate object must carry `description`, `amountLimit`, and `currencyCode`: the CLI pre-validates these locally and exits 2 naming the offending field — a missing or blank text field, a non-positive or unsafe numeric `amountLimit`, more than 2 decimal places, or a malformed mandate `effectiveUntilTime` all fail before any request is sent. Use a JSON string for a large amount to avoid JavaScript number precision loss. The backend enforces the same rules but masks most field errors behind a generic `OAuth request is invalid` response, so fix the request contract rather than retrying login.

Record `data.pendingInstructionId` from the init envelope. Null means only that no usable Quick ID was returned: CWallet uses the same absence for an existing VIC-card skip and for a swallowed creation failure, so return to the regular authorization resolver rather than assuming a list is required. On the first-card path, `payment_method.added` proves only card addition. Extract its exact `paymentInstrumentId`, refresh the card list, and run `classifyQuickInstructionActivationGate`; a Visa card with a Quick ID gets one same-card `singleAttempt` readiness poll before exact instruction verification. Merge the poll result's `vicReadinessWaitAttempted=true` continuation after refresh, so event, timeout, non-ready/wrong-card event, empty result, or poll gap cannot start a second wait. Quick activation likewise gets one bounded poll and final GET with `activationWaitAttempted=true`; final PENDING returns to the regular authorization list. Non-Visa and missing-ID branches return to the regular resolver. On the already-ready path (cards exist, no fresh binding ceremony) the ID is informational only — never start a binding-driven Quick wait there.

## Wallet Logout

```bash
clink wallet logout --format json
```

Logout best-effort revokes the current Refresh Token, then removes OAuth authorization and any legacy customer API key. It retains customer metadata, caches, and the existing credential policy: `oauthRequired=true` remains true after OAuth, while a never-OAuth legacy wallet remains false. The logout result no longer echoes `oauthRequired`; run `wallet status` when the post-logout policy matters. If another login replaces the original identity while logout is running, the CLI preserves the newer login and fails the stale logout. Do not implement token revocation yourself.

## Wallet Status

```bash
clink wallet status --format json
```

This is a local readiness check with no network request. It resolves the effective base URL and allowed environment/flag credentials for a never-OAuth legacy wallet while continuing to ignore them when `oauthRequired=true`. Key fields include `customerId`, `email`, `name`, `hasAuthorization`, `hasStoredAuthorization`, `authorizationEnvironmentMatches`, `authorizationType`, `oauthRequired`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, and legacy `hasCustomerApiKey`. It never returns raw tokens or API keys.

Classify this output with `classifyWalletStatusObservation`:

- OAuth ready: require `hasAuthorization=true`, `hasStoredAuthorization=true`, `authorizationEnvironmentMatches=true`, `authorizationType=oauth`, `oauthRequired=true`, `hasCustomerApiKey=false`, and a non-empty `customerId`.
- OAuth environment mismatch: `hasAuthorization=false`, `hasStoredAuthorization=true`, `authorizationEnvironmentMatches=false`, `authorizationType=null`, and `oauthRequired=true`. Keep the selected environment lock and start `wallet init` for that origin; never send the stored authorization across origins.
- OAuth reauthorization required: `oauthRequired=true` with no effective authorization. Start `wallet init`; never inspect stored/env/flag CSK.
- Legacy CSK ready: require `hasAuthorization=false`, `hasStoredAuthorization=false`, `authorizationEnvironmentMatches=null`, `authorizationType=csk`, `hasCustomerApiKey=true`, `oauthRequired=false`, and a non-empty `customerId`. Continue the requested operation; migration is recommended but must not block it.
- Setup required: neither mode is complete. Collect missing setup input before starting a new operation.
- Invalid OAuth state: OAuth markers contradict each other or `oauthRequired=true` appears with CSK readiness. Fail closed; never fall back to CSK.

New `wallet init` always creates OAuth and does not issue a new CSK. Existing CSK users may continue only while `oauthRequired` is omitted or exactly `false`. Once OAuth succeeds, logout, token expiry/revocation, malformed state, and base-URL changes retain the permanent OAuth-only policy. If an OAuth-authenticated command returns exit code 4 with `401`, stop the current business operation and start explicit reauthorization. For a never-OAuth legacy-CSK `401`, verify the locked environment and key or offer OAuth migration. For `403`, surface the permission/scope error without refreshing or retrying.

## Config Commands

Read current config:

```bash
clink config get --format json
```

Set non-secret values:

```bash
clink config set base-url <url> --format json
clink config set customer-id <id> --format json
clink config set email <email> --format json
clink config set name <name> --format json
clink config set default-open-links false --format json
```

`defaultOpenLinks` is machine-wide state in `~/.clink-cli/config.json`, shared by every build on the machine. Read it once per workflow with `config get`; when it is `true`, either set it `false` as above or pass `--no-open` on every link-producing command for the rest of the workflow.

Do not add a new legacy customer API key through this Skill. Existing never-OAuth users may retain an already stored key or provide `CLINK_CUSTOMER_API_KEY` through the execution environment. The CLI always rejects `config set customer-api-key`; `config unset customer-api-key` remains available to remove an existing saved legacy key.

`config set customer-id` is allowed only for a never-OAuth wallet. Changing it clears cached payment methods and risk rules. For an OAuth-managed wallet, change identities through `wallet init`; do not set or unset `customer-id` directly.

Unset values:

```bash
clink config unset <key> --format json
```

## Config State Model

The local config is a latest wallet state cache. OAuth authorization is bound to its issuer origin and a request never sends both OAuth and CSK. Successful OAuth stores sticky `oauthRequired=true`. Logout, Refresh Token expiry, and a terminal refresh rejection such as `invalid_grant` clear active credentials but retain that marker. Transient refresh failures such as network or service errors leave the current credentials intact; surface the error without falling back to CSK. Legacy CSK is considered only when the marker is absent or exactly false.

Pointing a command at another origin through `CLINK_BASE_URL` leaves the stored authorization in the config but makes it ineffective for that command. `wallet status` then reports `hasStoredAuthorization=true` with `authorizationEnvironmentMatches=false`, and authenticated commands require `wallet init` for the selected origin. Persisting a different origin with `clink config set base-url <url>` instead clears the stored OAuth authorization, any legacy customer API key, payment-method cache, and risk rules. It preserves the existing credential policy: `oauthRequired=true` remains sticky after OAuth, while a never-OAuth wallet remains false. Run `wallet init` for the new origin.

Every authenticated request, OAuth refresh/retry, payment-method cache write, event poll, and event ACK reloads and checks the current authorization identity. If another process replaces the login, changes the customer/device/session, or a webhook names a different customer, the stale operation fails without overwriting the newer wallet, caching the stale response, or acknowledging the mismatched event. Re-run `wallet status`; never automatically retry a state-changing payment, Tip, checkout, refund, or logout from that error.

Never inspect `authorization.accessToken` or `authorization.refreshToken` directly. Use `wallet status` or `config get`, which return only redacted readiness metadata. The config should contain the latest known payment-method snapshot, risk-rule state, and user display data; it should not grow as an append-only log of events.

When event processing sees payment-method changes, the CLI updates the cached payment-method snapshot. `risk_rule.updated` upserts local risk-rule state. Non-wallet business events are not configuration history: selected events are returned, while a typed poll processes and acknowledges non-selected events without returning them.

## Card Readiness

Refresh current payment methods without waiting for a browser action:

```bash
clink card binding-link --no-watch --no-open --format json
```

Then inspect `data.paymentMethodsVoList`, or read the local cache:

```bash
clink card list --format json
```

`card list` is cache-only. Do not use it alone when current card state matters; refresh first with `card binding-link --no-watch --no-open`.

## Binding Or Managing Cards

First card binding:

```bash
clink card binding-link --no-open --format json
```

Add another payment method:

```bash
clink card setup-link --no-open --format json
```

Manage existing payment methods:

```bash
clink card modify-link --no-open --format json
```

These commands print a URL for the user. Without `--no-watch`, `card binding-link` delays its first envelope until the Event Hub watch is ready; the setup and modify commands print their first envelope immediately. Each command then keeps the same process alive and emits a second JSON envelope after its matching completion event.

Every one of them is a `USER_DEVICE_ONLY` page: it collects or exposes a card number, so the user must open it in their own browser and the agent runtime must not open, navigate, preview, screenshot, read, or fill it by any channel. Pass `--no-open` so the CLI does not launch a browser on its own host either, and keep `--no-watch` off so the built-in listener stays running. See `references/clink-browser-handoff.md`.

Get one cached method:

```bash
clink card get --payment-instrument-id <id> --format json
```

## Risk Rules

View current risk rules:

```bash
clink risk get --format json
```

Generate risk-rule management URL:

```bash
clink risk link --no-open --format json
```

`risk link` is an async browser flow. Wait for `risk_rule.updated` through the built-in watch or `events poll` before claiming the change took effect. The page sets the user's own spending limits, so it is `USER_PREFERRED`: hand the URL to the user rather than choosing their rules for them in an agent browser.
