# clink-payment-skill

适用于 Claude Code 的 Clink 支付技能，通过 `clink` 实现钱包、卡片、支付、Skill 查询/打赏/安装、Visa/Mastercard 强认证授权、退款和风控规则操作。

## 环境要求

- Node.js >= 20
- Skill 内置 vendored CLI bundle：`vendor/clink-cli/clink-cli.bundle.mjs`，通过 `bin/clink` 暴露为 `clink` 命令，并将 `wallet init` 钉在生产环境
- **必须按路径调用 `bin/clink`**。`PATH` 上全局安装的 `clink` 或 `clink-cli` 可能是另一个未钉环境的构建，而所有构建共用同一个全局 `~/.clink-cli/config.json` —— 一旦某个未钉版本对 UAT 做过初始化，本分发的后续认证命令都会读到 UAT 的 `baseUrl`
- 新的钱包初始化使用 OAuth Device Authorization，并默认取邮箱 `@` 前部分作为姓名；仅当本地钱包从未完成过 OAuth 授权时，才继续兼容已有且完整的旧 CSK 钱包

## 安装 Clink Payment Skills

直接让 Agent 安装当前的 Clink Payment Skills：

```text
Install Clink Payment Skills: https://github.com/clinkbillcom/agentic-payment-skills
```

安装完成后，Agent 必须先理解完整语义意图，不能直接操作钱包。新的 Catalog/支付调用要构造 `references/clink-payment-intent-contract.md` 中的版本化契约，不得用正则、关键词、原始文本、旧布尔字段或环境中的支付参数来授权购买。商品搜索使用 `walletGate=SKIP`；描述商品后的购买发现使用 `DEFER_UNTIL_SELECTION`，两者都不执行 `wallet status` 或 `wallet init`。

只有验证后的路由返回 `walletGate=REQUIRE_STATUS` 时，才进入以下 status-first 初始化流程：明确的钱包操作可立即进入；商品购买必须先完成匿名发现、语义授权与用户选品，形成已解析的结账目标后再进入。仅有商品描述不是初始化钱包的理由。

1. 先执行 `clink wallet status --format json`。如果钱包已就绪（OAuth 或完整的旧 CSK），报告就绪并结束。
2. 否则向用户询问邮箱地址（唯一必填项；显示名取邮箱 `@` 前的部分，无需询问姓名）。
3. 执行 `clink wallet init --email <email> --open --format json`。持续读取同一进程，直到它输出 `Waiting for authorization...`；这表示 OAuth device-token 轮询已启动，不是 Event Hub 监听。如果 CLI 请求打开系统浏览器，再提示用户在那里完成授权；只有浏览器拉起失败且 wait marker 已出现后才展示验证 URL。OAuth 阶段绝不能另起 `events poll`。
4. 初始化成功且返回 `paymentMethodsCached=true`、`paymentMethodCount=0` 和非空 `bindingUrl` 时，只把 init URL 视为需要绑定首张卡的信号。先启动带内置监听的 `clink card binding-link --no-open --format json`；该命令会等限定事件类型的首次 poll 成功后才输出首个 JSON envelope，其中包含受信 Agent Portal 上精确的 `/payment-method-setup` `bindingUrl`（只允许受控的可选 `email` 参数）、`watchReady=true` 和 `watchEventType=payment_method.added`。此时**必须把这份已受监听保护的 `bindingUrl` 返回给用户**，并保持同一进程继续等待匹配事件；不能只报告 OAuth 已完成而漏掉链接。数量大于 0 表示已有卡；缓存刷新失败也不会推翻已经成功的 OAuth 登录。

用户明确要求重新登录、重新授权、替换过期链接，或错过之前的登录时，必须启动一次新的 `wallet init`。新尝试会覆盖旧尝试，Agent 不得复用聊天历史或旧终端输出里的登录 URL。

## 构建 fallback 发布工件

Clink CLI 自动安装所用的 fallback 包必须从干净的 Git 工作区生成：

```bash
npm run build:fallback-artifact
```

