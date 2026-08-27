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

- Visa 全量、品类和品牌权益查询，并与富惠内部 Catalog 分页结果联合
- 所有富惠商品的 product type 恒为 `FUHUI_VISA_PRODUCT`；
  `PROGRAM_FUHUI_MATCH` 只作为可选且已证明的关系标签，
  `VISA_PROGRAM_ONLY` 用于没有富惠商品关系的 Program
- Program 购买继续走 `product-search`、`commerce-login`、
  `commerce-run` 的现有 Program 聚合购买
- 非 Visa 的直接购物请求先做 Catalog 广域搜索
- 富惠和平台 Catalog 商品使用 `commerce-login` 后接
  `commerce-run mode=catalog_purchase` 的聚合购买合同

Visa Program、富惠和其他 Catalog 购买都保持 CLI 聚合。Skill 不包含运行时
工作流 JavaScript、长 Action Matrix 或大量操作 reference。钱包、卡片、
风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.28` 已 vendor 上游提交
`55fd330ca8eb6f3cef4ca5b5721a71ca1f5fbabd` 的 Visa CLI `0.2.33`。它支持
可选的旧版 `program.code`、完整 Eats365 `manual_item_facts` 复验和
`mode=catalog_purchase`；新购买上下文仍不发送 `program.code`。旧版或
不兼容安装必须停止，不能回退到 Program mode 或原子支付命令。

## 环境要求

- Node.js 20 或更高版本
- 始终按路径调用内置 launcher，不使用全局 CLI
- OAuth、绑卡、Passkey、3DS、Instruction 和风控页面由用户在系统浏览器完成

## 验证

```bash
npm test
git diff --check
```

Skill 版本：`0.1.28`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
