# Catalog Product Discovery Flow

Read this before searching Clink catalogs for a product the user described in words rather than by URL.

First read `references/clink-payment-intent-contract.md`. New callers must supply its semantic v2 envelope; this reference begins after the intent operation and wallet gate have been validated.

This flow answers "which products match this request" or "which product can I buy for this request" when there is no product link. It ends at a product candidate set; it never charges. A chosen product continues through `references/clink-ucp-checkout.md` only after purchase intent is explicit; that reference owns wallet readiness, authorization, and checkout.

## Boundary

This flow is discovery only. It does not decide to buy, does not resolve a payment instrument, and does not create a checkout. Reaching `CATALOG_RESULTS_READY` is not purchase authorization. A purchase-origin discovery may already carry explicit buy/order/checkout intent and create a guarded purchase selection; a pure search does not. Never infer one mode from the other.

Catalog search covers merchants Clink has onboarded. It is not a web search. When the catalogs genuinely have no match, hand product discovery back to the agent's own tools rather than reporting the product as unavailable.

## Public Catalog Environment And Language

Catalog discovery is anonymous. It does not require `wallet init` and must not read or depend on `~/.clink-cli/config.json`, saved OAuth/CSK credentials, the saved wallet `baseUrl`, or `CLINK_BASE_URL`.

Freeze one `catalogEnvironment` for the discovery:

| `catalogEnvironment` | CLI flag | Catalog API origin | Merchant-list API |
| --- | --- | --- | --- |
| `production` (default) | none | `https://api.clinkbill.com` | `GET https://api.clinkbill.com/agent/ucp/merchants` |
| `sandbox` | `--sandbox` | `https://uat-api.clinkbill.com` | `GET https://uat-api.clinkbill.com/agent/ucp/merchants` |
| `test` | `--test` | `https://api.clinkbill.dev` | `GET https://api.clinkbill.dev/agent/ucp/merchants` |

Only those three values are valid. Carry the same environment flag through `ucp-merchant list --internal`, merchant-scoped search, broad search, and any later `ucp-catalog product` lookup. Never infer the Catalog environment from wallet status or silently switch it between stages.

The Agent owns result-language detection. Before the first Catalog call, follow the priority in `references/clink-payment-intent-contract.md` and freeze one `catalogLanguage`: an explicit result-language request first, then the established conversation reply language, then the current user's language and script. New v2 `CATALOG_SEARCH` and `CATALOG_PURCHASE` inputs require `target.catalogLanguage`. Do not infer it from product keywords, brand names, query text alone, buyer country, wallet/config state, or a backend default.

`catalogLanguage` must be a valid BCP47 tag such as `zh-Hans`, `zh-Hant`, or `en-US`. Canonicalize it exactly as the CLI does: Chinese resolves to `zh-Hans` or `zh-Hant`; other languages use canonical BCP47 form. Pass the frozen value as `--language <tag>` on merchant-scoped search, broad search, and exact product lookup. Keep `--context` for non-language hints such as `address_country`; never place language in `context.language`, because the CLI rejects it when `--language` is also present. The direct Catalog FSM accepts `catalog_language` / `language` aliases but requires one nonblank canonical value before any CLI command. It never asks the query or backend to guess a target language.

Merchant-scoped `ucp-catalog search` and `ucp-catalog product` implement Catalog translation. Broad `catalog search` forwards the declared language to providers but does not run that translation pass, so provider localization may vary.

These rules apply only to the public Catalog discovery commands. `tool internal-ucp get-endpoint` and the later checkout remain under the authenticated wallet environment lock. Preserve `catalogEnvironment` on every candidate. The pending selection is authoritative over candidate-level copies; reject a conflict instead of replacing the frozen value. Before starting checkout for a selected candidate, compare the authoritative `wallet status` origin with the origin above; top-level/candidate or explicit/status wallet-origin conflicts also stop checkout. A test or sandbox candidate must never flow silently into production checkout or payment.

The four Gateway Catalog APIs (`ucp-merchant list --internal`, `ucp-catalog search/product`, and `catalog search`) are anonymous. Their HTTP `401` or `403` is a Gateway public-access configuration error, surfaced by the CLI as API error exit 5. Stop with `SURFACE_ERROR`. Do not inspect wallet credentials, refresh OAuth, run `wallet init`, or retry through CSK; none of those can repair an anonymous route. Other HTTP failures remain API errors; transport failures remain network errors.

