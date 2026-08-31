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

- Visa 全量、品类和品牌权益查询，通过一次
  `visa recommend --include-provider-products` 与 Visa Benefit Catalog
  provider registry 中的全部 provider 分页结果联合
- 所有已登记 provider 商品的 product type 恒为
  `VISA_PROVIDER_PRODUCT`；`PROGRAM_PROVIDER_MATCH` 只作为可选且已证明的
  关系标签，`VISA_PROGRAM_ONLY` 用于没有 provider 商品关系的 Program
- Program 购买继续走 `product-search`、`commerce-login`、
  `commerce-run` 的现有 Program 聚合购买
- 非 Visa 的直接购物请求先做 Catalog 广域搜索
- provider 和平台 Catalog 商品使用 `commerce-login` 后接
  `commerce-run mode=catalog_purchase` 的聚合购买合同
- 聚合缺卡合同：创建或复用一条精确的无卡 `PENDING` Instruction；可以提示
  Bind Card 链接但绝不自动打开；CLI 保持前台等待；只有同一张卡完成 VIC 且
  CWallet 自动激活该精确 Instruction 后才继续

CLI 是 Visa Benefit Catalog provider registry 和 provider identity 的唯一
权威源。Visa 权益相关查询只调用一次 joined CLI 命令，由 CLI 内部遍历
provider 并完成 cursor 分页；Skill 不复制 provider 条目，也不再用第二条
Catalog 或 merchant-list 请求拼接结果。

Skill 将 joined 返回的 Visa Offer 集合和可直接下单 provider 商品集合作为
两类权威候选集合。Agent 必须分别按照原始 query 的品牌、品类、地理、
商品、商户和其他硬约束过滤。有相关可下单商品时只向用户展示这些商品；
没有相关可下单商品时才展示 Visa Offer。用户回复不暴露两类内部集合的区别，
再根据真实结果自由组织、排序、编号和表述，
不使用固定标题、数量或展示模板。不相关 provider 商品不展示，但不会改变
CLI 返回的 `directlyOrderable` 事实。provider 商品保持
`VISA_PROVIDER_PRODUCT`；只有 CLI 已证明关系时才保留
`PROGRAM_PROVIDER_MATCH`。

joined 可下单商品同时返回本地化展示标题、provider `sourceTitle`、minor-unit
审计金额、major-unit 购买金额、币种和库存。购买上下文直接使用
`sourceTitle` 和 major-unit 金额，不再重新解释原始 Catalog 字段。
Eats365 购买复验使用冻结门店和商品的精确端点，不再依赖广域搜索连续两次
选中同一家门店。
平台路由只必填 `channelType` 和 `storeId`；query、重复环境和语言字段均为
可选兼容 metadata。
Eats365 在登录前收集买家姓名和 E.164 手机号；CLI 自动补钱包邮箱，并只把
buyer 数据发送给 Checkout。

Visa Program、provider 和其他 Catalog 购买都保持 CLI 聚合。Skill 不包含
运行时工作流 JavaScript、长 Action Matrix 或大量操作 reference。钱包、
卡片、风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.39` 已 vendor 上游提交
`de1327a837d40f99db5e5a01e99f84e5fc7eed93` 的 Visa CLI `0.2.43`。它支持
Visa Offer 与 provider 商品 joined 查询、可选的旧版 `program.code`、
完整 Eats365 `manual_item_facts` 复验和
`mode=catalog_purchase`；新购买上下文仍不发送 `program.code`。本版还要求
聚合缺卡流程只提示、不自动打开 Bind Card 链接，提示后继续前台等待同一条
PENDING Instruction，并且只在同卡 `visaRegistrationSucceeded=true` 且该
精确 Instruction 为 `ACTIVE` 后继续。

本分支有意不修改 vendored bundle 及其来源信息。vendor 只能通过
`clink-cli` 官方同步流程刷新。在同步后的 CLI 实现上述合同前，当前安装应视为
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

Skill 版本：`0.1.39`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
