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

- Visa 全量、品类和品牌权益查询，默认由 Agent 选择 1 组严格 filters；
  只有存在 4 组真正不同的安全方案时才执行一次并行 `visa recommend` 聚合；
  CLI 不再从 query 推断，首轮也不调用 UCP/Catalog
- Visa 没有相关结果时，用原始请求执行一次 UAT 全渠道 `catalog search`
  兜底；这个有界结果可以包含 Eats365 咖啡等商品
- 用户选中权益后，先用 `visa detail` 获取活动详情，再用
  `product-search` 对内部 UCP 做一次免登录匹配
- 只有精确 `internal-ucp-catalog` 命中才提示是否下单；未命中时只展示
  Visa 活动介绍与权威活动链接，不追加购买引导
- 命中的 Program 购买继续走 `commerce-login`、`commerce-run`
- 非 Visa 的直接购物请求先做 Catalog 广域搜索
- Catalog 商品使用 `commerce-login` 后接
  `commerce-run mode=catalog_purchase` 的聚合购买合同
- 聚合缺卡合同：创建或复用一条精确的无卡 `PENDING` Instruction；可以提示
  Bind Card 链接但绝不自动打开；CLI 保持前台等待；只有同一张卡完成 VIC 且
  CWallet 自动激活该精确 Instruction 后才继续

首轮 Visa 查询绝不使用 `--include-provider-products`。Agent 只按照原始请求
过滤 Visa Program。没有相关 Visa Program 时，才使用相同 query、语言、
地理范围和 UAT 环境执行一次匿名 Catalog 广域搜索。用户未限制 channel 时
会搜索所有可用渠道，但返回窗口有界且不可分页，不能描述为完整库存导出。

用户选中 Visa 权益后，Skill 先读取 Visa 权威详情和活动链接，再用 Program
提供的真实商户 commerce URL 执行 `visa product-search`。只有内部 UCP
Catalog 精确匹配，且身份、价格、币种、库存完整时，才能提示下单。外部页面
解析、没有匹配或事实不完整时，只展示活动介绍和活动链接，不使用购买 CTA。
UAT 额外只把 `https://vsrp.hk/p/o5s` 作为 CLI 内置 alias 映射到商户
`mcht_ftmse61a6az0`；同一 host 的其他路径不继承该映射。
已验证的 Program 购买优先使用 Program 返回的有效 MCC；Program 缺失 MCC
时，允许从完整冻结的商户和商品上下文做一次高置信分类。上述 UAT 惠康礼品卡
精确路由使用 MCC `5411`；Program MCC 格式错误或冲突、低置信分类和只看标题
的猜测仍必须在登录前停止。

Eats365 购买复验使用冻结门店和商品的精确端点，不再依赖广域搜索连续两次
选中同一家门店。
平台路由只必填 `channelType` 和 `storeId`；query、重复环境和语言字段均为
可选兼容 metadata。
Eats365 在登录前收集买家姓名和 E.164 手机号；CLI 自动补钱包邮箱，并只把
buyer 数据发送给 Checkout。

Visa Program 和其他 Catalog 购买都保持 CLI 聚合。Skill 不包含
运行时工作流 JavaScript、长 Action Matrix 或大量操作 reference。钱包、
卡片、风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.48` 已 vendor 上游提交
`d8952341e5d4699d4010c4216cb1975a9d7f5577` 的 Visa CLI `0.2.45`。它支持
纯 Visa 推荐、内部 UCP 命中后才提示 Program 下单、Visa 空结果 Catalog
兜底、可选的旧版 `program.code`、完整 Eats365 `manual_item_facts` 复验和
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

Skill 版本：`0.1.48`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