## Anonymous Product Search Route

When the user asks to search, find, look for, or see products without buy/order/checkout intent, `classifyPaymentIntent` routes to:

```text
state: CATALOG_SEARCH_SELECTED
route: CATALOG_SEARCH
action: RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW
purchaseIntent: false
requiresWallet: false
authenticationMode: ANONYMOUS
resultMode: DISCOVERY_ONLY
walletGate: SKIP
```

The Skill/host derives `operation=CATALOG_SEARCH` from the complete meaning of the current turn and supplies a non-empty `target.catalogQuery`. The FSM does not recover a query by stripping verbs from prose. When the target is missing, return `ASK_FOR_CATALOG_DISCOVERY_INPUT`; never search for a generic action word or Catalog noun.

`executionDecision=DENIED` returns `CATALOG_SEARCH_NOT_AUTHORIZED` with `DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY`; `CLARIFY` asks for intent and also runs nothing. These are semantic decisions, not phrase patterns. A turn may reject buying while affirmatively requesting discovery—for example, “do not buy; find coffee” remains an authorized `CATALOG_SEARCH`. Fix the upstream semantic decision when this distinction is wrong; do not add a sentence-specific regex.

This route is independent of wallet state. Resolve the Catalog environment and language directly, perform the network preflight for the Catalog origins, and run the discovery FSM. Do not run `wallet status`, `wallet init`, card refresh, instruction resolution, `parse-item`, or checkout first. Invalid context remains an anonymous input error with `requiresWallet=false`. Ambient top-level merchant/payment fields are ignored. An explicit nested `target.merchantId` is different: it is a requested Catalog scope, must survive routing, and is still validated against the anonymous merchant list. Nested channel/store scope is mutually exclusive with merchant scope.

A new search supersedes an older candidate list. Return results as discovery output. If the caller keeps the numbered results as a selection context, store `status:'AWAITING_SELECTION'`, `purchaseIntent:false`, `resultMode:'DISCOVERY_ONLY'`, the frozen query/environment/language, and the candidates. `AWAITING_SELECTION` makes the snapshot recognizable to the router. It is not a payable pending selection; the discovery-only flags keep it outside checkout:

- A candidate number, structured index, or product ID can identify one frozen result, but it does not authorize purchase and does not trigger wallet readiness.
- First classify the new turn semantically. Only an authorized purchase decision may be bound to a candidate; `DENIED` or `CLARIFY` runs no checkout. Raw text and a legacy `purchaseIntent` boolean cannot create authorization in the new path.
- Deterministic selector resolution must agree on one candidate. A mismatch, out-of-range selector, or ambiguous target re-asks; structured fields never silently override the user's meaning.
- An ordinal purchase with no frozen candidate context is not a Catalog query; ask for the missing product target instead of searching for "the second one".

When the semantic operation is `CATALOG_PURCHASE`, follow the purchase route below. Ambient merchant/payment fields cannot turn search into Direct Pay, and conflicting semantic intent must return `CLARIFY` or `DENIED` rather than being resolved by keyword priority.

## Described Product Purchase Route

When the user authorizes buying a product they described but gave no link, construct v2 `CATALOG_PURCHASE` rather than `UCP_CHECKOUT`. It returns `requiresWallet:false`, `authenticationMode:ANONYMOUS`, and `walletGate:DEFER_UNTIL_SELECTION`. Page-backed products still need a product URL before checkout. An internal merchant-scoped Catalog result may instead become a frozen `INTERNAL_UCP_CATALOG` target when the validated merchant-list entry supplies an authoritative full `domain` URL.

The legacy router resolves every non-empty `catalogEnvironment`/`catalog_environment` alias and every non-empty `catalogLanguage`/`catalog_language`/`language` alias together. Equivalent spellings are canonicalized with the CLI's exact rules; conflicting or invalid values return `ASK_FOR_CATALOG_DISCOVERY_INPUT` instead of silently choosing one. The v2 contract accepts only exact `target.catalogLanguage` and requires it for Catalog operations. A valid v2 route explicitly returns production, test, or sandbox plus the canonical effective language. Pass those returned fields together with `catalogQuery` into `classifyCatalogDiscovery`; do not restart from the query alone.

