# Internal UCP Merchant Routing Design

## Goal

Replace the hard-coded standard UCP domain allow-list with a skill-owned JSONL domain-to-merchant mapping. A mapped product domain resolves its internal Clink UCP endpoint from `merchant_id`; an unmapped domain retains the existing UCP profile discovery fallback.

The route terminology changes from `STANDARD_UCP_CHECKOUT` to `INTERNAL_UCP_CHECKOUT`. The protocol term “standard UCP profile” remains unchanged because it names the discovery protocol, not the selected checkout implementation.

## Scope

This change covers:

- a JSONL mapping owned by the payment skill;
- a focused JSONL loader and domain lookup module;
- checkout route FSM states, routes, actions, commands, and reasons;
- use of `clink-cli tool get-endpoint --merchant-id <id>` for mapped merchants;
- preservation of UCP profile and `get-rest-endpoint` discovery for unmapped merchants;
- synchronization of the already-developed `get-endpoint` CLI command into the skill’s vendored bundle;
- tests and routing documentation.

This change does not alter checkout create/complete payloads, authorization matching, fulfillment classification, payment-instrument selection, or merchant fulfillment confirmation.

## Merchant Mapping

Create `data/internal-ucp-merchants.jsonl`. Each nonblank line is one JSON object with exactly the routing fields `domain_name` and `merchant_id`:

```jsonl
{"domain_name":"uebmaw-it.myshopify.com","merchant_id":"mcht_frnagwqi4k43"}
{"domain_name":"www.bruceleeclub.com","merchant_id":"xxx"}
```

The second merchant ID is an intentional user-requested temporary value. It is nonempty and therefore behaves as a valid internal mapping until the user replaces it.

The loader must:

- ignore blank lines;
- parse every nonblank line independently as JSON;
- require a nonempty string `domain_name` and `merchant_id`;
- canonicalize `domain_name` by trimming whitespace, lowercasing it, and removing trailing dots;
- reject duplicate canonical domains;
- reject malformed JSON and invalid records with an error that identifies the file and line number;
- expose the loaded mapping as `INTERNAL_UCP_MERCHANTS` and provide a focused lookup function.

Domain matching is exact after canonicalization. A record for `www.example.com` does not match `example.com` or `shop.example.com`. Wildcards and registrable-domain inference are outside this scope.

## Components

### Merchant loader

Add `lib/internal-ucp-merchants.mjs`. It owns JSONL parsing, validation, canonical mapping construction, and exact lookup. The route FSM imports the default mapping instead of containing merchant data.

The parser and lookup functions remain independently testable. Tests may pass text or an alternate file URL to the loader, but production routing uses `data/internal-ucp-merchants.jsonl`.

### Route FSM

Update `lib/ucp-checkout-route-fsm.mjs` to remove `STANDARD_UCP_DOMAINS` and the allow-list branch.

Rename route terminology throughout the public FSM contract:

```text
STANDARD_ROUTE_SELECTED         -> INTERNAL_ROUTE_SELECTED
STANDARD_UCP_CHECKOUT           -> INTERNAL_UCP_CHECKOUT
CREATE_STANDARD_UCP_CHECKOUT    -> CREATE_INTERNAL_UCP_CHECKOUT
```

Keep profile-discovery names such as `STANDARD_UCP_PROFILE_CHECK` because they identify the standard UCP discovery protocol.

Add a mapped-merchant endpoint-resolution transition with a distinct state, route, and action:

```text
INTERNAL_ENDPOINT_REQUIRED
INTERNAL_UCP_ENDPOINT_DISCOVERY
GET_INTERNAL_UCP_ENDPOINT
```

The transition returns the canonical merchant domain, mapped merchant ID, and the command needed to resolve the endpoint. For the skill’s sandbox/UAT workflow, the executed form is:

```bash
clink-cli tool get-endpoint --merchant-id <merchant_id> --sandbox --format json
```

The underlying CLI also supports the production form without `--sandbox`:

```bash
clink-cli tool get-endpoint --merchant-id <merchant_id> --format json
```

The endpoint output contract is:

```json
{
  "endpoint": "https://uat-api.clinkbill.com/agent/ucp/mcht_example",
  "provider": "clinkbill",
  "merchantId": "mcht_example"
}
```

Because the JSONL loader rejects empty merchant IDs, a mapped merchant always has a valid command input. Per the approved behavior, `get-endpoint` is deterministic for a nonempty merchant ID; the mapped branch does not fall back to UCP profile discovery.

### Vendored CLI

