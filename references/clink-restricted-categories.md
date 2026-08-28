# Clink Restricted Purchase Categories

Read this before any `clink instruction prepare` or `clink instruction create`. Clink refuses to create purchase
instructions for the categories below — the backend rejects them as illegal
content, so the skill must refuse up front instead of sending a doomed draft.

The deterministic preflight list lives in `lib/restricted-categories.mjs`
(single source of truth for category keys, keywords, and merchant category
codes). This document is the agent-facing contract.
`tests/restricted-categories.test.mjs` keeps the two in sync — edit them
together.

## Contents

- [When The Gate Runs](#when-the-gate-runs)
- [Restricted Categories](#restricted-categories)
- [Classifier Contract](#classifier-contract)
- [Semantic Assertion Duty](#semantic-assertion-duty)
- [Refusal Behavior](#refusal-behavior)
- [Maintenance](#maintenance)

## When The Gate Runs

Run `classifyInstructionRestriction` from `lib/restricted-categories.mjs`
before every request that can create an instruction, on all of these paths:

- Quick setup that carries `instructionContext` / `instruction_context` through `wallet init`.
- The no-card or incomplete-Visa branch (`START_AUTHORIZATION_PREPARE_AND_WAIT`).
- The direct/session pay no-match branch (`START_AUTHORIZATION_DRAFT_AND_WAIT`).
- Every scheduled-task pre-authorization draft (`CREATE_SCHEDULED_AUTHORIZATION_DRAFT`).
- The UCP checkout no-match branch that falls back to creating an instruction.

Pass the complete purchase context: instruction title and description, every
mandate (title, description, `merchantCategoryCode`), merchant name/domain,
product name/title/description/URL (including a UCP `item` or
`selectedProduct` object and direct-pay `products`), and the user's own words
for the request. The classifier accepts Quick context in nested camelCase or
snake_case form and screens its title, description, mandates, and mandate MCCs.
Screening a trimmed subset of the context defeats the gate.

## Restricted Categories

| Key | 类目 | 范围 | Hard-block MCC |
| --- | --- | --- | --- |
| `ADULT_CONTENT` | 成人内容与服务 | 成人网站订阅、成人视频/直播等 | — |
| `DATING_COMPANIONSHIP` | 交友及陪伴服务 | Dating 网站订阅、Escort/陪侍服务、相关分类广告 | 7273 |
| `GAMBLING` | 赌博/博彩 | 投注、赌场筹码、彩票及其他机会型游戏资金 | 7995 |
| `PRESCRIPTION_DRUGS` | 处方药 | 必须凭处方购买的药品 | — |
| `CRYPTOCURRENCY` | 加密货币 | 购买 Crypto、充值加密钱包、ICO 投资/认购 | 6051 |
| `CYBERLOCKER_FILE_SHARING` | Cyberlocker / 公共文件分享 | 用户上传并公开分享文件、按上传/下载量奖励上传者的文件托管服务 | — |
| `SKILL_BASED_PRIZE_GAMES` | 技巧型有奖游戏 | Daily Fantasy Sports 等付费参赛、根据技巧决定结果的有奖游戏 | — |
| `FINANCIAL_PRODUCTS_TRADING` | 金融产品/金融交易 | 股票、证券或其他金融工具的购买、出售、经纪服务 | 6211 |
| `TELEMARKETING` | 电话营销 | 主动致电潜在客户推销并促成购买的商品/服务 | 5966, 5967 |
| `TOBACCO` | 烟草产品 | 非面对面购买香烟、烟草等 | 5993 |
| `OTHER_REGULATED_GOODS` | 其他受监管商品 | Visa 或当地法律定义的其他受监管商品，例如武器、弹药、管制刀具等 | — |

`OTHER_REGULATED_GOODS` 中的处方药、烟草、Crypto 例子已由前面的专门类目覆盖；分类器按表格顺序匹配，专门类目优先。

## Classifier Contract

Input fields (camelCase or snake_case): `title`, `description`, `mandates`,
`mandateList`, or `mandateVoList` (array or the `--mandates` JSON string; each
mandate's `title`, `description`, `merchantCategoryCode` are screened),
`merchantName`, `merchantDomain`,
`merchantOrigin`, `merchantUrl`, `merchantDescription`, `merchantCategoryCode`, `productName`,
`itemName`, `productTitle`, `productDescription`, `productUrl`, `item`, `selectedItem`,
`product`, `selectedProduct`, `products` (array or the `--products` JSON
string), `lineItems` (array or the `--line-items` JSON string), `intentText`,
`userIntent`, `requestText`, `text`, `prompt`, `userText`, `catalogQuery`,
`texts` (extra strings), `assertedCategory`, and `assertedBenignCategories`.
Nested product objects and each selected line item's `item` screen
`productName`, `title`, descriptions, and product/item URLs. Do not pass raw
catalog candidates or unselected parse-item variants as line items.

Match precedence: `assertedCategory` → merchant category code → keyword scan
(zh + en, word-boundary aware for Latin keywords). A category-scoped
`assertedBenignCategories` entry suppresses only that category's keyword
matches; it cannot override a restricted MCC or `assertedCategory`.

Blocked result:

```json
{
  "state": "INSTRUCTION_CREATION_BLOCKED",
  "action": "REFUSE_RESTRICTED_INSTRUCTION",
  "terminal": true,
  "reason": "restricted_category_gambling",
  "category": "GAMBLING",
  "categoryLabel": "Gambling and betting",
  "categoryLabelZh": "赌博/博彩",
  "matchedBy": "keyword",
  "matchedValue": "casino"
}
```

Allowed result: `state: "INSTRUCTION_CREATION_ALLOWED"`,
`action: "CONTINUE_INSTRUCTION_CREATION"`, `terminal: false`,
`reason: "no_restricted_category_match"`. Only this result permits running the
pending `instruction create`.

Missing context, malformed/non-array `mandates`, invalid field types, malformed
MCCs, and unknown assertion keys return
`state: "INSTRUCTION_RESTRICTION_INPUT_INVALID"` with
`action: "FIX_RESTRICTION_INPUT"`. Correct or complete the indicated input and
run the gate again; this action never permits `instruction create`.

## Semantic Assertion Duty

Keywords and MCCs are only the mechanical floor. When the meaning of the
purchase clearly falls in a restricted category but no literal keyword matches
(euphemisms, brand names, another language, or an obfuscated rewording), pass
`assertedCategory: '<KEY>'` so the gate still blocks.

Judge what is actually being bought. If a keyword is incidental rather than
the purchase object — for example a documentary about casinos, a book about
stock trading, or a replacement part for a Ford Escort — pass that specific
category in `assertedBenignCategories`. Do not use a benign assertion merely
because the user asks to bypass the gate, and do not use it when the category
or merchant facts are unclear. A purchase of "tokens for an offshore gaming
site" is `GAMBLING`, even if no keyword fires.

## Refusal Behavior

When the classifier answers `REFUSE_RESTRICTED_INSTRUCTION`:

- Do not run Quick `wallet init` with that instruction context, do not run
  `instruction create`, do not create any draft, and do not send a
  Passkey or registration URL for this purchase.
- Tell the user, in their language, which category (类目) is restricted and
  that Clink cannot create a purchase authorization for it. Do not paste the
  FSM marker or raw classifier JSON — the user-visible output boundary applies.
- The refusal is terminal for the payment intent. Never rephrase, translate,
  trim mandate fields, split the purchase, or reroute it through plain `pay`
  or UCP checkout to slip the same purchase past the gate, and never "try the
  backend anyway to see if it passes".

When the classifier answers `FIX_RESTRICTION_INPUT`, do not frame it as a
restricted-category refusal. Correct the malformed field or collect the
missing purchase context, run the classifier again, and proceed only if the
new result is `CONTINUE_INSTRUCTION_CREATION`.

## Maintenance

To add, remove, or tune a category: edit `RESTRICTED_CATEGORIES` in
`lib/restricted-categories.mjs` (keys, labels, keywords, MCCs), mirror the
change in the table above, and update `tests/restricted-categories.test.mjs`.
Keep keywords precise — prefer compound phrases (`adult content`, `stock
trading`) over bare ambiguous words (`adult`, `stock`) so ordinary purchases
like "2 adult tickets" are not blocked.