```text
PURCHASE_INTENT_WITHOUT_PRODUCT_URL
  -> RUN_CATALOG_DISCOVERY_WORKFLOW      (this reference)
  -> PRESENT_CANDIDATES_AND_WAIT
  -> USER_SELECTS_ONE_PRODUCT
  -> RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT   (clink-ucp-checkout.md)
```

The product remains unresolved when there is no `target.productUrl` unless the selected candidate is a validated `INTERNAL_UCP_CATALOG` target carrying `merchantId`, authoritative `merchantUrl`, `itemId`, product name, and frozen Catalog environment/language. A merchant ID by itself is only optional discovery scope and never authorizes checkout. Top-level ambient `merchantId` is ignored by v2. A page-backed item ID remains only a selection hint and must be verified against its parsed URL.

### Presenting Purchase Candidates

For `CATALOG_PURCHASE`, present the products from `CATALOG_RESULTS_READY` as a numbered list and record a pending selection object with `status: 'AWAITING_SELECTION'`, `purchaseIntent:true`, `resultMode:'PURCHASE_SELECTION'`, the original `catalogQuery`, the frozen valid `catalogEnvironment`, the effective canonical `catalogLanguage`, and its `candidates`. Both provenance fields are mandatory and must agree; neither is a compatibility fallback for the other. The original query is also mandatory; every present `catalogQuery` / `catalog_query` / `query` alias must be a non-empty string and agree. The pending fields are authoritative. `candidates` and the compatibility alias `products` may coexist only when they are the same frozen array; conflicting snapshots invalidate the pending object. Candidate `catalogEnvironment`/`catalogLanguage` fields may only confirm consistency and never supply or override context; a generic candidate `language` field is product data and is ignored here. Each present product ID and product name alias must be non-empty and consistent. Page-backed and platform-store candidates also require their absolute URL. An internal candidate carries `source=INTERNAL_UCP_CATALOG`, exactly one `merchantId`, a `merchantDomain`, and the authoritative HTTP(S) `merchantUrl` copied from the validated merchant-list entry's `domain`; the FSM safely parses that URL and derives `merchantDomain` from its hostname. An external platform store candidate instead carries `channelType`, optional `region`, and exactly one `storeId`. Merchant/store identity is mutually exclusive, and a store without `channelType` is invalid. Its ordering URL must carry one or more non-empty `product_id` values, all equal to the candidate product ID. Preserve the complete validated candidate facts, especially price, currency, quantity, source, and merchant URL; never synthesize a merchant or URL.

Do not preselect a product, even when only one candidate came back. Buying is the user's decision.

### Resolving The Selection

After the Skill has semantically authorized the new purchase turn, deterministic candidate binding accepts these selector forms:

| Reply form | Example |
| --- | --- |
| Structured product id | `selectedProductId: 'product_2'` |
| Structured index, 1-based | `selectedIndex: 2` |
| Bare ordinal in the reply text | `2`, `第2个`, `第一个` |

Everything else stays unresolved and re-asks. A product ID outside the presented candidates returns `selected_product_not_in_candidates`; an index outside the list returns `selected_index_out_of_range`; conflicting selectors return `catalog_product_selection_conflict`. These checks bind a prior semantic decision and never supply purchase authorization. Ambiguity is not resolved by guessing which product is cheaper or “probably intended.” Cancellation atomically changes `AWAITING_SELECTION -> CANCELLED` and stops. Validate provenance, original query, candidate-array identity, frozen context, and candidate schema before any claim. Damaged context becomes `INVALID` and restarts anonymous discovery from still-trusted input; if the query is also lost, ask for it. A selector from `DISCOVERY_ONLY` context cannot cross into checkout until this turn has an authorized semantic purchase decision.

A consumed or cancelled pending object never resolves again. Only `status: 'AWAITING_SELECTION'` is active.

### Continuing To Checkout

Before honoring `RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT`, atomically apply the returned pending transition from `AWAITING_SELECTION` to `EXECUTING`; a failed claim runs no checkout, and a terminal outcome consumes that pending object. The handoff carries top-level `purchaseIntent:true`, `requiresWallet:true`, and `resultMode:'PURCHASE_SELECTION'` even when its nested source pending remains discovery-only provenance. Continue through `references/clink-ucp-checkout.md` for exactly the selected product and its preserved candidate facts. Page-backed products still run `parse-item`. A validated internal Catalog product uses its frozen item ID and facts without page parsing. Both paths still require fulfillment classification, shipping when applicable, payment instrument readiness, instruction/mandate matching, route validation, exact amount handling, and one aggregate Checkout attempt.

