# Clink CLI Invocation

Read this before running any `clink` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

Route intent through `references/clink-payment-intent-contract.md` before resolving wallet state. Construct the semantic v2 envelope, validate it with `classifyPaymentIntent`, and obey the derived gate: `CATALOG_SEARCH=SKIP`, pre-selection `CATALOG_PURCHASE=DEFER_UNTIL_SELECTION`, and resolved `UCP_CHECKOUT` / `DIRECT_PAY=REQUIRE_STATUS`. Only `REQUIRE_STATUS` or an explicit wallet operation may enter wallet readiness.

## Host Network Preflight

The Skill cannot grant itself shell or network permissions through `SKILL.md` or `agents/openai.yaml`. Codex host-sandbox networking is also separate from Clink's API-environment flags: `clink --sandbox` / `--test` never enable outbound access for the process.

Before the first remote-capable command in each workflow:

1. Resolve this Skill directory, its `bin/clink` wrapper, and its `scripts/network-preflight.mjs` by absolute path. Never resolve either executable from `PATH` or relative to the user's current working directory. Use local-only `wallet status --format json` to determine an authenticated API origin only after the route returns `REQUIRE_STATUS`; anonymous Catalog origins come from `catalogEnvironment` and never require a wallet read.
2. Run the preflight through the host's normal network approval mechanism when one is available. `CODEX_SANDBOX_NETWORK_DISABLED=1` is a non-authoritative hint: an approved or escalated command can retain that value while having network access. Never skip the probe or claim the host blocked it from the variable alone. If the probe itself fails and returns `sandboxNetworkDisabledHint=true`, preserve the actual transport classification; if the host cannot approve network access for the command, suggest this Codex configuration and then retry only the preflight:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   ```

3. Run the bundled, unauthenticated Node preflight against the effective HTTPS origin. Pass only a URL or origin already required by the workflow:

   ```bash
   node <absolute_skill_path>/scripts/network-preflight.mjs <https_url_or_origin>
   ```

   The script emits the sanitized full `origin` (including a non-default port) plus `host`, sends one bodyless `HEAD` with redirects disabled, and never sends Authorization, cookies, API keys, or business payloads. It rejects non-HTTPS URLs and URLs containing credentials. Any HTTP response — including `401`, `403`, `404`, `405`, `429`, or `5xx` — proves DNS/TCP/TLS/HTTP reachability; it does not prove that authentication or the service operation will succeed.
4. Cache a successful result only for that exact origin and workflow. Preflight again before a later command contacts a newly resolved origin when the destination is exposed before that command starts. A failed preflight stops the next remote state change. Enabling networking permits another preflight; it never makes an earlier ambiguous mutation safe to resubmit.

Treat `DNS`, `TIMEOUT`, `CONNECT`, `TLS`, and `TRANSPORT_UNREACHABLE` as transport diagnoses, not proof that Codex deliberately blocked networking. A `sandboxNetworkDisabledHint` does not change that classification. Preserve the script's sanitized nested cause fields, including `code`, `syscall`, and `hostname`; common values include `ENOTFOUND`, `EAI_AGAIN`, `ETIMEDOUT`, and TLS certificate codes. If a later CLI error does not expose a cause, report it as unavailable instead of inventing one.

Do not recommend a Clink-only domain allowlist as sufficient. Public Skill installation currently may reach `s3.us-west-2.amazonaws.com`, while UCP discovery and checkout may reach workflow-resolved merchant origins. Preflight each origin that is known before an invocation when practical, but allow runtime access to the dynamic HTTPS destinations the selected workflow requires. An external preflight cannot intercept a destination that one CLI invocation resolves and immediately fetches internally; do not claim it covered that internal origin, and rely on the CLI's transport/error safeguards for that hop.

Exit status 6 or a `network_error` envelope alone cannot distinguish host sandbox denial, DNS, TLS, proxy, connection, timeout, or service failure. Retry only the preflight while diagnosing. Never blindly resubmit `clink pay`, `clink skills tip`, `clink refund create`, `clink ucp-checkout run`, or another state-changing command. Preserve each workflow's documented status/idempotency verification and execute only an explicitly returned, validated read-only resume command.

