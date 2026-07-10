# Internal UCP CLI Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move internal-UCP merchant detection and REST endpoint generation into a nested `clink-cli` command, then make the payment skill delegate routing to that command and fall back to standard-profile discovery only on `NOT_IN_INTERNAL_UCP_LIST`.

**Architecture:** `clink-cli` owns two environment-specific JSON arrays and a pure resolver that canonicalizes `product-url` hostnames, performs exact lookup, and constructs the internal endpoint. The skill route FSM runs the new command first, selects `INTERNAL_UCP_CHECKOUT` on success, and retains the existing profile/provider fallback only for an explicit list miss.

**Tech Stack:** Node.js 20+, TypeScript 5.8, ESM, Commander, Node test runner, esbuild single-file vendoring, JavaScript FSM modules.

---

## File Structure

### `/Users/dylan/clink/public-skills/clink-cli`

- Create `src/internal-ucp.production.json`: production merchant list, initially empty.
- Create `src/internal-ucp.sandbox.json`: sandbox ModelMax merchant mapping.
- Create `src/internal-ucp.ts`: config validation, hostname normalization, environment selection, exact lookup, endpoint construction.
- Create `src/internal-ucp.test.ts`: pure resolver/config tests.
- Modify `src/args.ts`: register `--product-url`.
- Modify `src/cli.ts`: replace the flat merchant-ID command with nested `tool internal-ucp get-endpoint` dispatch.
- Modify `src/help.ts`: nested tool help.
- Modify `src/tool.test.ts`: CLI behavior and help tests.
- Modify `README.md` and `README-zh.md`: command documentation.

### `/Users/dylan/clink/public-skills/agentic-payment-skills`

- Modify `vendor/clink-cli/clink-cli.bundle.mjs`: regenerate from verified CLI source.
- Modify `lib/ucp-checkout-route-fsm.mjs`: CLI-first internal route and internal terminology.
- Modify `tests/ucp-checkout-route-fsm.test.mjs`: new route transitions.
- Modify `tests/skill-docs.test.mjs`: updated documentation contract.
- Modify `SKILL.md`, `references/clink-ucp-checkout.md`, `README.md`, and `README.zh.md`: routing instructions and terminology.

## Task 1: Add CLI Internal-UCP Resolver and Environment Configuration

**Files:**
- Create: `/Users/dylan/clink/public-skills/clink-cli/src/internal-ucp.production.json`
- Create: `/Users/dylan/clink/public-skills/clink-cli/src/internal-ucp.sandbox.json`
- Create: `/Users/dylan/clink/public-skills/clink-cli/src/internal-ucp.ts`
- Create: `/Users/dylan/clink/public-skills/clink-cli/src/internal-ucp.test.ts`

- [ ] **Step 1: Write failing resolver tests**

Add tests that import `resolveInternalUcpEndpoint` and `validateInternalUcpMerchants` and assert:

```ts
test("sandbox ModelMax product resolves the UAT internal endpoint", () => {
  assert.deepEqual(
    resolveInternalUcpEndpoint("https://modelmax-store-uat.myshopify.com/products/demo", { sandbox: true }),
    {
      domainName: "modelmax-store-uat.myshopify.com",
      merchantId: "mcht_fcq09yoqqink",
      provider: "clinkbill",
      endpoint: "https://uat-api.clinkbill.com/agent/ucp/mcht_fcq09yoqqink"
    }
  );
});

test("production starts without internal merchants", () => {
  assert.throws(
    () => resolveInternalUcpEndpoint("https://modelmax-store-uat.myshopify.com/products/demo"),
    /NOT_IN_INTERNAL_UCP_LIST/
  );
});

test("matching is canonical but exact", () => {
  const merchants = validateInternalUcpMerchants([
    { domain_name: " ModelMax-Store-UAT.MyShopify.Com. ", merchant_id: "mcht_test" }
  ], "test");
  assert.equal(merchants.get("modelmax-store-uat.myshopify.com"), "mcht_test");
  assert.equal(merchants.has("shop.modelmax-store-uat.myshopify.com"), false);
});

test("duplicate and malformed merchant records fail validation", () => {
  assert.throws(
    () => validateInternalUcpMerchants([
      { domain_name: "shop.example.com", merchant_id: "mcht_1" },
      { domain_name: "SHOP.EXAMPLE.COM.", merchant_id: "mcht_2" }
    ], "test"),
    /duplicate internal UCP domain: shop\.example\.com/
  );
  assert.throws(
    () => validateInternalUcpMerchants([{ domain_name: "shop.example.com", merchant_id: "" }], "test"),
    /invalid internal UCP merchant at test\[0\]/
  );
});
```