## Control Model

Use `lib/catalog-discovery-fsm.mjs` (`classifyCatalogDiscovery`) to classify each step, then run only the returned command.

```text
CATALOG_QUERY
  -> GET_MERCHANT_LIST
  -> IF_CHANNEL_OR_STORE_TARGET  RUN_BROAD_CATALOG_SEARCH
  -> MATCH_MERCHANT_INTENT against each merchant description
  -> IF_MATCHED  RUN_MERCHANT_SCOPED_CATALOG_SEARCH
  -> IF_UNMATCHED_OR_EMPTY  RUN_BROAD_CATALOG_SEARCH
  -> IF_STILL_EMPTY  DELEGATE_EXTERNAL_PRODUCT_DISCOVERY
```

| State | Action | Meaning |
| --- | --- | --- |
| `MERCHANT_LIST_REQUIRED` | `GET_MERCHANT_LIST` | Load the supported merchants for the frozen public Catalog environment before any search. |
| `MERCHANT_INTENT_MATCH_REQUIRED` | `MATCH_MERCHANT_INTENT` | Agent matches user intent against the returned merchant `description` values and reports one merchant or no match. |
| `MERCHANT_SCOPED_SEARCH_REQUIRED` | `RUN_MERCHANT_SCOPED_CATALOG_SEARCH` | Intent matched exactly one listed merchant; search that merchant's catalog. |
| `BROAD_SEARCH_REQUIRED` | `RUN_BROAD_CATALOG_SEARCH` | No merchant matched, or the scoped search returned nothing; search across merchants and platform stores. |
| `CATALOG_RESULTS_READY` | `RETURN_CATALOG_RESULTS` | Terminal. Return the product candidates and stop; do not start checkout without explicit purchase intent. |
| `EXTERNAL_DISCOVERY_REQUIRED` | `DELEGATE_EXTERNAL_PRODUCT_DISCOVERY` | Terminal for this flow. Clink catalogs are exhausted; continue with browser, MCP, or another Skill. |
| `CATALOG_INPUT_MISSING` | `ASK_FOR_CATALOG_INPUT` | A required input is missing; ask before running any command. A buyer country without a catalog mapping is unknown location, not an error. |
| `CLI_ERROR` | `SURFACE_ERROR` | Surface the CLI/API error and stop. Never treat an error as an empty result. |

## Step 1 - Load Supported Merchants

```bash
clink ucp-merchant list --internal [--test|--sandbox] --format json
```

The explicit Catalog flag selects the API environment; omission means production. This command sends an anonymous `GET /agent/ucp/merchants`, needs no wallet, and does not read the saved environment. Before invoking it, preflight the selected Catalog API origin from the table above. Each entry carries `merchant_id`, `merchant_name`, `description`, and a full `domain` URL.

The server has already filtered the response to active, non-shadow internal merchants, so the FSM does not depend on an `enabled` response field. The list deliberately retains active merchants that are unavailable for Catalog search because the same eligibility boundary must continue to support internal endpoint resolution. Those rows carry `description:""`; the CLI also normalizes a null or missing upstream description to that string. The successful CLI contract therefore still requires `description` to be a string.

For intent matching, the FSM keeps a merchant as a candidate only when it has a `merchant_id` and a non-empty `description`. A merchant without a matchable description is skipped individually because matching it would be a guess; it does not invalidate the rest of the merchant list. The FSM preserves `merchant_name`, validates the full `domain` as a safe HTTP(S) origin, exposes it as `merchantUrl`, and derives `merchantDomain` from its hostname; it never constructs either value from a brand or merchant name.

## Step 2 - Match Intent Against Merchant Descriptions

Match the user's request against each candidate's `description`, not against its domain or name. Descriptions state product categories, fulfillment shape, and catalog character, which is what makes a merchant answerable for a request.

Skip this inference step when `channelType` or `storeId` is already established. After the merchant-list preflight, go directly to broad search: the merchant-scoped endpoint accepts neither the channel selector nor store identity, so a scoped match would silently discard the target constraint. A buyer country alone remains a hint and does not skip matching.

