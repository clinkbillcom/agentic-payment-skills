# Clink Payment Intent Contract

Read this before routing a Catalog discovery, described-product purchase, resolved-product checkout, or Direct Pay request. This contract applies to new integrations that call `classifyPaymentIntent`; wallet re-login, Skill Tip, and Skill installation keep their dedicated intent FSMs.

## Responsibility Boundary

The Skill or host planner owns semantic intent classification. Interpret the complete current user turn together with trusted workflow state, then construct one versioned intent envelope. Make the decision from meaning and conversational context, not from regexes, keyword presence, synonym lists, or ambient payment fields.

`lib/payment-intent-router-fsm.mjs` owns deterministic validation after that decision. It verifies the envelope, required scope, authorization binding, Catalog context, and target shape, then derives the route and wallet gate. It deliberately ignores natural-language `text` and legacy top-level authorization booleans in the versioned path.

The unversioned text/boolean path is a legacy compatibility adapter. Do not use it for a new caller, do not treat its text parser as the authorization source for Direct Pay or purchase, and do not extend it with new phrase-specific regexes when a semantic classification fails. Fix the host classification or the structured contract instead.

## Version 2 Input

Use `routingContractVersion: 2` and pass the envelope to `classifyPaymentIntent` (or directly to `classifyPaymentIntentV2`).

| Field | Contract |
| --- | --- |
| `routingContractVersion` | Exact number `2`. Any other present version fails closed. |
| `requestId` | Non-empty correlation identifier supplied by the trusted host for the current request. Required before an authorized operation can run. |
| `turnId` | Non-empty correlation identifier supplied by the trusted host for the current user turn or exact upstream decision. Required before an authorized operation can run. |
| `operation` | One of `CATALOG_SEARCH`, `CATALOG_PURCHASE`, `UCP_CHECKOUT`, `DIRECT_PAY`, or `NO_ACTION`. |
| `executionDecision` | `AUTHORIZED`, `DENIED`, or `CLARIFY`. This is the semantic decision for the complete current turn. |
| `authorizationSource` | Required for `CATALOG_PURCHASE`, `UCP_CHECKOUT`, and `DIRECT_PAY`: `CURRENT_USER_TURN` or `UPSTREAM_MERCHANT_WORKFLOW`. It is not required for anonymous search. |
| `target` | Operation-scoped target object. Do not fill it from unrelated conversation state. |
| `target.catalogLanguage` | Required for `CATALOG_SEARCH` and `CATALOG_PURCHASE`. Agent-owned Catalog result language as a canonical BCP47 tag; it maps to the CLI's `--language`, never to `context.language`. |
| `payment` | Direct/session Pay discriminated union. It is ignored as ambient authority for other operations. |
| `text` | Optional audit/context copy only. The v2 FSM never reparses it and it cannot authorize or veto an operation. |

Choose the decision semantically:

- `AUTHORIZED` means the complete current turn explicitly requests the operation, or a trusted upstream merchant workflow supplies an exact decision for this request.
- `DENIED` means the current meaning rejects, cancels, quotes, discusses, conditions, or otherwise does not authorize execution.
- `CLARIFY` means more than one materially different action remains plausible or required intent is missing. Ask for the missing intent; do not choose the more expensive route.

A turn may deny purchase while authorizing discovery. For example, “do not buy; find coffee” is `CATALOG_SEARCH` plus `AUTHORIZED`, not a denied search and not a purchase. This is a semantic distinction; do not encode the sentence as another regex exception.

## Operation Scope And Wallet Gate

The FSM derives wallet behavior from the validated operation. Callers must obey the returned gate rather than checking wallet state speculatively.

| Operation | Required scoped input | Resulting wallet gate | Wallet behavior |
| --- | --- | --- | --- |
| `CATALOG_SEARCH` | `target.catalogQuery` and `target.catalogLanguage`; optional Catalog environment plus either merchant scope or channel/store/location scope | `SKIP` | Anonymous discovery. Run no `wallet status`, `wallet init`, card, instruction, or checkout command. |
| `CATALOG_PURCHASE` | `target.catalogQuery` or `target.productName`, plus `target.catalogLanguage`; the same optional Catalog scope | `DEFER_UNTIL_SELECTION` | Discovery remains anonymous. Present candidates and wait; do not touch the wallet until one validated product is selected for checkout. |
| `UCP_CHECKOUT` | Either an absolute `target.productUrl`, or a frozen internal Catalog target with `target.source=INTERNAL_UCP_CATALOG`, `merchantId`, authoritative `merchantUrl`, matching `merchantDomain`, `itemId`, `productName`, `catalogEnvironment`, and `catalogLanguage` | `REQUIRE_STATUS` | The product is resolved and the purchase is authorized. Page-backed products run `parse-item`; an internal Catalog target uses its frozen item facts and skips page parsing. |
| `DIRECT_PAY` | The mutually exclusive Direct/Session scope below | `REQUIRE_STATUS` | Enter authenticated wallet readiness and Direct/Session Pay guards. |
| `NO_ACTION` | No executable target | `SKIP` | Run no Catalog or wallet/payment command. Use `DENIED` or `CLARIFY`, not `AUTHORIZED`. |