命令会在已忽略的 `dist/` 下生成两个文件：

- `agentic-payment-skill.zip`，ZIP 内只有一个统一包根 `agentic-payment-skills/`
- `agentic-payment-skill.manifest.json`，schema v1 的完整性与来源 sidecar

ZIP 直接从已提交的 Git `HEAD` 树生成：除根 `docs/`、`tests/` 外，所有 tracked regular file 都会保留。因此 `SKILL.md`、`package.json`、两个 README、`.gitignore` 和完整运行目录都会进入工件，本地 ignored 文件不会被误打包。发现符号链接、submodule、特殊条目，或源码预带 `.clink-install.json` / `.clink-provenance.json` 时，构建会直接失败。

构建默认使用源码 commit 的时间戳固定 ZIP 元数据；发布基础设施也可以通过标准 `SOURCE_DATE_EPOCH` 显式指定时间。不依赖签名私钥或其他私钥。生成后必须成对发布到：

```text
https://www.clinkbill.com/public/skills/agentic-payment-skill.zip
https://www.clinkbill.com/public/skills/agentic-payment-skill.manifest.json
```

`archiveSha256` 校验 ZIP 原始字节。`contentSha256` 使用与安装器一致的规范树哈希：SHA-256 先写入 `clink-skill-tree-v1\0`，再对裁剪后的全部 regular file 按 POSIX 相对路径的 UTF-8 字节序处理；每条记录是 `path + NUL + executable-bit + NUL + byte-size + NUL + file-bytes + NUL`。任意 Unix 执行位存在时 executable-bit 为 `1`，否则为 `0`。安装器拥有的 `.clink-install.json` 与 `.clink-provenance.json` 不参与该树哈希。

这两个固定公网 URL 发布时，必须先上传并刷新 ZIP，确认公网文件大小和 SHA-256 已与新 manifest 一致，再最后发布 manifest；随后同时刷新两个 CDN 路径，并执行一次公网下载校验。公网 ZIP 仍是上一代时不得提前暴露新 manifest，CLI 遇到跨代不匹配会按安全策略直接失败。

## 功能说明

安装后，Claude 可以代你执行以下 Clink 支付操作：

- 钱包状态检查
- 钱包重新登录与重新授权
- 绑卡与支付方式管理
- 支付执行（直接模式和会话模式）
- Agent 支付宝二维码支付：直接在终端展示 CLI 生成的字符二维码，必要时回退到私有 PNG，等待关联的成功/失败事件，并在每个终态递归清理临时目录
- 基于语义的 v2 意图路由和派生钱包门禁：匿名公共 Catalog 搜索不读取钱包状态或 `~/.clink-cli/config.json`；带购买意图的商品发现也保持匿名，直到本轮语义明确授权并绑定一个候选商品。候选编号只负责定位商品，本身不能授权购买。Catalog 结果语言由 Agent 根据会话意图决定并冻结为 BCP47，通过 `--language` 传入；query 文本和后端不再猜测目标语言
- 使用 `clink skills list --all --tippable` 查询可打赏 Skill，仅按编号、发布者、技能名称三列展示，表头语言与用户语言一致
- 使用 `clink skills tip` 按 publisher/name 且不传 version，或从同一上下文两小时内展示的列表解析 Number 后执行明确授权的 USD 打赏；同步 agent pay 成功即为支付成功，`account-created` / `account-reloaded` 只是可选的结果增强事件
- 使用 `clink skills install publisher/name[@version]` 安装公开 Skill：省略 version 表示 latest，`@version` 表示精确版本；按序号安装时，从同一上下文两小时内最新的带 scope 列表冻结 publisher/name/version，并在确认后执行
- 强认证代理授权准备（以 `strongAuthReady` 和 `authProtocol=VISA|MASTERCARD` 为准，复用/创建 instruction draft，并生成对应协议的 Passkey URL 由页面自动签名）
- UCP 商品下单 —— 解析并冻结一个商品，判断履约方式；实物邮寄必须提供完整的标准收货地址；完成 Visa/Mastercard 强认证授权后，先运行 `clink tool internal-ucp get-endpoint`。仅 `NOT_IN_INTERNAL_UCP_LIST` 才 fallback 到 `get-rest-endpoint`；每个 provider（包括 `clinkbill` 和非 clinkbill）都必须解析出 canonical HTTPS endpoint，且其 origin 与当前成功的 wallet-status 证据完全同源。runtime 原子 claim 唯一的 `checkoutAttemptId` 后，才在冻结的 `CLINK_BASE_URL` 下以前台方式执行一次 `clink ucp-checkout run ... --confirm-purchase --format json`；只读 resume 继续保留该环境锁。仅数字交付追加 `--wait-delivery --max-wait 900`；Agent 不再手工串联 create、complete、事件轮询或交付轮询
- 退款提交与状态轮询
- 风控规则查看与配置
- 事件驱动的异步完成 —— 通过 CLI 内置的链接监听或 `clink events poll` 等待 Clink 事件中心的 webhook（绑卡、退款结果、强认证就绪/instruction 激活、3DS 后订单结果），而不是凭猜测或反复重试