## Command Resolution

Every example in this skill uses `clink` as the stable command name. This repository provides it through package.json `bin.clink`, which points to `bin/clink`. Use that single entrypoint for every operation instead of repeating the bundle path.

**Resolve `clink` to this repository's `bin/clink` by absolute path, once, at the start of every workflow. Never invoke a bare `clink` (or `clink-cli`) resolved from `PATH`.** The name on `PATH` may belong to a different build — a globally installed or `npm link`ed CLI from another checkout — and that build does not carry this distribution's sandbox/UAT pin. Every build on the machine shares one global config file, `~/.clink-cli/config.json`, so a different build is not merely a different binary: it is a different environment writing the same state.

**Environment selection belongs to `wallet init` for authenticated commands, not to their later per-command flags.** This UAT distribution pins `wallet init` to sandbox through `CLINK_WALLET_INIT_ENVIRONMENT`. Plain `wallet init` and `wallet init --sandbox` use UAT; `wallet init --test` exits 2 with `wallet init environment is fixed to sandbox by this CLI distribution`. Authenticated commands other than init reject `--sandbox`/`--test`, and there is no `--base-url` flag. Initialize with the plain wrapper:

```bash
bin/clink wallet init --email <email> --open --format json
```

A successful initialization saves the selected environment, so every later authenticated command reuses it with no environment flag. `CLINK_BASE_URL` remains an advanced process-level override for custom authenticated endpoints; keep one fixed value for the whole authenticated workflow if used at all.

Public Catalog discovery is the deliberate exception. These commands are anonymous and do not read `~/.clink-cli/config.json`, saved OAuth/CSK state, the saved wallet `baseUrl`, or `CLINK_BASE_URL`. Start them directly for `CATALOG_SEARCH` and for the discovery stage of `CATALOG_PURCHASE`; do not initialize a wallet as a prerequisite:

```text
tool internal-ucp get-merchant-list
ucp-catalog search
ucp-catalog product
catalog search
```

For Gateway Catalog API calls, this wrapper appends `--sandbox`, so omission or an explicit `--sandbox` uses UAT (`https://uat-api.clinkbill.com`). An explicit `--test` conflicts and exits 2. Freeze `catalogEnvironment=sandbox` through the merchant list, merchant-scoped search, broad search, and product lookup. These commands send no `Authorization`, `X-Customer-API-Key`, `X-Customer-ID`, or timestamp signature and do not refresh OAuth or retry a `401`.

The Agent owns Catalog result-language detection. Before the first search, choose and freeze one canonical BCP47 `catalogLanguage` from the user's explicit result-language request, the established conversation reply language, or the current user's language/script, in that order. New v2 Catalog intent must carry it as `target.catalogLanguage`. Pass it to `ucp-catalog search`, `ucp-catalog product`, and `catalog search` with `--language <tag>`; never read it from wallet config or infer it from product keywords/query text. The CLI normalizes the tag, including Chinese to `zh-Hans` or `zh-Hant`, writes the effective value to request `context.language`, and sends the same value as `Accept-Language`. Keep `--context` for non-language hints such as `address_country`; `--language` and `context.language` are mutually exclusive. A legacy caller that omits both receives untranslated/original provider text and sends no `Accept-Language`; the query is never used to guess a target language. Merchant-scoped search/product implement Catalog translation, while broad search only forwards the language to providers and localization may vary.

`tool internal-ucp get-merchant-list` sends an anonymous `GET /agent/ucp/merchants` to the same sandbox/UAT Catalog API origin selected by this wrapper. Preflight `https://uat-api.clinkbill.com` before the merchant-list command; the successful probe is reusable for later search calls in the same workflow. The command never reads a static public document or a bundled merchant list.

`tool internal-ucp get-endpoint`, `tool parse-item`, checkout, payment, and order commands are not part of this exception. They continue to use the authenticated wallet environment lock. Before a Catalog candidate enters checkout, compare that wallet origin with the candidate's frozen `catalogEnvironment`; a mismatch stops checkout until the environments align. Never carry a test or sandbox candidate silently into production payment.

The wrapper is:

```bash
bin/clink
```

