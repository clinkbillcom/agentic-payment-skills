# clink-payment-skill

适用于 Claude Code 的 Clink 支付技能，通过 `clink-cli` 实现钱包、卡片、支付、VIC 授权、退款和风控规则操作。

## 环境要求

- Node.js >= 20
- 已安装并配置 `clink-cli` — 参考 [Clink Payment Skills 配置文档](https://github.com/clinkbillcom/agent-payment-skills)
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
- 退款提交与状态轮询
- 风控规则查看与配置
- 事件驱动的异步完成 —— 通过 CLI 内置的链接监听或 `clink-cli events poll` 等待 Clink 事件中心的 webhook（绑卡、退款结果、VIC 激活、3DS 后订单结果），而不是凭猜测或反复重试
