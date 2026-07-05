---
name: clink-payment-skill
description: "Use for direct Clink payment and wallet operations: Clink wallet initialization/status/config, risk-rule management, authorization management (Visa/VIC instruction, mandate, Passkey signing, async activation), card binding and payment-method management/readiness, executing an explicitly authorized recharge/top-up/payment for a known merchant_id, buying or ordering a product URL/product link with Clink pay (clink pay 买/购买/下单 商品链接), generic UCP checkout/order flows where merchant_id is unknown, generic UCP checkout/order flows where merchant_id is known, related async events, and Clink refund submission/status."
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

## Execution Ownership

Agent owns command execution. When this skill is triggered and required inputs/authorization are available, run the matching tool or `clink-cli` command yourself through the available runtime. Command examples are internal execution recipes, not user instructions. Ask the user only for missing data, explicit payment/refund authorization, shipping details, or required browser-page actions.

If the runtime cannot execute local commands, report that limitation and stop. Provide a manual command only when the user explicitly asks for a command preview or manual fallback.

## Before Running Commands

CRITICAL - before executing a matching operation, read the listed reference file. Do not rely on memory or infer hidden fields.

| Operation | Must read |
| --- | --- |
| Any command invocation, JSON parsing, exit-code handling, local bundle usage | `references/clink-cli-invocation.md` |
| Wallet init/status, single-user config, sandbox, card readiness, card management, risk links | `references/clink-wallet-config.md` |
| Waiting for binding, risk, refund, VIC, instruction, or 3DS completion events | `references/clink-async-events.md` |
| VIC agentic authorization, Visa readiness, purchase instruction list/create/sign-url/update/cancel | `references/clink-instruction.md` |
| Authorized payment execution, 3DS handling, refund submission/status | `references/clink-payment-refund.md` |
| UCP checkout product order flow, product-link purchase intent, instruction/mandate matching, item-id extraction, external checkout create/complete | `references/clink-ucp-checkout.md` |

Read multiple references when a workflow crosses boundaries. Example: a product order through UCP checkout needs `clink-cli-invocation.md`, `clink-wallet-config.md`, `clink-instruction.md`, `clink-ucp-checkout.md`, and sometimes `clink-async-events.md`.

## When to Use