- [ ] **Step 2: Run the resolver test and verify RED**

Run:

```bash
cd /Users/dylan/clink/public-skills/clink-cli
npm run build
```

Expected: TypeScript fails because `./internal-ucp.js` and its exports do not exist.

- [ ] **Step 3: Add the JSON files and minimal resolver**

Production JSON:

```json
[]
```

Sandbox JSON:

```json
[
  {
    "domain_name": "modelmax-store-uat.myshopify.com",
    "merchant_id": "mcht_fcq09yoqqink"
  }
]
```

Implement `internal-ucp.ts` with these public contracts:

```ts
import productionConfig from "./internal-ucp.production.json" with { type: "json" };
import sandboxConfig from "./internal-ucp.sandbox.json" with { type: "json" };
import { API_BASE_URLS } from "./domains.js";
import { validationError } from "./errors.js";

export interface InternalUcpEndpointResult {
  domainName: string;
  merchantId: string;
  provider: "clinkbill";
  endpoint: string;
}

export interface InternalUcpResolveOptions {
  sandbox?: boolean;
  merchants?: ReadonlyMap<string, string>;
}

export function validateInternalUcpMerchants(value: unknown, source: string): ReadonlyMap<string, string> {
  if (!Array.isArray(value)) throw validationError(`invalid internal UCP config: ${source}`);
  const result = new Map<string, string>();
  value.forEach((record, index) => {
    if (!record || typeof record !== "object") throw validationError(`invalid internal UCP merchant at ${source}[${index}]`);
    const domainName = canonicalDomain((record as Record<string, unknown>).domain_name);
    const merchantId = stringValue((record as Record<string, unknown>).merchant_id);
    if (!domainName || !merchantId) throw validationError(`invalid internal UCP merchant at ${source}[${index}]`);
    if (result.has(domainName)) throw validationError(`duplicate internal UCP domain: ${domainName}`);
    result.set(domainName, merchantId);
  });
  return result;
}

export function resolveInternalUcpEndpoint(
  rawProductUrl: string,
  options: InternalUcpResolveOptions = {}
): InternalUcpEndpointResult {
  let productUrl: URL;
  try {
    productUrl = new URL(rawProductUrl);
  } catch {
    throw validationError("invalid --product-url");
  }
  const domainName = canonicalDomain(productUrl.hostname);
  const merchants = options.merchants ?? (options.sandbox ? SANDBOX_MERCHANTS : PRODUCTION_MERCHANTS);
  const merchantId = domainName ? merchants.get(domainName) : undefined;
  if (!domainName || !merchantId) throw validationError("NOT_IN_INTERNAL_UCP_LIST");
  const baseUrl = options.sandbox ? API_BASE_URLS.sandbox : API_BASE_URLS.production;
  return {
    domainName,
    merchantId,
    provider: "clinkbill",
    endpoint: `${baseUrl}/agent/ucp/${encodeURIComponent(merchantId)}`
  };
}
```

Use these private helpers and validated constants in the same module:

```ts
function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function canonicalDomain(value: unknown): string | undefined {
  return stringValue(value)?.toLowerCase().replace(/\.+$/, "");
}

const PRODUCTION_MERCHANTS = validateInternalUcpMerchants(
  productionConfig,
  "internal-ucp.production.json"
);
const SANDBOX_MERCHANTS = validateInternalUcpMerchants(
  sandboxConfig,
  "internal-ucp.sandbox.json"
);
```

- [ ] **Step 4: Run resolver tests and verify GREEN**

Run:

```bash
cd /Users/dylan/clink/public-skills/clink-cli
npm run build
node --test dist/internal-ucp.test.js
```

Expected: all internal-UCP resolver tests pass.

## Task 2: Add the Nested CLI Command and Help

**Files:**
- Modify: `/Users/dylan/clink/public-skills/clink-cli/src/args.ts`
- Modify: `/Users/dylan/clink/public-skills/clink-cli/src/cli.ts`
- Modify: `/Users/dylan/clink/public-skills/clink-cli/src/help.ts`
- Modify: `/Users/dylan/clink/public-skills/clink-cli/src/tool.test.ts`

- [ ] **Step 1: Replace flat-command tests with failing nested-command tests**

Test sandbox success, production miss, sandbox miss, missing input, and nested help. The central success assertion is:

```ts
const { stdout, stderr } = await execFileAsync(process.execPath, [
  new URL("./index.js", import.meta.url).pathname,
  "tool", "internal-ucp", "get-endpoint",
  "--product-url", "https://modelmax-store-uat.myshopify.com/products/demo",
  "--sandbox", "--format", "json"
], { env: { ...process.env, HOME: TEST_HOME } });

assert.equal(stderr, "");
assert.deepEqual(JSON.parse(stdout), {
  domainName: "modelmax-store-uat.myshopify.com",
  merchantId: "mcht_fcq09yoqqink",
  provider: "clinkbill",
  endpoint: "https://uat-api.clinkbill.com/agent/ucp/mcht_fcq09yoqqink"
});
```

For an absent domain, assert exit success and:

```ts
assert.deepEqual(JSON.parse(stdout), { error_code: "NOT_IN_INTERNAL_UCP_LIST" });
```

- [ ] **Step 2: Run focused CLI tests and verify RED**

Run:

```bash
cd /Users/dylan/clink/public-skills/clink-cli
npm run build
node --test --test-name-pattern='internal-ucp' dist/tool.test.js
```

Expected: failures show `unknown option: --product-url` or unsupported nested command.

- [ ] **Step 3: Implement nested dispatch and discovery-style miss handling**

Register this option in `args.ts`:

```ts
{ name: "product-url", flags: "--product-url <url>" },
```

In `cli.ts`, import `resolveInternalUcpEndpoint`, read `context.args.positionals[2]`, and route only `get-endpoint`. The handler must be:

```ts
async function toolInternalUcp(context: CommandContext): Promise<number> {
  const nestedCommand = context.args.positionals[2];
  if (nestedCommand !== "get-endpoint") {
    throw validationError(`unsupported internal-ucp tool command: ${nestedCommand ?? ""}`);
  }
  const productUrl = requireStringFlag(context.args.flags, "missing --product-url", "product-url");
  try {
    const result = resolveInternalUcpEndpoint(productUrl, {
      sandbox: getBooleanFlag(context.args.flags, "sandbox")
    });
    printJson(result, context.globalOptions.format);
  } catch (error) {
    if (error instanceof CliError && error.message === "NOT_IN_INTERNAL_UCP_LIST") {
      printJson({ error_code: error.message }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    throw error;
  }
  return EXIT_CODES.OK;
}
```

Remove flat `get-endpoint` dispatch and `--merchant-id` endpoint generation from `tool.ts` if no other caller uses it.

- [ ] **Step 4: Implement three-level help**

Extend `printHelp`/`getHelpText` to accept an optional third positional command, add `TOOL_INTERNAL_UCP_HELP` and `TOOL_INTERNAL_UCP_GET_ENDPOINT_HELP`, and document both environment forms. Ensure root tool help lists:

```text
clink-cli tool internal-ucp get-endpoint --product-url <url> [options]
```

- [ ] **Step 5: Run focused CLI tests and verify GREEN**

Run:

```bash
cd /Users/dylan/clink/public-skills/clink-cli
npm run build
node --test dist/internal-ucp.test.js dist/tool.test.js
```

Expected: all resolver and tool tests pass.

## Task 3: Update CLI Documentation and Verify the Adjacent Repository

**Files:**
- Modify: `/Users/dylan/clink/public-skills/clink-cli/README.md`
- Modify: `/Users/dylan/clink/public-skills/clink-cli/README-zh.md`

- [ ] **Step 1: Replace the flat command documentation**

Document:

```bash
clink-cli tool internal-ucp get-endpoint --product-url https://shop.example/products/demo --format json
clink-cli tool internal-ucp get-endpoint --product-url https://modelmax-store-uat.myshopify.com/products/demo --sandbox --format json
```

State exact domain matching and the `NOT_IN_INTERNAL_UCP_LIST` discovery result.

- [ ] **Step 2: Run the full CLI suite**

Run:

```bash
cd /Users/dylan/clink/public-skills/clink-cli
npm test
```

Expected: zero failed tests.

- [ ] **Step 3: Preserve the dirty-worktree boundary**

Run `git diff --check` and inspect `git diff`. Do not commit the adjacent CLI repository because the feature started from user-owned uncommitted changes; leave the complete verified diff intact for the user.

## Task 4: Vendor the Verified CLI Bundle

**Files:**
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/vendor/clink-cli/clink-cli.bundle.mjs`

- [ ] **Step 1: Build and bundle the CLI**

Run:

```bash
cd /Users/dylan/clink/public-skills/clink-cli
npm run build
npx esbuild dist/index.js --bundle --platform=node --format=esm --outfile=/Users/dylan/clink/public-skills/agentic-payment-skills/vendor/clink-cli/clink-cli.bundle.mjs --banner:js="import{createRequire as __cr}from'module';const require=__cr(import.meta.url);"
```

Expected: esbuild reports one generated bundle.

- [ ] **Step 2: Smoke-test both environment paths in the vendored bundle**

Run sandbox success, production miss, and sandbox miss directly against the bundle. Expected sandbox success endpoint is `https://uat-api.clinkbill.com/agent/ucp/mcht_fcq09yoqqink`; both misses return `{"error_code":"NOT_IN_INTERNAL_UCP_LIST"}` with exit code `0`.

## Task 5: Change the Skill Route FSM with TDD

**Files:**
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/tests/ucp-checkout-route-fsm.test.mjs`
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/lib/ucp-checkout-route-fsm.mjs`

- [ ] **Step 1: Write failing route tests**

Replace allow-list tests with assertions for:

```js
const discovery = classifyUcpCheckoutRoute({
  selectedItemUrl: 'https://modelmax-store-uat.myshopify.com/products/demo',
  sandbox: true,
});
assert.equal(discovery.state, UcpCheckoutRouteState.INTERNAL_ENDPOINT_REQUIRED);
assert.equal(discovery.route, UcpCheckoutRoute.INTERNAL_UCP_ENDPOINT_DISCOVERY);
assert.equal(discovery.action, UcpCheckoutRouteAction.GET_INTERNAL_UCP_ENDPOINT);
assert.match(discovery.command, /tool internal-ucp get-endpoint/);
assert.match(discovery.command, /--sandbox/);

const internal = classifyUcpCheckoutRoute({
  selectedItemUrl: 'https://modelmax-store-uat.myshopify.com/products/demo',
  internalUcpEndpointOutput: {
    endpoint: 'https://uat-api.clinkbill.com/agent/ucp/mcht_fcq09yoqqink',
    provider: 'clinkbill',
    merchantId: 'mcht_fcq09yoqqink',
  },
});
assert.equal(internal.route, UcpCheckoutRoute.INTERNAL_UCP_CHECKOUT);
assert.equal(internal.action, UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT);

const fallback = classifyUcpCheckoutRoute({
  selectedItemUrl: 'https://shop.example.com/products/demo',
  internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
});
assert.equal(fallback.action, UcpCheckoutRouteAction.CHECK_STANDARD_UCP_PROFILE);
```

