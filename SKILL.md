---
name: clink-payment-skill
description: "Use when handling Clink wallet init/status/config, card or risk readiness, direct/UCP payment, refund, VIC/3DS events, listing tippable skills (支持打赏哪些 skill), tipping one or multiple skills, or installing a public skill by publisher/name with optional version or a Number from recent context."
version: "1.7.0"
requires:
  node: ">=20"
  bundled: "vendor/clink-cli/clink-cli.bundle.mjs"
---

# Clink Payment Skill

Use this skill for direct Clink payment operations through `clink-cli`.

This skill executes wallet, card, payment, refund, risk, VIC instruction, public-skill listing/tipping/installation, internal/external UCP checkout, utility, event, and local config commands. It does not decide pricing, entitlement, or merchant receipt confirmation.

## Execution Ownership

Agent owns command execution. When this skill is triggered and required inputs/authorization are available, run the matching tool or `clink-cli` command yourself through the available runtime. Command examples are internal execution recipes, not user instructions. Ask the user only for missing data, explicit payment/refund authorization, shipping details, or required browser-page actions.

If the runtime cannot execute local commands, report that limitation and stop. Provide a manual command only when the user explicitly asks for a command preview or manual fallback.

## Before Running Commands

CRITICAL - before executing a matching operation, read the listed reference file. Do not rely on memory or infer hidden fields.

| Operation | Must read |
| --- | --- |
| Any command invocation, JSON parsing, exit-code handling, local bundle usage | `references/clink-cli-invocation.md` |
| Wallet init/status, single-user config, sandbox, card readiness, card management, risk links | `references/clink-wallet-config.md` |
| Waiting for binding, risk, refund, VIC, instruction, 3DS completion, or optional Agent Pay account-confirmation events | `references/clink-async-events.md` |
| VIC agentic authorization, Visa readiness, purchase instruction list/create/sign-url/update/cancel | `references/clink-instruction.md` |
| Authorized payment execution, 3DS handling, refund submission/status | `references/clink-payment-refund.md` |
| UCP checkout product order flow, product-link purchase intent, instruction/mandate matching, product analysis with `parse-item`, checkout route resolution, checkout create/complete | `references/clink-ucp-checkout.md` |
| Public skill listing, skill tip input/authorization, Number snapshot safety, tip result handling, optional merchant account events | `references/clink-skill-tip.md` |
| Public Skill installation by identity or Number, confirmation safety, CLI result handling, install conflicts | `references/clink-skill-install.md` |

Read multiple references when a workflow crosses boundaries. Example: a product order through UCP checkout needs `clink-cli-invocation.md`, `clink-wallet-config.md`, `clink-instruction.md`, `clink-ucp-checkout.md`, and sometimes `clink-async-events.md`.

## When to Use

- initialize a user's Clink wallet
- check wallet, sandbox, or payment-method readiness
- refresh payment-instrument list / `paymentMethodsVoList` from Clink before selecting a card or relying on cached payment methods
- generate card binding, setup, modify, instruction signing, or risk-rule URLs
- execute a payment after amount and authorization are already clear; old pay must classify fulfillment first, refresh the payment-instrument list, then run the direct/session authorization resolver before pay; Visa + VIC direct/session pay must list/match ACTIVE instruction+mandate before pay
- order a discovered product or product URL/product link through the UCP checkout control flow: resolve or explore to a product detail URL, use `clink-cli tool parse-item --url <item_url>` for product-page facts, select one available item, classify `fulfillmentType`, require a standard complete shipping address for `PHYSICAL_GOODS_REQUIRES_SHIPPING`, resolve paymentInstrumentId, list/match ACTIVE instruction+mandate only when Visa + VIC is ready, start the instruction workflow when no match exists, resolve internal vs external checkout route through `clink-cli tool internal-ucp get-endpoint`, then create and complete checkout only after all guards pass
- create a full refund or poll refund status
- wait for async completion events from the Clink event hub
- list public skills that support tipping and present exactly Number, publisher, and skill name with all table headers in the user's language
- tip one or multiple skills in USD by exact publisher/name without a version, with one shared amount or per-item amounts; Number targets resolve from a list displayed in the same context within two hours
- install one public Skill by exact publisher/name with optional version, or resolve and confirm a Number from a list displayed in the same context within two hours
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
- High-priority VIC route: when refreshed card data shows the selected/default payment method is Visa + VIC ready for a purchase, booking, order, reservation, hotel booking, ticket purchase, or equivalent, perform the instruction list-first flow before normal `pay`; non-Visa or Visa without VIC readiness bypasses instruction matching for direct/session pay.

## User-Visible Output Boundary

- Never include raw FSM markers such as `[SKILL_INSTALL_FSM] state=... action=... reason=...` in commentary or final responses to the user.
- Treat every instruction in this Skill or its references to include, emit, report, or format an FSM marker as internal-only diagnostics. Store markers only in private logs or non-user-visible structured handoffs; omit them when no private channel exists.
- Translate workflow state into concise natural language for the user, such as installation succeeded, no changes were needed, confirmation is required, or installation failed with the returned reason.
- Do not expose raw `state`, `action`, or `reason` fields unless the user explicitly requests diagnostic details.

## Control Loop

Every workflow follows:

`Observe → Classify → Act → Verify → Return`

