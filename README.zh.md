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

CLI 是 Visa Benefit Catalog provider registry 和 provider identity 的唯一
权威源。Cases 1-3 只调用一次 joined CLI 命令，由 CLI 内部遍历 provider
并完成 cursor 分页；Skill 不复制 provider 条目，也不再用第二条 Catalog
或 merchant-list 请求拼接结果。

Skill 将 joined 返回的 Visa Offer 集合和可直接下单 provider 商品集合作为
两类权威候选集合。Agent 必须分别按照原始 query 的品牌、品类、地理、
商品、商户和其他硬约束过滤，再根据真实结果自由组织、排序、编号和表述，
不使用固定标题、数量或展示模板。不相关 provider 商品不展示，但不会改变
CLI 返回的 `directlyOrderable` 事实。provider 商品保持
`VISA_PROVIDER_PRODUCT`；只有 CLI 已证明关系时才保留
`PROGRAM_PROVIDER_MATCH`。

Visa Program、provider 和其他 Catalog 购买都保持 CLI 聚合。Skill 不包含
运行时工作流 JavaScript、长 Action Matrix 或大量操作 reference。钱包、
卡片、风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.30` 已 vendor 上游提交
`42af4fadc12413623a4a64fee108a26d9342174a` 的 Visa CLI `0.2.34`。它支持
Visa Offer 与 provider 商品 joined 查询、可选的旧版 `program.code`、
完整 Eats365 `manual_item_facts` 复验和
`mode=catalog_purchase`；新购买上下文仍不发送 `program.code`。vendor
来源只通过 `clink-cli` 官方同步流程刷新。旧版或不兼容安装必须停止，
不能回退到 Program mode 或原子支付命令。

## 环境要求

- Node.js 20 或更高版本
- 始终按路径调用内置 launcher，不使用全局 CLI
- OAuth、绑卡、Passkey、3DS、Instruction 和风控页面由用户在系统浏览器完成

## 验证

```bash
npm test
git diff --check
```

Skill 版本：`0.1.30`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
