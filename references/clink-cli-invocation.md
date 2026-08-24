# Clink CLI Invocation

Read this before running any `clink` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

## Host Network Preflight

The Skill cannot grant itself shell or network permissions through `SKILL.md` or `agents/openai.yaml`. Codex host-sandbox networking is also separate from Clink's API-environment flags: `clink --sandbox` / `--test` never enable outbound access for the process.

Before the first remote-capable command in each workflow:

1. Resolve this Skill directory, its `bin/clink` wrapper, and its `scripts/network-preflight.mjs` by absolute path. Never resolve either executable from `PATH` or relative to the user's current working directory. Use local-only commands such as `wallet status --format json` when needed to determine the effective API origin; those commands remain available without network access.
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

Exit status 6 or a `network_error` envelope alone cannot distinguish host sandbox denial, DNS, TLS, proxy, connection, timeout, or service failure. Retry only the preflight while diagnosing. Never blindly resubmit `clink pay`, `clink skills tip`, `clink refund create`, `clink ucp-checkout complete`, or another state-changing command. Preserve each workflow's documented status/idempotency verification and its explicitly bounded read-only GET or poll retries.

## Command Resolution

Every example in this skill uses `clink` as the stable command name. This repository provides it through package.json `bin.clink`, which points to `bin/clink`. Use that single entrypoint for every operation instead of repeating the bundle path.

**Resolve `clink` to this repository's `bin/clink` by absolute path, once, at the start of every workflow. Never invoke a bare `clink` (or `clink-cli`) resolved from `PATH`.** The name on `PATH` may belong to a different build — a globally installed or `npm link`ed CLI from another checkout — and that build does not carry this distribution's production pin. Every build on the machine shares one global config file, `~/.clink-cli/config.json`, so a different build is not merely a different binary: it is a different environment writing the same state.

**Environment selection belongs to `wallet init`, not to per-command flags.** This distribution pins `wallet init` to production through `CLINK_WALLET_INIT_ENVIRONMENT`, so `wallet init --sandbox` and `wallet init --test` exit 2 with `wallet init environment is fixed to production by this CLI distribution`. Other distributions pin sandbox/UAT or test the same way. Every command other than `wallet init` rejects `--sandbox`/`--test` with exit code 2, and there is no `--base-url` flag. Initialize with the plain wrapper:

```bash
bin/clink wallet init --email <email> --open --format json
```

A successful initialization saves the selected environment, so every later command reuses it with no environment flag. `CLINK_BASE_URL` remains an advanced process-level override for custom endpoints; keep one fixed value for the whole workflow if used at all.

The wrapper is:

```bash
bin/clink
```

OAuth authorization is bound to its issuer origin. Initialize under the environment this distribution pins. Never send credentials across environments.

**The pin constrains only `wallet init`, and only through this wrapper. It does not validate a base URL that is already saved.** `wallet init` resolves the pinned environment first; every other command resolves `CLINK_BASE_URL`, then the saved `baseUrl`, with no pin check. So a config written by an unpinned build — or by an intentional sandbox/UAT session — stays in force for every later command run through this production wrapper, including `pay`, `ucp-checkout complete`, `skills tip`, and `refund create`.

That state is not self-announcing. `wallet status` reports `authorizationEnvironmentMatches: true` whenever the stored `issuerOrigin` agrees with the effective `baseUrl`, which is exactly what a consistently-UAT wallet looks like. A wallet can therefore report fully OAuth-ready while pointed at the wrong environment.

So after resolving the wrapper, read `wallet status --format json` and compare `data.baseUrl` against this distribution's pinned origin, `https://api.clinkbill.com`, before running any operation that moves money or mutates remote state. On a mismatch, tell the user which origin is actually in effect and get an explicit decision; do not silently continue, and do not silently re-initialize — `wallet init` against a different origin replaces their current login.