- initialize a user's Clink wallet
- check wallet, sandbox, or payment-method readiness
- generate card binding, setup, modify, instruction signing, or risk-rule URLs
- execute a payment after amount and authorization are already clear; old pay must classify fulfillment first, Direct/session Visa payment must list/match ACTIVE instruction+mandate before pay
- order a discovered product or product URL/product link through the UCP checkout control flow: classify `fulfillmentType`, require a US shipping address for `PHYSICAL_GOODS_REQUIRES_SHIPPING`, resolve paymentInstrumentId, list/match ACTIVE instruction+mandate first, start the instruction creation workflow when no match exists, then create and complete checkout only after a valid match exists
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
2. **Classify:** map the observation to a route, status, exit code, or event type before acting. For payment output, prefer the explicit classifier in `lib/payment-workflow-fsm.mjs` and include `[PAYMENT_FSM] state=<STATE> action=<ACTION> reason=<REASON>` in structured handoffs. For product URL/link UCP checkout, use `lib/ucp-checkout-workflow-fsm.mjs` (`classifyUcpProductIntent`, `classifyUcpCheckoutPrerequisites`, `classifyAuthorizationSelection`, `classifyUcpCheckoutObservation`, `classifyUcpPaymentSuccessEventObservation`) and include `[UCP_CHECKOUT_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. Use `lib/workflow-marker.mjs` `formatWorkflowMarker` for marker formatting. For async events, use `lib/event-workflow-fsm.mjs` and `correlateEventWorkflow` to produce the `event_fsm` classification only after resource correlation.
3. **Act:** run exactly the next allowed CLI command; do not skip guards or combine unrelated recovery actions.
4. **Verify:** use sync status, a matching event, or a `get`/status command before claiming a terminal state.
5. **Return:** hand structured payment/order/refund/checkout data back to the caller; do not confirm merchant fulfillment.

Maintain an **environment lock**: define the `clink-cli` prefix once (see `references/clink-cli-invocation.md`), which is the only place sandbox vs production is chosen, and reuse it for every command in the workflow. Individual commands stay environment-neutral. Do not switch environment mid-workflow unless the caller explicitly starts a new workflow.

FSM action contract:

| Action | Required behavior |
| --- | --- |
| `WAIT_EVENT` | Return a pending state and wait for the correlated event or status check; do not claim completion. |
| `SEND_3DS_AND_WAIT_EVENT` | Send the redirect URL once, then wait for the matching `agent_order.succeeded` or `agent_order.failed`. |
| `RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION` | Return payment success evidence to the merchant layer; do not claim merchant fulfillment. |
| `STOP_PAYMENT_FAILURE` | Stop the payment path or offer an explicit recovery; do not retry automatically. |
| `VERIFY_BEFORE_RETRY` | Treat payment state as unknown and verify through a safe status/idempotency path before retry. |
| `START_WALLET_SETUP` | Start wallet/config recovery before any new payment attempt. |
| `POLL_PAYMENT_SUCCESS_EVENT` | Immediately run `clink-cli events poll --type agent_order.succeeded --format json` after UCP checkout complete returns `completed`; wait for the matching payment success event. |
| `RETURN_PAYMENT_SUCCESS_EVENT` | Surface the matched `agent_order.succeeded` event/message to the caller; do not claim merchant fulfillment. |
| `SURFACE_ERROR` | Surface the CLI/API error and stop without inventing recovery. |

## Routing And Action Matrix

| Observation | Action |
| --- | --- |
| Need current payment-method readiness | `card binding-link --no-watch`, then inspect `paymentMethodsVoList`; do not trust `card list` alone |
| User must bind/manage card or risk rules | Emit the link and immediately start a concurrent, non-blocking watch (bound command watch, or `events poll` for a hand-built URL such as the Visa Passkey registration link), then verify the matching event; do not wait for the user to report completion before listening |
| User says Visa, or selected/default payment method is known to be Visa, for purchase/order/book | Use the VIC instruction flow; list ACTIVE instructions before creating a draft |
| Discovered external product order | First classify fulfillment as `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`. If `UNKNOWN`, ask before checkout. If physical goods ship, collect a US shipping address before instruction list. Then list ACTIVE instructions for the resolved paymentInstrumentId; if no matching instruction+mandate exists, start the instruction creation workflow and stop UCP checkout until activation; if a valid match exists, run UCP checkout create then complete as one handoff: create checkout, parse checkoutId, complete checkout with that paymentInstrumentId, immediately poll `agent_order.succeeded`, then return the matched payment success event/message; do not use plain `pay` |
| Old direct/session pay fulfillment is `NO_SHIPPING_REQUIRED` | Do not ask for an address; pass the fixed default US address placeholder to `clink-cli pay` |
| Old direct/session pay fulfillment is `PHYSICAL_GOODS_REQUIRES_SHIPPING` | Ask for a real US shipping address and validate it before `instruction list` or `clink-cli pay` |
| Old direct/session pay fulfillment is `UNKNOWN` | Ask whether the product ships as physical goods; do not run `clink-cli pay` |
| Direct/session Visa payment is explicitly authorized | Resolve current/default paymentInstrumentId, list/match ACTIVE instruction+mandate first, start the instruction creation workflow when no match exists, and run `clink-cli pay` only with resolved `instruction_id` + `mandate_id` |
| Direct/session non-Visa payment is explicitly authorized | Run `clink-cli pay` with exact inputs from the user or upstream merchant flow |
| `pay status=1` | Return payment success data for merchant confirmation; do not claim merchant fulfillment |
| `pay status=3/4/6` | Stop or offer recovery; do not report merchant success |
| `pay exit=6` | Treat state as unknown; verify before retry |
| `pay exit=7` | Send 3DS redirect URL and wait for the matching order event |
| `refund create ok` | Treat as submitted only; wait for refund event or `refund get` terminal state |
| UCP `complete_in_progress` | Use bounded `ucp-checkout get` recovery or return a resumable pending state |

## Hard Rules

- Never run `clink-cli pay` unless the user explicitly authorized this payment in the current context, or an upstream merchant workflow already supplied an explicit payment decision for this exact request.
- Before old `clink-cli pay`, classify fulfillment. For `NO_SHIPPING_REQUIRED`, use the fixed default US address (`548 Market St`, `PMB 00000`, San Francisco, CA 94104, `address_country=US`) as the payment-context placeholder. For `PHYSICAL_GOODS_REQUIRES_SHIPPING`, collect a real US shipping address. For `UNKNOWN`, ask first.
- Old agent pay must use the fixed merchant category code `5999` in `aiAgentInstructionBo.merchantInfo.merchantCategoryCode`; do not ask the user or merchant skill for this MCC.
- For Direct/session Visa payment, `instruction_id` and `mandate_id` are mandatory. Before pay, run `clink-cli instruction list --valid-only --payment-instrument-id <current/default paymentInstrumentId> --format json`, apply amount hard match plus title/description/merchant semantic match, and inject the matched IDs. If there is no matching instruction+mandate, start the instruction creation workflow and stop; the No-match VIC pay branch is terminal for the current pay attempt.
- When no-match VIC pay starts instruction creation, preserve a pending payment intent with its draft instruction, then wait for `purchase_instruction.activated`. Resume through `resume_pending_payment_intent` only for the matching pending intent so the same FSM re-runs list/match/pay. A different instruction activation on the same card must not resume this intent. The merchant skill must not manually provide `instruction_id` or `mandate_id` or call pay outside this payment intent.
- Never run `ucp-checkout create` or `ucp-checkout complete` for a product order until the target product, amount, currency, merchant context, fulfillment type, payment instrument, instruction ID, and mandate ID are all known and explicitly authorized for the same current request.
- Never invent payment parameters. Missing `amount`, `currency`, `merchantId`, `sessionId`, `orderId`, or target payment method means stop and ask the caller or user for the missing data.
- Never expose `customerApiKey` or other secrets in user-visible output.
- Never call `config set customer-api-key <value>` with a literal key. Pipe from the environment variable instead: `printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json`.
- Never run `wallet init` as a hidden recovery inside payment, checkout, or refund execution. If exit code 3 or 4 is returned, stop the current operation and start the wallet initialization or configuration workflow yourself after collecting only the missing user input.
- Treat `pay` exit code 6 or client-side timeout as an unknown payment state. Do not retry until the payment state is verified safe through merchant-side status, operator checks, or a caller-provided idempotency guarantee.
- For exit code 7, send the 3DS redirect URL to the user and wait for the matching order event before declaring success.
- Refunds require an explicit refund request and the original `orderId`. This skill only submits full refunds.
- Async completion is event-driven. Never claim binding, refund, VIC registration, instruction activation, risk-rule update, or post-3DS order completion until the matching event has been observed through the built-in link watch or `events poll`. Start that listener at URL-emit time, concurrently and non-blocking, not after the user reports completion; when a flow has multiple valid readiness events (for example VIC registration), watch all of them and confirm against authoritative status (`card get`, `refund get`) rather than a single event type.
- VIC authorization prepares permission; it is not payment completion. Reuse ACTIVE instructions only when the selected card, amount cap, currency, service window, and merchant/category/title/description semantics cover the request.
- UCP checkout product orders must classify fulfillment before checkout: use `PHYSICAL_GOODS_REQUIRES_SHIPPING` only for shipped physical goods, `NO_SHIPPING_REQUIRED` for services/subscriptions/hotels/tickets/bookings/reservations/digital goods, and `UNKNOWN` only long enough to ask. Physical shipped goods require a US shipping address before instruction list, instruction creation, `tool item-id`, or checkout create. Use the CWallet instruction address shape (`countryCode=US`, `line1`, `zip`) for `instruction create`, and the UCP Postal Address shape (`address_country=US`, `street_address`, `postal_code`) for `ucp-checkout create` and VIC `pay` shipping context.
- UCP checkout product orders must list ACTIVE instructions first, filter out reserve or inactive instruction/mandate entries, apply amount hard match and merchant semantic match, extract `item_id`, resolve the current/default paymentInstrumentId, create the external checkout, parse checkoutId from the create response, then complete it with `--payment-instrument-id`.
- After UCP checkout complete returns `completed`, immediately run `clink-cli events poll --type agent_order.succeeded --format json`, correlate the returned event to the current checkout/order/session when identifiers are available, and send the matched success event/message back to the caller.
- If no matching instruction+mandate is found for a UCP product order, do not run `ucp-checkout create` or `ucp-checkout complete`; start the instruction creation workflow and wait for matching ACTIVE instruction evidence.
- No-match UCP branch is terminal for the current checkout attempt: after starting the instruction creation workflow, return a waiting/pending state and do not continue to item-id extraction, checkout create, or checkout complete until activation is observed and the flow restarts from instruction list.
- UCP checkout completion is not merchant fulfillment; delivery, entitlement, merchant receipt, or downstream business completion belongs to the merchant/product runtime.
- If the user asks to preview a command or verify inputs without execution, use `--dry-run` when supported.

## Quick Reference

| Need | Command |
| --- | --- |
| Initialize wallet | `clink-cli wallet init --email <email> --name <name> --format json` (use credentials matching the prefix's environment) |
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
| List reusable VIC instructions | `clink-cli instruction list --valid-only --payment-instrument-id <id> --format json` |
| Create VIC instruction draft | `clink-cli instruction create ... --format json` |
| Print instruction Passkey URL | `clink-cli instruction sign-url ... --format json` |
| Get one VIC instruction | `clink-cli instruction get --purchase-instruction-id <id> --format json` |
| Extract UCP product item ID | `clink-cli tool item-id --url <product_url> --format json` |
| Create external UCP checkout | `clink-cli ucp-checkout create ... --instruction-id <id> --mandate-id <id> --format json` |
| Complete external UCP checkout | `clink-cli ucp-checkout complete --checkout-id <id> --payment-instrument-id <id> --format json` |
| Wait for UCP payment success | `clink-cli events poll --type agent_order.succeeded --format json` |

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
- Waiting for the user to report completion before starting to listen; start the event watch the moment the URL is emitted, and for the Visa Passkey registration URL (no built-in watch) start a concurrent `events poll` right away.
