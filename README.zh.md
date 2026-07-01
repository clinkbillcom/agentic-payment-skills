# clink-payment-skill

适用于 Claude Code 的 Clink 支付技能，通过 `clink-cli` 实现钱包、卡片、支付、VIC 授权、退款和风控规则操作。

## 环境要求

- Node.js >= 20
- Skill 内置 vendored `clink-cli` bundle：`vendor/clink-cli/clink-cli.bundle.mjs`；全局安装 `clink-cli` 只作为本地调试可选项
- `~/.clink-cli/config.json` 中包含有效的 `customerId` 和 `customerApiKey`

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
- VIC 代理授权准备（Visa 状态检查、instruction 复用/创建 draft、发送 Passkey URL 由页面自动签名）
- 外部 UCP 商品下单 —— 先判断实物/虚拟履约类型；需要邮寄的实物商品必须提供美国收货地址，instruction 创建使用 CWallet 地址结构，checkout/payment 上下文使用 UCP Postal Address 结构，再列出 ACTIVE instructions，按商品金额硬匹配与商家语义匹配筛选 instruction/mandate，获取商品 `item_id`，创建 checkout，再用支付工具完成 checkout
- 退款提交与状态轮询
- 风控规则查看与配置
- 事件驱动的异步完成 —— 通过 CLI 内置的链接监听或 `clink-cli events poll` 等待 Clink 事件中心的 webhook（绑卡、退款结果、VIC 激活、3DS 后订单结果），而不是凭猜测或反复重试

## Skill 结构

`SKILL.md` 只保留路由和安全规则；命令级细节放在 `references/` 下，沿用飞书/Lark skills 的“执行前读取对应操作 reference”模式。

商品下单前请先读取 `references/clink-ucp-checkout.md`，再执行 `clink-cli instruction list`、`clink-cli tool item-id`、`clink-cli ucp-checkout create/complete`。
