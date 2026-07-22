# clink-payment-skill

适用于 Claude Code 的 Clink 支付技能，通过 `clink-cli` 实现钱包、卡片、支付、Skill 查询/打赏/安装、VIC 授权、退款和风控规则操作。

## 环境要求

- Node.js >= 20
- Skill 内置 vendored `clink-cli` bundle：`vendor/clink-cli/clink-cli.bundle.mjs`；全局安装 `clink-cli` 只作为本地调试可选项
- 新的钱包初始化使用 OAuth Device Authorization；仅当本地钱包从未完成过 OAuth 授权时，才继续兼容已有且完整的旧 CSK 钱包

## 安装 Clink Payment Skills

直接让 Agent 安装当前的 Clink Payment Skills：

```text
Install Clink Payment Skills: https://github.com/clinkbillcom/agent-payment-skills
```

安装完成后，Agent 会继续引导你完成后续配置。

## 功能说明

安装后，Claude 可以代你执行以下 Clink 支付操作：

- 钱包状态检查
- 绑卡与支付方式管理
- 支付执行（直接模式和会话模式）
- 使用 `clink-cli skills list --all --tippable` 查询可打赏 Skill，仅按编号、发布者、技能名称三列展示，表头语言与用户语言一致
- 使用 `clink-cli skills tip` 按 publisher/name 且不传 version，或从同一上下文两小时内展示的列表解析 Number 后执行明确授权的 USD 打赏；同步 agent pay 成功即为支付成功，`account-created` / `account-reloaded` 只是可选的结果增强事件
- 使用 `clink-cli skills install publisher/name[@version]` 安装公开 Skill：省略 version 表示 latest，`@version` 表示精确版本；按序号安装时，从同一上下文两小时内最新的带 scope 列表冻结 publisher/name/version，并在确认后执行
- VIC 代理授权准备（Visa 状态检查、instruction 复用/创建 draft、发送 Passkey URL 由页面自动签名）
- UCP 商品下单 —— 先用 `clink-cli tool parse-item` 解析并选择商品，判断履约方式；需要邮寄的实物商品必须提供完整的标准收货地址；在 Visa/VIC 需要时完成授权匹配；随后用商品 URL 调用 `clink-cli tool internal-ucp get-endpoint`。命中配置时直接走 internal checkout；只有返回 `NOT_IN_INTERNAL_UCP_LIST` 才 fallback 到 `/.well-known/ucp-clink` 与 `get-rest-endpoint` 自主探测，其中 provider 为 `clinkbill` 时走 internal checkout，其他 provider 或探测失败时走 external checkout
- 退款提交与状态轮询
- 风控规则查看与配置
- 事件驱动的异步完成 —— 通过 CLI 内置的链接监听或 `clink-cli events poll` 等待 Clink 事件中心的 webhook（绑卡、退款结果、VIC 激活、3DS 后订单结果），而不是凭猜测或反复重试

## Skill 结构

`SKILL.md` 只保留路由和安全规则；命令级细节放在 `references/` 下，沿用飞书/Lark skills 的“执行前读取对应操作 reference”模式。

商品下单前请先读取 `references/clink-ucp-checkout.md`，再执行 `clink-cli tool parse-item`、`clink-cli instruction list`、`clink-cli ucp-checkout create/complete`。

查询可打赏 Skill 或执行打赏前，请先读取 `references/clink-skill-tip.md`，再执行 `clink-cli skills list --all --tippable` 或 `clink-cli skills tip`。Number 只从同一用户、会话和环境两小时内展示的快照解析，再使用 publisher/name 且不传 version 执行；没有有效快照时先展示列表并要求确认。

安装公开 Skill 前，请先读取 `references/clink-skill-install.md`，再执行 `clink-cli skills install`。直接指定 publisher/name 时省略 version 以安装 latest；指定 publisher/name@version 时安装精确版本；按序号安装时只使用同一用户、会话和环境两小时内最新的带 scope 快照，并在执行前确认冻结的 publisher/name/version。