For every wallet initialization, pass `--email` and `--open`. There is no `--name` flag: `wallet init --name` exits 2, the initial name comes from the email text before `@`, and `config set name` changes it later. When live stderr prints `Opening your browser...`, the CLI has requested that the system browser handle the complete URL; that line proves neither that a visible window opened nor that OAuth polling has begun. Keep reading until the current attempt prints the complete `Waiting for authorization...` marker, then mark its device-token poll active, tell the user to complete email verification and click Confirm in the resulting window, and leave that same process running without repeating the URL. If browser launch fails, wait for that same marker and read the URL only from the current process's latest wallet-init attempt segment. Never start Event Hub polling for OAuth.

An affirmative fresh-login request is different from asking for the same URL again. `重新登录`, `再登录一次`, `重新授权钱包`, an expired/missed login link, `log in again`, and `fresh login link` start exactly one new `wallet init` process. The CLI generation makes the new process authoritative and causes the older attempt to stop. Resolve email from the current request before wallet status, and never let an already-ready status suppress explicit re-login. Do not use chat history, terminal scrollback, or an older child process as the URL source.

**`--no-open` belongs on every other link-producing command, not `wallet init`.** `card binding-link`, `card setup-link`, `card modify-link`, `risk link`, `instruction create`, `instruction sign-url`, `instruction update`, and `instruction cancel` all launch a browser when `--open` or a stored `default-open-links` says so. `--no-open` suppresses launch only; the built-in event watch is controlled separately by `--no-watch` and must stay on.

`defaultOpenLinks` is not safe to assume. It lives in the same machine-wide `~/.clink-cli/config.json` that every build shares, so one earlier `config set default-open-links true` — from this skill's host or any other build on the machine — re-arms auto-open for all of those commands. Read it once per workflow, then either turn it off or treat `--no-open` as mandatory for the rest of the workflow:

```bash
clink config get --format json
clink config set default-open-links false --format json
```

Which pages the user must complete in their own browser, and which the agent may open, is in `references/clink-browser-handoff.md`. The `wallet init --open` system-browser handoff is the only exception to CLI-side suppression; an agent browser must not navigate a Passkey, 3DS, card, or OAuth page.

To inspect help without installing a global binary, call the bundle directly:

```bash
node vendor/clink-cli/clink-cli.bundle.mjs --help
node vendor/clink-cli/clink-cli.bundle.mjs wallet --help
node vendor/clink-cli/clink-cli.bundle.mjs instruction --help
node vendor/clink-cli/clink-cli.bundle.mjs skills --help
node vendor/clink-cli/clink-cli.bundle.mjs skills list --help
node vendor/clink-cli/clink-cli.bundle.mjs skills install --help
node vendor/clink-cli/clink-cli.bundle.mjs skills tip --help
```

## JSON Output

Always pass `--format json`.

Success envelope on stdout:

```json
{ "ok": true, "data": { "...": "..." } }
```

Error envelope on stderr when JSON format is explicit:

```json
{ "ok": false, "error": { "type": "...", "code": 0, "message": "..." } }
```

Inspect the process exit code first, then parse the stream that contains the envelope. Do not scrape human text when JSON is available.

The OAuth verification URL is a live progress message on stderr, not the final JSON envelope. With `wallet init --open`, do not expose it after CLI browser handoff. After a reported browser-launch failure, read it only from the current process's latest attempt segment and send it once. Do not start another init merely to obtain or repeat the URL for the same active attempt; start a new attempt only for explicit re-login or after the current attempt expires or terminates.

Before OAuth completion, the running `wallet init` process polls the OAuth device-token endpoint, not the Event Hub. Treat that poll as active only after the current attempt prints the complete `Waiting for authorization...` marker; do not start `events poll` for OAuth. Init's final `data.bindingUrl` came from a cache refresh with watching disabled and must not be sent directly. When `paymentMethodsCached=true` and `paymentMethodCount=0`, start `clink card binding-link --no-open --format json` without `--no-watch`. Its scoped `payment_method.added` watcher delays the first envelope until its first Event Hub poll succeeds. Once that envelope has a trusted Agent Portal `/payment-method-setup` `bindingUrl` with no query except one optional non-empty `email`, `data.watchReady=true`, and `data.watchEventType=payment_method.added` while the child remains running, returning that watched link to the user is mandatory; do not stop at OAuth-ready. A positive count needs no first-card handoff, and a cache-refresh error does not make OAuth login fail.

