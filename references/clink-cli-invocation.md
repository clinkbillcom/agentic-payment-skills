# Clink CLI Invocation

Read this before running any `clink-cli` command from this skill.

## Command Resolution

The command examples use `clink-cli` as the stable command name. In a packaged skill session, define it from the vendored bundle before running examples:

```bash
clink-cli() { node "<skill_dir>/vendor/clink-cli/clink-cli.bundle.mjs" "$@"; }
```

Replace `<skill_dir>` with the absolute path of this skill. For local developer debugging, a locally linked `clink-cli` executable may be used only after confirming it is built from the expected local source.

To inspect help without installing a global binary:

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
| 4 | Auth error | Verify profile, base URL, and customer API key. |
| 5 | API error | Show `error.message`; do not invent recovery. |
| 6 | Network error or ambiguous timeout | Treat payment state as unknown; verify before retrying. |
| 7 | 3DS required | Send redirect URL and wait for order event. |

## Global Options

| Flag | Default | Description |
| --- | --- | --- |
| `--format json` | `json` | Required for agent parsing. |
| `--profile <name>` | `default` | Named local credential profile. |
| `--sandbox` | false | Uses sandbox API and sandbox agent pages. Pair it with a sandbox profile. |
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