OAuth authorization is bound to its issuer origin. Initialize under the environment this distribution pins. Never send credentials across environments.

**The pin constrains only `wallet init`, and only through this wrapper. It does not validate a base URL that is already saved.** `wallet init` resolves the pinned environment first; every later authenticated command resolves `CLINK_BASE_URL`, then the saved `baseUrl`, with no pin check. So a config written by another build stays in force for authenticated commands run through this UAT wrapper, including `pay`, `ucp-checkout run`, `skills tip`, and `refund create`. Public Catalog discovery is pinned separately as described above.

That state is not self-announcing. `wallet status` reports `authorizationEnvironmentMatches: true` whenever the stored `issuerOrigin` agrees with the effective `baseUrl`, which is exactly what a consistently-UAT wallet looks like. A wallet can therefore report fully OAuth-ready while pointed at the wrong environment.

So after resolving the wrapper, read `wallet status --format json` and compare `data.baseUrl` against this distribution's pinned origin, `https://uat-api.clinkbill.com`, before running any operation that moves money or mutates remote state. On a mismatch, tell the user which origin is actually in effect and get an explicit decision; do not silently continue, and do not silently re-initialize.

For every wallet initialization, pass `--email` and `--open`. There is no `--name` flag: `wallet init --name` exits 2, the initial name comes from the email text before `@`, and `config set name` changes it later. When live stderr prints `Opening your browser...`, the CLI has requested that the system browser handle the complete URL; that line proves neither that a visible window opened nor that OAuth polling has begun. Keep reading until the current attempt prints the complete `Waiting for authorization...` marker, then mark its device-token poll active, tell the user to complete email verification and click Confirm in the resulting window, and leave that same process running without repeating the URL. If browser launch fails, wait for that same marker and read the URL only from the current process's latest wallet-init attempt segment. Never start Event Hub polling for OAuth.

An affirmative fresh-login request is different from asking for the same URL again. `重新登录`, `再登录一次`, `重新授权钱包`, an expired/missed login link, `log in again`, and `fresh login link` start exactly one new `wallet init` process. The CLI generation makes the new process authoritative and causes the older attempt to stop. Resolve email from the current request before wallet status, and never let an already-ready status suppress explicit re-login. Do not use chat history, terminal scrollback, or an older child process as the URL source.

**`--no-open` belongs on every other link-producing command, not `wallet init`.** `card binding-link`, `card setup-link`, `card modify-link`, `risk link`, `instruction create`, `instruction sign-url`, `instruction update`, and `instruction cancel` all launch a browser when `--open` or a stored `default-open-links` says so. `--no-open` suppresses launch only; the built-in event watch is controlled separately by `--no-watch` and must stay on.

`defaultOpenLinks` is not safe to assume. It lives in the same machine-wide `~/.clink-cli/config.json` that every build shares, so one earlier `config set default-open-links true` — from this skill's host or any other build on the machine — re-arms auto-open for all of those commands. Read it once per workflow, then either turn it off or treat `--no-open` as mandatory for the rest of the workflow:

```bash
clink config get --format json
clink config set default-open-links false --format json
```

Which pages the user must complete in their own browser, and which the agent may open, is in `references/clink-browser-handoff.md`. The `wallet init --open` system-browser handoff is the only exception to CLI-side suppression; an agent browser must not navigate a Passkey, 3DS, card, or OAuth page.

The shipped references are the runtime command contract. Do not spend a workflow turn probing `--help`, especially before a payment mutation. Capability/version compatibility is verified by repository tests and the vendored bundle contract, not rediscovered by the Agent during a user request.

## JSON Output

Always pass `--format json`.

Success envelope on stdout:

```json
{ "ok": true, "data": { "...": "..." } }
```

Error envelope on stderr when JSON format is explicit:

```json
{ "ok": false, "error": { "type": "...", "code": 0, "message": "...", "details": {} } }
```

Inspect the process exit code first, then parse the stream that contains the envelope. Do not scrape human text when JSON is available. A successful `pay --terminal-qr --format json` is the deliberate exception to an otherwise quiet stderr: stdout still contains the only success JSON envelope, while stderr contains the user-facing UTF-8 QR or its safe fallback warning. Never parse that character QR as JSON.