The adjacent `/Users/dylan/clink/public-skills/clink-cli` worktree already contains uncommitted `get-endpoint` source, help, and test changes. Preserve those user-owned edits. Verify them in that repository, build there, and regenerate `vendor/clink-cli/clink-cli.bundle.mjs` in this skill using the existing vendoring recipe.

Do not commit or rewrite unrelated files in the adjacent CLI repository. The payment-skill commit contains only its regenerated bundle and its own routing/data/documentation changes.

## Routing Flow

Route resolution starts only after product parsing and item selection. The FSM derives a canonical hostname from existing product facts in this order:

1. `merchantDomain`;
2. `merchantOrigin`;
3. selected item URL;
4. item URL;
5. product URL;
6. merchant URL.

The new route is:

```text
product facts
  -> derive canonical merchant domain
  -> lookup INTERNAL_UCP_MERCHANTS
     -> mapped
        -> GET_INTERNAL_UCP_ENDPOINT with merchant_id
        -> endpoint output
        -> INTERNAL_UCP_CHECKOUT
     -> unmapped
        -> CHECK_STANDARD_UCP_PROFILE
        -> profile absent/non-JSON
           -> EXTERNAL_UCP_CHECKOUT
        -> successful JSON profile
           -> GET_REST_ENDPOINT using profile shopping endpoint or product URL
           -> provider == clinkbill
              -> INTERNAL_UCP_CHECKOUT
           -> provider != clinkbill or endpoint discovery error
              -> EXTERNAL_UCP_CHECKOUT
```

If no merchant domain can be derived, retain the existing `INPUT_REQUIRED` result. Mapping lookup must not mutate the selected item, amount, merchant facts, authorization, or fulfillment state.

## Failure Behavior

- Invalid or duplicate JSONL records are configuration errors detected during load; routing must not silently ignore them.
- Missing merchant domain returns the existing route-input-required result.
- A mapped merchant does not run profile discovery.
- `get-endpoint` is treated as deterministic for a nonempty mapped merchant ID. Unexpected malformed command output is surfaced as an error instead of silently selecting external checkout.
- Unmapped merchants retain existing profile failure behavior: absent/non-JSON profile selects external checkout; a standard profile whose endpoint provider is not `clinkbill`, or whose REST endpoint discovery fails, also selects external checkout.

## Documentation

Update:

- `SKILL.md` action contract, routing matrix, hard rules, and quick reference;
- `references/clink-ucp-checkout.md` route algorithm and end-to-end skeleton;
- `README.md` and `README.zh.md` routing summaries;
- `references/clink-cli-invocation.md` only if the vendored command’s environment behavior needs explicit clarification.

Documentation must consistently use “internal UCP checkout” for the selected internal route and reserve “standard UCP profile” for discovery.

## Testing

Add loader tests covering:

- the two initial mapping records;
- lowercase/trailing-dot normalization;
- exact hostname matching;
- blank-line handling;
- malformed JSON with line identification;
- missing/empty fields;
- duplicate canonical domains.

Update route FSM tests covering:

- `uebmaw-it.myshopify.com` maps to `mcht_frnagwqi4k43` and requests `get-endpoint`;
- `www.bruceleeclub.com` maps to the intentional `xxx` value and requests `get-endpoint`;
- a mapped `get-endpoint` result selects `INTERNAL_UCP_CHECKOUT` directly;
- a mapped domain never requests a UCP profile;
- an unmapped domain requests the standard UCP profile;
- an unmapped domain with a JSON profile and `provider=clinkbill` selects `INTERNAL_UCP_CHECKOUT`;
- non-Clink providers and endpoint-discovery errors select `EXTERNAL_UCP_CHECKOUT`;
- the retired checkout-selection identifiers `STANDARD_ROUTE_SELECTED`, `STANDARD_UCP_CHECKOUT`, and `CREATE_STANDARD_UCP_CHECKOUT` are removed from code and documentation, while standard-profile discovery identifiers remain.

Verify the adjacent CLI’s focused tests before vendoring, then run the payment skill’s full `npm test` suite and direct bundled-command smoke tests for both production and sandbox `get-endpoint` output.

## Acceptance Criteria

- No hard-coded standard domain allow-list remains.
- `INTERNAL_UCP_MERCHANTS` is loaded from the skill-owned JSONL file.
- Mapped domains resolve an endpoint by merchant ID and select internal checkout without profile probing.
- Unmapped domains preserve profile discovery and provider-gated internal/external routing.
- The public route contract uses `INTERNAL_UCP_CHECKOUT` and related internal terminology.
- Both initial records exist exactly as approved, including the temporary `xxx` merchant ID.
- The skill’s vendored CLI supports `tool get-endpoint` in production and sandbox forms.
- Focused and full verification commands pass.
