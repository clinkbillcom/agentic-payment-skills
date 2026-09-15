# Visa Skill

UAT Skill 提供五个独立命令：推荐商品、登录、确定支付卡、选择/授权 Instruction、Checkout。
各命令对应独立 CLI 文件，Agent 负责流程编排，并非强制五步流水线。
先登录再推荐有效；仅登录不需要商品、购买上下文或购买授权，报告登录结果即结束。
仅登录和 Instruction 激活可用 `visa browser-open` 打开返回的精确链接。
整个支付卡步骤只展示链接，包括绑卡、卡管理和 VIC；用户回来后原命令查状态。
购买结果及订单查询直接展示 CLI 返回的
`orderUrl` 为“查看订单”链接，不能拿 OMS/UCP 订单号自行拼 Portal URL。

此分支是在 `agentic-payment-skills` 仓库中维护的轻量 Visa Skill 发行线。

它只携带一份 Visa Edition：

```text
bin/visa-cli
vendor/visa-cli/visa-cli.bundle.mjs
```

Visa Edition 保留 Base Commands 与 Visa 权益查询，Skill 购买契约为：

```text
visa recommend-products
visa commerce-login <purchase-args> --confirm-purchase --no-open
visa payment-method resolve --environment sandbox
visa instruction candidates|create|bind-pi|get|wait <purchase-args> <PI/source>
visa checkout <purchase-args> <PI/source> --purchase-instruction-id <id> --mandate-id <id> --confirm-purchase
```

`visa commerce-run` 命令/导出仅作兼容，不再是新购买
主路径，也不用于缺少新命令时回退。

轻量购物路由覆盖：

- 商品、品类、商户、下单和 Visa 权益请求都通过一次 `visa recommend-products` 查询；
  CLI 会立即把每条 Program 与已配置的精确内部 UCP 路由做商品匹配
- Visa recommendation 只发送 taxonomy filters，不发送 keyword；Program code
  命中商户后，才使用不改写的原始 query 搜索该商户；Offer 标题只作为展示信息
- 不传 `--include-broad-catalog`，不生成 broad query，也不做 Catalog fallback
- Agent 为 `recommend-products` 选择筛选条件时不推断、不传 `--type`
- 每个筛选方案必须包含 region；明确品类/商户/品牌/商品时必须有 category，
  泛地区请求省略 category；其他 taxonomy 轴仅在用户明确提及时填写
- 单次只买一种商品、数量 1；CLI 生成可复用购买快照及所需授权参数
- 已展示订单事实不变时，“买这个”“帮我下单”“确认购买”均有效，不要求复述完整订单
- HK/CN 来源仅由用户显式切换，目的地 `--region` 不修改已保存来源
- 最终统一返回可下单商品和未匹配 Visa 权益；已匹配成商品的权益不重复展示
- Agent 展示前做轻度相关性检查，过滤明显无关商品和权益，同时保留合理别名与翻译
- 展示顺序固定为可下单商品优先、相关权益其次；空集合不单独说明，只有两边
  都为空时才提示没有搜到
- 用户选择未匹配权益后可用 `visa detail` 查看详情，但不重复 product-search
- 只有精确 `internal-ucp-catalog` 命中才提示是否下单；未命中时只展示
  Visa 活动介绍与权威活动链接，不追加购买引导
- 命中的 Program 下单直接使用未变化的 `recommend-products` 快照进入
  五步购买流程，不执行 `visa detail`
- 直接购物也只使用 Visa Offer 与命中商户搜索，不进入广域 Catalog
- 绑卡与 VIC 交给 Portal；整个 Step3 只展示链接，用户回来后重复同一 resolve
  命令，只读核验后才继续

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
所有 Step4/5 命令复用选中商品 `purchaseContext` 的扁平参数，登录不带购买上下文。
Agent 不推断 MCC、复制 Program
字段或拼装 Instruction。现有数据不足时报告 `purchaseContextUnavailable`。

CLI 负责权威读取、技术资格过滤和执行，Agent 负责流程编排与购买语义校验。
`purchase-context-validation.ts` 只检查币种、金额、MCC，不校验或比对
title/description 的内容。Agent 判断意图、限制品类与商品语义，包括
eligibleMandates 匹配；CLI 参数解析、PI/VIC、ACTIVE、有效期/使用态/recurring、
商品 ID/价格/可售性等独立检查保持不变。
Skill 不包含运行时工作流 JavaScript。钱包、
卡片、风控、Direct/Session Pay、支付宝二维码、UCP、Instruction、退款、
events、Skill 打赏和安装能力，仍以 `SKILL.md` 中简短且 fail-closed 的
Capability Contract 提供。