For an explicitly selected Agent Alipay payment, invoke `clink pay` with `--payment-method-type ALIPAY --terminal-qr --format json` and omit a default Card payment instrument. In Codex, command output may be collapsed and is not a user-visible message. When stderr contains block characters and no terminal warning, extract only the contiguous QR lines and repeat them exactly inside a fenced `text` block in the next assistant message. Do not substitute PNG because of possible alignment concerns. Use the local file fallback from stdout only when stderr contains `Warning: terminal QR could not be displayed; use customerAction.imagePath instead.` or contains no QR block characters.

That stdout contains `customerAction.type=QR_CODE_REQUIRED` with fixed local-file metadata: `mediaType=image/png`, `temporary=true`, `cleanupRequired=true`, `imagePath`, caller-owned `cleanupPath`, nullable `orderId`, nullable `paymentExecutionDetailId`, numeric-or-null epoch-seconds `expiresAt`, and numeric-or-null `expiresSecond`. The original PNG Data URL and raw `qrCodeContent` are redacted. Never print or decode either marker. After the terminal QR or image fallback becomes visible, immediately run the returned `agent_order.succeeded,agent_order.failed` any-of poll and recursively remove `cleanupPath` after a terminal result.

If QR validation or local storage fails after the charge was submitted, the CLI returns exit 5 with `error.type=payment_state_unknown`. This is not an ordinary API error. Preserve safe `error.details.orderId` and `error.details.paymentExecutionDetailId`, keep `retryAllowed=false`, and route to `PAY_UNKNOWN / VERIFY_BEFORE_RETRY`. Verify the existing payment before any resubmission.

The OAuth verification URL is a live progress message on stderr, not the final JSON envelope. With `wallet init --open`, do not expose it after CLI browser handoff. After a reported browser-launch failure, read it only from the current process's latest attempt segment and send it once. Do not start another init merely to obtain or repeat the URL for the same active attempt; start a new attempt only for explicit re-login or after the current attempt expires or terminates.

Before OAuth completion, the running `wallet init` process polls the OAuth device-token endpoint, not the Event Hub. Treat that poll as active only after the current attempt prints the complete `Waiting for authorization...` marker; do not start `events poll` for OAuth. Init's final `data.bindingUrl` came from a cache refresh with watching disabled and must not be sent directly. When `paymentMethodsCached=true` and `paymentMethodCount=0`, start `clink card binding-link --no-open --format json` without `--no-watch`. Its scoped `payment_method.added` watcher delays the first envelope until its first Event Hub poll succeeds. Once that envelope has a trusted Agent Portal `/payment-method-setup` `bindingUrl` with no query except one optional non-empty `email`, `data.watchReady=true`, and `data.watchEventType=payment_method.added` while the child remains running, returning that watched link to the user is mandatory; do not stop at OAuth-ready. A positive count needs no first-card handoff, and a cache-refresh error does not make OAuth login fail.

## Exit Codes

| Code | Meaning | Action |
| --- | --- | --- |
| 0 | Success | Parse `data`. |
| 2 | Validation error | Fix input before retrying. |
| 3 | Config error | Ask the user to initialize/configure wallet. A logged-out or malformed OAuth-only wallet normally reaches this `Login required` path rather than falling back to CSK. |
| 4 | Auth error | The CLI already refreshes OAuth and retries an unauthorized business request at most once. If OAuth `401` still escapes, or the session is expired/invalid/revoked, stop and explicitly reauthorize. For legacy-CSK `401`, verify the locked environment and key. For `403`, surface the permission/scope error without refresh or retry. |
| 5 | API error, or a post-submit unknown payment state | For ordinary API errors, show `error.message`. If `error.type=payment_state_unknown`, preserve its safe order/PED details, forbid automatic retry, and verify the existing payment. |
| 6 | Transport/network failure or ambiguous timeout; not proof of a server-side failure | Preserve any available sanitized transport cause. Treat every state-changing result as unknown and follow its verification/no-resubmission rule. Use only documented bounded retry policies for read-only work. |
| 7 | 3DS required | Send redirect URL and wait for order event. |
| 8 | Install error | Surface the installation conflict or transaction failure; do not claim success. |