## 必须由用户自己打开的页面

这个 skill 会被不同的 agent 安装，其中一些自带浏览器能力。OAuth 邮箱验证页、绑卡/加卡/管理卡页、Visa/Mastercard Passkey 注册与签名页、instruction 更新/取消页、3DS 挑战页和风控规则页，都必须由用户在自己的浏览器里完成——不得由 agent 内置浏览器、无头浏览器、浏览器 MCP、computer-use 或内嵌 webview 去打开、跳转、预览、截图或填写。Passkey 页在 agent 浏览器里根本不可能成功：WebAuthn 需要用户自己设备上的平台认证器。商品详情页正好相反，仍然属于 agent 的工作。

由于完成与否只由 webhook 事件证明，而不是由浏览器回报，用户可以在任意浏览器或设备上完成（包括手机），流程照样收敛。逐页契约见 `references/clink-browser-handoff.md`，每个 URL 在发出前由 `lib/page-handoff.mjs` 分类。

Agent 支付宝二维码不属于这些页面。Skill 使用 `--terminal-qr` 调用 `clink pay`，原样展示 CLI 生成的 UTF-8 字符二维码，并保留本地 `image/png` 文件动作作为兜底；不得通过 Agent Browser 打开图片、打印 Base64 或暴露原始二维码内容。Skill 会立即启动订单事件等待，并在成功、失败、过期、超时或监听错误后递归删除由调用方负责的临时目录。

## Skill 结构

`SKILL.md` 只保留路由和安全规则；命令级细节放在 `references/` 下，沿用飞书/Lark skills 的“执行前读取对应操作 reference”模式。

Catalog/支付路由先读取 `references/clink-payment-intent-contract.md`。该文档定义语义 v2 envelope、Direct/Session Pay 范围，以及 `SKIP` / `DEFER_UNTIL_SELECTION` / `REQUIRE_STATUS` 钱包门禁。

商品下单前请先读取 `references/clink-ucp-checkout.md`，再执行 `clink tool parse-item`、`clink instruction list` 和唯一一次聚合命令 `clink ucp-checkout run`。该命令必须前台等待；运行时不得查询 `--help`、固定 `sleep`、转后台，或拆成手工 create/complete/wait。

查询可打赏 Skill 或执行打赏前，请先读取 `references/clink-skill-tip.md`，再执行 `clink skills list --all --tippable` 或 `clink skills tip`。Number 只从同一用户、会话和环境两小时内展示的快照解析，再使用 publisher/name 且不传 version 执行；没有有效快照时先展示列表并要求确认。

安装公开 Skill 前，请先读取 `references/clink-skill-install.md`，再执行 `clink skills install`。直接指定 publisher/name 时省略 version 以安装 latest；指定 publisher/name@version 时安装精确版本；按序号安装时只使用同一用户、会话和环境两小时内最新的带 scope 快照，并在执行前确认冻结的 publisher/name/version。
