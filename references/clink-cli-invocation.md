# Clink CLI Invocation

Read this before running any `clink-cli` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

## Command Resolution

Every example in this skill uses `clink-cli` as the stable command name. This repository provides that command through package.json `bin.clink-cli`, which points to `bin/clink-cli`. Use that single entrypoint for every operation instead of repeating the bundle path.

**Environment selection belongs to `wallet init`, not to the wrapper.** `--sandbox` and `--test` are accepted only by `wallet init`; every other command rejects them with exit code 2. There is no `--base-url` flag. Select the environment once during initialization:

- production: `bin/clink-cli wallet init --email <email> --no-open --format json`;
- sandbox/UAT: add `--sandbox`;
- test (`*.clinkbill.dev`): add `--test`.

`--sandbox` and `--test` are mutually exclusive. A successful initialization saves the selected environment, so every later command reuses it with no environment flag. Re-run `wallet init` to switch environments. `CLINK_BASE_URL` remains an advanced process-level override for custom endpoints; keep one fixed value for the whole workflow if used at all.

The wrapper is:

```bash
bin/clink-cli
```

OAuth authorization is bound to its issuer origin. Initialize under the exact environment the workflow needs. Never send legacy production credentials to sandbox/UAT/test or vice versa.

Resolve `clink-cli` to `bin/clink-cli` at the start of a workflow and keep the saved environment (and any `CLINK_BASE_URL`) unchanged for every follow-up command; this is the environment lock. Direct local execution can use `./bin/clink-cli ...`. A locally linked executable may be used only after confirming that it points to this repository wrapper.

For Agent-run wallet initialization, explicitly pass `--no-open` on the `wallet init` invocation. This per-invocation opt-out overrides both `--open` and the stored `default-open-links` setting. Do not rely on the stored default: the Agent must stream the original process's live stderr, send the verification URL once, and leave that same process running while the user authorizes in their browser.

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

The OAuth verification URL from `wallet init --no-open` is the narrow exception: it is a live progress message on stderr, not the final JSON envelope. Read it only from the original process's live stderr, send it once, and do not start another init process to obtain it.

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
| `--sandbox` / `--test` | false | Accepted only by `wallet init`; selects the sandbox/UAT or test API, dashboard, and agent environment and saves it. Mutually exclusive. Every other command rejects them with exit code 2. |
| `--timeout <ms>` | `30000` | Request timeout. |
| `--dry-run` | false | Print request without executing when supported. |
| `--no-open` | false | Force-disable browser launch for this invocation, overriding `--open` and stored `default-open-links`; required for Agent-run `wallet init`. |
| `--no-watch` | false | Skip the built-in link watch after a URL is printed. |

Base URL resolution is `CLINK_BASE_URL`, then the environment saved by `wallet init` (default production). `--base-url` no longer exists and returns `unknown option: --base-url`. Stored OAuth authorization is never sent outside its issuer origin. `wallet status` exposes `hasStoredAuthorization` and `authorizationEnvironmentMatches` so the agent can distinguish a saved login from one effective for the selected origin. When `oauthRequired=true`, stored/env/flag CSK is ignored. Only a wallet that has never completed OAuth resolves legacy customer credentials from flags, then environment variables (`CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`), then `~/.clink-cli/config.json`.

The CLI binds each long-running command to the authorization identity observed when it starts. OAuth refresh/retry, payment-method caching, event polling/ACK, and logout stop if another process replaces the customer, device, or OAuth session. A customer-mismatched webhook is neither cached nor acknowledged. Surface these authentication-change errors, re-run `wallet status` under the same environment lock, and never automatically retry a state-changing payment, Tip, checkout, refund, or logout.

## Secret Handling

Never read or print OAuth Access/Refresh Tokens. Token refresh and revocation belong to the CLI; use `wallet init`, authenticated commands, and `wallet logout`. Never pass a legacy customer API key as a literal shell argument. A never-OAuth legacy workflow may receive `CLINK_CUSTOMER_API_KEY` from its execution environment. `config set customer-api-key` is always rejected; only `config unset customer-api-key` may remove an existing saved legacy key.

Do not echo secrets in user-visible output or logs. `wallet status` and `config get` expose readiness metadata without raw tokens or API keys.
