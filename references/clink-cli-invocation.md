# Clink CLI Invocation

Read this before running any `clink-cli` command from this skill.

Command examples are execution recipes for the agent. Run them through the available runtime when the workflow has the required inputs and authorization; do not present them as routine user-run instructions. Only provide a command instead of executing it when the user explicitly asks for a preview/manual fallback or the runtime cannot execute local commands.

## Command Resolution

Every example in this skill uses `clink-cli` as the stable command name. Define it once from the vendored bundle at the start of the workflow, and reuse that single prefix for every command. Do not repeat the bundle path, `--sandbox`, or `--profile` on individual examples; the prefix already carries them.

**This prefix definition is the only place that selects sandbox vs production.** Every other example and reference is environment-neutral, so switching environments means changing this one keyword and nothing else.

Define the prefix once. The environment is fixed by the single `CLINK_ENV` keyword below — it is the only thing to change to switch environments:

```bash
clink-cli() {
  local CLINK_ENV=sandbox   # the ONLY switch: sandbox | production
  if [ "$CLINK_ENV" = sandbox ]; then
    node "<skill_dir>/vendor/clink-cli/clink-cli.bundle.mjs" --sandbox --profile sandbox "$@"
  else
    node "<skill_dir>/vendor/clink-cli/clink-cli.bundle.mjs" --profile production "$@"
  fi
}
```

The skill currently runs in **sandbox**. To move to production later, change the one keyword `CLINK_ENV=sandbox` to `CLINK_ENV=production` and nothing else. Replace `<skill_dir>` with the absolute path of this skill. Match the profile credentials to the environment: sandbox customer credentials in the `sandbox` profile, production credentials in the `production` profile. Never reuse a production customer API key with `--sandbox`.

The environment is a fixed configuration value, not a runtime choice. Do **not** ask the user which environment to run against. Read `CLINK_ENV` from this prefix and proceed silently — sandbox today, production after the keyword is changed.

Keep this one prefix for every follow-up command in the workflow; this is the profile/environment lock. For local developer debugging, a locally linked `clink-cli` executable may be used only after confirming it is built from the expected local source.

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
| 4 | Auth error | Verify profile, base URL, and customer API key. |
| 5 | API error | Show `error.message`; do not invent recovery. |
| 6 | Network error or ambiguous timeout | Treat payment state as unknown; verify before retrying. |
| 7 | 3DS required | Send redirect URL and wait for order event. |

## Global Options

| Flag | Default | Description |
| --- | --- | --- |
| `--format json` | `json` | Required for agent parsing. |
| `--profile <name>` | `default` | Named local credential profile. Driven by the `CLINK_ENV` keyword in the `clink-cli` prefix (see Command Resolution), not chosen per command. |
| `--sandbox` | false | Uses sandbox API and sandbox agent pages. Driven by the `CLINK_ENV` keyword in the `clink-cli` prefix (see Command Resolution), never per command. |
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
