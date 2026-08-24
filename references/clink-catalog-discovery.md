# Catalog Product Discovery Flow

Read this before searching Clink catalogs for a product the user described in words rather than by URL.

This flow answers "which product can I buy for this request" when there is no product link. It ends at a product candidate set; it never charges. A chosen product continues through `references/clink-ucp-checkout.md`, which owns purchase intent, authorization, and checkout.

## Boundary

This flow is discovery only. It does not decide to buy, does not resolve a payment instrument, and does not create a checkout. Reaching `CATALOG_RESULTS_READY` is not purchase authorization: the user must still state explicit buy/order/checkout intent before the UCP checkout flow starts.

Catalog search covers merchants Clink has onboarded. It is not a web search. When the catalogs genuinely have no match, hand product discovery back to the agent's own tools rather than reporting the product as unavailable.

Lock one Catalog result language before the first search. Prefer an explicit
user request; otherwise use the current request and conversation language.
Pass that BCP 47 tag to every scoped and broad Catalog command as
`--language <tag>`. The backend no longer infers the target display language
from the query text.

## Described Product Purchase Route

When the user wants to buy a product they described but gave no link, `classifyPaymentIntent` routes to `CATALOG_PURCHASE` rather than `UCP_CHECKOUT`. UCP checkout begins at `clink tool parse-item`, which needs a product detail URL, so discovery has to resolve one first.

```text
PURCHASE_INTENT_WITHOUT_PRODUCT_URL
  -> RUN_CATALOG_DISCOVERY_WORKFLOW      (this reference)
  -> PRESENT_CANDIDATES_AND_WAIT
  -> USER_SELECTS_ONE_PRODUCT
  -> RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT   (clink-ucp-checkout.md)
```

The route triggers only when there is no `productUrl`, no `itemId`, and no `merchantId`. Any one of those means the target is already resolved enough for the normal UCP checkout flow. A bare purchase verb with no described product asks for a payment target instead — searching the catalogs for "购买" or "buy" finds nothing useful.

### Presenting Candidates

Present the products from `CATALOG_RESULTS_READY` as a numbered list and record a pending selection object with `status: 'AWAITING_SELECTION'` and its `candidates`. Each candidate keeps its own target identity: an internal merchant candidate carries `merchantId`, while an external platform store candidate carries `channelType`, `region`, and `storeId`. The two are mutually exclusive — never synthesize a `merchantId` for a platform store, because checkout will fail with it.

Do not preselect a product, even when only one candidate came back. Buying is the user's decision.

### Resolving The Selection

`classifyPaymentIntent` resolves a reply to the pending selection in exactly three forms:

| Reply form | Example |
| --- | --- |
| Structured product id | `selectedProductId: 'product_2'` |
| Structured index, 1-based | `selectedIndex: 2` |
| Bare ordinal in the reply text | `2`, `第2个`, `第一个` |

Everything else stays unresolved and re-asks. A product id outside the presented candidates returns `selected_product_not_in_candidates`; an index outside the list returns `selected_index_out_of_range`. Ambiguous wording such as "那个便宜点的吧" never resolves to a product — picking the wrong one spends the user's money on the wrong thing. A cancellation reply cancels the pending selection and stops; no checkout, no payment.

A consumed or cancelled pending object never resolves again. Only `status: 'AWAITING_SELECTION'` is active.

### Continuing To Checkout