Report a match as `merchantMatch: { merchantId, merchantDomain, merchantUrl, reason }`, copying `merchantId`, the hostname-derived `merchantDomain`, and `merchantUrl` exactly from the one selected candidate. The description remains the only matching evidence; merchant name, domain, and URL only preserve that candidate's identity. Return `merchantMatch:false` for no match. When multiple candidates share a merchant ID, a matching domain or URL discriminator is mandatory; omission returns `merchant_match_ambiguous`. Any supplied discriminator that conflicts with the selected list entry also fails closed. Never construct a replacement URL. The FSM rejects an ID outside the loaded list as `merchant_match_not_in_candidates`.

Match only when the description genuinely covers the request. A weak match that returns nothing costs an extra round trip; a wrong match sends the user a confident answer from the wrong catalog.

## Step 3 - Merchant-Scoped Search

The merchant list and searches use the same Catalog API origin. Reuse the successful preflight from Step 1 for that exact origin in this workflow; preflight again only if the destination changes.

```bash
clink ucp-catalog search --merchant-id <merchant_id> --query <text> --language <BCP47> [--context <json>] [--test|--sandbox] --format json
```

`--merchant-id` is required: this path is merchant-scoped by contract. Pass the Agent-frozen target language with `--language`; this opts into Catalog translation for product titles and descriptions. If non-language context is also needed, pass one separate JSON object without a `language` field. Products come back as a flat `products` array. A non-empty array is terminal for discovery; an empty array falls through to the broad search rather than reporting the product as unavailable.

## Step 4 - Broad Search Across Merchants And Stores

```bash
clink catalog search --query <text> [--channel-type <channel>] --language <BCP47> [--context <json>] [--test|--sandbox] --format json
```

This path is not merchant-scoped and takes no `--merchant-id`. Results come back grouped by target, where each group identifies either an internal merchant (`merchant_id`) or an external platform store (`store_id` plus `region`); the two are mutually exclusive. The response `region` and `store_id` remain candidate identity and must survive into product selection and checkout.

Broad discovery is a bounded, non-exhaustive result window. It does not return pagination metadata, and `clink catalog search` therefore rejects `--cursor` and `--limit` instead of pretending they can page the merged cross-target result. If a merchant is already known and real cursor pagination is required, use `clink ucp-catalog search --merchant-id ...`.

For an unscoped response, read the cross-target count from `total_products`, falling back to the sum of per-group `products` when it is absent. For an established store target, first keep only groups whose returned `store_id` exactly matches the target, then recompute the count from those groups. Never use the server's cross-target `total_products` after this local filter.

The FSM resolves broad-search context as follows:

| Established context | Server request | Response handling |
| --- | --- | --- |
| No channel or buyer location | no optional flag | Keep all groups. |
| Eats365 channel | `--channel-type eats365` | Keep all returned Eats365 groups. |
| HK or SG buyer location | `--context '{"address_country":"HK"}'` (or SG) | Supply the backend's mapped discovery hint; it is not a strict filter. |
| Eats365 plus HK/SG | `--channel-type eats365 --context '{"address_country":"HK"}'` | Keep all returned groups unless a store target is also established. |
| One known Eats365 store | `--channel-type eats365` plus optional HK/SG context | Locally keep only the exact `store_id`, such as `arabica_cheklapkok`, and recompute the product count. |
| US, JP, or another unmapped buyer country | omit `--context` | Continue as unknown catalog location; do not return an input error. |

If `catalogLanguage=zh-Hans` accompanies an HK buyer location, emit separate arguments: `--language zh-Hans --context '{"address_country":"HK"}'`. If language is the only optional request field, emit only `--language zh-Hans`. Broad discovery forwards the declared language to each provider, but provider localization may vary. A caller that omits language stops with `ASK_FOR_CATALOG_INPUT`; query text never drives target-language detection.

When an exact product lookup follows search, preserve the same environment and language:

```bash
clink ucp-catalog product --merchant-id <merchant_id> --product-id <product_id> --language <same_BCP47_as_search> [--context <json>] [--test|--sandbox] --format json
```

Rules for channel, country, and store context:

