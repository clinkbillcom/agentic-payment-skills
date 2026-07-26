# Wallet, Config, Card, And Risk Commands

Read this before wallet setup, local config work, card readiness checks, payment-method management, or risk-rule links.

## Wallet Setup

Select and lock the `clink-cli` environment during wallet initialization (see `references/clink-cli-invocation.md`). Wallet init then needs the account fields:

```bash
clink-cli wallet init --email <email> --name <name> --no-open --format json
```

The main distribution targets production by default, while the UAT distribution supplies its wallet-init environment internally. Use `--test` only when selecting test is permitted. After initialization, run all follow-up commands without environment flags and verify the persisted environment through `wallet status`.

`wallet init` starts OAuth Device Authorization and polls until authorization completes. In Agent workflows, always pass `--no-open`; it prevents browser launch for this invocation even if stored configuration enables link opening. The original process prints the verification URL to live stderr. Stream that stderr while the process is running.

Read the verification URL only from the original process's live stderr. When `Complete authorization in your browser:` appears, send the following URL to the user exactly once and keep that same process alive. Do not open the URL from the Agent runtime, start a second `wallet init`, or reconstruct the URL from final stdout. Do not navigate to, preview, or prefetch the URL with an Agent browser: that request can overlap with the user's page load and trigger duplicate verification-code sends or resend throttling. The user completes email verification and confirmation in the browser; never ask them to send an OTP to the agent and never add `--otp`. The URL keeps `user_code` in its query and carries email/name in its fragment. It is intended for the current user, but do not copy it into unrelated logs or handoffs.

Successful initialization stores `customerId`, `email`, `name`, an environment-bound OAuth authorization, and sticky `oauthRequired=true` in the single local config. Final init output requires `hasAuthorization=true`, `authorizationType=oauth`, `hasCustomerApiKey=false`, and a non-empty `customerId`; it no longer echoes `oauthRequired`. Use `wallet status` to classify the persisted credential policy. The CLI refreshes expiring Access Tokens and atomically rotates Refresh Tokens. Never read, print, copy, or refresh either token directly.

After OAuth succeeds, `wallet init` calls the card binding-link endpoint to refresh cached payment methods. It strips the returned URL to its HTTPS origin and returns that origin as `bindingUrl`. Proactively send a non-empty `data.bindingUrl` as the next card-binding step; never expose its original path, query string, or encoded email. If refresh fails, report `paymentMethodsCacheError` without inventing a URL; OAuth initialization itself remains successful.

Classify live stderr and final init output with `classifyWalletInitObservation` from `lib/wallet-workflow-fsm.mjs`:

- `SHOW_OAUTH_VERIFICATION_URL_AND_WAIT`: read the URL only from live stderr, send it once, and keep waiting on the same `wallet init --no-open` process; never open it from the Agent runtime.
- `RETURN_WALLET_PLAN`: report `--dry-run` as planned, not initialized.
- `RETURN_WALLET_READY`: accept only the final OAuth initialization evidence above; do not require an `oauthRequired` field from `wallet init`.
- `SURFACE_ERROR`: return the terminal CLI error without inventing recovery.

## Wallet Logout

```bash
clink-cli wallet logout --format json
```

Logout best-effort revokes the current Refresh Token, then removes OAuth authorization and any legacy customer API key. It retains customer metadata, caches, and the existing credential policy: `oauthRequired=true` remains true after OAuth, while a never-OAuth legacy wallet remains false. The logout result no longer echoes `oauthRequired`; run `wallet status` when the post-logout policy matters. If another login replaces the original identity while logout is running, the CLI preserves the newer login and fails the stale logout. Do not implement token revocation yourself.

## Wallet Status

```bash
clink-cli wallet status --format json
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
clink-cli config get --format json
```

Set non-secret values:

```bash
clink-cli config set base-url <url> --format json
clink-cli config set customer-id <id> --format json
clink-cli config set email <email> --format json
clink-cli config set name <name> --format json
clink-cli config set default-open-links false --format json
```

Do not add a new legacy customer API key through this Skill. Existing never-OAuth users may retain an already stored key or provide `CLINK_CUSTOMER_API_KEY` through the execution environment. The CLI always rejects `config set customer-api-key`; `config unset customer-api-key` remains available to remove an existing saved legacy key.

`config set customer-id` is allowed only for a never-OAuth wallet. Changing it clears cached payment methods and risk rules. For an OAuth-managed wallet, change identities through `wallet init`; do not set or unset `customer-id` directly.

Unset values:

```bash
clink-cli config unset <key> --format json
```

## Config State Model

The local config is a latest wallet state cache. OAuth authorization is bound to its issuer origin and a request never sends both OAuth and CSK. Successful OAuth stores sticky `oauthRequired=true`. Logout, Refresh Token expiry, and a terminal refresh rejection such as `invalid_grant` clear active credentials but retain that marker. Transient refresh failures such as network or service errors leave the current credentials intact; surface the error without falling back to CSK. Legacy CSK is considered only when the marker is absent or exactly false.

Selecting another origin temporarily through `CLINK_BASE_URL` leaves the stored authorization in the config but makes it ineffective for that command. `wallet status` then reports `hasStoredAuthorization=true` with `authorizationEnvironmentMatches=false`, and authenticated commands require `wallet init` for the selected origin. Persisting a different origin with `clink-cli config set base-url <url>` instead clears the stored OAuth authorization, any legacy customer API key, payment-method cache, and risk rules. It preserves the existing credential policy: `oauthRequired=true` remains sticky after OAuth, while a never-OAuth wallet remains false. Run `wallet init` for the new origin.

Every authenticated request, OAuth refresh/retry, payment-method cache write, event poll, and event ACK reloads and checks the current authorization identity. If another process replaces the login, changes the customer/device/session, or a webhook names a different customer, the stale operation fails without overwriting the newer wallet, caching the stale response, or acknowledging the mismatched event. Re-run `wallet status`; never automatically retry a state-changing payment, Tip, checkout, refund, or logout from that error.

Never inspect `authorization.accessToken` or `authorization.refreshToken` directly. Use `wallet status` or `config get`, which return only redacted readiness metadata. The config should contain the latest known payment-method snapshot, risk-rule state, and user display data; it should not grow as an append-only log of events.

When event processing sees payment-method changes, the CLI updates the cached payment-method snapshot. `risk_rule.updated` upserts local risk-rule state. Non-wallet business events are returned to the caller and acknowledged by the event path; they are not configuration history.

## Card Readiness

Refresh current payment methods without waiting for a browser action:

```bash
clink-cli card binding-link --no-watch --format json
```

Then inspect `data.paymentMethodsVoList`, or read the local cache:

```bash
clink-cli card list --format json
```

`card list` is cache-only. Do not use it alone when current card state matters; refresh first with `card binding-link --no-watch`.

## Binding Or Managing Cards

First card binding:

```bash
clink-cli card binding-link --format json
```

Add another payment method:

```bash
clink-cli card setup-link --format json
```

Manage existing payment methods:

```bash
clink-cli card modify-link --format json
```

These commands print a URL for the user. Without `--no-watch`, they also wait for the relevant completion event and then emit a second JSON envelope.

Get one cached method:

```bash
clink-cli card get --payment-instrument-id <id> --format json
```

## Risk Rules

View current risk rules:

```bash
clink-cli risk get --format json
```

Generate risk-rule management URL:

```bash
clink-cli risk link --format json
```

`risk link` is an async browser flow. Wait for `risk_rule.updated` through the built-in watch or `events poll` before claiming the change took effect.
