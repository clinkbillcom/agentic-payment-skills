# Visa Skill

此分支是在 `agentic-payment-skills` 仓库中维护的轻量 Visa Skill 发行线。

它只携带一份 Visa Edition：

```text
bin/visa-cli
vendor/visa-cli/visa-cli.bundle.mjs
```

Visa Edition 同时包含全部 Base Commands，并保留 Visa 权益查询与快速聚合购买：

```text
visa recommend
visa detail
visa taxonomy
visa product-search
visa commerce-login
visa commerce-run
```

轻量购物路由覆盖：

- 商品、品类、商户、下单和 Visa 权益请求都通过一次 `visa recommend-products` 查询；
  CLI 会立即把每条 Program 与已配置的精确内部 UCP 路由做商品匹配
- Visa recommendation 只发送 taxonomy filters，不发送 keyword；Program code
  命中商户后，才使用不改写的原始 query 搜索该商户；Offer 标题只作为展示信息
- 不传 `--include-broad-catalog`，不生成 broad query，也不做 Catalog fallback
- Agent 为 `recommend-products` 选择筛选条件时不推断、不传 `--type`
- 每个筛选方案必须包含 region 和至少一个 category；多个 category 按 OR，
  其他 taxonomy 轴仅在用户明确提及时填写
- 登录和购买 mandate 统一使用 `product.totalAmountMajor`，禁止把 Catalog
  最小单位金额复制到 `amountLimit`
- 唯一 `visa recommend --region hk|cn` 会自动选择并保存对应来源；
  只有跨来源查询才额外使用 `--market`
- 最终统一返回可下单商品和未匹配 Visa 权益；已匹配成商品的权益不重复展示
- Agent 展示前做轻度相关性检查，过滤明显无关商品和权益，同时保留合理别名与翻译
- 展示顺序固定为可下单商品优先、相关权益其次；空集合不单独说明，只有两边
  都为空时才提示没有搜到
- 用户选择未匹配权益后可用 `visa detail` 查看详情，但不重复 product-search
- 只有精确 `internal-ucp-catalog` 命中才提示是否下单；未命中时只展示
  Visa 活动介绍与权威活动链接，不追加购买引导
- 命中的 Program 购买继续走 `commerce-login`、`commerce-run`
- 直接购物也只使用 Visa Offer 与命中商户搜索，不进入广域 Catalog
- 聚合缺卡合同：创建或复用一条精确的无卡 `PENDING` Instruction；可以提示
  Bind Card 链接但绝不自动打开；CLI 保持前台等待；只有同一张卡完成 VIC 且
  CWallet 自动激活该精确 Instruction 后才继续

首轮不使用 `--include-provider-products`、`--include-broad-catalog` 或
`--broad-queries`，也不调用 standalone Catalog 或 Agent-managed merchant-list。
聚合命令先查 Visa Offer，只在 Program code 与 `ext.visa_program_id` 完全相同时
路由商户，再使用原始 query 搜索该商户。失败或未匹配 Program 继续保留为 Visa 权益。
匿名发现直接执行内置 launcher，不传环境参数，也不探测文件、发行版、wallet
或认证状态。

可下单商品已经由聚合命令完成内部 UCP 精确匹配并归一化价格、币种、库存和
商户身份。商品中的 matched Program 仅作购买 provenance；只有 `visaBenefits`
可以生成用户可见权益。未匹配权益后续只允许用 `visa detail` 查看详情，不重复 product-search。
UAT 只有在返回的 Program code 与商户 `mcht_ftmse61a6az0` 的 merchant-list
`ext.visa_program_id` 完全相同时才建立路由；Offer URL 不再选择商户。
已验证的 Program 购买优先使用 Program 返回的有效 MCC；Program 缺失 MCC
时，允许从完整冻结的商户和商品上下文做一次高置信分类。上述 UAT 惠康礼品卡
精确路由使用 MCC `5411`；Program MCC 格式错误或冲突、低置信分类和只看标题
的猜测仍必须在登录前停止。

Visa Program 购买保持 CLI 聚合。Skill 不包含
运行时工作流 JavaScript、长 Action Matrix 或大量操作 reference。钱包、
卡片、风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.65` 已 vendor 上游提交
`72e6c2fe4c464461e54f992bbe9712ce617f2d8f` 的 Visa CLI `0.2.56`。本
product-match 分支只执行一轮 Visa 推荐、精确商户匹配和命中商户 Catalog 搜索；
`wujh/visa-offer-product-broad-search-0901` 在此基础上额外并行广域 Catalog。
新购买上下文仍不发送 `program.code`。本版还要求
聚合缺卡流程只提示、不自动打开 Bind Card 链接，提示后继续前台等待同一条
PENDING Instruction，并且只在同卡 `visaRegistrationSucceeded=true` 且该
精确 Instruction 为 `ACTIVE` 后继续。

本分支已通过 `clink-cli` 官方同步流程刷新 vendor。若其他发行版未实现上述
合同，当前安装应视为
不兼容并停止，不能自动打开绑卡/VIC 页面、不能提示链接后结束、不能回退到
Program mode，也不能拆成原子命令执行购买。

## 环境要求

- Node.js 20 或更高版本
- 始终按路径调用内置 launcher，不使用全局 CLI
- OAuth、绑卡、Passkey、3DS、Instruction 和风控页面由用户在系统浏览器完成
- 可以展示 Bind Card 链接，但 CLI 不得自动打开，也不得展示后停止等待同一条
  PENDING Instruction

## 验证

```bash
npm test
git diff --check
```

Skill 版本：`0.1.65`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
