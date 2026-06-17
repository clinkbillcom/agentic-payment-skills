---
name: clink-payment-skill
description: "Use when an agent needs to initialize a Clink wallet, check payment-method readiness, execute an explicitly authorized charge, create or track a refund, wait for an async completion event (binding, refund, VIC activation, 3DS), or retrieve payment-management and risk-rule links."
version: "1.1.0"
requires:
  node: ">=20"
  bins: ["clink-cli"]
  install: "npm install -g @clink-ai/clink-cli"
---

# Clink Payment Skill

Use this skill for direct Clink payment operations through `clink-cli`.

This skill executes wallet, card, payment, refund, risk-rule, and local config commands. It does not decide pricing, entitlement, or merchant receipt confirmation.

## When to Use

- initialize a user's Clink wallet
- check whether a wallet or payment method is ready
- generate a card binding, setup, modify, or risk-rule URL for the user
- execute a payment after the amount and authorization are already clear
- create a full refund or poll refund status
- inspect or update local Clink CLI configuration

## Do Not Use

- deciding whether the user should be charged
- inventing `amount`, `currency`, `merchantId`, `sessionId`, `orderId`, or `paymentInstrumentId`
- confirming merchant receipt, balance top-up completion, or product entitlement
- blindly retrying an ambiguous payment after timeout or network failure
- handling generic merchant integration design when no direct `clink-cli` action is needed

## Routing Boundary

- Merchant or product skills own business intent: when to charge, how much to charge, and how to confirm success on the merchant side.
- This skill owns the Clink CLI execution path: wallet readiness, payment-method readiness, charge execution, refund submission, refund polling, and risk-rule links.
- If the request is generic product language such as "enable auto top-up" without a direct Clink wallet or payment operation, route to the merchant or integration skill first.
- High-priority VIC route: if the user says to use Visa for a purchase, booking, order, reservation, hotel booking, ticket purchase, or equivalent, this skill must first perform VIC authorization preparation. Do not immediately answer that the merchant plugin is missing, ask for a payment link/session ID, or run normal `pay` before the Visa readiness and instruction list-first flow.

## Hard Rules

- Never run `clink-cli pay` unless the user explicitly authorized this payment in the current context, or an upstream merchant workflow already supplied an explicit payment decision for this exact request.
- Never invent payment parameters. Missing `amount`, `currency`, `merchantId`, `sessionId`, `orderId`, or target payment method means stop and ask the caller or user for the missing data.
- Never expose `customerApiKey` or other secrets in user-visible output.
- Never call `config set customer-api-key <value>` with a literal key — pipe from the environment variable instead: `printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key`.
- Never run `wallet init` automatically during a payment or other operation. If exit code 3 or 4 is returned, ask the user to run `wallet init` themselves (it is a one-time setup step done at install time).
- Treat `pay` exit code `6` or client-side timeout as an unknown payment state. Do not blindly retry unless the caller provides an idempotent retry guarantee or the payment state is confirmed elsewhere.
- For exit code `7`, send the 3DS redirect URL to the user and wait for completion instead of continuing automatically.
- Refunds require an explicit refund request and the original `orderId`. This skill only submits full refunds.
- Async completion is event-driven, not guesswork. Operations that finish asynchronously (card binding/change, risk-rule update, refund lifecycle, VIC registration, purchase-instruction activation, post-3DS order result) are confirmed by a webhook event from the Clink event hub, not by assumption. Never claim an async flow completed until the matching event has been observed — either through the link command's built-in watch or through `events poll`. See the Async Completion Model section.
- VIC (agentic authorization): when the user asks to use Visa for a purchase, booking, order, or reservation, first refresh cards and check `visaRegistrationSucceeded`. If it is not `true`, send the Visa Passkey registration URL. If it is `true`, list ACTIVE instructions filtered by the selected `paymentInstrumentId`, semantically reuse a matching instruction, or create a draft with `instruction create`. Never call a backend sign API; send the Passkey page URL and let the page automatically sign after the user opens it. Never invent `mandates`, `title`, amount limits, merchant scope, or hidden Passkey payloads. Never send `clientReferenceId`, `channelTokenId`, or `consumerId` — the server derives them. Currency/amount are per-mandate, not at instruction level.
- If the user asks to preview a command or verify inputs without execution, use `--dry-run` when supported.