The four Gateway Catalog API actions — `tool internal-ucp get-merchant-list`, `ucp-catalog search`, `ucp-catalog product`, and `catalog search` — are anonymous. Their HTTP `401` or `403` is mapped to API error exit 5 and means the Gateway public-access configuration is wrong. Surface it and stop; the authenticated-command exit-4 recovery rule does not apply, and wallet status, OAuth refresh, or re-login cannot repair it. Other HTTP failures are ordinary API errors (exit 5); transport failures remain exit 6.

## Global Options

| Flag | Default | Description |
| --- | --- | --- |
| `--format json` | `json` | Required for agent parsing. |
| `--sandbox` / `--test` | UAT wrapper adds `--sandbox` | Public Catalog discovery and `wallet init` are pinned to sandbox/UAT. Explicit `--sandbox` is compatible; `--test` conflicts. Other authenticated commands reject environment flags. |
| `--timeout <ms>` | `30000` | Request timeout. |
| `--dry-run` | false | Print request without executing when supported. |
| `--open` | false | Open the generated link in the system browser. Required for every `wallet init` invocation. |
| `--no-open` | false | Force-disable browser launch for this invocation, overriding `--open` and stored `default-open-links`. Required on link-producing commands other than `wallet init`. Suppresses launch only; it does not disable the built-in watch. |
| `--no-watch` | false | Skip the built-in link watch after a URL is printed. |

For direct or legacy UCP order-event compatibility, `events poll` also accepts `--checkout-id <id>` together with exactly
`--type agent_order.succeeded` or `--type agent_order.failed`. The CLI filters before ACK and leaves
same-type events for other concurrent checkouts queued. A checkout match with malformed or
conflicting Payment Order aliases also stays queued. For the success type, pass the checkout-frozen
UCP order ID as `--ucp-order-id <id>` and preserve an internal checkout route with `--endpoint
<url>`. Once the exact success event arrives, the same CLI process keeps it unacknowledged while it
fetches that UCP order and includes it in the poll envelope; if the UCP ID is absent, it resolves it
with bounded read-only checkout GETs first. It ACKs immediately before output. An uncertain ACK
returns `eventAckWarning` without downgrading payment, so a later poll may observe a harmless
duplicate. A timeout's opaque `nextToken` is preserved in the safely rebuilt resume command. Never
pass the event's Payment Order `orderId` or `resourceId` as `--ucp-order-id`, and do not dispatch a
second order command from the Agent.

`wallet init` resolves this distribution's sandbox pin before `CLINK_BASE_URL`. Authenticated later commands resolve `CLINK_BASE_URL` and then the saved base URL. Public Catalog discovery is separately forced to sandbox/UAT by the wrapper. There is no `--base-url` option; passing it returns `unknown option: --base-url`. Stored OAuth authorization is never sent outside its issuer origin. `wallet status` exposes `hasStoredAuthorization` and `authorizationEnvironmentMatches` so the agent can distinguish a saved login from one effective for the selected origin. When `oauthRequired=true`, stored/env/flag CSK is ignored. Only a wallet that has never completed OAuth resolves legacy customer credentials from flags, then environment variables (`CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`), then `~/.clink-cli/config.json`.

The CLI binds each long-running command to the authorization identity observed when it starts. OAuth refresh/retry, payment-method caching, event polling/ACK, and logout stop if another process replaces the customer, device, or OAuth session. A customer-mismatched webhook is neither cached nor acknowledged. Surface these authentication-change errors, re-run `wallet status` under the same environment lock, and never automatically retry a state-changing payment, Tip, checkout, refund, or logout.

## Secret Handling

Never read or print OAuth Access/Refresh Tokens. Token refresh and revocation belong to the CLI; use `wallet init`, authenticated commands, and `wallet logout`. Never pass a legacy customer API key as a literal shell argument. A never-OAuth legacy workflow may receive `CLINK_CUSTOMER_API_KEY` from its execution environment. `config set customer-api-key` is always rejected; only `config unset customer-api-key` may remove an existing saved legacy key.

Do not echo secrets in user-visible output or logs. `wallet status` and `config get` expose readiness metadata without raw tokens or API keys.
