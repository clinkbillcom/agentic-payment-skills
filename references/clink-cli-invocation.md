# Clink CLI Invocation

Read this before running any `clink-cli` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

## Command Resolution

Every example in this skill uses `clink-cli` as the stable command name. Define it once from the vendored bundle at the start of the workflow, and reuse that single prefix for every command. Do not repeat the bundle path or `--sandbox` on individual examples; the prefix already carries them.

**This prefix definition is the only place that selects sandbox vs production.** Every other example and reference is environment-neutral, so switching environments means editing this one line and nothing else.

For sandbox, bake in `--sandbox`:

```bash
clink-cli() { node "<skill_dir>/vendor/clink-cli/clink-cli.bundle.mjs" --sandbox "$@"; }
```

For production, drop the sandbox flags:

```bash
clink-cli() { node "<skill_dir>/vendor/clink-cli/clink-cli.bundle.mjs" "$@"; }
```

Replace `<skill_dir>` with the absolute path of this skill. Match local credentials to the environment: sandbox customer credentials when using `--sandbox`, production credentials for production. Never reuse a production customer API key with `--sandbox`.

Pick one prefix at the start of a workflow and keep it for every follow-up command; this is the environment lock. For local developer debugging, a locally linked `clink-cli` executable may be used only after confirming it is built from the expected local source.

To inspect help without installing a global binary, call the bundle directly:

```bash
node vendor/clink-cli/clink-cli.bundle.mjs --help
node vendor/clink-cli/clink-cli.bundle.mjs wallet --help
node vendor/clink-cli/clink-cli.bundle.mjs instruction --help
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

## Global Options

| Flag | Default | Description |
| --- | --- | --- |
| `--format json` | `json` | Required for agent parsing. |
| `--sandbox` | false | Uses sandbox API and sandbox agent pages. Selected only in the `clink-cli` prefix definition (see Command Resolution), never per command. |
| `--timeout <ms>` | `30000` | Request timeout. |
| `--dry-run` | false | Print request without executing when supported. |
| `--no-watch` | false | Skip the built-in link watch after a URL is printed. |

Config resolution is flags first, then environment variables (`CLINK_BASE_URL`, `CLINK_CUSTOMER_ID`, `CLINK_CUSTOMER_API_KEY`), then `~/.clink-cli/config.json`.

## Secret Handling

Never pass a customer API key as a literal shell argument. Use an environment variable and stdin:

```bash
printenv CLINK_CUSTOMER_API_KEY | clink-cli config set customer-api-key --format json
```

Do not echo secrets in user-visible output or logs.