Also test that any other CLI error returns `SURFACE_ERROR`, and retain profile/provider fallback coverage.

- [ ] **Step 2: Run route tests and verify RED**

Run:

```bash
cd /Users/dylan/clink/public-skills/agentic-payment-skills
node --test tests/ucp-checkout-route-fsm.test.mjs
```

Expected: missing `INTERNAL_*` enums/actions and old allow-list behavior cause failures.

- [ ] **Step 3: Implement the CLI-first FSM**

Rename the selected route/state/action identifiers, remove `STANDARD_UCP_DOMAINS`, add `SURFACE_ERROR`, and classify `internalUcpEndpointOutput` before profile evidence. Select a product URL without parsing its hostname for internal lookup. Only `error_code === 'NOT_IN_INTERNAL_UCP_LIST'` enters the existing profile path.

Build commands with shell-safe quoting:

```js
function internalEndpointCommandForUrl(url, sandbox) {
  return `clink-cli tool internal-ucp get-endpoint --product-url ${shellQuoteIfNeeded(url)}${sandbox ? ' --sandbox' : ''} --format json`;
}
```

- [ ] **Step 4: Run route tests and verify GREEN**

Run the focused route test and expect zero failures.

## Task 6: Update Skill Documentation with Contract Tests

**Files:**
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/tests/skill-docs.test.mjs`
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/SKILL.md`
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/references/clink-ucp-checkout.md`
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/README.md`
- Modify: `/Users/dylan/clink/public-skills/agentic-payment-skills/README.zh.md`

- [ ] **Step 1: Write failing documentation assertions**

Require the nested command, `NOT_IN_INTERNAL_UCP_LIST` fallback, `INTERNAL_UCP_CHECKOUT`, and provider-gated profile fallback. Assert the retired hard-coded allow-list and `STANDARD_UCP_CHECKOUT` terminology are absent.

- [ ] **Step 2: Run documentation tests and verify RED**

Run `node --test tests/skill-docs.test.mjs`; expect failures against old allow-list language.

- [ ] **Step 3: Update all routing documentation**

Describe this exact control flow:

```text
product URL -> tool internal-ucp get-endpoint
  success -> internal UCP checkout
  NOT_IN_INTERNAL_UCP_LIST -> standard UCP profile probe
    provider=clinkbill -> internal UCP checkout
    otherwise -> external UCP checkout
  other error -> stop and surface error
```

- [ ] **Step 4: Run documentation tests and verify GREEN**

Run the focused docs test and expect zero failures.

## Task 7: Full Verification and Current-Repo Commit

**Files:**
- Verify all modified payment-skill files.

- [ ] **Step 1: Run full payment-skill tests**

Run:

```bash
cd /Users/dylan/clink/public-skills/agentic-payment-skills
npm test
```

Expected: zero failed tests.

- [ ] **Step 2: Run final CLI verification and bundle smoke tests**

Run `npm test` in the adjacent CLI repository again, then run the three bundle smoke cases. Expected: zero failed tests and exact success/miss outputs.

- [ ] **Step 3: Inspect both worktrees**

Run `git diff --check` in both repositories. Confirm the adjacent CLI diff contains only the pre-existing feature files plus the approved JSON/module changes, and the payment-skill diff contains the regenerated bundle, FSM/tests, and docs.

- [ ] **Step 4: Commit the payment-skill implementation**

Stage only payment-skill implementation files and commit:

```bash
git commit -m "feat: route internal UCP through CLI config"
```

Do not commit the adjacent CLI repository’s user-owned dirty worktree.
