# Internal UCP Merchant Routing Design

## Goal

Move internal-UCP merchant configuration and endpoint resolution into `clink-cli`. The payment skill no longer owns or loads a merchant mapping and no longer parses a product domain for internal routing. Instead, it invokes one CLI discovery command with the product URL and classifies the result.

The selected internal route uses `INTERNAL_UCP_CHECKOUT` terminology. The protocol term “standard UCP profile” remains unchanged because it names the discovery protocol used by the fallback path.

## Scope

This change covers two repositories:

- `/Users/dylan/clink/public-skills/clink-cli`: environment-specific JSON configuration, a nested internal-UCP tool command, domain lookup, endpoint generation, help, and tests;
- `/Users/dylan/clink/public-skills/agentic-payment-skills`: vendored CLI synchronization, route FSM integration, tests, and routing documentation.

This change does not alter checkout create/complete payloads, authorization matching, fulfillment classification, payment-instrument selection, or merchant fulfillment confirmation.

## CLI-Owned Configuration

Add two standard JSON array files to `clink-cli`:

- `src/internal-ucp.production.json`
- `src/internal-ucp.sandbox.json`

Production initially contains no internal merchants:

```json
[]
```

Sandbox initially contains:

```json
[
  {
    "domain_name": "modelmax-store-uat.myshopify.com",
    "merchant_id": "mcht_fcq09yoqqink"
  }
]
```

Each record requires a nonempty string `domain_name` and `merchant_id`. Configuration loading must:

- validate both environment files;
- canonicalize `domain_name` by trimming whitespace, lowercasing it, and removing trailing dots;
- reject malformed records and duplicate canonical domains;
- use exact canonical hostname matching;
- include both JSON files in TypeScript builds, the published CLI package, and the single-file vendored bundle.

A record for `www.example.com` does not match `example.com` or `shop.example.com`. Wildcards and registrable-domain inference are outside this scope.

## CLI Command

Replace the current uncommitted flat `tool get-endpoint --merchant-id` draft with the approved nested command:

```bash
clink-cli tool internal-ucp get-endpoint --product-url <url> --format json
clink-cli tool internal-ucp get-endpoint --product-url <url> --sandbox --format json
```

`--sandbox` selects `src/internal-ucp.sandbox.json` and the sandbox API base URL. Without it, the command selects `src/internal-ucp.production.json` and the production API base URL.

The command must:

1. require `--product-url`;
2. parse it as an absolute URL;
3. canonicalize `URL.hostname`;
4. select the production or sandbox merchant configuration;
5. find an exact `domain_name` match;
6. generate the REST endpoint as `<environment_api_base>/agent/ucp/<encoded_merchant_id>`;
7. return the matched domain, merchant ID, provider, and endpoint.

Sandbox success example:

```json
{
  "domainName": "modelmax-store-uat.myshopify.com",
  "merchantId": "mcht_fcq09yoqqink",
  "provider": "clinkbill",
  "endpoint": "https://uat-api.clinkbill.com/agent/ucp/mcht_fcq09yoqqink"
}
```

The command follows existing discovery-tool conventions:

- a domain absent from the selected environment configuration prints `{"error_code":"NOT_IN_INTERNAL_UCP_LIST"}` and exits `0`;
- a missing `--product-url` or invalid URL uses the normal validation-error envelope and exits `2`;
- unexpected configuration or runtime errors use the existing CLI error handling and do not masquerade as a list miss.

The command is local and deterministic. It performs no network request.

## CLI Structure

Add a focused internal-UCP configuration and resolver unit rather than embedding merchant data in the command dispatcher. It owns configuration validation, environment selection, domain canonicalization, exact lookup, and endpoint construction.

Extend CLI parsing and help for the three-level command path:

```text
tool -> internal-ucp -> get-endpoint
```

The dispatcher may read the third positional argument from the existing parsed positional list. Help must cover both `tool internal-ucp --help` and `tool internal-ucp get-endpoint --help` behavior without changing unrelated command groups.

## Skill Route Contract

Remove the hard-coded `STANDARD_UCP_DOMAINS` allow-list and do not add a mapping file or mapping loader to the skill.

Rename checkout-selection terminology throughout the public FSM contract:

```text
STANDARD_ROUTE_SELECTED         -> INTERNAL_ROUTE_SELECTED
STANDARD_UCP_CHECKOUT           -> INTERNAL_UCP_CHECKOUT
CREATE_STANDARD_UCP_CHECKOUT    -> CREATE_INTERNAL_UCP_CHECKOUT
```

Keep profile-discovery names such as `STANDARD_UCP_PROFILE_CHECK` because they identify the standard UCP discovery protocol.

Add a first-stage CLI discovery transition:

```text
INTERNAL_ENDPOINT_REQUIRED
INTERNAL_UCP_ENDPOINT_DISCOVERY
GET_INTERNAL_UCP_ENDPOINT
```

The FSM selects the best available product URL from the already-frozen product facts. It does not parse the hostname or inspect merchant configuration. When no internal endpoint observation is present, it returns the CLI command for the active environment. The payment skill’s sandbox/UAT flow executes:

```bash
clink-cli tool internal-ucp get-endpoint \
  --product-url <selected_product_url> \
  --sandbox \
  --format json
```

## Routing Flow

Route resolution starts after product parsing and item selection:

```text
selected product URL
  -> clink-cli tool internal-ucp get-endpoint --product-url ...
     -> endpoint result
        -> INTERNAL_UCP_CHECKOUT
     -> error_code == NOT_IN_INTERNAL_UCP_LIST
        -> CHECK_STANDARD_UCP_PROFILE
        -> profile absent/non-JSON
           -> EXTERNAL_UCP_CHECKOUT
        -> successful JSON profile
           -> GET_REST_ENDPOINT using profile shopping endpoint or product URL
           -> provider == clinkbill
              -> INTERNAL_UCP_CHECKOUT
           -> provider != clinkbill or endpoint discovery error
              -> EXTERNAL_UCP_CHECKOUT
     -> any other CLI error or malformed result
        -> SURFACE_ERROR
```

An internal-list miss is the only CLI result that enters autonomous profile discovery. A configured merchant never runs the profile probe. Routing must not mutate the selected item, amount, merchant facts, authorization, or fulfillment state.

If no product URL can be selected, retain the existing input-required behavior rather than guessing a domain or merchant.

## Vendored CLI

The adjacent `clink-cli` worktree already contains uncommitted source, help, and test changes for the superseded flat `get-endpoint` draft. Preserve unrelated user-owned edits while revising those same feature files to the approved nested product-URL command.

After the adjacent CLI tests pass, build it and regenerate `vendor/clink-cli/clink-cli.bundle.mjs` in the payment skill using the existing vendoring recipe. Do not commit unrelated files from the adjacent CLI repository as part of the payment-skill repository commit.

## Documentation

Update the following:

- `clink-cli/README.md` and `clink-cli/README-zh.md` with the nested command and environment behavior;
- payment skill `SKILL.md` action contract, routing matrix, hard rules, and quick reference;
- `references/clink-ucp-checkout.md` route algorithm and end-to-end skeleton;
- payment skill `README.md` and `README.zh.md` routing summaries.

Documentation must consistently use “internal UCP checkout” for the selected internal route and reserve “standard UCP profile” for discovery.

## Testing

Add or revise `clink-cli` tests covering:

- production configuration is initially empty;
- sandbox configuration contains the approved ModelMax merchant;
- exact hostname matching with lowercase/trailing-dot normalization;
- subdomains and parent domains do not match accidentally;
- duplicate or malformed configuration records are rejected;
- sandbox ModelMax URL returns the expected UAT REST endpoint;
- the same URL without `--sandbox` returns `NOT_IN_INTERNAL_UCP_LIST`;
- an unknown sandbox URL returns `NOT_IN_INTERNAL_UCP_LIST` with exit code `0`;
- missing `--product-url` and invalid URLs return validation errors;
- nested command and help dispatch work;
- the old flat `tool get-endpoint --merchant-id` command is no longer documented or dispatched.

Update payment-skill route tests covering:

- the first route action calls `tool internal-ucp get-endpoint` with the selected product URL;
- a successful CLI endpoint result selects `INTERNAL_UCP_CHECKOUT` directly;
- `NOT_IN_INTERNAL_UCP_LIST` requests standard-profile discovery;
- other CLI errors do not trigger profile fallback;
- an unmapped merchant with a JSON profile and `provider=clinkbill` selects `INTERNAL_UCP_CHECKOUT`;
- non-Clink providers and REST endpoint-discovery errors select `EXTERNAL_UCP_CHECKOUT`;
- the retired checkout-selection identifiers `STANDARD_ROUTE_SELECTED`, `STANDARD_UCP_CHECKOUT`, and `CREATE_STANDARD_UCP_CHECKOUT` are removed, while standard-profile identifiers remain.

Verify the adjacent CLI’s full test suite before vendoring. Then run the payment skill’s full `npm test` suite and direct bundled-command smoke tests for sandbox success, production miss, and sandbox miss.

## Acceptance Criteria

- Internal merchant configuration exists only in `clink-cli`, with separate production and sandbox JSON files.
- Production starts with `[]`; sandbox contains exactly the approved ModelMax merchant record.
- `tool internal-ucp get-endpoint --product-url` selects configuration and endpoint base by environment.
- The command returns `NOT_IN_INTERNAL_UCP_LIST` using existing discovery-tool conventions when the domain is absent.
- No hard-coded internal/standard domain allow-list or merchant mapping remains in the payment skill.
- The payment skill delegates internal detection and endpoint generation to the CLI.
- Only `NOT_IN_INTERNAL_UCP_LIST` falls back to autonomous standard-profile probing.
- A CLI endpoint result or profile-discovered `provider=clinkbill` selects `INTERNAL_UCP_CHECKOUT`.
- Both production and sandbox configuration are present in the vendored single-file CLI.
- Focused and full verification commands pass.