Invalid, denied, unsupported, or unbound contracts fail closed with `requiresWallet:false` and `walletGate:SKIP`. Missing inputs also do not initialize a wallet; collect or repair the scoped input first.

Catalog scope is nested under `target`. `merchantId` is mutually exclusive with channel/store scope. `storeId` requires `channelType`; `addressCountry` is an optional discovery hint. The Catalog FSM still validates a scoped merchant against the anonymous merchant list. Top-level copies are ambient and ignored.

`INTERNAL_UCP_CATALOG` is not a general item-ID bypass. It is valid only for a
candidate produced by the Catalog FSM from a validated merchant-list entry. Its
`merchantUrl` must come from that entry's `merchant_url`, not from Agent URL
construction, a brand default, or a prior run. A bare item ID still requires a
product URL and remains outside the wallet gate. The no-parse v2 handoff must
also carry the claimed `pendingCatalogProductSelection` in `EXECUTING` state
and the exact `selectedProduct` returned by the atomic selection transition;
the router rejects missing or conflicting frozen-selection provenance.

### Agent-Owned Catalog Language

Before the first Catalog call, the Agent determines and freezes one target result language. Use this priority:

1. A result language the user explicitly requests in the current turn.
2. The reply language already established for the current conversation.
3. The natural language and script used by the user in the current turn.

Do not derive the result language from product keywords, brand names, the Catalog query alone, buyer country, wallet/config state, or a backend default. Query language and result language are independent: a Chinese query may request English results, and an English product name in a Chinese conversation normally still uses Chinese results. If explicit instructions leave multiple incompatible result languages, use `CLARIFY` before any Catalog or wallet command.

Put the decision in `target.catalogLanguage`. The FSM canonicalizes it with the same rules as the CLI: Chinese resolves to `zh-Hans` or `zh-Hant`; other languages use canonical BCP47 form. Reuse that frozen value on merchant-scoped search, broad search, and exact product lookup through `--language`. Never also put language in `--context`; that object carries non-language hints such as `address_country`, and the CLI rejects `--language` combined with `context.language`.

`DIRECT_PAY` uses an explicit `payment.mode` because the CLI modes are mutually exclusive:

- `DIRECT`: require `target.merchantId`, a positive canonical decimal string in `payment.amount`, and a three-letter `payment.currency`; prohibit `payment.sessionId`.
- `SESSION`: require `payment.sessionId`; prohibit Direct-mode merchant/amount/currency fields. Use a separate future authorization-scope object if session authorization needs asserted amount/currency—do not disguise those values as CLI execution fields.
- Both modes may carry `payment.paymentInstrumentId` and correlation-only `payment.orderId`.

## Examples

Anonymous product search:

```json
{
  "routingContractVersion": 2,
  "requestId": "request_1",
  "turnId": "turn_1",
  "operation": "CATALOG_SEARCH",
  "executionDecision": "AUTHORIZED",
  "target": {
    "catalogQuery": "Slack channel backup app",
    "catalogLanguage": "en"
  }
}
```

Purchase discovery, still anonymous until selection:

```json
{
  "routingContractVersion": 2,
  "requestId": "request_2",
  "turnId": "turn_2",
  "operation": "CATALOG_PURCHASE",
  "executionDecision": "AUTHORIZED",
  "authorizationSource": "CURRENT_USER_TURN",
  "target": {
    "catalogQuery": "Bruce Lee T-shirt",
    "catalogLanguage": "en"
  }
}
```

Direct Pay from a trusted upstream merchant decision:

```json
{
  "routingContractVersion": 2,
  "requestId": "request_3",
  "turnId": "turn_3",
  "operation": "DIRECT_PAY",
  "executionDecision": "AUTHORIZED",
  "authorizationSource": "UPSTREAM_MERCHANT_WORKFLOW",
  "target": { "merchantId": "merchant_1" },
  "payment": { "mode": "DIRECT", "amount": "10.00", "currency": "USD" }
}
```

## Security Invariants

- `text`, top-level `merchantId` / amount / currency, and legacy booleans cannot fill nested v2 scope or change its operation.
- `requestId` and `turnId` are trusted-host correlation fields, not self-authenticating proof. The host must create them for the current decision, and the execution layer must preserve its normal replay/idempotency controls. `authorizationSource` is likewise a trusted host assertion, never a user-supplied string.
- Catalog discovery does not become authenticated because a wallet happens to exist or ambient payment data is present.
- Catalog language is an Agent decision. Missing or invalid `target.catalogLanguage` in a v2 Catalog operation is an anonymous input error and never triggers wallet setup.
- A described-product purchase is not checkout-ready. `CATALOG_PURCHASE` stays anonymous until the user selects one frozen candidate.
- A selected or linked product does not bypass fulfillment, shipping, payment-instrument, instruction, or checkout guards.
- When the host cannot produce one confident semantic operation, use `CLARIFY` or `DENIED`; never fall back to matching more words.