- The top-level channel type is `eats365`. The FSM normalizes the `eat365` spelling to `eats365`; passing `eat365` through to the backend matches no channel because platform store snapshots are published under the `eats365` name.
- After loading the merchant list, an established channel or store goes directly to broad search. Do not let a merchant-scoped match bypass a constraint that endpoint cannot carry. A country-only hint does not force this branch.
- Do not use `--ext` for `channel_type` or `store_id`. The CLI records `--ext` for passthrough but does not apply it as a search predicate, so doing so silently widens the result.
- `address_country` in `--context` is ISO 3166-1 alpha-2. HK and SG are currently mapped; US, JP, and every other value are treated as unknown location and omitted rather than rejected. New inputs use `addressCountry`; the FSM accepts legacy pending input `region=hk` or `region=sg` only as a compatibility alias.
- `store_id` is the platform-side store id, a lowercase slug such as `arabica_cheklapkok` rather than a numeric store code. Take it from context — a store the user named, or a store returned by an earlier broad search group. Never invent one.
- The CLI currently has no single-store search flag. A known `storeId` therefore remains target identity while the command searches its channel, and the FSM filters the response groups locally before returning candidates. If only other stores match, the requested store has no catalog result; never return those other stores as if they belonged to the target.
- A store target still requires `channelType`; alone it returns `catalog_channel_type_missing`, since store ids are platform-side identities rather than globally scoped catalog ids.

## Step 5 - Delegate Product Discovery

An empty broad search means Clink's catalogs do not carry the product, not that the product does not exist. Continue discovery with the agent's own tools: a browser, another MCP server, or a product Skill. When that produces a product detail URL, preserve the originating route: `CATALOG_SEARCH` returns it as discovery-only output and waits for a later explicit purchase request; only purchase-origin `CATALOG_PURCHASE` continues through `references/clink-ucp-checkout.md`, which starts at `clink tool parse-item`.

Tell the user the Clink catalogs had no match and that discovery is continuing elsewhere. Do not report the product as unavailable, and do not retry the same query against the same catalogs.

## Hard Rules

- A semantically authorized described-product request without `target.productUrl` routes to `CATALOG_PURCHASE`, even when nested `target.merchantId` narrows discovery. A merchant scope is not a resolved product.
- A semantic `CATALOG_SEARCH` routes to `RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW` with `purchaseIntent=false`, `requiresWallet=false`, `authenticationMode=ANONYMOUS`, `resultMode=DISCOVERY_ONLY`, and `walletGate=SKIP`.
- `CATALOG_PURCHASE` discovery returns `walletGate=DEFER_UNTIL_SELECTION`; it also runs no wallet command until one product is selected and converted to an authorized checkout.
- The Skill/host supplies `AUTHORIZED`, `DENIED`, or `CLARIFY` from meaning. Do not encode authorization as a synonym/negation regex or let the legacy text adapter authorize a new purchase.
- Never treat `DISCOVERY_ONLY` results as purchase authorization. Candidate selectors bind an already-authorized semantic decision; they do not create one.
- For `CATALOG_PURCHASE`, present candidates and wait. Never preselect a product, not even a single candidate.
- For a purchase-origin pending selection, require both `purchaseIntent=true` and `resultMode=PURCHASE_SELECTION`; missing, partial, or conflicting provenance fails closed. The frozen query is mandatory, and every present query alias must be a non-empty string and agree; otherwise invalidate the snapshot and ask for Catalog input without running either discovery action. Resolve only by structured product id, structured index, or a bare ordinal, and only to a candidate that was actually presented. Current denial or unbound text never inherits prior purchase authorization. For `DISCOVERY_ONLY`, a bare ordinal remains non-purchasing; only a new explicit purchase-wrapped selection may cross the boundary. Ambiguous replies re-ask.
- Keep each candidate's target identity intact. Every present product ID/name/URL alias must be non-empty and consistent. Internal Catalog candidates require source, merchant ID, authoritative merchant URL, and matching merchant domain; platform stores require store/channel identity and an ordering URL whose `product_id` values all equal the candidate product ID. Preserve price/currency/quantity facts and never invent a merchant or URL.
- A selected snapshot must atomically transition `AWAITING_SELECTION -> EXECUTING` before checkout and become consumed after a terminal outcome. A failed claim or replay runs no checkout. The selected handoff carries top-level `purchaseIntent=true`, `requiresWallet=true`, and `resultMode=PURCHASE_SELECTION`.
- A selected product still passes every UCP checkout guard. Only a validated `INTERNAL_UCP_CATALOG` target may skip `parse-item`; it never skips fulfillment, shipping, amount, wallet, instruction, route, or execution gates.
- Always load the merchant list before the first search. Intent matching without descriptions is a guess.
- Match intent only against `description`, and only to a merchant present in the loaded list.
- Never invent `merchant_id`, `store_id`, `channel_type`, or `address_country`. Missing context means omit it, not fabricate a value. Preserve response `region` and store identity on candidates even though `region` is no longer a search input.
- Use top-level `--channel-type` for channel narrowing. Never put channel/store predicates in `--ext`, and never claim a store-targeted result until groups have been filtered by exact `store_id` and recounted.
- Treat an empty result and a CLI error differently. An empty scoped search widens; an error surfaces and stops.
- Discovery results are not purchase authorization. Do not build `ucp-checkout run --confirm-purchase` without explicit buy/order/checkout intent and a fresh confirmation for the frozen selected product, quantity, total, and currency.
- A platform-store candidate carries its own `url`: the store ordering page with `?product_id=`, not a product detail page. That parameter must be non-empty and match the candidate product ID. Carry the URL into checkout as-is. `parse-item` answers `manual_item_facts` for it, which is the expected success envelope — the store has no per-product page to find, so browsing for one only wastes a turn and ends in the same place.
- Prices in candidates are minor units (`price.amount: 2600` is HK$26.00). `ucp-checkout run --line-items` wants a major-unit string (`"26.00"`) and scales it by `--currency`. Convert once at aggregate checkout build time; passing the minor value through overcharges by 100x.
- Freeze one public `catalogEnvironment` (`production` by default) and carry its same CLI flag through the merchant list, both search paths, and product lookup. Do not read the wallet config for discovery.
- Let the Agent choose and freeze one BCP47 `catalogLanguage` before the first v2 Catalog call. Pass it through scoped search, broad search, and product lookup as `--language`; reuse the same normalized value at every stage. Keep `address_country` in a language-free `--context`, and never infer result language from query text, buyer country, wallet state, or the backend.
- Keep checkout's authenticated environment lock separate. Treat the pending selection and current `wallet status` as authoritative, and fail closed on any duplicate-source conflict or origin mismatch before `get-endpoint`, checkout, or payment.