After `RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT`, continue through `references/clink-ucp-checkout.md` for exactly the selected product. That flow still owns every purchase guard: product detail URL and `parse-item`, one available item, fulfillment classification, shipping address when physical goods ship, payment instrument, instruction/mandate matching when the card is Visa + VIC ready, and checkout route resolution. Selecting a product does not skip any of them.

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
| `MERCHANT_LIST_REQUIRED` | `GET_MERCHANT_LIST` | Load the supported merchants for the current environment lock before any search. |
| `MERCHANT_INTENT_MATCH_REQUIRED` | `MATCH_MERCHANT_INTENT` | Agent matches user intent against the returned merchant `description` values and reports one merchant or no match. |
| `MERCHANT_SCOPED_SEARCH_REQUIRED` | `RUN_MERCHANT_SCOPED_CATALOG_SEARCH` | Intent matched exactly one listed merchant; search that merchant's catalog. |
| `BROAD_SEARCH_REQUIRED` | `RUN_BROAD_CATALOG_SEARCH` | No merchant matched, or the scoped search returned nothing; search across merchants and platform stores. |
| `CATALOG_RESULTS_READY` | `RETURN_CATALOG_RESULTS` | Terminal. Return the product candidates and stop; do not start checkout without explicit purchase intent. |
| `EXTERNAL_DISCOVERY_REQUIRED` | `DELEGATE_EXTERNAL_PRODUCT_DISCOVERY` | Terminal for this flow. Clink catalogs are exhausted; continue with browser, MCP, or another Skill. |
| `CATALOG_INPUT_MISSING` | `ASK_FOR_CATALOG_INPUT` | A required input is missing; ask before running any command. A buyer country without a catalog mapping is unknown location, not an error. |
| `CLI_ERROR` | `SURFACE_ERROR` | Surface the CLI/API error and stop. Never treat an error as an empty result. |

## Step 1 - Load Supported Merchants

```bash
clink tool internal-ucp get-merchant-list --format json
```

The document is environment-locked; the saved `wallet init` environment selects which merchant list is returned. Each entry carries `merchant_id`, `domain_name`, `enabled`, and `description`.

The FSM keeps a merchant as a candidate only when it has a `merchant_id`, is not `enabled:false`, and has a non-empty `description`. A merchant without a description cannot be intent-matched on anything but a guess, so it is excluded from matching rather than matched blindly. This mirrors the server-side candidate rule for cross-merchant search.

## Step 2 - Match Intent Against Merchant Descriptions

Match the user's request against each candidate's `description`, not against its domain or name. Descriptions state product categories, fulfillment shape, and catalog character, which is what makes a merchant answerable for a request.

Skip this inference step when `channelType` or `storeId` is already established. After the merchant-list preflight, go directly to broad search: the merchant-scoped endpoint accepts neither the channel selector nor store identity, so a scoped match would silently discard the target constraint. A buyer country alone remains a hint and does not skip matching.

Report the decision back to the FSM as `merchantMatch: { merchantId, reason }` for a match, or `merchantMatch: false` for no match. The FSM rejects a `merchantId` that is not in the list it just loaded (`merchant_match_not_in_candidates`): a merchant the wallet never enumerated must not receive a scoped search.

Match only when the description genuinely covers the request. A weak match that returns nothing costs an extra round trip; a wrong match sends the user a confident answer from the wrong catalog.

## Step 3 - Merchant-Scoped Search

```bash
clink ucp-catalog search --merchant-id <merchant_id> --query <text> --language <tag> --format json
```

`--merchant-id` is required: this path is merchant-scoped by contract. Products come back as a flat `products` array. A non-empty array is terminal for discovery; an empty array falls through to the broad search rather than reporting the product as unavailable.

## Step 4 - Broad Search Across Merchants And Stores

