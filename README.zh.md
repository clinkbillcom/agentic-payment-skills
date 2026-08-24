# clink-payment-skill

适用于 Claude Code 的 Clink 支付技能，通过 `clink` 实现钱包、卡片、支付、Skill 查询/打赏/安装、VIC 授权、退款和风控规则操作。

## 环境要求

- Node.js >= 20
- Skill 内置 vendored CLI bundle：`vendor/clink-cli/clink-cli.bundle.mjs`，通过 `bin/clink` 暴露为 `clink` 命令，并将 `wallet init` 钉在生产环境
- **必须按路径调用 `bin/clink`**。`PATH` 上全局安装的 `clink` 或 `clink-cli` 可能是另一个未钉环境的构建，而所有构建共用同一个全局 `~/.clink-cli/config.json` —— 一旦某个未钉版本对 UAT 做过初始化，本分发的后续所有命令都会读到 UAT 的 `baseUrl`
- 新的钱包初始化使用 OAuth Device Authorization，并默认取邮箱 `@` 前部分作为姓名；仅当本地钱包从未完成过 OAuth 授权时，才继续兼容已有且完整的旧 CSK 钱包

## 安装 Clink Payment Skills

直接让 Agent 安装当前的 Clink Payment Skills：

```text
Install Clink Payment Skills: https://github.com/clinkbillcom/agent-payment-skills
```

安装完成后，Agent 必须立即继续钱包初始化，而不是等待用户再次发起：

1. 先执行 `clink wallet status --format json`。如果钱包已就绪（OAuth 或完整的旧 CSK），报告就绪并结束。
2. 否则向用户询问邮箱地址（唯一必填项；显示名取邮箱 `@` 前的部分，无需询问姓名）。
3. 执行 `clink wallet init --email <email> --open --format json`。持续读取同一进程，直到它输出 `Waiting for authorization...`；这表示 OAuth device-token 轮询已启动，不是 Event Hub 监听。如果 CLI 请求打开系统浏览器，再提示用户在那里完成授权；只有浏览器拉起失败且 wait marker 已出现后才展示验证 URL。OAuth 阶段绝不能另起 `events poll`。
4. 初始化成功且返回 `paymentMethodsCached=true`、`paymentMethodCount=0` 和非空 `bindingUrl` 时，只把 init URL 视为需要绑定首张卡的信号。先启动带内置监听的 `clink card binding-link --no-open --format json`；该命令会等限定事件类型的首次 poll 成功后才输出首个 JSON envelope，其中包含受信 Agent Portal 上精确的 `/payment-method-setup` `bindingUrl`（只允许受控的可选 `email` 参数）、`watchReady=true` 和 `watchEventType=payment_method.added`。此时**必须把这份已受监听保护的 `bindingUrl` 返回给用户**，并保持同一进程继续等待匹配事件；不能只报告 OAuth 已完成而漏掉链接。数量大于 0 表示已有卡；缓存刷新失败也不会推翻已经成功的 OAuth 登录。

用户明确要求重新登录、重新授权、替换过期链接，或错过之前的登录时，必须启动一次新的 `wallet init`。新尝试会覆盖旧尝试，Agent 不得复用聊天历史或旧终端输出里的登录 URL。

## 功能说明

安装后，Claude 可以代你执行以下 Clink 支付操作：

- 钱包状态检查
- 钱包重新登录与重新授权
- 绑卡与支付方式管理
- 支付执行（直接模式和会话模式）
- 使用 `clink skills list --all --tippable` 查询可打赏 Skill，仅按编号、发布者、技能名称三列展示，表头语言与用户语言一致
- 使用 `clink skills tip` 按 publisher/name 且不传 version，或从同一上下文两小时内展示的列表解析 Number 后执行明确授权的 USD 打赏；同步 agent pay 成功即为支付成功，`account-created` / `account-reloaded` 只是可选的结果增强事件
- 使用 `clink skills install publisher/name[@version]` 安装公开 Skill：省略 version 表示 latest，`@version` 表示精确版本；按序号安装时，从同一上下文两小时内最新的带 scope 列表冻结 publisher/name/version，并在确认后执行
- VIC 代理授权准备（Visa 状态检查、instruction 复用/创建 draft、发送 Passkey URL 由页面自动签名）
- UCP 商品下单 —— 解析并冻结一个商品，判断履约方式；实物邮寄必须提供完整的标准收货地址；完成 Visa/VIC 授权后，先运行 `clink tool internal-ucp get-endpoint`。仅 `NOT_IN_INTERNAL_UCP_LIST` 才 fallback 到 `get-rest-endpoint`；命中 endpoint 或 fallback provider 为 `clinkbill` 时走 internal checkout，其他 provider 走 external checkout。最后只以前台方式执行一次 `clink ucp-checkout run ... --confirm-purchase --format json`。仅数字交付追加 `--wait-delivery --max-wait 900`；Agent 不再手工串联 create、complete、事件轮询或交付轮询
- 退款提交与状态轮询
- 风控规则查看与配置
- 事件驱动的异步完成 —— 通过 CLI 内置的链接监听或 `clink events poll` 等待 Clink 事件中心的 webhook（绑卡、退款结果、VIC 激活、3DS 后订单结果），而不是凭猜测或反复重试

## 必须由用户自己打开的页面

这个 skill 会被不同的 agent 安装，其中一些自带浏览器能力。OAuth 邮箱验证页、绑卡/加卡/管理卡页、Visa Passkey 注册与签名页、instruction 更新/取消页、3DS 挑战页和风控规则页，都必须由用户在自己的浏览器里完成——不得由 agent 内置浏览器、无头浏览器、浏览器 MCP、computer-use 或内嵌 webview 去打开、跳转、预览、截图或填写。Passkey 页在 agent 浏览器里根本不可能成功：WebAuthn 需要用户自己设备上的平台认证器。商品详情页正好相反，仍然属于 agent 的工作。

由于完成与否只由 webhook 事件证明，而不是由浏览器回报，用户可以在任意浏览器或设备上完成（包括手机），流程照样收敛。逐页契约见 `references/clink-browser-handoff.md`，每个 URL 在发出前由 `lib/page-handoff.mjs` 分类。

## Skill 结构

`SKILL.md` 只保留路由和安全规则；命令级细节放在 `references/` 下，沿用飞书/Lark skills 的“执行前读取对应操作 reference”模式。

商品下单前请先读取 `references/clink-ucp-checkout.md`，再执行 `clink tool parse-item`、`clink instruction list` 和唯一一次聚合命令 `clink ucp-checkout run`。该命令必须前台等待；运行时不得查询 `--help`、固定 `sleep`、转后台，或拆成手工 create/complete/wait。

查询可打赏 Skill 或执行打赏前，请先读取 `references/clink-skill-tip.md`，再执行 `clink skills list --all --tippable` 或 `clink skills tip`。Number 只从同一用户、会话和环境两小时内展示的快照解析，再使用 publisher/name 且不传 version 执行；没有有效快照时先展示列表并要求确认。

安装公开 Skill 前，请先读取 `references/clink-skill-install.md`，再执行 `clink skills install`。直接指定 publisher/name 时省略 version 以安装 latest；指定 publisher/name@version 时安装精确版本；按序号安装时只使用同一用户、会话和环境两小时内最新的带 scope 快照，并在执行前确认冻结的 publisher/name/version。
