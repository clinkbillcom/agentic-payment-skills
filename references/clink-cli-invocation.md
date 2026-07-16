# Clink CLI Invocation

Read this before running any `clink-cli` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

## Command Resolution

Every example in this skill uses `clink-cli` as the stable command name. This repository provides that command through package.json `bin.clink-cli`, which points to `bin/clink-cli`. Use that single entrypoint for every operation instead of repeating the bundle path.

**`bin/clink-cli` uses production by default and does not hardcode `--sandbox`.** Select the environment once at the start of a workflow, bind the logical `clink-cli` command to that exact invocation, and reuse it for every follow-up command:

- production: `bin/clink-cli`;
- sandbox/UAT: `bin/clink-cli --sandbox`;
- explicit API host: `bin/clink-cli --base-url <url>` or one fixed `CLINK_BASE_URL` value.

To select sandbox/UAT, include `--sandbox` in that locked logical wrapper.

The wrapper is:

```bash
bin/clink-cli
```

Credentials must match the selected environment. Never use a production customer API key with a sandbox/UAT command, or sandbox/UAT credentials with a production command.

Resolve `clink-cli` to the selected invocation at the start of a workflow and keep the same flags and `CLINK_BASE_URL` for every follow-up command; this is the environment lock. Direct local execution can use `./bin/clink-cli ...`. A locally linked executable may be used only after confirming that it points to this repository wrapper and preserves the same environment selection.

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

## Exit Codes

| Code | Meaning | Action |
| --- | --- | --- |
| 0 | Success | Parse `data`. |
| 2 | Validation error | Fix input before retrying. |
| 3 | Config error | Ask the user to initialize/configure wallet. |
| 4 | Auth error | Verify base URL and customer API key. |
| 5 | API error | Show `error.message`; do not invent recovery. |
| 6 | Network error or ambiguous timeout | Treat payment state as unknown; verify before retrying. |
| 7 | 3DS required | Send redirect URL and wait for order event. |
| 8 | Install error | Surface the installation conflict or transaction failure; do not claim success. |

## Global Options

| Flag | Default | Description |
| --- | --- | --- |
| `--format json` | `json` | Required for agent parsing. |
| `--sandbox` | false | Selects sandbox/UAT API, dashboard, and agent pages. Bind it into the workflow's logical `clink-cli` command when sandbox is selected. |
| `--timeout <ms>` | `30000` | Request timeout. |
| `--dry-run` | false | Print request without executing when supported. |
| `--no-watch` | false | Skip the built-in link watch after a URL is printed. |

Base URL resolution is `--base-url`, then `CLINK_BASE_URL`, then `--sandbox`, then stored/default production config. Customer credentials resolve from flags, then environment variables (`CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`), then `~/.clink-cli/config.json`.

## Secret Handling

Never pass a customer API key as a literal shell argument. Use an environment variable and stdin:

```bash
printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json
```

Do not echo secrets in user-visible output or logs.