## Common Mistakes

- Searching before loading the merchant list, then guessing a merchant from its domain name.
- Running one Catalog stage with `--test` or `--sandbox` and silently dropping that flag on the next stage.
- Reading wallet/config or query keywords for Catalog output language, omitting Agent language detection on a new v2 route, or combining `--language` with `context.language` instead of keeping buyer country in a language-free context.
- Taking a test/sandbox Catalog candidate into a production checkout because discovery and checkout environment locks were treated as the same thing.
- Treating an anonymous merchant-list or Catalog search `401`/`403` as an expired wallet login instead of surfacing the Gateway public-route configuration error (exit 5).
- Sending a described product straight to UCP checkout, then failing at `parse-item` because there is no product detail URL.
- Auto-selecting the first or only candidate instead of letting the user choose.
- Resolving an ambiguous reply such as "那个便宜点的吧" to a product by guessing which one is meant.
- Reusing a cancelled or already-consumed pending selection object.
- Giving a platform store candidate a fabricated `merchantId` so checkout has something to send.
- Searching the catalogs for a bare purchase verb because the user said only "购买".
- Running `wallet status` or `wallet init` before a pure Catalog search, or treating an anonymous Catalog `401`/`403` as a login problem.
- Adding another phrase-specific regex when the semantic Catalog operation or execution decision is wrong.
- Letting a bare result Number from `DISCOVERY_ONLY` search output start checkout without a new explicit purchase signal.
- Passing a `merchant_id` that intent matching invented rather than one the list returned.
- Sending `eat365` as the channel type and reading the empty result as "no products".
- Putting `channel_type` or `store_id` in `--ext` and assuming it narrowed the search.
- Passing a known `storeId` to no CLI flag, then returning products from every store instead of filtering the response groups exactly.
- Treating a scoped-search error as an empty catalog and widening the search past a real failure.
- Reporting a product as unavailable when only the Clink catalogs were searched.
- Treating a matched product as authorization to create a checkout.
- Inventing an `address_country` value instead of taking it from context or omitting it to mean unknown location.
