---
name: clink-payment-skill
description: "Use when an agent needs to initialize a Clink wallet, check payment-method readiness, execute an explicitly authorized charge, run an external UCP product checkout, create or track a refund, wait for an async completion event (binding, refund, VIC activation, 3DS), or retrieve payment-management and risk-rule links."
version: "1.3.0"
requires:
  node: ">=20"
  bundled: "vendor/clink-cli/clink-cli.bundle.mjs"
metadata:
  requires:
    bins: ["node"]
  cliHelp: "node vendor/clink-cli/clink-cli.bundle.mjs --help; node vendor/clink-cli/clink-cli.bundle.mjs wallet --help; node vendor/clink-cli/clink-cli.bundle.mjs card --help; node vendor/clink-cli/clink-cli.bundle.mjs pay --help; node vendor/clink-cli/clink-cli.bundle.mjs refund --help; node vendor/clink-cli/clink-cli.bundle.mjs instruction --help; node vendor/clink-cli/clink-cli.bundle.mjs ucp-checkout --help; node vendor/clink-cli/clink-cli.bundle.mjs tool --help; node vendor/clink-cli/clink-cli.bundle.mjs events poll --help"
---

# Clink Payment Skill

Use this skill for direct Clink payment operations through `clink-cli`.

This skill executes wallet, card, payment, refund, risk, VIC instruction, external UCP checkout, utility, event, and local config commands. It does not decide pricing, entitlement, or merchant receipt confirmation.

## Before Running Commands

CRITICAL - before executing a matching operation, read the listed reference file. Do not rely on memory or infer hidden fields.

| Operation | Must read |
| --- | --- |
| Any command invocation, JSON parsing, exit-code handling, local bundle usage | `references/clink-cli-invocation.md` |
| Wallet init/status, config/profile, sandbox profile, card readiness, card management, risk links | `references/clink-wallet-profile.md` |
| Waiting for binding, risk, refund, VIC, instruction, or 3DS completion events | `references/clink-async-events.md` |
| VIC agentic authorization, Visa readiness, purchase instruction list/create/sign-url/update/cancel | `references/clink-instruction.md` |
| Authorized payment execution, 3DS handling, refund submission/status | `references/clink-payment-refund.md` |
| UCP checkout product order flow, instruction/mandate matching, item-id extraction, external checkout create/complete | `references/clink-ucp-checkout.md` |

Read multiple references when a workflow crosses boundaries. Example: a product order through UCP checkout needs `clink-cli-invocation.md`, `clink-wallet-profile.md`, `clink-instruction.md`, `clink-ucp-checkout.md`, and sometimes `clink-async-events.md`.

## When to Use

- initialize a user's Clink wallet
- check wallet, profile, sandbox, or payment-method readiness
- generate card binding, setup, modify, instruction signing, or risk-rule URLs
- execute a payment after amount and authorization are already clear
- order a discovered product through the UCP checkout control flow: classify `fulfillmentType`, require a US shipping address for `PHYSICAL_GOODS_REQUIRES_SHIPPING`, resolve paymentInstrumentId, list/match ACTIVE instruction+mandate first, start the instruction creation workflow when no match exists, then create and complete checkout only after a valid match exists
- create a full refund or poll refund status
- wait for async completion events from the Clink event hub
- inspect or update local Clink CLI configuration

## Do Not Use

- deciding whether the user should be charged
- inventing `amount`, `currency`, `merchantId`, `sessionId`, `orderId`, `paymentInstrumentId`, mandate scope, or merchant scope
- confirming merchant receipt, balance top-up completion, or product entitlement
- blindly retrying an ambiguous payment after timeout or network failure
- handling generic merchant integration design when no direct `clink-cli` action is needed

## Routing Boundary

- Merchant or product skills own business intent: when to charge, how much to charge, and how to confirm merchant-side success.
- This skill owns the Clink CLI execution path: wallet readiness, payment-method readiness, charge execution, refund submission, refund polling, event waiting, and risk-rule links.
- If the request is generic product language such as "enable auto top-up" without a direct Clink wallet or payment operation, route to the merchant or integration skill first.
- High-priority VIC route: if the user says to use Visa, or the selected/default payment method is known to be Visa, for a purchase, booking, order, reservation, hotel booking, ticket purchase, or equivalent, perform the VIC readiness and instruction list-first flow before any normal `pay`.

## Control Loop

Every workflow follows:

`Observe → Classify → Act → Verify → Return`

