# Visa Skill

登录/授权成功打开浏览器时静默等待，不再问用户；只有打开失败或禁用自动打开时
由 CLI 立即退出并返回 `manualOpenUrl`。展示链接后暂停，用户完成页面操作后，
仅在返回 `rerunAllowed=true`、`resumeMode=same_command`、`checkoutStarted=false`
时执行相同命令和上下文，续接原登录或精确 Instruction，不重复确认购买、不重试支付。
购买结果及订单查询直接展示 CLI 返回的
`orderUrl` 为“查看订单”链接，不能拿 OMS/UCP 订单号自行拼 Portal URL。

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
- 单次只买一种商品、数量 1；CLI 生成可复用购买快照及所需授权参数
- 已展示订单事实不变时，“买这个”“帮我下单”“确认购买”均有效，不要求复述完整订单
- 唯一 `visa recommend --region hk|cn` 会自动选择并保存对应来源；
  只有跨来源查询才额外使用 `--market`
- 最终统一返回可下单商品和未匹配 Visa 权益；已匹配成商品的权益不重复展示
- Agent 展示前做轻度相关性检查，过滤明显无关商品和权益，同时保留合理别名与翻译
- 展示顺序固定为可下单商品优先、相关权益其次；空集合不单独说明，只有两边
  都为空时才提示没有搜到
- 用户选择未匹配权益后可用 `visa detail` 查看详情，但不重复 product-search
- 只有精确 `internal-ucp-catalog` 命中才提示是否下单；未命中时只展示
  Visa 活动介绍与权威活动链接，不追加购买引导
- 命中的 Program 下单直接使用未变化的 `recommend-products` 快照进入
  `commerce-login`、`commerce-run`，不执行 `visa detail`
- 直接购物也只使用 Visa Offer 与命中商户搜索，不进入广域 Catalog
- 绑卡交给 Portal，CLI 不打开 Bind Card；PENDING Quick 有卡但未 VIC 时返回
  CLI 给出的该卡精确 VIC URL，未知/进行中的授权不能重复自动打开

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
登录和购买复用选中商品的 `purchaseContext`，Agent 不再推断 MCC、复制 Program
字段或拼装 Instruction。现有数据不足时报告 `purchaseContextUnavailable`。

Visa Program 购买保持 CLI 聚合。Skill 不包含
运行时工作流 JavaScript、长 Action Matrix 或大量操作 reference。钱包、
卡片、风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.84` 已刷新 vendor，来源提交
`811e2d6ef322c9b741e59b0adc14315ea93d8661` 的 Visa CLI `0.2.63`。本
product-match 分支只执行一轮 Visa 推荐、精确商户匹配和命中商户 Catalog 搜索；
`wujh/visa-offer-product-broad-search-0901` 在此基础上额外并行广域 Catalog。
新购买上下文仍不发送 `program.code`。本次同步了 CLI bundle；
以下契约不等于 CLI 新流程已通过运行时验收或后端已部署。

本分支已通过 `clink-cli` 官方同步流程刷新 vendor。若其他发行版未实现上述
购买快照合同，应报告限制，不猜测缺失字段，也不拆成原子命令执行购买。

## Quick Instruction 契约

- 新建 Quick 时，有符合条件且已选中的 VIC-ready Visa 卡则返回 `CREATED`，
  绑定其 `paymentInstrumentId`，尚未激活；否则返回 `PENDING`。LOGIN 和
  REGISTER 均支持这两种结果。
- `pendingInstructionId` 是历史字段名，不代表状态。必须读取真实响应和
  exact-GET 的 Instruction `status`。保留已有 Quick，不因卡就绪而将历史
  PENDING 改名或替换。登录保存原 ID，CREATED、PENDING、ACTIVE 均可返回就绪，
  授权等待交给 `commerce-run`。
- CREATED 立即由 CLI `--open` 打开 CLI 返回的精确
  `/passkey-auth/{pi}?type=visa&instructionId={ORIGINAL_QUICK_ID}` URL，
  使用原 Quick ID 和已绑定的 `paymentInstrumentId`，不等绑卡/VIC，不换卡。
  Portal 现有 `/sign` 激活同一原 ID；CREATED 本身不允许 Checkout。
- 无卡 PENDING 最多等待 15 分钟；超时仍无卡只请求绑卡并展示 CLI 返回的
  Portal 绑卡入口，不给 VIC/Instruction 激活链接。
- PENDING 有卡但未 VIC 返回该卡精确 VIC URL，不用 Portal 首页替代。
  核对授权与原 ID 的关联，未知关联不承诺自动激活；激活后 exact-GET 原 ID。
- 历史 PENDING 的卡已 VIC-ready 时，打开原 ID 的精确 Passkey URL，
  不等绑卡、不创建替代 Instruction。
- ACTIVE 直接复用原 ID，不重复授权。另一条匹配 ACTIVE 也不能替代已有 Quick。
  只有原 Quick 精确状态为 ACTIVE 且绑定同一 VIC-ready 卡才可开始 Checkout。
- 已有 Quick 的所有分支创建次数均为零；无 Quick 时普通 ACTIVE 选择/复用和
  创建保持不变，不能丢弃 Quick ID 进入该路径。
- 授权页仅由 CLI 打开；成功后静默等待，失败返回同一精确手动链接。
  仅 CLI 明确允许的 Checkout 前续跑可复用原命令、上下文和 ID，零新增创建；
  可能已创建 Checkout 后只允许只读恢复。

维护案例见 [quick-instruction-cases.md](references/quick-instruction-cases.md)，
规则变更先记入 [change-log.md](references/change-log.md)，不增加运行时读取步骤。

## 环境要求

- Node.js 20 或更高版本
- 始终按路径调用内置 launcher，不使用全局 CLI
- OAuth、绑卡、Passkey、3DS、Instruction 和风控页面由用户在系统浏览器完成
- 用户下单后自动完成登录与购买衔接，不插入新的聊天确认；用户只在浏览器中完成授权

## 验证

```bash
npm test
git diff --check
```

Skill 版本：`0.1.84`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