Skill `0.1.103` 内含来源提交
`479c0902658dcf6b1173bd6800c0a654320d482d` 的 Visa CLI `0.2.78`。本
product-match 分支只执行一轮 Visa 推荐、精确商户匹配和命中商户 Catalog 搜索；
`wujh/visa-offer-product-broad-search-0901` 在此基础上额外并行广域 Catalog。
新购买上下文仍不发送 `program.code`。官方 Visa bundle 已同步五个独立命令；
CLI 回归 1486/1486、同步后 Skill 测试 61/61 通过。仅为本地回归结果，
不代表后端部署或真实支付验收。

若发行版缺少新命令，应报告限制，不猜测字段、不回退旧聚合、不拆成原子支付。

## 五步规则

编号仅表示购物示例，不是调用先后凭证。卡就绪查询不要求已有商品；原 ID 的
get/wait 和具备完整上下文及当前资格的 checkout 均可直接调用，不重跑前序命令。
ready 或 nextAction 不能把“仅登录/仅查卡”的请求扩展成购买。

1. `visa recommend-products` 不变：保留商品和权益，冻结商户、productId、
   权威价格/币种及数量 1。
2. `visa commerce-login` 先查登录状态，购买上下文携带 instructionContext。
   默认卡 ready 不新建；无默认卡或默认卡明确未就绪创建 PENDING，其他卡不影响。
   状态未知先只读核对。保留原 Quick ID 和 deadline，先返回链接再独立 browser-open。
   纯登录用 `visa init --sandbox --start --no-open`，原 ID `--resume`，不调用 wallet init。
3. `visa payment-method resolve --environment sandbox` 默认取已保存默认卡，
   不问用哪张。用户主动指定非默认卡 exact ID 时传
   `--payment-instrument-id <id> --selection-source explicit`，也必须完成 VIC。
   无卡返回 Portal 根页 bindCardUrl；默认选择模式下无默认卡返回 manageCardUrl；支持但未就绪
   返回 vicUrl；支持为 false/unknown 或读取失败则停止/手动卡管理。
   整个 Step3 禁止 browser-open、`--open` 或其他自动打开，只展示 URL；
   用户回来后同一命令复查。ready 后同时冻结 paymentInstrumentId 和
   selectionSource default|explicit 并传给 Step4/5。默认卡改变必须重新确认；
   显式非默认选择不会被新默认卡替换，也不要求存在默认卡或设为默认。
4. candidates 只读过滤 ACTIVE、PI、币种、额度 >= 购买金额、MCC、有效期、
   使用/占用与 recurring，返回全部 eligible Instructions 及 eligibleMandates
   的 mandateId/title/description/金额/币种/MCC 和 PI。Agent 按同商户、SKU、
   面值、地区、数量语义匹配，接受等价翻译，不以标题字符串相等为条件；
   证据模糊就停止澄清，不能猜。命中冻结两个 ID 去 Step5；确定无匹配才用
   `--confirm-purchase` 创建普通 PI-bound CREATED，绝不创建 PENDING 或 bind-pi。
   先告知使用系统浏览器、避开实际宿主内置浏览器，再 browser-open 精确
   manualOpenUrl。保留 instructionId 和 epoch 毫秒 authorizationDeadline；
   get 立即检查，wait 带 `--instruction-id`、`--authorization-deadline <ms>`，
   最多 600 秒（10 分钟），不重置截止时间、不重新创建或打开。
5. checkout 使用同一扁平购买参数、PI/source、Instruction/Mandate 两个 ID 及确认；
   必须 PI ready、exact-GET ACTIVE Instruction 与 eligible Mandate，并复核商品
   ID、金额、币种和可售性。不隐式登录、选卡、匹配/创建 Instruction 或打开浏览器。
   `--phase checkout_started` 拒绝重跑，只允许返回的只读恢复。

Instruction/Mandate ID 是客户端 gate；当前 UCP complete wire 仅传 PI，后端
resolver 不变，不能宣称后端转发或精确消费了选中的两个 ID。PENDING/CREATED
不复用为另一笔购买的授权，未知结果或超时不允许替代 Instruction 或支付重试。

卡是否支持 VIC 使用 `GET /agent/cwallet/card/info` 的
`cardSchemeRegistrationEnabled`，是否完成 VIC 使用
`visaRegistrationSucceeded` 或卡级 `strongAuthRegistered`。支持能力和完成
状态必须分开判断；能力为 false、字段未知或接口读取失败时，不进入 VIC 或
Checkout。

## 环境要求

- Node.js 20 或更高版本
- 始终按路径调用内置 launcher，不使用全局 CLI
- OAuth、绑卡、Passkey、3DS、Instruction 和风控页面由用户在系统浏览器完成
- ready 阶段不重复询问购买确认；Step3 用户操作、事实变化、歧义、超时或未知结果时停止

## 验证

```bash
npm test
git diff --check
```

Skill 版本：`0.1.103`

CLI 来源记录在 `vendor/visa-cli/package.json`。生成的 bundle 只能由
`clink-cli` 官方 vendor 同步流程更新。