```bash
clink catalog search --query <text> --language <tag> [--channel-type <channel>] [--context <json>] --format json
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

Rules for channel, country, and store context:

- The top-level channel type is `eats365`. The FSM normalizes the `eat365` spelling to `eats365`; passing `eat365` through to the backend matches no channel because platform store snapshots are published under the `eats365` name.
- After loading the merchant list, an established channel or store goes directly to broad search. Do not let a merchant-scoped match bypass a constraint that endpoint cannot carry. A country-only hint does not force this branch.
- Do not use `--ext` for `channel_type` or `store_id`. The CLI records `--ext` for passthrough but does not apply it as a search predicate, so doing so silently widens the result.
- `address_country` in `--context` is ISO 3166-1 alpha-2. HK and SG are currently mapped; US, JP, and every other value are treated as unknown location and omitted rather than rejected. New inputs use `addressCountry`; the FSM accepts legacy pending input `region=hk` or `region=sg` only as a compatibility alias.
- `store_id` is the platform-side store id, a lowercase slug such as `arabica_cheklapkok` rather than a numeric store code. Take it from context — a store the user named, or a store returned by an earlier broad search group. Never invent one.
- The CLI currently has no single-store search flag. A known `storeId` therefore remains target identity while the command searches its channel, and the FSM filters the response groups locally before returning candidates. If only other stores match, the requested store has no catalog result; never return those other stores as if they belonged to the target.
- A store target still requires `channelType`; alone it returns `catalog_channel_type_missing`, since store ids are platform-side identities rather than globally scoped catalog ids.

## Step 5 - Delegate Product Discovery

An empty broad search means Clink's catalogs do not carry the product, not that the product does not exist. Continue discovery with the agent's own tools: a browser, another MCP server, or a product Skill. When that produces a product detail URL, purchase continues through `references/clink-ucp-checkout.md`, which starts at `clink tool parse-item`.

Tell the user the Clink catalogs had no match and that discovery is continuing elsewhere. Do not report the product as unavailable, and do not retry the same query against the same catalogs.

## Hard Rules

- A purchase intent for a described product with no `productUrl`, `itemId`, or `merchantId` routes to `CATALOG_PURCHASE`, never straight to UCP checkout.
- Present candidates and wait. Never preselect a product, not even a single candidate.
- Resolve a selection only by structured product id, structured index, or a bare ordinal, and only to a candidate that was actually presented. Ambiguous replies re-ask.
- Keep each candidate's target identity intact. `merchantId` and `storeId` are mutually exclusive; never invent a `merchantId` for a platform store.
- A selected product still passes every UCP checkout guard. Selection is not authorization to skip `parse-item`, fulfillment classification, shipping, or instruction matching.
- Always load the merchant list before the first search. Intent matching without descriptions is a guess.
- Match intent only against `description`, and only to a merchant present in the loaded list.
- Never invent `merchant_id`, `store_id`, `channel_type`, or `address_country`. Missing context means omit it, not fabricate a value. Preserve response `region` and store identity on candidates even though `region` is no longer a search input.
- Use top-level `--channel-type` for channel narrowing. Never put channel/store predicates in `--ext`, and never claim a store-targeted result until groups have been filtered by exact `store_id` and recounted.
- Treat an empty result and a CLI error differently. An empty scoped search widens; an error surfaces and stops.
- Discovery results are not purchase authorization. Do not chain into `ucp-checkout create` without explicit buy/order/checkout intent for the selected product.
- A platform-store candidate carries its own `url`: the store ordering page with `?product_id=`, not a product detail page. Carry it into checkout as-is. `parse-item` answers `manual_item_facts` for it, which is the expected success envelope — the store has no per-product page to find, so browsing for one only wastes a turn and ends in the same place.
- Prices in candidates are minor units (`price.amount: 2600` is HK$26.00). `ucp-checkout create --line-items` wants a major-unit string (`"26.00"`) and scales it by `--currency`. Convert once at checkout build time; passing the minor value through overcharges by 100x.
- Keep the environment lock. The merchant list, both search paths, and any later checkout all run under the environment saved by `wallet init`.

## Common Mistakes

- Searching before loading the merchant list, then guessing a merchant from its domain name.
- Sending a described product straight to UCP checkout, then failing at `parse-item` because there is no product detail URL.
- Auto-selecting the first or only candidate instead of letting the user choose.
- Resolving an ambiguous reply such as "那个便宜点的吧" to a product by guessing which one is meant.
- Reusing a cancelled or already-consumed pending selection object.
- Giving a platform store candidate a fabricated `merchantId` so checkout has something to send.
- Searching the catalogs for a bare purchase verb because the user said only "购买".
- Passing a `merchant_id` that intent matching invented rather than one the list returned.
- Sending `eat365` as the channel type and reading the empty result as "no products".
- Putting `channel_type` or `store_id` in `--ext` and assuming it narrowed the search.
- Passing a known `storeId` to no CLI flag, then returning products from every store instead of filtering the response groups exactly.
- Treating a scoped-search error as an empty catalog and widening the search past a real failure.
- Reporting a product as unavailable when only the Clink catalogs were searched.
- Treating a matched product as authorization to create a checkout.
- Inventing an `address_country` value instead of taking it from context or omitting it to mean unknown location.