## Quick Reference

| Need | Command |
|------|---------|
| Initialize wallet | `clink-cli wallet init ... --format json` |
| Check wallet readiness | `clink-cli wallet status --format json` |
| Refresh payment methods | `clink-cli card binding-link --format json` |
| List cached payment methods | `clink-cli card list --format json` |
| Charge user | `clink-cli pay ... --format json` |
| Submit refund | `clink-cli refund create ... --format json` |
| Poll refund | `clink-cli refund get ... --format json` |
| Wait for an async completion event | `clink-cli events poll --type <eventType> --format json` |
| Refresh card cache without waiting | `clink-cli card binding-link --no-watch --format json` |
| View risk rules | `clink-cli risk-rule get --format json` |
| Get risk-rule config URL | `clink-cli risk-rule link --format json` |
| Create VIC instruction draft | `clink-cli instruction create ... --format json` |
| Print instruction Passkey URL | `clink-cli instruction sign-url ... --format json` |
| List reusable VIC instructions | `clink-cli instruction list --status ACTIVE --payment-instrument-id <id> --format json` |
| Get one VIC instruction by ID | `clink-cli instruction get --purchase-instruction-id <id> --format json` |
| Future charge with VIC authorization | `clink-cli pay ... --purchase-instruction-id <id> --format json` |

## Prerequisites

- Node.js >= 20
- `clink-cli` installed: `npm install -g @clink-ai/clink-cli`
- Network access to Clink API (default: `https://api.clinkbill.com`)
- Wallet initialized (run once after installing `clink-cli`):

```bash
clink-cli wallet init --email <email> --name <name> --format json
```

After init, bind a payment method:

```bash
clink-cli card binding-link --format json
# → send bindingUrl to user; the built-in watch waits for the payment_method.added
#   event and refreshes the cache automatically (or poll: clink-cli events poll
#   --type payment_method.added --format json)
```

## Output Format

Always pass `--format json` so both success and error output are machine-parseable.

With explicit `--format json`, inspect the exit code first, then parse JSON from the stream that contains it.

Success envelope (stdout):
```json
{ "ok": true, "data": { ... } }
```

Error envelope (stderr, only when `--format json` is explicit):
```json
{ "ok": false, "error": { "type": "...", "code": 0, "message": "..." } }
```

When a command returns a list, treat the list as the payload inside `data`.

## Async Completion Model

Many Clink operations finish asynchronously: card binding/change, risk-rule update, the refund lifecycle, VIC registration, purchase-instruction activation, and the final order result after a 3DS redirect. Completion is signaled by a webhook event from the Clink event hub, not by assumption or by re-running the action.

This skill has no background process. Instead, `clink-cli` exposes the event hub through two foreground mechanisms — use them in place of guessing or busy-looping:

1. **Built-in link watch (default).** Whenever a command prints a URL for the user to act on in a browser — `card binding-link`, `card setup-link`, `card modify-link`, `risk-rule link`, `instruction create|sign-url|update|cancel`, and `pay` when it returns a 3DS redirect — the CLI keeps running and polls the event queue (every 5s, up to 15 min, stopping at the first batch). It processes the events (logs to **stderr**, refreshes the local payment-method cache, stores each event under `eventCache`), acknowledges them, and prints them as a **second JSON envelope** on **stdout**. So a single foreground call both shows the user the link and returns once the completion event arrives.

2. **On-demand poll (`events poll`).** When you need to wait for a state change without printing a link — for example after a refund submission, or to resume a watch that timed out — call `clink-cli events poll`. It drains the queue within a bounded window and returns the processed events.

Rules:

- **Do not fabricate completion.** Never tell the user a binding, refund, VIC activation, or post-3DS payment succeeded until the matching event has actually been observed (via the link watch's second envelope or `events poll`).
- **Do not busy-retry the action.** Re-running `card binding-link` or re-submitting a refund to "check" status is wrong — poll the event hub instead. Refund status may also be queried directly with `refund get`.
- **Do not block scripted runs.** For non-interactive or cache-only refreshes (e.g. calling `card binding-link` only to refresh the cached card list), pass `--no-watch` so the command prints and exits immediately. The watch is also skipped automatically under `--dry-run`.
- **Never silently drop events.** Event types the CLI does not recognize yet are still logged, cached, and acked, so newer business events are never lost — read them from the returned envelope by `type`/`resourceId`.

Event types you will encounter include `payment_method.added`, `payment_method.updated`, `payment_method.default_change`, `risk_rule.updated`, `agent_order.succeeded`, `agent_order.failed`, `agent_refund.succeeded`, `agent_refund.approved`, `agent_refund.failed`, `agent_refund.rejected`, `vic_device.binding_succeeded`, `purchase_instruction.created`, `purchase_instruction.activated`, `purchase_instruction.updated`, and `purchase_instruction.cancelled`.

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Parse `data` from stdout |
| 2 | Validation error | Fix input, retry |
| 3 | Config error | Run `wallet init` or `config set` |
| 4 | Auth error | Verify credentials/environment, then re-run `wallet init` if needed |
| 5 | API error | Show `error.message` to user |
| 6 | Network error or ambiguous timeout | Treat payment state as unknown; verify state before retrying |
| 7 | 3DS required | Extract `redirectUrl`, send to user |

## Global Options

All commands accept these flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--format json` | json | Always use this for agent parsing |
| `--profile <name>` | default | Named credential profile |
| `--timeout <ms>` | 30000 | Request timeout |
| `--dry-run` | false | Print request without executing |
| `--no-watch` | false | Skip the built-in event watch after a link is printed (use for scripted runs or cache-only refresh) |

Config resolution: flags > env vars (`CLINK_BASE_URL`, `CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`) > `~/.clink-cli/config.json`.

## Tools

### wallet init

Initialize a customer wallet. Run once per user.

```bash
clink-cli wallet init --email <email> --name <name> --format json
```

Optional: `--source <value>` (bootstrap source tag, defaults to `"agent"` — leave unset unless the caller requires a different value).

Side effects: saves `customerId`, `customerApiKey`, `email`, `name` to `~/.clink-cli/config.json`.

Idempotent — calling again for the same email returns existing credentials.

### wallet status

Check local wallet config. No network request.

```bash
clink-cli wallet status --format json
```

Key fields: `customerId` (null if not initialized), `email`, `hasCustomerApiKey`.

### card binding-link

Get the wallet binding URL **and** refresh the local payment method cache (network request).

```bash
clink-cli card binding-link --format json
```

Key fields: `bindingUrl`, `paymentMethodsVoList` (array, empty if no card bound).

Side effects: overwrites the local payment method cache. By default this command also **watches** for the binding-completion event after printing `bindingUrl` (see Async Completion Model) and emits a second JSON envelope when `payment_method.added` arrives. Pass `--no-watch` when you only want to refresh the cache.

This command has two distinct uses — always be explicit about which one applies:

| Use case | Action |
|----------|--------|
| Need up-to-date card list (no waiting) | Call `binding-link --no-watch`, then read `paymentMethodsVoList` from the response (or follow with `card list`) |
| User needs to bind a first card | Call `binding-link`, send `bindingUrl` to user, then let the built-in watch (or `events poll --type payment_method.added`) confirm completion and refresh the cache — do not busy-retry |

**Never call `card list` alone when you need current card state** — it reads the local cache and may be stale. Always precede it with `binding-link` if freshness matters.

### card setup-link

URL to add a new payment method after the wallet is initialized.

```bash
clink-cli card setup-link --format json
```

Key fields: `url`, `paymentMethodsVoList`.

### card modify-link

URL to manage existing payment methods.

```bash
clink-cli card modify-link --format json
```

Key fields: `url`, `paymentMethodsVoList`.

### card list

List cached payment methods. No network request — reads local cache only.

```bash
clink-cli card list --format json
```

The payload in `data` is an array.

**Cache may be stale.** Call `card binding-link` first whenever you need current card state (e.g., before a payment pre-check). Use `card list` alone only when you explicitly want the cached snapshot.

### card get

Get one cached payment method.

```bash
clink-cli card get --payment-instrument-id <id> --format json
```

### pay

Execute a payment. Two modes:

**Direct mode** (merchant provides amount):

```bash
clink-cli pay --merchant-id <id> --amount <amount> --currency <currency> --format json
```

**Session mode** (amount bound to session):

```bash
clink-cli pay --session-id <id> --format json
```

Optional for both: `--payment-instrument-id <id>` (defaults to cached default card), `--payment-method-type <type>` (defaults to `CARD`, supported values: `CARD`, `KAKAO`, `CASHAPP`, `WECHAT`, `CRYPTO`, `PIX`, `ALIPAY`, `UPI`).

Preconditions:
- wallet is initialized
- at least one payment method is available
- the payment parameters come from the user or an upstream merchant workflow
- the payment is explicitly authorized for this request

**Exit code 7 (3DS)**: payment requires 3D Secure. The response still contains data — extract `data.channelPaymentResponse.action.redirectUrl` and send it to the user.

**Payment status values** (in `data.status`):
- `1` = success
- `3` = failed (card declined)
- `4` = failed (risk rule blocked)
- `6` = failed (other)

**Key return fields** (on success):
- `data.orderId` — save this if a refund may be needed later
- `data.status` — payment status code above
- `data.channelPaymentResponse.action.redirectUrl` — only present on exit code 7 (3DS)

### refund create

Submit a full refund for an order.

```bash
clink-cli refund create --order-id <order_id> --format json
```

`--order-id` is the `data.orderId` returned by `clink-cli pay`.

Returns `refundOrderId` (starts with `rfd_`). The refund is processed asynchronously — poll with `refund get --refund-id <refundOrderId>`.

### refund get

Query refund status.

```bash
clink-cli refund get --refund-id <refund_id> --format json
```

**States**: `pending_review`, `refunding`, `success`, `failed`, `review_rejected`.

Terminal states: `success`, `failed`, `review_rejected`.

### events poll

Wait on demand for async completion events from the Clink event hub, then process and acknowledge them. This is the standalone counterpart to the link commands' built-in watch — use it when you need to wait for a state change without re-printing a link (e.g. after a refund submission, after a user finishes a Passkey page, or to resume a watch that timed out).

```bash
clink-cli events poll --type <eventType> --format json
```

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--type <eventType>` | (none) | Return early once an event of this type arrives. Without it, the poll returns on the first event of any type. |
| `--max-wait <seconds>` | 60 | Bounded wait window before timing out. |
| `--limit <n>` | 20 | Page size per poll. |
| `--no-ack` | false | Peek without acknowledging (events stay in the queue). |

Returns `{ ready, timedOut, events, ackedEventIds }`:

- `ready: true` — the awaited event arrived (any event, or one matching `--type`). Read it from `events`.
- `timedOut: true` — the window elapsed with no matching event. The result also includes `resumeCommand`; because acked events are removed server-side, resuming is just running the same command again — there is no cursor or offset to pass.

Important: a single poll processes the **whole returned batch** (every event is cached under `eventCache`). `--type` only controls **when to stop waiting**, not which events are returned — so always filter the returned `events` by `type` and `resourceId` to find the specific change you triggered. Pass `--no-ack` only to peek; by default the poll consumes (acks) what it reads.

### risk-rule get

Get current risk rule settings.

```bash
clink-cli risk-rule get --format json
```

Key fields: `singleRechargeLimit`, `dailyTotalLimit`, `dailyMaxCount`, `rechargeInterval`, `manualApprovalThreshold`.

### risk-rule link

URL to configure risk rules.

```bash
clink-cli risk-rule link --format json
```

Key fields: `url`.

### instruction (VIC agentic authorization)

VIC lets the user pre-authorize an agent to operate within mandate limits (amount cap, currency, merchant/category scope, expiry) on a Visa card that has completed registration. This phase prepares authorization; it does not prove payment completion.

Only use for a Visa card whose card data has:

```text
visaRegistrationSucceeded === true
```

If the selected Visa card has not completed registration, send the registration page URL:

```text
https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa
```

Pass `--sandbox` when the user or caller is operating against sandbox; omit it for production (the default). `--sandbox` switches both the agent page domain (`agent.clinkbill.dev`) and the API base URL (`api.clinkbill.dev`). There is no `--agent-env` flag.

**list** — first check for reusable ACTIVE instructions on the selected card:

```bash
clink-cli instruction list \
  --status ACTIVE \
  --payment-instrument-id <visa_pi> \
  --format json
```

Reuse only when `paymentInstrumentId`, amount cap, currency, service window, and merchant/category/title/description semantics cover the user's requested scope. MCC is optional; missing MCC alone must not block reuse.

**get** — fetch a single instruction (e.g. to confirm its current status) by id:

```bash
clink-cli instruction get \
  --purchase-instruction-id <instructionId> \
  --format json
```

**create** — when no reusable instruction exists, create a draft and print the Passkey URL:

```bash
clink-cli instruction create \
  --payment-instrument-id <visa_pi> --title "<title>" \
  --effective-until-time "1782345600" \
  --mandates '[{"title":"Hotel","description":"Hotel","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"1782345600"}]' \
  --format json
```

Returns `data.instructionId` and `data.passkeyUrl`. Send `data.passkeyUrl` to the user. The user opens that page and the page automatically signs. `--description`, `--extra` are optional. Currency and `amountLimit` live on each mandate, not at instruction level — do NOT pass `--currency`/`--total-limit-amount`/`--country-code`. `--effective-until-time` is Unix epoch seconds (e.g. `1782345600`); the CLI rejects other formats. For hotel check-in, use the check-in day end-of-day as epoch seconds. Do NOT pass `clientReferenceId` / `channelTokenId` / `consumerId`. Add `--sandbox` for the sandbox agent page.

**Fulfillment (`--shipping-address`)** — classify the purchase before preparing:
- **Physical goods that ship**: pass `--shipping-address '<json>'` with a US address (`countryCode` must be `US`). The CLI forwards it to the backend as `shippingAddress`.
- **Services, subscriptions, hotels, tickets, bookings, reservations, digital goods**: do NOT pass `--shipping-address`.
- If it is unclear whether the purchase ships a physical item, ask the user before preparing — do not guess.

There is no `--fulfillment-type` flag in `clink-cli`; the presence or absence of `--shipping-address` is how fulfillment is expressed on the CLI path. Address shape:

```bash
clink-cli instruction create \
  --payment-instrument-id <visa_pi> --title "<title>" \
  --effective-until-time "1782345600" \
  --mandates '<json>' \
  --shipping-address '{"addressId":"addr_001","name":"Jim","line1":"123 Market St","line2":"Apt 201","city":"San Francisco","state":"CA","zip":"94105","countryCode":"US","deliveryContactDetails":{}}' \
  --format json
```

Default to one-time authorization. Set recurring (`--is-recurring`) only when the user clearly says it is periodic, recurring, subscription-like, monthly, weekly, or equivalent.

**sign-url** — print the Passkey URL for an existing draft:

```bash
clink-cli instruction sign-url \
  --payment-instrument-id <visa_pi> \
  --purchase-instruction-id <instructionId> \
  --format json
```

This command does not call a backend sign API. Never fabricate hidden Passkey payloads such as `authResult`, `appInstance`, `fidoBlob`, or `dfpSessionId`. Add `--sandbox` for the sandbox agent page.

**update / cancel** — first phase only prints the agent page base URL (add `--sandbox` for sandbox):

```bash
clink-cli instruction update --format json
clink-cli instruction cancel --format json
```

Do not call backend update/cancel APIs in this phase.

**Future payment boundary**: `clink-cli pay --purchase-instruction-id <instructionId>` is the target command shape, but backend payment support for this parameter is not ready yet. Until that contract is confirmed, store the ACTIVE `instructionId` in task context and do not claim payment has completed.

### config get

Read current configuration.

```bash
clink-cli config get --format json
```

### config set

Set a configuration value.

```bash
clink-cli config set <key> <value> [--profile <name>] --format json
```

Keys: `base-url`, `customer-id`, `default-open-links`, `email`, `name`.

To persist `customer-api-key`, pipe from the environment variable — never pass it as a literal argument:

```bash
printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json
```

This keeps the key out of command arguments, shell history, and agent-visible logs.

### config unset

Remove a configuration value.

```bash
clink-cli config unset <key> [--profile <name>] --format json
```

---

## Workflows

### First-Time Setup

Run this once before any payment operation.

```
1. Collect email and name from user

2. clink-cli wallet init --email <email> --name <name> --format json
   → exit 0: credentials saved, continue
   → exit 4: auth error, verify email and API environment

3. clink-cli card binding-link --format json
   → paymentMethodsVoList is empty:
     a. Send bindingUrl to user, ask them to bind a card on the web page
     b. The command's built-in watch is already polling — wait for its second JSON
        envelope carrying a payment_method.added event (it also refreshes the cache),
        or call: clink-cli events poll --type payment_method.added --format json
     c. Confirm the event arrived, then read paymentMethodsVoList (now non-empty)
     d. Do NOT busy-retry binding-link to "check" — let the event confirm completion
   → paymentMethodsVoList is non-empty:
     Skip to step 4

4. (Optional) clink-cli risk-rule link --format json
   → Send URL to user for risk rule configuration

5. Setup complete
```

### Execute Payment

```
1. Pre-check card:
   clink-cli card binding-link --format json
   → exit 3 or exit 4? Wallet not initialized or auth error — ask user to run wallet init (see Prerequisites), do NOT run it automatically
   → paymentMethodsVoList is empty? Send bindingUrl, ask user to bind a card, then refresh again
   → paymentMethodsVoList is non-empty? Continue

2. Execute:
   clink-cli pay --merchant-id <id> --amount <amount> --currency <currency> --format json
   (or --session-id <id> for session mode)

3. Parse result by exit code:

   exit 0 → check data.status:
     status 1 → payment succeeded, return result
     status 3 → card declined
       → clink-cli card setup-link --format json
       → send URL to user to switch card
       → ask user if they want to retry (do NOT auto-retry)
     status 4 → risk rule blocked
       → clink-cli risk-rule get --format json (show current limits)
       → clink-cli risk-rule link --format json (send config URL)
       → ask user if they want to retry after adjusting rules
     status 6 → other failure, show error to user

   exit 7 → 3DS required:
     → extract data.channelPaymentResponse.action.redirectUrl
     → send URL to user
     → the pay command's built-in watch is already polling for the post-3DS result;
       wait for its second JSON envelope (agent_order.succeeded / agent_order.failed),
       or call: clink-cli events poll --type agent_order.succeeded --format json
     → do NOT declare success until that order event arrives

   exit 3 or exit 4 → wallet not initialized or auth error:
     → ask user to run: clink-cli wallet init --email <email> --name <name> --format json
     → do NOT run wallet init automatically

   exit 6 → network error or ambiguous client-side failure:
     → treat payment state as unknown
     → do NOT blindly retry
     → verify payment state with the caller's idempotency guarantees, merchant-side status, or operator checks first
     → retry only after the state is confirmed safe

   exit 5 → API error:
     → show error.message to user
```

**Amount rule**: user explicit amount overrides merchant default amount. In session mode, amount is bound to the session. Never invent an amount.

### Refund

```
1. Collect orderId from user (starts with "order_")

2. clink-cli refund create --order-id <order_id> --format json
   → exit 0: extract refundOrderId from response. Tell the user the refund is
     submitted and pending — a successful submission is NOT a final result.
   → exit 5: order not found or already refunded, show error

3. Wait for the final result (two equivalent options — do NOT fabricate completion):
   a. Event-driven: clink-cli events poll --type agent_refund.succeeded --format json
      (also watch for agent_refund.approved / agent_refund.failed / agent_refund.rejected;
      filter the returned events by refundId/resourceId for this refund)
   b. Direct status poll (interval 5-10s, timeout 2-5 min):
      clink-cli refund get --refund-id <refund_id> --format json
      → pending_review / refunding: poll again
      → success: refund completed, inform user
      → failed: refund failed, inform user
      → review_rejected: refund rejected, inform user
```

### VIC Agentic Authorization

```
1. Refresh and select a Visa card:
   clink-cli card binding-link --format json  (refresh)
   → choose the user-specified Visa card, otherwise default card, otherwise first available card
   → check cardScheme/cardBrand/network is Visa
   → if Visa and visaRegistrationSucceeded is not true:
     send https://<agent-domain>/passkey-auth/{paymentInstrumentId}?type=visa
     wait for the registration event rather than busy-refreshing:
       clink-cli events poll --type vic_device.binding_succeeded --format json
       (payment_method.updated for the same paymentInstrumentId also signals readiness)
     then refresh and confirm card data shows visaRegistrationSucceeded=true
   → non-Visa? Use the normal Execute Payment workflow instead

2. List reusable instructions before creating anything:
   clink-cli instruction list --status ACTIVE --payment-instrument-id <visa_pi> --format json
   → if an ACTIVE instruction semantically matches the selected card, amount cap,
     currency, merchant/category/title/description, and service window:
     reuse its instructionId
   → if no match and scope is incomplete:
     ask only for the missing mandate fields
   → if no match and scope is complete:
     classify fulfillment, then continue to prepare

3. Classify fulfillment:
   → physical goods that ship? collect a US shipping address and pass --shipping-address
   → services / hotels / tickets / bookings / subscriptions / digital goods? no --shipping-address
   → unclear? ask the user before preparing — do not guess

4. Prepare draft:
   clink-cli instruction create --payment-instrument-id <visa_pi> \
     --title <t> --effective-until-time "<unix-epoch-seconds>" \
     --mandates '<json: each mandate carries amountLimit + currencyCode>' \
     [--shipping-address '<US address json>']  (only for shipped physical goods) \
     [--sandbox]  (only for sandbox) \
     --format json
   → save data.instructionId
   → send data.passkeyUrl to the user

5. Wait for page-driven authorization:
   → user opens data.passkeyUrl
   → the page automatically signs
   → the create command's built-in watch is already polling; wait for its second JSON
     envelope carrying purchase_instruction.activated for this instructionId, or call:
     clink-cli events poll --type purchase_instruction.activated --format json
   → the instruction must be ACTIVE before any payment; do not assume activation

6. Payment boundary:
   → store the ACTIVE instructionId in task context
   → do not claim payment completed from authorization alone
   → do not use --purchase-instruction-id for pay until backend payment support is confirmed
```

**VIC rules**: never create a draft without explicit user authorization and complete mandate scope; never invent mandates, merchant scope, or hidden Passkey payloads; classify fulfillment (pass `--shipping-address` only for shipped physical goods, with `countryCode=US`); list by selected `paymentInstrumentId` before creating; default to one-time authorization unless the user clearly expresses recurring semantics.

### Payment Method Management

```
View current methods:
  clink-cli card binding-link --no-watch --format json  (refresh cache, no waiting)
  clink-cli card list --format json                      (read cache)

Add a new method:
  clink-cli card setup-link --format json
  → send URL to user
  → its built-in watch waits for payment_method.added (also refreshes the cache),
    or call: clink-cli events poll --type payment_method.added --format json

Manage existing methods:
  clink-cli card modify-link --format json
  → send URL to user
  → its built-in watch waits for payment_method.updated / payment_method.default_change,
    or call: clink-cli events poll --type payment_method.updated --format json
```

### Risk Rules

```
View current rules:
  clink-cli risk-rule get --format json

Configure rules:
  clink-cli risk-rule link --format json
  → send URL to user
  → its built-in watch waits for risk_rule.updated,
    or call: clink-cli events poll --type risk_rule.updated --format json
```

---

## Merchant Integration

When another skill (e.g., a SaaS billing skill) needs to charge the user:

```
Merchant Skill                        This Skill (clink-cli)
──────────────                        ──────────────────────
1. Detects payment needed
   (402, low balance, user request)

2. Pre-check ──────────────────────►  wallet status + card list
                                      (verify wallet + card exist)

3. Provides payment params:
   merchant_id + amount + currency
   (or session_id)

4. Execute ────────────────────────►  clink-cli pay ...

5. ◄───────────────────────────────   Return result
   (success / failure / 3DS URL)

6. Merchant confirms receipt
   (merchant's own API)
```

**Responsibilities**:
- Merchant skill decides when to pay, how much, and confirms receipt.
- This skill executes the charge and returns the raw result.
- This skill performs wallet/card pre-checks before executing a payment, and can also be called only for pre-checks.
- This skill does NOT make merchant-specific decisions.

## Common Mistakes

- Calling `pay` before `wallet status` and `card list` pre-checks.
- Retrying exit code `6` payments without first resolving the payment state.
- Inventing missing payment parameters instead of stopping for clarification.
- Forgetting to refresh card state with `card binding-link` before assuming the cache is current.
- Treating refunds as synchronous instead of waiting for the `agent_refund.*` event (or polling `refund get`).
- Declaring an async flow complete (binding, refund, VIC activation, post-3DS order) before the matching event is observed.
- Busy-retrying a link command to "check" status instead of letting its built-in watch or `events poll` deliver the event.
- Passing `--no-watch` when you actually need to wait for the user's browser action — or omitting it when you only wanted a cache refresh.
