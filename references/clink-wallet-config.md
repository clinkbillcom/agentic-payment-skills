# Wallet, Config, Card, And Risk Commands

Read this before wallet setup, local config work, card readiness checks, payment-method management, or risk-rule links.

## Wallet Setup

Select and lock the `clink-cli` environment once (see `references/clink-cli-invocation.md`). Wallet init then only needs the account fields:

```bash
clink-cli wallet init --email <email> --name <name> --format json
```

`bin/clink-cli` targets production by default; bind `--sandbox` into the logical wrapper for sandbox/UAT. Use credentials that belong to the locked environment and never mix production with sandbox/UAT credentials.

`wallet init` stores `customerId`, `customerApiKey`, `email`, and `name` in the single local config. Re-running it overwrites the previous local customer and clears cached payment-method/risk-rule state. It is a setup step and must not be run automatically during a payment attempt.

### Email OTP Recovery

After `wallet init` returns, classify the observation with `lib/wallet-workflow-fsm.mjs` (`classifyWalletInitObservation`) and report the `[WALLET_FSM]` marker in structured handoffs. If the classifier returns `ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT`, do not treat it as a terminal setup failure. It matches any of these fields:

- `BOOTSTRAP_OTP_REQUIRED`
- `71160015`
- `cwallet.bootstrap.otp.required`
- `Verification code has been sent to this email. Please retry with otp.`

Tell the user that Clink sent a verification code to the same email address used for `wallet init`, ask them to check that email and send the OTP back, then retry once the user provides it:

```bash
clink-cli wallet init --email <email> --name <name> --otp <email_otp> --format json
```

Use the same `email`, `name`, and locked environment as the original attempt. Never invent or guess the OTP, never change the email to avoid the OTP challenge, and do not keep retrying `wallet init` without `--otp` after this error.

## Wallet Status

```bash
clink-cli wallet status --format json
```

This is a local config check. Key fields include `customerId`, `email`, `name`, and `hasCustomerApiKey`.

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

Set the customer API key only through stdin:

```bash
printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json
```

Unset values:

```bash
clink-cli config unset <key> --format json
```

## Config State Model

The local config is a latest wallet state cache. It should contain the single local customer credentials, the latest known payment-method snapshot, risk-rule state, and user display data. It should not grow as an append-only log of events.

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