1. **Observe:** read the current CLI JSON envelope, exit code, event, or local config snapshot.
2. **Classify:** map the observation to a route, status, exit code, or event type before acting. For wallet init output, use `lib/wallet-workflow-fsm.mjs` (`classifyWalletInitObservation`) and include `[WALLET_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. For payment intent routing, use `lib/payment-intent-router-fsm.mjs` (`classifyPaymentIntent`) and include `[PAYMENT_INTENT_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. Skill-tip list questions route to `SKILL_TIP_LIST`; an explicitly authorized tip with one exact target and USD amount routes to `SKILL_TIP`. Use `lib/skill-tip-workflow-fsm.mjs` and include `[SKILL_TIP_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. Multiple targets route to `SKILL_TIP_BATCH`; use `lib/skill-tip-batch-workflow-fsm.mjs` and include `[SKILL_TIP_BATCH_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. An explicitly authorized public Skill installation routes to `SKILL_INSTALL`; use `lib/skill-install-workflow-fsm.mjs` and include `[SKILL_INSTALL_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. Product signals route to UCP checkout only with explicit buy/order/checkout language or an upstream purchaseIntent; otherwise ask for the missing purchase intent. For direct/session pre-pay authorization routing, use `lib/authorization-workflow-fsm.mjs` (`classifyPaymentAuthorizationResolver`) and include `[AUTHORIZATION_FSM] state=<STATE> action=<ACTION> reason=<REASON>`. After `instruction create` or `instruction sign-url`, use `classifyAuthorizationDraftObservation` to build the activation waitSpec; after a correlated activation event, use `classifyAuthorizationActiveVerification` on `instruction get --purchase-instruction-id <id> --format json` before resuming. For payment output, use `lib/payment-workflow-fsm.mjs` (`classifyPaymentObservation` and `classifyPaymentAccountEventObservation`) and include `[PAYMENT_FSM] state=<STATE> action=<ACTION> reason=<REASON>` in structured handoffs. After synchronous Agent Pay success, pass the active payment-watch set through `lib/event-workflow-fsm.mjs` `classifyEventPollObservation`; its `AGENT_PAY_ACCOUNT` purpose uses `classifyAgentPayAccountEventCandidate` before the Payment FSM aggregates the optional result. For product URL/link UCP checkout, use `lib/ucp-checkout-workflow-fsm.mjs` (`classifyUcpProductIntent`, `classifyUcpParseItemObservation`, `classifyUcpCheckoutPrerequisites`, `classifyAuthorizationSelection`, `classifyUcpCheckoutObservation`, `classifyUcpPaymentSuccessEventObservation`) and `lib/ucp-checkout-route-fsm.mjs` (`classifyUcpCheckoutRoute`); include `[UCP_CHECKOUT_FSM]` and `[UCP_CHECKOUT_ROUTE_FSM]` markers. Use `lib/workflow-marker.mjs` `formatWorkflowMarker` for marker formatting. For other async events, use `lib/event-workflow-fsm.mjs` (`classifyEventWaitRequest`, `classifyEventPollObservation`, and `correlateEventWorkflow`) to start the typed poll and produce the `event_fsm` classification only after resource correlation.
3. **Act:** run exactly the next allowed CLI command; do not skip guards or combine unrelated recovery actions.
4. **Verify:** use sync status, a matching event, or a `get`/status command before claiming a terminal state.
5. **Return:** hand structured payment/order/refund/checkout data back to the caller; do not confirm merchant fulfillment.

Maintain an **environment lock**: select production, sandbox/UAT, or one explicit base URL once (see `references/clink-cli-invocation.md`), bind `clink-cli` to that exact wrapper invocation, and reuse it for every command in the workflow. `bin/clink-cli` defaults to production; a sandbox workflow binds `--sandbox` into the logical wrapper once. Individual command recipes stay environment-neutral.

FSM action contract:

| Action | Required behavior |
| --- | --- |
| `WAIT_EVENT` | Return a pending state and wait for the correlated event or status check; do not claim completion. |
| `SEND_3DS_AND_WAIT_EVENT` | Send the redirect URL once, then wait for the matching `agent_order.succeeded` or `agent_order.failed`. |
| `RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION` | Return payment success evidence to the merchant layer; do not claim merchant fulfillment. |
| `STOP_PAYMENT_FAILURE` | Stop the payment path or offer an explicit recovery; do not retry automatically. |
| `VERIFY_BEFORE_RETRY` | Treat payment state as unknown and verify through a safe status/idempotency path before retry. |
| `START_WALLET_SETUP` | Start wallet/config recovery before any new payment attempt. |
| `ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT` | When `clink-cli wallet init` returns `BOOTSTRAP_OTP_REQUIRED`, code `71160015`, `cwallet.bootstrap.otp.required`, or "Verification code has been sent to this email. Please retry with otp.", tell the user to check the Clink OTP email, ask for the OTP, then rerun wallet init with the same email/name plus `--otp <email_otp>`. |
| `REFRESH_PAYMENT_INSTRUMENT_LIST` | Run `clink-cli card binding-link --no-watch --format json` and resolve the selected/default payment instrument before direct/session pay. |
| `RUN_PAY_WITHOUT_AUTHORIZATION` | For direct/session pay, bypass instruction matching because the selected/default card is non-Visa or Visa without VIC readiness; run `clink-cli pay` without instruction/mandate IDs. |
| `LIST_AUTHORIZATIONS` | For Visa + VIC ready direct/session pay, run `clink-cli instruction list --valid-only --payment-instrument-id <id> --format json` before pay. |
| `RUN_PAY_WITH_AUTHORIZATION` | Run `clink-cli pay` with the matched `instruction_id` and `mandate_id`. |
| `START_AUTHORIZATION_DRAFT_AND_WAIT` | Create the mandate/instruction draft for the same payment intent, then run `classifyAuthorizationDraftObservation` on the CLI output. |
| `START_AUTHORIZATION_ACTIVATION_WATCH` | Send the Passkey URL and immediately start `clink-cli events poll --type purchase_instruction.activated --no-ack --format json` from the returned waitSpec; do not wait for the user to report completion before listening. |
| `VERIFY_RESOURCE_STATUS` | After `classifyEventPollObservation` correlates the event by `instructionId` / `purchaseInstructionId`, run the waitSpec verify command, normally `clink-cli instruction get --purchase-instruction-id <id> --format json`. |
| `PARSE_ITEM` | Run `clink-cli tool parse-item --url <item_url> --format json` before UCP checkout create/update. |
| `ASK_FOR_ITEM_SELECTION` | Ask the user to choose when `parse-item` returns multiple available items and the user is present. |
| `SELECT_ITEM_BY_CONTEXT` | In long tasks when the user is absent, select one available item from `parse-item` output using the frozen user intent and record the reason. |
| `RESOLVE_CHECKOUT_ROUTE` | Run `classifyUcpCheckoutRoute` after item selection. First execute the returned `clink-cli tool internal-ucp get-endpoint --product-url <item_url> --format json`. A resolved endpoint selects `INTERNAL_UCP_CHECKOUT`; only `NOT_IN_INTERNAL_UCP_LIST` continues to standard UCP profile discovery. |
| `GET_INTERNAL_UCP_ENDPOINT` | Execute the environment-locked internal endpoint command. On success create internal UCP checkout with the returned endpoint. On `NOT_IN_INTERNAL_UCP_LIST`, run the returned standard profile probe. Surface every other error without fallback. |
| `POLL_PAYMENT_SUCCESS_EVENT` | Immediately run `clink-cli events poll --type agent_order.succeeded --format json` after UCP checkout complete returns `completed`; wait for the matching payment success event. |
| `RETURN_PAYMENT_SUCCESS_EVENT` | Surface the matched `agent_order.succeeded` event/message to the caller; do not claim merchant fulfillment. |
| `RETURN_SKILL_TABLE` | Run `clink-cli skills list --all --tippable --format json`, preserve CLI Number values, and return exactly Number, publisher, and skill name with all three headers in the user's language. |
| `RUN_SKILL_TIP_LIST_WORKFLOW` | When no same-context two-hour snapshot resolves a Number, preserve the returned `tipDraft.confirmationRequired=true`, list tippable Skills, and display the table before creating a confirmation pending object. |
| `ASK_FOR_TIP_CONFIRMATION` | Show the frozen Number, publisher/name, amount, and USD without a version; do not execute payment. |
| `CLAIM_PENDING_TIP` | Atomically change the same pending object from `AWAITING_CONFIRMATION` to `EXECUTING`; return no command until the claim succeeds. |
| `CANCEL_PENDING_TIP` | Atomically change `AWAITING_CONFIRMATION` to `CANCELLED`; never execute payment. |
| `RUN_SKILL_TIP` | Execute only the exact authorized publisher/name and amount; never pass version or Number to the CLI. Preserve the returned complete `expectedTip` binding for result classification. |
| `START_CARD_BINDING` | For the exact insufficient-default-Balance error, return only `Credit 余额不足，请先绑定银行卡`, run `clink-cli card binding-link --format json`, send the binding URL, and keep the binding watch active. Never tell the user to recharge Credit or Balance. |
| `ASK_FOR_TIP_BATCH_CONFIRMATION` | Show every distinct Skill, each USD amount, authorized total, ignored duplicates, and the continue-after-error policy; require one confirmation for the frozen batch. |
| `CLAIM_PENDING_TIP_BATCH` | Atomically change the same batch from `AWAITING_CONFIRMATION` to `EXECUTING`; return no payment command until the claim succeeds. |
| `RUN_NEXT_SKILL_TIP` | Run exactly one frozen `clink-cli skills tip` call for the current distinct Skill. Payment calls are sequential. |
| `WAIT_FOR_SKILL_TIP_ITEM` | Keep the current batch index while an interactive authorization or 3DS continuation is unresolved; do not submit a later payment. |
| `RETURN_SKILL_TIP_BATCH_RESULT` | Return ordered item statuses and `ALL_PAID`, `PARTIAL`, or `NONE_PAID`; batch `COMPLETED` does not mean all items were paid. |
| `ASK_FOR_INSTALL_CONFIRMATION` | For a Number target, show the frozen publisher/name/version and create one bound pending confirmation; do not install yet. |
| `CLAIM_PENDING_INSTALL` | Atomically change the same install pending object from `AWAITING_CONFIRMATION` to `EXECUTING`; return no command until the claim succeeds. |
| `CANCEL_PENDING_INSTALL` | Atomically change the install pending object from `AWAITING_CONFIRMATION` to `CANCELLED`; never execute installation. |
| `RUN_SKILL_INSTALL` | Execute `clink-cli skills install <publisher>/<skillName>[@<version>] --format json` using one exact authorized identity. Omit the version to select latest. |
| `RETURN_INSTALL_PLAN` | Report a dry-run as `PLANNED`, not installed. |
| `RETURN_INSTALL_SUCCESS` | Return only a binding-matched `INSTALLED`, `UPDATED`, or `UNCHANGED` result. |
| `SEND_PASSKEY_AND_WAIT` | Handle a legacy tip authorization continuation defensively; it is not the latest Credit-only normal path and no tip payment has occurred yet. |
| `START_OPTIONAL_ACCOUNT_EVENT_WATCH` | After synchronous Agent Pay or Skill Tip success, keep payment `PAID` and immediately start bounded `account-created` and `account-reloaded` polls in parallel. |
| `WAIT_OPTIONAL_ACCOUNT_EVENT` | Keep `PAID` and wait when only one of the two optional account polls has settled; do not report absence until both settle. |
| `RETURN_SUCCESS_WITH_ACCOUNT_EVENT` | For Agent Pay, return `PAID` plus one uniquely attributed account event, its message key, and allowlisted core information. |
| `RETURN_SUCCESS_WITHOUT_ACCOUNT_EVENT` | For Agent Pay, return `PAID` when neither optional account event is observed in the bounded window. |
| `RETURN_SUCCESS_WITH_WARNING` | For Agent Pay, return `PAID` plus `POLL_ERROR` or `AMBIGUOUS`; never claim merchant-order confirmation from uncertain evidence. |
| `RETURN_TIP_SUCCESS` | Return `PAID` plus one correlated optional account event. |
| `RETURN_TIP_SUCCESS_WITHOUT_ACCOUNT_EVENT` | Return `PAID` when neither optional account event is observed in the bounded window. |
| `RETURN_TIP_SUCCESS_WITH_WARNING` | Return `PAID` plus an optional-monitoring warning when account polling fails. |
| `SURFACE_ERROR` | Surface the CLI/API error and stop without inventing recovery. |

## Routing And Action Matrix

| Observation | Action |
| --- | --- |
| User asks which skills support tipping | Run `clink-cli skills list --all --tippable --format json`, classify with `classifySkillListObservation`, and return exactly Number, publisher, and skill name with all headers matching the user's language. |
| User explicitly authorizes an identity tip | Require exact publisher/name, a positive amount, and USD; run `clink-cli skills tip --publisher <publisher> --name <skill_name> --amount <amount> --format json` without a version. |
| User explicitly authorizes a Number tip with a same-context list displayed within two hours | Resolve Number to the frozen publisher/name and run the versionless identity command without refreshing the list. |
| Number tip has no valid two-hour context snapshot | List and display tippable Skills, freeze the selected row, then require confirmation before atomically claiming and executing the identity command. |
| User requests multiple Skill tips with one shared amount | Resolve every target, de-duplicate by case-insensitive publisher/name with the first occurrence and amount winning, then require one confirmation for the complete frozen batch. |
| User requests multiple Skill tips with per-item amounts | Validate every target and amount before confirmation, freeze the complete batch, then execute one `clink-cli skills tip` invocation per distinct Skill in sequential order. |
| A batch item is `FAILED` or `UNKNOWN` | Record the item, never automatically retry it, and continue with the next frozen Skill. |
| A batch item requires authorization or 3DS | Keep it active and do not submit the next payment until the existing single-tip workflow reaches a terminal payment classification. |
| Skill tip returns `Credit 余额不足，请先绑定银行卡` | Payment was not attempted. Return the same stable message, start `clink-cli card binding-link --format json`, send the binding URL, and wait for binding. Never suggest recharge/top-up. |
| Skill tip returns `status=paid` with agent pay `status=1` | Treat synchronous agent pay success as payment success immediately, then start the two optional account-event polls. |
| Optional skill-tip account polls time out or fail | Keep payment status `PAID`; report `NOT_OBSERVED` or `POLL_ERROR` without claiming the merchant lacks support. |
| User explicitly authorizes `publisher/name` installation | Run the identity install command without a version so Marketplace selects latest. |
| User explicitly authorizes `publisher/name@version` installation | Run one exact versioned package operand; never translate it into a separate version flag. |
| User requests installation by Number from a valid two-hour snapshot | Freeze publisher/name/version/skillId, ask for confirmation, atomically claim the pending object, then run the frozen identity command. |
| Number installation lacks a valid scoped snapshot | Ask for publisher/name/version or ask the user to list Skills first; never scan Markdown, refresh and reuse Number silently, or guess. |
| Skill installation returns `planned` | Report `PLANNED`, not installed. |
| Need current payment-method readiness or refresh payment-instrument list | `clink-cli card binding-link --no-watch --format json`, then inspect `data.paymentMethodsVoList`; Do not use `card list` alone for freshness |
| `wallet init` returns `BOOTSTRAP_OTP_REQUIRED` / `71160015` / `cwallet.bootstrap.otp.required` | Ask the user to check the Clink verification email and provide the OTP, then retry `clink-cli wallet init --email <email> --name <name> --otp <email_otp> --format json` using the same email, name, and environment lock. |
| User must bind/manage card or risk rules | Emit the link and immediately start a concurrent, non-blocking watch (bound command watch, or `events poll` for a hand-built URL such as the Visa Passkey registration link), then verify the matching event; do not wait for the user to report completion before listening |
| Selected/default payment method is Visa + VIC ready for purchase/order/book | Use the VIC instruction flow; list ACTIVE instructions before creating a draft |
| Discovered product order | Resolve or explore to one product detail URL, run `clink-cli tool parse-item --url <item_url> --format json`, select exactly one available item, let agent/FSM supply quantity, merchantCategoryCode, fulfillmentType, and shipping when required. If fulfillment is `UNKNOWN`, ask before checkout. If physical goods ship, collect a standard complete shipping address before instruction list or checkout create. Resolve paymentInstrumentId, list/match ACTIVE instruction+mandate only when Visa + VIC is ready, and stop until activation when no match exists. Then run `classifyUcpCheckoutRoute` and its `clink-cli tool internal-ucp get-endpoint` command. A resolved endpoint uses internal checkout. Only `NOT_IN_INTERNAL_UCP_LIST` triggers `/.well-known/ucp-clink` probing followed by `get-rest-endpoint`; fallback provider `clinkbill` uses internal checkout, while other providers or discovery failures use external checkout. Create checkout, parse checkoutId, complete checkout, immediately poll `agent_order.succeeded`, and return the matched event/message; do not use plain `pay`. |
| Old direct/session pay fulfillment is `NO_SHIPPING_REQUIRED` | Do not ask for an address; pass the fixed Apple Park default US address placeholder to `clink-cli pay` |
| Old direct/session pay fulfillment is `PHYSICAL_GOODS_REQUIRES_SHIPPING` | Ask for a real US shipping address and validate it before `instruction list` or `clink-cli pay` |
| Old direct/session pay fulfillment is `UNKNOWN` | Ask whether the product ships as physical goods; do not run `clink-cli pay` |
| Direct/session payment is explicitly authorized | Classify fulfillment, refresh payment instruments, and run `classifyPaymentAuthorizationResolver`. If the selected/default card is non-Visa or Visa without VIC readiness, run `clink-cli pay` without instruction/mandate IDs. If it is Visa + VIC ready, list/match ACTIVE instruction+mandate first; if no match exists, start the instruction creation workflow and stop until activation. |
| `pay status=1` | Treat payment as synchronously `PAID`, return the payment result immediately, and start `account-created` plus `account-reloaded` optional polls. Uniquely attributed evidence may confirm account creation/merchant order; do not claim fulfillment beyond that event. |
| Optional Agent Pay account polls time out, fail, or cannot select one payment | Keep `PAID`; report `NOT_OBSERVED`, `POLL_ERROR`, or `AMBIGUOUS` without retrying payment or claiming merchant-order confirmation. |
| `pay status=3/4/6` | Stop or offer recovery; do not report merchant success |
| `pay exit=6` | Treat state as unknown; verify before retry |
| `pay exit=7` | Send 3DS redirect URL and wait for the matching order event |
| `refund create ok` | Treat as submitted only; wait for refund event or `refund get` terminal state |
| UCP `complete_in_progress` | Use bounded `ucp-checkout get` recovery or return a resumable pending state |

## Hard Rules

- Never run a Skill installation from a question, tutorial/status request, negated, historical, conditional, malformed, multi-target, or conflicting request. An identity installation requires one exact imperative package target; a Number installation always requires a bound confirmation.
- For Skill installation, Number is context only. Use the newest explicit-scope (`all` or `tippable`) structured snapshot displayed within two hours for the same user, conversation/session, and exact environment lock. Freeze publisher/name/optional version/skillId; never pass Number to the CLI, scrape Markdown, or fall back to an older snapshot when the newest selected snapshot is invalid.
- The latest install syntax is one package operand. Omit version to select latest; reject literal `latest` and noncanonical version wording. Do not use a separate version flag, and do not add replacement behavior unless the user explicitly authorizes `--force` after a conflict.
- Number confirmation first returns `CLAIM_PENDING_INSTALL`; only a successful atomic `AWAITING_CONFIRMATION -> EXECUTING` transition may produce an install command. Consumed, cancelled, expired, cross-context, or already-executing pending objects never execute again.
- Treat a Skill install as successful only from one strict `{ok:true,data}` envelope whose publisher, skill name, and requested version match `expectedInstall`. `planned` is preview only; a nonzero exit, malformed envelope, or binding mismatch is not success.
- Never run `clink-cli skills tip` unless the current request affirmatively authorizes the exact target and positive USD amount, or one complete multi-Skill batch. Negated, cancelled, questioned, historical, conditional, counterfactual, and advice requests are not payment authorization. Ambiguous batch amount wording requires clarification.
- A batch supports one shared amount or per-item amounts and always requires one confirmation. Resolve the complete batch before confirmation; if one target, Number, amount, currency, or context is invalid, do not confirm or execute a subset.
- De-duplicate a batch by trimmed case-insensitive publisher/name. The first occurrence wins: preserve its spelling and amount, ignore later duplicates without accumulation, and disclose ignored duplicates in the confirmation.
- After an atomic `CLAIM_PENDING_TIP_BATCH`, execute one `clink-cli skills tip` call per distinct Skill, sequentially in frozen order. Never submit batch payment calls concurrently or add a CLI batch argument.
- A terminal `FAILED` or `UNKNOWN` batch item does not stop later items. Record it, continue with the next frozen item, and never automatically retry it. An interactive authorization or 3DS item blocks later payment submission until it becomes terminal.
- Batch `COMPLETED` means all distinct items were attempted or resolved; it does not mean all were paid. Return every item plus `ALL_PAID`, `PARTIAL`, or `NONE_PAID`.
- Number is a context index, never a `skills tip` CLI target. Use only the newest structured snapshot displayed within two hours for the same user, conversation/session, and exact environment lock. Resolve Number to frozen publisher/name and optional internal skill ID; never bind a tip to snapshot version, scrape history, or refresh the list when that snapshot is valid.
- Without a valid Number snapshot, run `skills list --all --tippable`, display exactly the localized three-column table, freeze publisher/name and optional internal skill ID, and require confirmation. Confirmation first returns `CLAIM_PENDING_TIP`; only a successful atomic `AWAITING_CONFIRMATION -> EXECUTING` transition may produce the payment command. Consumed, cancelled, expired, or already-executing pending objects never execute again.
- The latest Skill Tip command refreshes and uses the explicit default payment method. A default `CARD` is charged directly; a default `BALANCE` must have enough finite `availableBalance`. Do not add VIC instruction, mandate, mixed-payment, currency, or payment-instrument flags.
- When Skill Tip returns the exact error `Credit 余额不足，请先绑定银行卡`, classify `TIP_CARD_BINDING_REQUIRED / START_CARD_BINDING`. The stable user message is exactly `Credit 余额不足，请先绑定银行卡`; immediately start `clink-cli card binding-link --format json` and its binding watch. Never tell the user to recharge, top up, or add funds to Credit/Balance in this branch.
- Treat a `payment_unknown` payload or exit code 6 as unknown even when the charge request returned an HTTP response. Never retry until an order/idempotency status path proves retry safety.
- For skill tips, synchronous agent pay success (`status=paid` with underlying `status=1`) is payment success. Do not require an order event or merchant account event before returning `PAID`.
- A paid Skill Tip result requires the execution-ready `expectedTip` binding and must match its publisher, skill name, optional skill ID, amount, and USD currency. The version resolved by the CLI is result metadata, not an authorization constraint. Missing or mismatched binding is `UNKNOWN`, never an unbound success.
- `account-created` and `account-reloaded` are optional merchant events and mutually exclusive for one tip. Correlate any observed event to the current tip; timeout or poll failure never downgrades `PAID`.
- Treat skill-tip exit code 6 or client timeout as an unknown payment state. Never retry the tip automatically.
- Never run `clink-cli pay` unless the user explicitly authorized this payment in the current context, or an upstream merchant workflow already supplied an explicit payment decision for this exact request.
- Before old `clink-cli pay`, classify fulfillment. For `NO_SHIPPING_REQUIRED`, use the fixed Apple Park default US address (`One Apple Park Way`, Cupertino, CA 95014, `address_country=US`) as the payment-context placeholder. For `PHYSICAL_GOODS_REQUIRES_SHIPPING`, collect a real US shipping address. For `UNKNOWN`, ask first.
- Old agent pay must use the fixed merchant category code `5999` in `aiAgentInstructionBo.merchantInfo.merchantCategoryCode`; do not ask the user or merchant skill for this MCC.
- For Direct/session pay, always refresh payment instruments and run `classifyPaymentAuthorizationResolver` before `clink-cli pay`. If the selected/default card is non-Visa or Visa without VIC readiness, bypass instruction matching and run pay without `instruction_id`/`mandate_id`. If the selected/default card is Visa + VIC ready, `instruction_id` and `mandate_id` are mandatory: run `clink-cli instruction list --valid-only --payment-instrument-id <current/default paymentInstrumentId> --format json`, apply amount hard match plus title/description/merchant semantic match, and inject the matched IDs. If there is no matching instruction+mandate, start the instruction creation workflow and stop; the no-match authorization branch is terminal for the current pay attempt.
- When no-match Visa + VIC ready pay starts instruction creation, preserve a pending payment intent with its draft instruction, then wait for `purchase_instruction.activated` through `clink-cli events poll --type purchase_instruction.activated --no-ack --format json`. Resume through `resume_pending_payment_intent` only after `classifyEventPollObservation` matches the activation by the same `instructionId` / `purchaseInstructionId` and `classifyAuthorizationActiveVerification` proves the instruction is ACTIVE through `instruction get --purchase-instruction-id <id> --format json`. A different instruction activation on the same card must not resume this intent. The merchant skill must not manually provide `instruction_id` or `mandate_id` or call pay outside this payment intent.
- Never run UCP checkout create or complete for a product order until the selected item, amount, currency, merchant context, fulfillment type, payment instrument, and required authorization context are all known and explicitly authorized for the same current request.
- Never invent payment parameters. Missing `amount`, `currency`, `merchantId`, `sessionId`, `orderId`, or target payment method means stop and ask the caller or user for the missing data.
- Never expose `customerApiKey` or other secrets in user-visible output.
- Never call `config set customer-api-key <value>` with a literal key. Pipe from the environment variable instead: `printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json`.
- Never run `wallet init` as a hidden recovery inside payment, checkout, or refund execution. If exit code 3 or 4 is returned, stop the current operation and start the wallet initialization or configuration workflow yourself after collecting only the missing user input.
- If wallet initialization returns `BOOTSTRAP_OTP_REQUIRED`, code `71160015`, `cwallet.bootstrap.otp.required`, or "Verification code has been sent to this email. Please retry with otp.", ask the user for the OTP from the Clink email and rerun the same `wallet init` with `--otp <email_otp>`. Do not guess the OTP, do not switch email addresses, and do not retry the same command without `--otp`.
- Treat `pay` exit code 6 or client-side timeout as an unknown payment state. Do not retry until the payment state is verified safe through merchant-side status, operator checks, or a caller-provided idempotency guarantee.
- For Agent Pay `status=1`, payment is already `PAID`. Immediately start both 60-second account polls under the same environment lock; timeout, poll failure, missing merchant support, or account-event ambiguity never downgrades or retries the payment.
- Agent Pay account events lack `orderId/sessionId`. Use `classifyAgentPayAccountEventCandidate` against active watches in the same environment and wallet/customer scope: require matching amount/currency, reject explicit `customerEmail`/`webSite`/`userId` conflicts, and use those optional identities only as a unique positive tie-breaker. If multiple candidates remain, report `AMBIGUOUS` and keep `PAID`; never select the first event or payment arbitrarily.
- Preserve the Payment FSM's stable watch identity across both polls and the active-watch snapshot. When an upstream payment ID is unavailable, use the generated local `accountWatchId`; never reconstruct a watch from display text.
- Accept both CLI aliases `account-created` / `account-reloaded` and body types `account.created` / `account.reloaded`. Only a uniquely attributed `account.created` may produce the account-created/order-confirmed message; only a uniquely attributed `account.reloaded` may produce the order-confirmed message.
- For exit code 7, send the 3DS redirect URL to the user and wait for the matching order event before declaring success.
- Refunds require an explicit refund request and the original `orderId`. This skill only submits full refunds.
- Async completion is event-driven. Never claim binding, refund, VIC registration, instruction activation, risk-rule update, or post-3DS order completion until the matching event has been observed through the built-in link watch or `events poll`. Start that listener at URL-emit time, concurrently and non-blocking, not after the user reports completion; when a flow has multiple valid readiness events (for example VIC registration), watch all of them and confirm against authoritative status (`card get`, `refund get`) rather than a single event type.
- VIC authorization prepares permission; it is not payment completion. Reuse ACTIVE instructions only when the selected card, amount cap, currency, service window, and merchant/category/title/description semantics cover the request.
- UCP checkout product orders must classify fulfillment before checkout: use `PHYSICAL_GOODS_REQUIRES_SHIPPING` only for shipped physical goods, `NO_SHIPPING_REQUIRED` for services/subscriptions/hotels/tickets/bookings/reservations/digital goods, and `UNKNOWN` only long enough to ask. Physical shipped goods require a standard complete shipping address before instruction list, instruction creation, or checkout create; do not restrict the address to the US. For `NO_SHIPPING_REQUIRED`, do not ask for an address; pass the fixed Apple Park default address when creating an instruction or when old pay needs a shipping-address placeholder. Use the CWallet instruction address shape (`countryCode` as ISO 3166-1 alpha-2, `line1`, `zip`) for `instruction create`, and the UCP Postal Address shape (`address_country` as ISO 3166-1 alpha-2, `street_address`, `postal_code`) for `ucp-checkout create` and VIC `pay` shipping context.
- For product URL checkout, agent owns product exploration: use browser tools, page extraction, search, or page request first to find a product detail URL and read title, price, currency, merchant context, availability, and Shopify variant data before asking the user for product fields, then run `clink-cli tool parse-item --url <item_url> --format json`. `parse-item` returns product-page facts only: `itemUrl`, `merchantOrigin`, `merchantDomain`, `merchantName`, `currency`, and `items[]` with `itemId`, `title`, `unitPriceMinor`, `available`, item URL, options, and optional inventory status. It does not return quantity, merchantCategoryCode, fulfillmentType, paymentInstrumentId, instructionId, mandateId, or checkoutId.
- UCP checkout product orders must select exactly one available parsed item before checkout. If `parse-item` returns one available item, use it. If it returns multiple available items, ask the user when present; in long tasks when the user is absent, select by frozen user intent and record the reason. The agent/FSM supplies quantity from user intent, defaults to `1` only when unspecified, computes `totalAmountMinor = unitPriceMinor * quantity`, classifies merchantCategoryCode and fulfillmentType, and then performs mandate matching only when the selected/default card is Visa + VIC ready.
- For Shopify product URLs, product exploration and `parse-item` must preserve variant selection: direct variant links use the `variant` query parameter; SPU slug links fetch `<product_url>.js`, parse the response body `variants` array, and select by explicit user choice. If multiple variants remain, ask instead of guessing.
- UCP checkout product orders must resolve checkout route before checkout create with `lib/ucp-checkout-route-fsm.mjs`. Always start with `clink-cli tool internal-ucp get-endpoint --product-url <selected_item_url> --format json`; the environment lock selects the matching CLI configuration. A resolved endpoint selects `INTERNAL_UCP_CHECKOUT` and is passed through create/get/complete. Only `NOT_IN_INTERNAL_UCP_LIST` may fall back to the returned `/.well-known/ucp-clink` probe. When fallback returns parseable JSON, run `clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json`; `provider=clinkbill` selects internal UCP checkout, while another provider, endpoint discovery failure, or `standard_ucp_profile_absent` selects external checkout. Surface all other internal endpoint errors without profile fallback.
- After UCP checkout complete returns `completed`, immediately run `clink-cli events poll --type agent_order.succeeded --format json`, correlate the returned event to the current checkout/order/session when identifiers are available, and send the matched success event/message back to the caller.
- If no matching instruction+mandate is found for a UCP product order, do not run `ucp-checkout create` or `ucp-checkout complete`; start the instruction creation workflow and wait for matching ACTIVE instruction evidence.
- No-match UCP authorization branch is terminal for the current checkout attempt: after starting the instruction creation workflow, return a waiting/pending state and do not continue to checkout create or checkout complete until activation is observed and the flow restarts from instruction list.
- UCP checkout completion is not merchant fulfillment; delivery, entitlement, merchant receipt, or downstream business completion belongs to the merchant/product runtime.
- If the user asks to preview a command or verify inputs without execution, use `--dry-run` when supported.

## Quick Reference

| Need | Command |
| --- | --- |
| List tippable public skills | `clink-cli skills list --all --tippable --format json` |
| Tip by publisher/name | `clink-cli skills tip --publisher <publisher> --name <skill_name> --amount <amount> --format json` |
| Tip by displayed Number | Resolve the recent-context Number to publisher/name, then use the versionless identity command above. |
| Tip multiple Skills | Confirm one frozen batch, then repeat the versionless publisher/name command once per distinct Skill in sequential order. |
| Install latest Skill by identity | `clink-cli skills install <publisher>/<skillName> --format json` |
| Install exact Skill version | `clink-cli skills install <publisher>/<skillName>@<version> --format json` |
| Install by displayed Number | Resolve the recent scoped snapshot, freeze publisher/name/version, confirm, atomically claim, then use the identity command. |
| Wait for optional Agent Pay/Tip new-account evidence | `clink-cli events poll --type account-created --max-wait 60 --format json` |
| Wait for optional Agent Pay/Tip reload evidence | `clink-cli events poll --type account-reloaded --max-wait 60 --format json` |
| Initialize wallet | `clink-cli wallet init --email <email> --name <name> [--otp <email_otp>] --format json` (use credentials matching the prefix's environment) |
| Check wallet readiness | `clink-cli wallet status --format json` |
| Refresh payment-instrument list without waiting | `clink-cli card binding-link --no-watch --format json` (returns `paymentMethodsVoList` and updates the local cache) |
| Bind first card and wait | `clink-cli card binding-link --format json` |
| List cached payment methods | `clink-cli card list --format json` |
| Charge user | `clink-cli pay ... --format json` |
| Submit refund | `clink-cli refund create --order-id <order_id> --format json` |
| Poll refund | `clink-cli refund get --refund-id <refund_id> --format json` |
| Wait for event | `clink-cli events poll --type <eventType> --format json` |
| Wait for instruction activation | `clink-cli events poll --type purchase_instruction.activated --no-ack --format json` |
| View risk rules | `clink-cli risk get --format json` |
| Get risk-rule config URL | `clink-cli risk link --format json` |
| List reusable VIC instructions | `clink-cli instruction list --valid-only --payment-instrument-id <id> --format json` |
| Create VIC instruction draft | `clink-cli instruction create ... --format json` |
| Print instruction Passkey URL | `clink-cli instruction sign-url ... --format json` |
| Get one VIC instruction | `clink-cli instruction get --purchase-instruction-id <id> --format json` |
| Analyze UCP product item(s) | `clink-cli tool parse-item --url <item_url> --format json` |
| Resolve configured internal UCP endpoint | `clink-cli tool internal-ucp get-endpoint --product-url <item_url> --format json` |
| Resolve fallback standard-profile REST endpoint | `clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json` |
| Create UCP checkout | `clink-cli ucp-checkout create [--endpoint <rest_endpoint>] ... --instruction-id <id> --mandate-id <id> --format json` |
| Complete UCP checkout | `clink-cli ucp-checkout complete [--endpoint <rest_endpoint>] --checkout-id <id> --payment-instrument-id <id> --format json` |
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

For a UCP checkout product order, the merchant/product skill owns product discovery and price truth; this skill owns the control flow that converts that target into a safe checkout using `tool parse-item`, optional instruction matching, checkout route resolution, checkout create, and checkout complete.

## Common Mistakes

- Treating install tutorials, status checks, historical/conditional language, product installation services, or malformed package text as authorization to modify local Skills.
- Passing a displayed Number, a literal latest version, or a separate version flag to the install CLI instead of resolving one canonical identity operand.
- Installing a Number immediately without freezing the newest scoped snapshot and atomically claiming the user's confirmation.
- Treating a skill-list query as authorization to tip.
- Treating a bare amount as a Skill Number, scanning Markdown history, using a snapshot older than two hours, or passing `--number` to `skills tip`.
- Executing immediately after a confirmation without first atomically claiming its pending object.
- Waiting for `account-created` / `account-reloaded` before recognizing synchronous tip payment success.
- Downgrading a paid tip because the merchant emitted no optional account event.
- Treating the first Agent Pay account event as the current order without unique-candidate attribution.
- Downgrading or retrying a successful Agent Pay because optional account monitoring timed out, failed, or was ambiguous.
- Calling `pay` before wallet/card pre-checks.
- Forcing instruction matching for direct/session pay when the selected/default card is non-Visa or Visa without VIC readiness; this branch bypasses instruction matching.
- Retrying exit code 6 payments before resolving the unknown state.
- Inventing missing payment, mandate, or merchant-scope parameters.
- Creating a UCP checkout before proving an ACTIVE, not-reserved instruction/mandate matches the exact product amount and merchant semantics.
- Entering UCP checkout with `UNKNOWN` fulfillment, or trying physical goods without a standard complete shipping address.
- Passing instruction or mandate flags to `ucp-checkout complete`; only create binds those fields, and external complete sends `payment_instrument_id` only.
- Reading `card list` alone when current card state is needed; refresh first with `card binding-link --no-watch`.
- Treating refunds as synchronous instead of waiting for `agent_refund.*` events or polling `refund get`.
- Declaring async flows complete before the matching event is observed.
- Busy-retrying link commands to check status instead of using the built-in watch or `events poll`.
- Passing `--no-watch` when you need to wait for the user's browser action, or omitting it when you only wanted a cache refresh.
- Waiting for the user to report completion before starting to listen; start the event watch the moment the URL is emitted, and for the Visa Passkey registration URL (no built-in watch) start a concurrent `events poll` right away.
