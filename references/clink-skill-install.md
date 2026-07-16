# Skill Installation

Read this before routing or executing a public Skill installation.

## Contents

- Routing and authorization
- Identity targets
- Number targets and context
- Confirmation claim
- CLI result handling
- Conflict and failure handling

## Routing and Authorization

Use `classifyPaymentIntent` before choosing the workflow. An imperative request for exactly one Skill routes to `SKILL_INSTALL`; then use `classifySkillInstallPrerequisites` from `lib/skill-install-workflow-fsm.mjs`. Emit `[SKILL_INSTALL_FSM] state=<STATE> action=<ACTION> reason=<REASON>`.

Accept one target only:

- an identity containing `publisher`, `skillName`, and optional `versionNo`;
- a marked Number such as `第 2 个 skill`, `序号 2`, `#2`, or `number 2`.

Questions, tutorials, status checks, negated requests, historical statements, conditional wording, multiple targets, malformed package tokens, and structured/text conflicts are not installation authorization. Do not let product installation services or installation fees enter this route.

If both a Skill Tip and Skill Install confirmation are pending, a bare confirmation or cancellation is ambiguous. Require the user to say which operation to confirm or cancel.

## Identity Targets

The only execution grammar is:

```text
clink-cli skills install <publisher>/<skillName>[@<version>] --format json
```

For `publisher/name` without a version, omit the version entirely so Marketplace selects latest. Never write a literal latest version. For an exact version request, append it to the single package operand with `@`.

Publisher and Skill name use 1–128 letters, digits, `.`, `_`, or `-`. Version additionally allows `+`. Preserve spelling and case. Reject dangling `@`, extra path segments, URLs, partial-token matches, and noncanonical version syntax instead of silently falling back to latest.

An explicitly authorized identity request runs directly. Preserve this binding for result classification:

```json
{
  "publisher": "clinkpay",
  "skillName": "PollyReach",
  "requestedVersion": "v1.2.3"
}
```

Use `requestedVersion: null` when the version was omitted.

## Number Targets and Context

Number is conversation context, never a CLI target. Read only a structured snapshot that was actually displayed to the same user, conversation/session, and exact environment lock within two hours (including exactly two hours). Require an explicit snapshot scope: `all` or `tippable` for install; an unscoped snapshot is invalid.

Choose the newest valid displayed snapshot for the allowed scope before validating its rows. Do not fall back to an older snapshot when the newest selected snapshot is malformed, has duplicate Number values, or does not contain the requested Number.

Freeze the selected row's `publisher`, `skillName`, optional `versionNo`, and `skillId`. Do not refresh Marketplace and do not reconstruct a snapshot from Markdown history. When no valid snapshot exists, ask for `publisher/name[@version]` or ask the user to list Skills first; do not guess.

Every Number installation requires confirmation, even when its snapshot is current. Store one bound object:

```json
{
  "pendingId": "install_pending_1",
  "status": "AWAITING_CONFIRMATION",
  "number": 2,
  "resolvedTarget": {
    "publisher": "clinkpay",
    "skillName": "PollyReach",
    "skillId": "skill_2",
    "versionNo": "v1.2.3"
  },
  "snapshotId": "snapshot_1",
  "userId": "user_1",
  "conversationId": "conversation_1",
  "environment": "sandbox:https://api.clinkbill.dev",
  "createdAt": "2026-07-16T10:00:00.000Z",
  "expiresAt": "2026-07-16T12:00:00.000Z"
}
```

Show Number, publisher, name, and the frozen version. If the row has no version, display `version: latest`, but still omit the version from the eventual CLI operand.

## Confirmation Claim

Use a two-stage transition:

1. `CONFIRMED + AWAITING_CONFIRMATION` returns `CLAIM_PENDING_INSTALL` and no command.
2. The runtime atomically changes `AWAITING_CONFIRMATION -> EXECUTING`.
3. Only `CLAIMED + EXECUTING` returns `RUN_SKILL_INSTALL` with the frozen identity command.

Cancellation changes `AWAITING_CONFIRMATION -> CANCELLED`. Expired, cross-context, already executing, consumed, or cancelled pending objects never run again. After a terminal CLI result, change `EXECUTING -> CONSUMED`.

## CLI Result Handling

Inspect the exit code first. A success path requires exactly one JSON envelope with boolean `ok: true` and an object `data`. Verify `publisher`, `skillName`, and `requestedVersion` against the frozen `expectedInstall` binding.

Classify `action` as follows:

| CLI action | Result |
| --- | --- |
| `planned` with `dryRun=true` | `PLANNED`; this is not installed |
| `installed` | `INSTALLED` |
| `updated` | `UPDATED` |
| `unchanged` | `UNCHANGED`, terminal success |

A missing or mismatched binding, malformed envelope, multiple stdout envelopes, or unknown action is `UNKNOWN`, never success.

## Conflict and Failure Handling

Do not add replacement behavior by default. Use `--force` only after the user gives explicit authorization to replace an existing installation and its managed agent links or backups.

Surface CLI validation, configuration, authentication, API, network, and install errors without inventing recovery. Exit code 8 is an install transaction error such as a conflict, lock, archive, filesystem, or agent-publication failure. Do not report success from a nonzero exit.