1. **Observe:** read the current CLI JSON envelope, exit code, event, or local config snapshot.
2. **Classify:** map the observation to a route, status, exit code, or event type before acting.
3. **Act:** run exactly the next allowed CLI command; do not skip guards or combine unrelated recovery actions.
4. **Verify:** use sync status, a matching event, or a `get`/status command before claiming a terminal state.
5. **Return:** hand structured payment/order/refund/checkout data back to the caller; do not confirm merchant fulfillment.

Maintain a **profile/environment lock**: once a workflow starts with `--profile <name>` and/or `--sandbox`, every follow-up command in that workflow must use the same profile and environment unless the caller explicitly starts a new workflow.

## Routing And Action Matrix

| Observation | Action |
| --- | --- |
| Need current payment-method readiness | `card binding-link --no-watch`, then inspect `paymentMethodsVoList`; do not trust `card list` alone |
| User must bind/manage card or risk rules | Run the link command without `--no-watch`, or wait with `events poll`, then verify the matching event |
| User says Visa, or selected/default payment method is known to be Visa, for purchase/order/book | Use the VIC instruction flow; list ACTIVE instructions before creating a draft |
| Discovered external product order | First classify fulfillment as `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`. If `UNKNOWN`, ask before checkout. If physical goods ship, collect a US shipping address before instruction list. Then list ACTIVE instructions for the resolved paymentInstrumentId; if no matching instruction+mandate exists, start the instruction creation workflow and stop UCP checkout until activation; if a valid match exists, run UCP checkout create then complete as one handoff: create checkout, parse checkoutId, then complete checkout with that paymentInstrumentId; do not use plain `pay` |
| Direct/session payment is explicitly authorized | Run `clink-cli pay` with exact inputs from the user or upstream merchant flow |
| `pay status=1` | Return payment success data for merchant confirmation; do not claim merchant fulfillment |
| `pay status=3/4/6` | Stop or offer recovery; do not report merchant success |
| `pay exit=6` | Treat state as unknown; verify before retry |
| `pay exit=7` | Send 3DS redirect URL and wait for the matching order event |
| `refund create ok` | Treat as submitted only; wait for refund event or `refund get` terminal state |
| UCP `complete_in_progress` | Use bounded `ucp-checkout get` recovery or return a resumable pending state |

## Hard Rules

- Never run `clink-cli pay` unless the user explicitly authorized this payment in the current context, or an upstream merchant workflow already supplied an explicit payment decision for this exact request.
- Never run `ucp-checkout create` or `ucp-checkout complete` for a product order until the target product, amount, currency, merchant context, fulfillment type, payment instrument, instruction ID, and mandate ID are all known and explicitly authorized for the same current request.
- Never invent payment parameters. Missing `amount`, `currency`, `merchantId`, `sessionId`, `orderId`, or target payment method means stop and ask the caller or user for the missing data.
- Never expose `customerApiKey` or other secrets in user-visible output.
- Never call `config set customer-api-key <value>` with a literal key. Pipe from the environment variable instead: `printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json`.
- Never run `wallet init` automatically during a payment or other operation. If exit code 3 or 4 is returned, ask the user to run wallet setup themselves.
- Treat `pay` exit code 6 or client-side timeout as an unknown payment state. Do not retry until the payment state is verified safe through merchant-side status, operator checks, or a caller-provided idempotency guarantee.
- For exit code 7, send the 3DS redirect URL to the user and wait for the matching order event before declaring success.
- Refunds require an explicit refund request and the original `orderId`. This skill only submits full refunds.
- Async completion is event-driven. Never claim binding, refund, VIC registration, instruction activation, risk-rule update, or post-3DS order completion until the matching event has been observed through the built-in link watch or `events poll`.
- VIC authorization prepares permission; it is not payment completion. Reuse ACTIVE instructions only when the selected card, amount cap, currency, service window, and merchant/category/title/description semantics cover the request.
- UCP checkout product orders must classify fulfillment before checkout: use `PHYSICAL_GOODS_REQUIRES_SHIPPING` only for shipped physical goods, `NO_SHIPPING_REQUIRED` for services/subscriptions/hotels/tickets/bookings/reservations/digital goods, and `UNKNOWN` only long enough to ask. Physical shipped goods require a US shipping address (`countryCode=US`) before instruction list, instruction creation, `tool item-id`, or checkout create.
- UCP checkout product orders must list ACTIVE instructions first, filter out reserve or inactive instruction/mandate entries, apply amount hard match and merchant semantic match, extract `item_id`, resolve the current/default paymentInstrumentId, create the external checkout, parse checkoutId from the create response, then complete it with `--payment-instrument-id`.
- If no matching instruction+mandate is found for a UCP product order, do not run `ucp-checkout create` or `ucp-checkout complete`; start the instruction creation workflow and wait for matching ACTIVE instruction evidence.
- No-match UCP branch is terminal for the current checkout attempt: after starting the instruction creation workflow, return a waiting/pending state and do not continue to item-id extraction, checkout create, or checkout complete until activation is observed and the flow restarts from instruction list.
- UCP checkout completion is not merchant fulfillment; delivery, entitlement, merchant receipt, or downstream business completion belongs to the merchant/product runtime.
- If the user asks to preview a command or verify inputs without execution, use `--dry-run` when supported.

