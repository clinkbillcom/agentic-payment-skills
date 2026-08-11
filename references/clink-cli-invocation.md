# Clink CLI Invocation

Read this before running any `clink` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

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

For every wallet initialization, pass `--email` and `--open`. There is no `--name` flag: `wallet init --name` exits 2, the initial name comes from the email text before `@`, and `config set name` changes it later. When live stderr prints `Opening your browser...`, the CLI has handed the complete URL to the system browser. Do not repeat the URL; tell the user the Clink authorization page opened, ask them to complete email verification and click Confirm, and leave that same process running. If browser launch fails, read the URL only from the original process's live stderr.

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

The OAuth verification URL is a live progress message on stderr, not the final JSON envelope. With `wallet init --open`, do not expose it after CLI browser handoff. After a reported browser-launch failure, read it only from the original process's live stderr, send it once, and do not start another init process to obtain it.

## Exit Codes

| Code | Meaning | Action |
| --- | --- | --- |
| 0 | Success | Parse `data`. |
| 2 | Validation error | Fix input before retrying. |
| 3 | Config error | Ask the user to initialize/configure wallet. A logged-out or malformed OAuth-only wallet normally reaches this `Login required` path rather than falling back to CSK. |
| 4 | Auth error | The CLI already refreshes OAuth and retries an unauthorized business request at most once. If OAuth `401` still escapes, or the session is expired/invalid/revoked, stop and explicitly reauthorize. For legacy-CSK `401`, verify the locked environment and key. For `403`, surface the permission/scope error without refresh or retry. |
| 5 | API error | Show `error.message`; do not invent recovery. |
| 6 | Network error or ambiguous timeout | Treat payment state as unknown; verify before retrying. |
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

`wallet init` resolves its distribution-pinned environment first, then `CLINK_BASE_URL`, then production. Later commands resolve `CLINK_BASE_URL` and then the saved base URL. There is no `--base-url` option; passing it returns `unknown option: --base-url`. Stored OAuth authorization is never sent outside its issuer origin. `wallet status` exposes `hasStoredAuthorization` and `authorizationEnvironmentMatches` so the agent can distinguish a saved login from one effective for the selected origin. When `oauthRequired=true`, stored/env/flag CSK is ignored. Only a wallet that has never completed OAuth resolves legacy customer credentials from flags, then environment variables (`CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`), then `~/.clink-cli/config.json`.

The CLI binds each long-running command to the authorization identity observed when it starts. OAuth refresh/retry, payment-method caching, event polling/ACK, and logout stop if another process replaces the customer, device, or OAuth session. A customer-mismatched webhook is neither cached nor acknowledged. Surface these authentication-change errors, re-run `wallet status` under the same environment lock, and never automatically retry a state-changing payment, Tip, checkout, refund, or logout.

## Secret Handling

Never read or print OAuth Access/Refresh Tokens. Token refresh and revocation belong to the CLI; use `wallet init`, authenticated commands, and `wallet logout`. Never pass a legacy customer API key as a literal shell argument. A never-OAuth legacy workflow may receive `CLINK_CUSTOMER_API_KEY` from its execution environment. `config set customer-api-key` is always rejected; only `config unset customer-api-key` may remove an existing saved legacy key.

Do not echo secrets in user-visible output or logs. `wallet status` and `config get` expose readiness metadata without raw tokens or API keys.
