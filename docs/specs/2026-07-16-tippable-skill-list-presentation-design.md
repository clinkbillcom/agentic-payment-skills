# Tippable Skill List Presentation and Versionless Tip Design

## Goal

Change only the tippable-Skill list presentation and Skill Tip target contract:

- display exactly three table columns: Number, publisher, and skill name;
- render all table headers in the user's language;
- resolve a tip to `publisher/name` and never pass a version to `clink-cli skills tip`.

## Scope

This design covers:

- presentation of `clink-cli skills list --all --tippable --format json` results;
- localization of the three table headers;
- Number-to-identity projection for Skill Tip;
- publisher/name Skill Tip command construction;
- Skill Tip confirmation and result-binding rules affected by removing version selection;
- focused documentation and tests.

This design does not change:

- wallet initialization, sandbox selection, endpoint persistence, or the CLI wrapper;
- `clink-cli skills list` or `clink-cli skills tip` API behavior;
- Skill installation, including its optional exact-version behavior;
- the two-hour Number snapshot lifetime and context-isolation rules;
- payment authorization, synchronous payment-success semantics, metrics, or optional account-event polling;
- the vendored CLI bundle, because the current CLI already supports a tip without `--version`.

## Selected Approach

Use a tip-specific presentation and target projection instead of weakening the shared Skill-list snapshot.

The list parser may continue retaining CLI metadata such as `skillId` and `versionNo` for existing consumers, including Skill installation and event correlation. The user-visible tippable table projects only `number`, `publisher`, and `skillName`. The Skill Tip workflow projects a selected row to `publisher/skillName` and ignores its version when constructing the payment command.

This keeps the requested behavior isolated from `skills install`.

## Intent and Command Contract

The list intent continues to execute:

```bash
clink-cli skills list --all --tippable --format json
```

The tip intent always executes:

```bash
clink-cli skills tip \
  --publisher <publisher> \
  --name <skill_name> \
  --amount <amount> \
  --format json
```

The Skill Tip workflow must never add:

- `--version`;
- `--number`;
- `--expected-skill-id`.

The CLI therefore applies its default publisher/name version selection. The Skill must not claim that the tip targeted an exact version.

## Table Presentation Contract

### Columns

Every non-empty tippable list is rendered as a Markdown table with exactly these semantic columns and in this order:

1. `number`
2. `publisher`
3. `skillName`

Do not display `skillId`, `versionNo`, or any other CLI field. Preserve the CLI-provided Number; do not renumber rows. Do not translate or otherwise rewrite publisher or Skill-name values. Continue escaping Markdown table separators and line breaks in displayed values.

### Header Language

Determine the display language from the current user's list request. If that request is ambiguous, use the dominant language of the current conversation. If neither can be determined, use English.

All three headers must use the same language. Do not emit mixed headers such as `编号 | publisher | skill_name`.

Required Chinese rendering:

```markdown
| 编号 | 发布者 | 技能名称 |
| ---: | --- | --- |
```

Required English rendering:

```markdown
| Number | Publisher | Skill Name |
| ---: | --- | --- |
```

For another user language, localize all three semantic labels into that language while preserving the field values unchanged.

### Empty List

An empty result continues to return a localized empty-list message and no table. This change does not alter empty-list classification.

## Number Snapshot and Tip Resolution

The existing two-hour structured snapshot remains the source of truth for a Number request. Markdown history must not be scraped.

For Skill Tip, resolve a selected snapshot row as:

```json
{
  "publisher": "clinkpay",
  "skillName": "PollyReach"
}
```

The shared snapshot may retain hidden `skillId` and `versionNo` metadata, but:

- `versionNo` must not appear in the displayed table;
- `versionNo` must not appear in the tip confirmation prompt;
- `versionNo` must not appear in the pending tip's execution target;
- `versionNo` must not appear in `expectedTip` as an authorization constraint;
- `versionNo` must not be added to the tip command.

`skillId` may remain internal for existing result validation, metrics, and optional account-event correlation. It must not appear in the list table and must never become a CLI target flag.

When a Number has a valid recent snapshot, use the frozen publisher/name mapping without refreshing the live list. When no valid snapshot exists, keep the existing list-then-confirm flow; its confirmation displays Number, `publisher/name`, amount, and USD without a version suffix.