## Quick Reference

| Need | Command |
| --- | --- |
| Initialize wallet | `clink-cli wallet init --email <email> --name <name> --format json` |
| Initialize sandbox wallet in its own profile | `clink-cli wallet init --sandbox --profile sandbox --email <email> --name <name> --format json` |
| Check wallet readiness | `clink-cli wallet status --format json` |
| Refresh payment methods without waiting | `clink-cli card binding-link --no-watch --format json` |
| Bind first card and wait | `clink-cli card binding-link --format json` |
| List cached payment methods | `clink-cli card list --format json` |
| Charge user | `clink-cli pay ... --format json` |
| Submit refund | `clink-cli refund create --order-id <order_id> --format json` |
| Poll refund | `clink-cli refund get --refund-id <refund_id> --format json` |
| Wait for event | `clink-cli events poll --type <eventType> --format json` |
| View risk rules | `clink-cli risk get --format json` |
| Get risk-rule config URL | `clink-cli risk link --format json` |
| List reusable VIC instructions | `clink-cli instruction list --status ACTIVE --payment-instrument-id <id> --format json` |
| Create VIC instruction draft | `clink-cli instruction create ... --format json` |
| Print instruction Passkey URL | `clink-cli instruction sign-url ... --format json` |
| Get one VIC instruction | `clink-cli instruction get --purchase-instruction-id <id> --format json` |
| Extract UCP product item ID | `clink-cli tool item-id --url <product_url> --format json` |
| Create external UCP checkout | `clink-cli ucp-checkout create ... --instruction-id <id> --mandate-id <id> --format json` |
| Complete external UCP checkout | `clink-cli ucp-checkout complete --checkout-id <id> --payment-instrument-id <id> --format json` |

## Output Contract

Always pass `--format json` so both success and error output are machine-parseable.

Success envelope on stdout:

```json
{ "ok": true, "data": { "...": "..." } }
```

Error envelope on stderr when JSON format is explicit:

```json
{ "ok": false, "error": { "type": "...", "code": 0, "message": "..." } }
```

Inspect the exit code first, then parse the stream that contains the envelope. When a command returns a list, treat the list as the payload inside `data`.

## Merchant Integration

When another skill needs to charge the user directly:

```text
Merchant skill                    Clink payment skill
--------------                    -------------------
Detects payment needed
Provides merchantId/amount
or sessionId
                                  Pre-checks wallet/card
                                  Executes clink-cli pay
Receives raw result
Confirms merchant receipt
```

Responsibilities:

- Merchant skill decides when to pay, how much to pay, and how to confirm receipt.
- This skill executes Clink operations and returns raw results or event confirmations.
- This skill can be used for pre-checks only, without executing a payment.

For a UCP checkout product order, the merchant/product skill owns product discovery and price truth; this skill owns the control flow that converts that target into a safe external checkout using `instruction list`, `tool item-id`, `ucp-checkout create`, and `ucp-checkout complete`.

## Common Mistakes

- Calling `pay` before wallet/card pre-checks.
- Retrying exit code 6 payments before resolving the unknown state.
- Inventing missing payment, mandate, or merchant-scope parameters.
- Creating a UCP checkout before proving an ACTIVE, not-reserved instruction/mandate matches the exact product amount and merchant semantics.
- Entering UCP checkout with `UNKNOWN` fulfillment, or trying physical goods without a standard US shipping address.
- Passing instruction or mandate flags to `ucp-checkout complete`; only create binds those fields, and external complete sends `payment_instrument_id` only.
- Reading `card list` alone when current card state is needed; refresh first with `card binding-link --no-watch`.
- Treating refunds as synchronous instead of waiting for `agent_refund.*` events or polling `refund get`.
- Declaring async flows complete before the matching event is observed.
- Busy-retrying link commands to check status instead of using the built-in watch or `events poll`.
- Passing `--no-watch` when you need to wait for the user's browser action, or omitting it when you only wanted a cache refresh.