## Exit Codes

| Code | Meaning | Action |
| --- | --- | --- |
| 0 | Success | Parse `data`. |
| 2 | Validation error | Fix input before retrying. |
| 3 | Config error | Ask the user to initialize/configure wallet. A logged-out or malformed OAuth-only wallet normally reaches this `Login required` path rather than falling back to CSK. |
| 4 | Auth error | The CLI already refreshes OAuth and retries an unauthorized business request at most once. If OAuth `401` still escapes, or the session is expired/invalid/revoked, stop and explicitly reauthorize. For legacy-CSK `401`, verify the locked environment and key. For `403`, surface the permission/scope error without refresh or retry. |
| 5 | API error | Show `error.message`; do not invent recovery. |
| 6 | Transport/network failure or ambiguous timeout; not proof of a server-side failure | Preserve any available sanitized transport cause. Treat every state-changing result as unknown and follow its verification/no-resubmission rule. Use only documented bounded retry policies for read-only work. |
| 7 | 3DS required | Send redirect URL and wait for order event. |
| 8 | Install error | Surface the installation conflict or transaction failure; do not claim success. |

## Global Options

| Flag | Default | Description |
| --- | --- | --- |
| `--format json` | `json` | Required for agent parsing. |
| `--sandbox` / `--test` | false | Accepted only by `wallet init`, and rejected there too when the distribution pins an environment (this one pins production). Mutually exclusive. Every other command rejects them with exit code 2. |
| `--timeout <ms>` | `30000` | Request timeout. |
| `--dry-run` | false | Print request without executing when supported. |
| `--open` | false | Open the generated link in the system browser. Required for every `wallet init` invocation. |
| `--no-open` | false | Force-disable browser launch for this invocation, overriding `--open` and stored `default-open-links`. Required on link-producing commands other than `wallet init`. Suppresses launch only; it does not disable the built-in watch. |
| `--no-watch` | false | Skip the built-in link watch after a URL is printed. |

For UCP order completion, `events poll` also accepts `--checkout-id <id>` together with exactly
`--type agent_order.succeeded` or `--type agent_order.failed`. The CLI filters before ACK: it ACKs
the matching checkout event and leaves same-type events for other concurrent checkouts queued.

`wallet init` resolves its distribution-pinned environment first, then `CLINK_BASE_URL`, then production. Later commands resolve `CLINK_BASE_URL` and then the saved base URL. There is no `--base-url` option; passing it returns `unknown option: --base-url`. Stored OAuth authorization is never sent outside its issuer origin. `wallet status` exposes `hasStoredAuthorization` and `authorizationEnvironmentMatches` so the agent can distinguish a saved login from one effective for the selected origin. When `oauthRequired=true`, stored/env/flag CSK is ignored. Only a wallet that has never completed OAuth resolves legacy customer credentials from flags, then environment variables (`CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`), then `~/.clink-cli/config.json`.

The CLI binds each long-running command to the authorization identity observed when it starts. OAuth refresh/retry, payment-method caching, event polling/ACK, and logout stop if another process replaces the customer, device, or OAuth session. A customer-mismatched webhook is neither cached nor acknowledged. Surface these authentication-change errors, re-run `wallet status` under the same environment lock, and never automatically retry a state-changing payment, Tip, checkout, refund, or logout.

## Secret Handling

Never read or print OAuth Access/Refresh Tokens. Token refresh and revocation belong to the CLI; use `wallet init`, authenticated commands, and `wallet logout`. Never pass a legacy customer API key as a literal shell argument. A never-OAuth legacy workflow may receive `CLINK_CUSTOMER_API_KEY` from its execution environment. `config set customer-api-key` is always rejected; only `config unset customer-api-key` may remove an existing saved legacy key.

Do not echo secrets in user-visible output or logs. `wallet status` and `config get` expose readiness metadata without raw tokens or API keys.