## Direct Identity Tips

A direct identity request is normalized to publisher/name for execution. Version information is not part of the Skill Tip authorization contract. Even if an input or upstream parser contains `versionNo`, command construction must omit it and the result must not be described as an exact-version tip.

This rule applies equally to:

- `打赏 clinkpay/pollyreach 2 USD`;
- `tip clinkpay/pollyreach $2`;
- a Number resolved from a recent list;
- a pending Number confirmation resumed after the user confirms.

## FSM Changes

Keep the existing Skill Tip states and payment transitions. Change only their presentation and target payloads:

- `classifySkillListObservation` returns the same normalized rows and snapshot, but the tippable table renderer receives the user's display language and emits only the three required columns.
- `TIP_EXECUTION_READY` builds the versionless publisher/name command.
- `TIP_CONFIRMATION_REQUIRED` creates a resolved execution target without `versionNo` and produces a prompt without `@version`.
- `expectedTip` binds publisher, skill name, amount, and USD. It may retain `skillId` when available, but it must not bind or compare a version.
- `classifySkillTipObservation` accepts the version actually resolved by the CLI as result metadata; a different returned version is not an authorization mismatch because no exact version was requested.

The list language is presentation input, not routing input. Changing the language must not change row selection, Number resolution, authorization, or payment behavior.

## Documentation Changes

Update the following contracts without changing unrelated workflows:

- `SKILL.md`
  - describe the three-column localized table;
  - remove optional-version wording from Skill Tip only;
  - show a versionless Tip command;
  - keep Skill Install version wording unchanged.
- `references/clink-skill-tip.md`
  - replace the four-column example;
  - document header-language selection;
  - remove version from Tip target, confirmation, command, and `expectedTip` examples.
- `references/clink-skill-install.md`
  - no behavioral change; only adjust shared-list wording if necessary to clarify that hidden snapshot metadata may still support installation.

Do not modify wallet, payment, refund, UCP, instruction, or async-event documentation for this change.

## Implementation Boundaries

Expected implementation touchpoints are limited to:

- `lib/skill-list-context.mjs`, only if the shared renderer needs a tip-specific column profile or localized headers;
- `lib/skill-tip-workflow-fsm.mjs`;
- Skill Tip router normalization only where it currently preserves a version for tipping;
- `SKILL.md` and `references/clink-skill-tip.md`;
- focused Skill Tip, shared-list presentation, and documentation tests.

Do not change:

- `bin/clink-cli`;
- wallet environment code or documentation;
- `lib/skill-install-workflow-fsm.mjs` behavior;
- the vendored `clink-cli` bundle;
- account-event polling or payment-result classification beyond removing version comparison.

## Testing

Add or update tests for:

1. A Chinese request produces exactly `编号 | 发布者 | 技能名称`.
2. An English request produces exactly `Number | Publisher | Skill Name`.
3. One table never mixes header languages.
4. The table contains exactly three columns and does not contain `skill_id`, `skillId`, `version`, or `versionNo` headers.
5. Publisher and Skill-name values are preserved and Markdown-escaped.
6. CLI Number values are preserved without renumbering.
7. A direct publisher/name tip command contains no `--version`.
8. A direct tip input carrying `versionNo` still produces no `--version` and no exact-version success claim.
9. A Number snapshot row carrying `versionNo` resolves to a versionless publisher/name Tip command.
10. A Number confirmation prompt contains no version suffix.
11. `expectedTip` and result matching do not treat the CLI-resolved version as an authorization constraint.
12. Existing two-hour snapshot, confirmation claim, payment success, optional event, and unknown-payment tests continue to pass.
13. Existing Skill Install latest and exact-version tests continue to pass unchanged.

## Acceptance Criteria

- Every displayed tippable-Skill table has exactly three columns in the order Number, publisher, Skill name.
- All three headers match the current user's language; Chinese and English render exactly as specified.
- `skillId` and version are not displayed.
- Publisher and Skill-name values remain unchanged.
- Every Skill Tip executes by publisher/name and amount without `--version`.
- Number-based tipping preserves the existing recent-context and confirmation safety rules.
- A CLI-resolved version does not cause a Tip authorization mismatch and is not presented as user-selected.
- Skill Install version behavior and all unrelated payment workflows remain unchanged.
- Focused and full test suites pass.
