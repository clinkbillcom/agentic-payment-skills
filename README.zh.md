# clink-payment-skill

适用于 Claude Code 的 Clink 支付技能，通过 `clink-cli` 实现钱包、卡片、支付、退款和风控规则操作。

## 环境要求

- Node.js >= 20
- 已安装并配置 `clink-cli` — 参考 [clink-cli 配置文档](https://github.com/clinkbillcom/agentic-payment-skills)
- `~/.clink-cli/config.json` 中包含有效的 `customerId` 和 `customerApiKey`

## 安装技能

```bash
# 个人级别（对所有项目生效）
git clone https://github.com/clinkbillcom/agentic-payment-skills ~/.claude/skills/clink-payment-skill

# 项目级别（仅对当前项目生效）
git clone https://github.com/clinkbillcom/agentic-payment-skills .claude/skills/clink-payment-skill
```

克隆完成后技能立即对 Claude agent 生效。

## 功能说明

安装后，Claude 可以代你执行以下 Clink 支付操作：

- 钱包状态检查
- 绑卡与支付方式管理
- 支付执行（直接模式和会话模式）
- 退款提交与状态轮询
- 风控规则查看与配置
