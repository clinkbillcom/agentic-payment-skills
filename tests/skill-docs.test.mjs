import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const readmeZh = await readFile(new URL('../README.zh.md', import.meta.url), 'utf8');
const walletConfig = await readFile(new URL('../references/clink-wallet-config.md', import.meta.url), 'utf8');
const paymentRefund = await readFile(new URL('../references/clink-payment-refund.md', import.meta.url), 'utf8');
const ucpCheckout = await readFile(new URL('../references/clink-ucp-checkout.md', import.meta.url), 'utf8');
const asyncEvents = await readFile(new URL('../references/clink-async-events.md', import.meta.url), 'utf8');
const cliInvocation = await readFile(new URL('../references/clink-cli-invocation.md', import.meta.url), 'utf8');
const instruction = await readFile(new URL('../references/clink-instruction.md', import.meta.url), 'utf8');
const skillTip = await readFile(new URL('../references/clink-skill-tip.md', import.meta.url), 'utf8');
const skillInstall = await readFile(new URL('../references/clink-skill-install.md', import.meta.url), 'utf8');
const cliWrapper = await readFile(new URL('../bin/clink-cli', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('skill frontmatter stays compact and trigger-focused', () => {
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
  const description = frontmatter.match(/^description:\s*"?(.+?)"?$/mu)?.[1] ?? '';

  assert.ok(frontmatter.length <= 1024, `frontmatter length ${frontmatter.length} exceeds 1024`);
  assert.match(description, /^Use when/u);
});

test('environment guidance matches the production-default CLI wrapper', () => {
  assert.doesNotMatch(cliWrapper, /--sandbox/u);
  assert.match(cliInvocation, /does not hardcode `--sandbox`/u);
  assert.match(cliInvocation, /production by default/u);
  assert.match(cliInvocation, /select sandbox.*--sandbox/isu);
  assert.doesNotMatch(skill, /hardcoded UAT\/sandbox/u);
});

test('main skill routes direct and session pay through authorization resolver before pay', () => {
  assert.match(skill, /lib\/authorization-workflow-fsm\.mjs/u);
  assert.match(skill, /AUTHORIZATION_FSM/u);
  assert.match(skill, /Direct\/session payment is explicitly authorized/u);
  assert.match(skill, /Visa \+ VIC ready/u);
  assert.match(skill, /non-Visa or Visa without VIC readiness/u);
  assert.doesNotMatch(skill, /Direct\/session non-Visa payment is explicitly authorized \| Run `clink-cli pay`/u);
});

test('payment reference documents Visa VIC resolver bypass branch', () => {
  assert.match(paymentRefund, /Direct\/Session Pay Authorization Resolver/u);
  assert.match(paymentRefund, /non-Visa/u);
  assert.match(paymentRefund, /Visa but VIC is not enabled/u);
  assert.match(paymentRefund, /bypass instruction matching/u);
  assert.match(paymentRefund, /Visa \+ VIC ready/u);
});

test('Agent Pay account event monitoring is optional, correlated, and user-visible', () => {
  assert.match(skill, /classifyPaymentAccountEventObservation/u);
  assert.match(skill, /classifyAgentPayAccountEventCandidate/u);
  assert.match(skill, /`pay status=1`[\s\S]*account-created[\s\S]*account-reloaded/iu);
  assert.match(skill, /Agent Pay[\s\S]*AMBIGUOUS[\s\S]*PAID/iu);

  assert.match(
    paymentRefund,
    /clink-cli events poll --type account-created --max-wait 60 --format json/u,
  );
  assert.match(
    paymentRefund,
    /clink-cli events poll --type account-reloaded --max-wait 60 --format json/u,
  );
  assert.match(paymentRefund, /账户创建和商户订单确认成功/u);
  assert.match(paymentRefund, /商户订单确认成功/u);
  assert.match(
    paymentRefund,
    /customerEmail[\s\S]*webSite[\s\S]*userId[\s\S]*amount[\s\S]*currency/u,
  );
  assert.match(paymentRefund, /account\.created[\s\S]*account\.reloaded/iu);
  assert.match(paymentRefund, /accountWatchId[\s\S]*paymentId.*absent/iu);

  assert.match(asyncEvents, /Agent Pay[\s\S]*unique candidate/iu);
  assert.match(asyncEvents, /Agent Pay[\s\S]*AMBIGUOUS/iu);
  assert.match(asyncEvents, /timeout[\s\S]*poll error[\s\S]*AMBIGUOUS[\s\S]*PAID/iu);
});

test('wallet init documents email OTP recovery flow', () => {
  assert.match(walletConfig, /BOOTSTRAP_OTP_REQUIRED/u);
  assert.match(walletConfig, /71160015/u);
  assert.match(walletConfig, /Verification code has been sent to this email/u);
  assert.match(walletConfig, /clink-cli wallet init --email <email> --name <name> --otp <email_otp> --format json/u);
  assert.match(skill, /lib\/wallet-workflow-fsm\.mjs/u);
  assert.match(skill, /WALLET_FSM/u);
  assert.match(skill, /--otp <email_otp>/u);
});

test('UCP checkout workflow uses parse-item as the product analysis command', () => {
  assert.match(skill, /clink-cli tool parse-item --url <item_url>/u);
  assert.match(ucpCheckout, /clink-cli tool parse-item --url <item_url>/u);
  assert.match(ucpCheckout, /parse-item returns product-page facts/u);
  assert.match(ucpCheckout, /quantity comes from the user intent/u);
  assert.match(ucpCheckout, /merchantCategoryCode comes from agent classification/u);
  assert.doesNotMatch(skill, /clink-cli tool item-id/u);
  assert.doesNotMatch(ucpCheckout, /clink-cli tool item-id/u);
});

test('skill documents intent routing and checkout route FSMs', () => {
  assert.match(skill, /lib\/payment-intent-router-fsm\.mjs/u);
  assert.match(skill, /PAYMENT_INTENT_FSM/u);
  assert.match(skill, /explicit buy\/order\/checkout language or an upstream purchaseIntent/u);
  assert.match(skill, /lib\/ucp-checkout-route-fsm\.mjs/u);
  assert.match(skill, /UCP_CHECKOUT_ROUTE_FSM/u);
});

test('skill documents public skill listing and explicitly authorized tip routing', () => {
  assert.match(skill, /references\/clink-skill-tip\.md/u);
  assert.match(skill, /lib\/skill-tip-workflow-fsm\.mjs/u);
  assert.match(skill, /SKILL_TIP_FSM/u);
  assert.match(skill, /clink-cli skills list --all --tippable --format json/u);
  assert.match(skill, /clink-cli skills tip --publisher/u);
  assert.doesNotMatch(
    skill,
    /clink-cli skills tip[^\n]*(?:--version|--number|--expected-skill-id)/iu,
  );
  assert.match(skill, /synchronous agent pay.*payment success/isu);
  assert.match(skill, /account-created.*account-reloaded/isu);
  assert.match(skill, /optional/iu);
});

test('skill tip reference binds Number through recent context and optional account event semantics', () => {
  assert.match(skillTip, /Number.*snapshot/isu);
  assert.match(skillTip, /two hours|2 hours|两小时|2 小时/iu);
  assert.match(skillTip, /publisher.*skillName.*skillId/isu);
  assert.match(skillTip, /newest valid displayed snapshot.*do not fall back to an older/isu);
  assert.match(skillTip, /skills list --all --tippable/iu);
  assert.match(skillTip, /confirmationRequired.*true/isu);
  assert.match(skillTip, /fresh list.*does not contain.*select again/isu);
  assert.match(skillTip, /confirmation|确认/iu);
  assert.doesNotMatch(
    skillTip,
    /clink-cli skills tip[^\n]*(?:--version|--number|--expected-skill-id)/iu,
  );
  assert.match(skillTip, /status.*paid.*status.*1.*payment success/isu);
  assert.match(skillTip, /expectedTip.*required.*publisher.*skillName.*amount.*currency/isu);
  assert.match(skillTip, /both.*account-created.*account-reloaded.*warning/isu);
  assert.match(skillTip, /account-created.*account-reloaded/isu);
  assert.match(skillTip, /optional/iu);
  assert.match(skillTip, /Never retry exit code 6/iu);
  assert.match(skillTip, /clink-cli events poll --type account-created --max-wait 60 --format json/u);
  assert.match(skillTip, /clink-cli events poll --type account-reloaded --max-wait 60 --format json/u);
});

test('skill tip reference requires a localized three-column table', () => {
  assert.match(skillTip, /\| 编号 \| 发布者 \| 技能名称 \|/u);
  assert.match(skillTip, /\| Number \| Publisher \| Skill Name \|/u);
  assert.match(skillTip, /same language.*user|user.*language.*all three headers/isu);
  assert.doesNotMatch(skillTip, /\| 序号 \| 发布者 \| Skill 名称 \| skill_id \|/u);
});

test('skill tip reference documents authorization questions and fallback correlation context', () => {
  assert.match(skillTip, /counterfactual.*advice.*not authorization/isu);
  assert.match(skillTip, /negated.*historical.*conditional.*not authorization/isu);
  assert.match(skillTip, /ambiguous.*amount.*clarif/isu);
  assert.match(skillTip, /payment_unknown/iu);
  assert.match(skillTip, /expectedResource.*customerId.*merchantId.*skillId/isu);
  assert.match(skillTip, /explicit.*conflicting orderId.*reject/isu);
  assert.match(asyncEvents, /nonzero CLI exit.*SURFACE_EVENT_ERROR/isu);
});

test('skill documents context-bound Skill installation routing', () => {
  assert.match(skill, /references\/clink-skill-install\.md/u);
  assert.match(skill, /lib\/skill-install-workflow-fsm\.mjs/u);
  assert.match(skill, /SKILL_INSTALL_FSM/u);
  assert.match(skill, /clink-cli skills install <publisher>\/<skillName>\[@<version>\] --format json/u);
  assert.match(skill, /omit.*version.*latest/isu);
  assert.match(skill, /Number.*confirmation/isu);
  assert.doesNotMatch(skill, /clink-cli skills install[^\n]*--version/iu);
  assert.doesNotMatch(skill, /clink-cli skills install[^\n]*--number/iu);
  assert.doesNotMatch(skill, /clink-cli skills install[^\n]*@latest/iu);
});

test('FSM markers are internal diagnostics and never user-visible output', () => {
  assert.match(skill, /Never include raw FSM markers.*commentary or final responses/isu);
  assert.match(skill, /private logs.*non-user-visible structured handoffs/isu);
  assert.match(skill, /Translate workflow state into concise natural language/isu);
});

test('Skill install reference freezes Number context before atomic confirmation', () => {
  assert.match(skillInstall, /same user.*conversation.*exact environment/isu);
  assert.match(skillInstall, /two hours|2 hours/iu);
  assert.match(skillInstall, /newest valid displayed snapshot.*not fall back/isu);
  assert.match(skillInstall, /publisher.*skillName.*versionNo.*skillId/isu);
  assert.match(skillInstall, /AWAITING_CONFIRMATION.*EXECUTING/isu);
  assert.match(skillInstall, /clink-cli skills install <publisher>\/<skillName>\[@<version>\] --format json/u);
  assert.match(skillInstall, /omit.*version.*latest/isu);
  assert.match(skillInstall, /planned.*not.*installed/isu);
  assert.match(skillInstall, /--force.*explicit/isu);
  assert.doesNotMatch(skillInstall, /skills install[^\n]*(?:--number|--version|@latest)/iu);
});

test('CLI invocation reference documents Skill install help and exit code 8', () => {
  assert.match(cliInvocation, /skills install --help/u);
  assert.match(cliInvocation, /\| 8 \| Install error/u);
});

test('skill and package versions are bumped for batch Skill Tip routing', () => {
  assert.match(skill, /version:\s*"1\.7\.0"/u);
  assert.equal(packageJson.version, '1.7.0');
  assert.equal(packageJson.engines?.node, '>=20');
});

test('skill documents atomic sequential batch tipping with itemized outcomes', () => {
  for (const document of [skill, skillTip]) {
    assert.match(document, /SKILL_TIP_BATCH_FSM/u);
    assert.match(document, /one confirmation|一次确认/iu);
    assert.match(document, /first occurrence|首次出现/iu);
    assert.match(document, /sequential|串行/iu);
    assert.match(document, /one.*clink-cli skills tip.*(?:call|invocation).*distinct Skill/isu);
    assert.match(document, /fail(?:ed|ure).*unknown.*(?:continue|do not stop|不阻断)/isu);
    assert.match(document, /never.*(?:automatically )?retry|不.*自动重试/isu);
    assert.match(document, /COMPLETED.*does not mean.*all.*paid|COMPLETED.*不代表.*全部/isu);
  }
  assert.match(skillTip, /shared amount|统一金额/iu);
  assert.match(skillTip, /per-item amounts|分别指定金额/iu);
  assert.match(skillTip, /ALL_PAID.*PARTIAL.*NONE_PAID/isu);
});

test('README summaries advertise both skill tip intents', () => {
  assert.match(readme, /skills list --all --tippable/u);
  assert.match(readme, /skills tip/u);
  assert.match(readme, /two hours|2 hours/iu);
  assert.match(readme, /Number, publisher, and Skill name/iu);
  assert.match(readme, /tips.*publisher\/name.*without.*version/iu);
  assert.doesNotMatch(readme, /tips[^\n]*optional version/iu);
  assert.doesNotMatch(readme, /clink-cli skills tip[^\n]*--number|expected-skill-id/iu);
  assert.match(readme, /account-created.*account-reloaded/isu);
  assert.match(readmeZh, /skills list --all --tippable/u);
  assert.match(readmeZh, /skills tip/u);
  assert.match(readmeZh, /两小时|2 小时/iu);
  assert.match(readmeZh, /编号、发布者、技能名称/u);
  assert.match(readmeZh, /打赏.*publisher\/name.*不传.*version/iu);
  assert.doesNotMatch(readmeZh, /打赏[^\n]*可选 version/iu);
  assert.doesNotMatch(readmeZh, /clink-cli skills tip[^\n]*--number|expected-skill-id/iu);
  assert.match(readmeZh, /account-created.*account-reloaded/isu);
});

test('README summaries advertise latest, exact-version, and Number Skill installs', () => {
  for (const summary of [readme, readmeZh]) {
    assert.match(summary, /skills install/u);
    assert.match(summary, /publisher\/name\[@version\]|publisher\/name.*version/iu);
    assert.match(summary, /latest/iu);
    assert.match(summary, /Number|序号/iu);
    assert.match(summary, /confirm|确认/iu);
  }
});

test('UCP checkout route delegates internal detection to clink-cli before profile fallback', () => {
  assert.match(skill, /clink-cli tool internal-ucp get-endpoint/u);
  assert.match(skill, /NOT_IN_INTERNAL_UCP_LIST/u);
  assert.match(skill, /INTERNAL_UCP_CHECKOUT/u);
  assert.match(ucpCheckout, /clink-cli tool internal-ucp get-endpoint/u);
  assert.match(ucpCheckout, /NOT_IN_INTERNAL_UCP_LIST/u);
  assert.match(ucpCheckout, /internal UCP checkout/iu);
  assert.match(ucpCheckout, /\.well-known\/ucp-clink/u);
  assert.match(ucpCheckout, /parseable JSON/u);
  assert.match(ucpCheckout, /clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json/u);
  assert.match(ucpCheckout, /services\.\*\.endpoint/u);
  assert.match(ucpCheckout, /provider.*clinkbill/u);
  assert.match(ucpCheckout, /provider.*not.*clinkbill.*external/u);
  assert.match(ucpCheckout, /--endpoint <rest_endpoint>/u);
  assert.match(ucpCheckout, /standard_ucp_profile_absent/u);
  assert.doesNotMatch(skill, /STANDARD_UCP_DOMAINS/u);
  assert.doesNotMatch(skill, /STANDARD_UCP_CHECKOUT/u);
  assert.doesNotMatch(ucpCheckout, /known standard UCP domain allowlist/u);
  assert.doesNotMatch(ucpCheckout, /www\.bruceleeclub\.com/u);
});

test('README summaries include CLI-first internal routing and the profile provider gate', () => {
  assert.match(readme, /internal-ucp get-endpoint/u);
  assert.match(readme, /NOT_IN_INTERNAL_UCP_LIST/u);
  assert.match(readme, /internal checkout/iu);
  assert.match(readme, /get-rest-endpoint/u);
  assert.match(readme, /provider.*clinkbill/u);
  assert.match(readme, /external checkout/u);
  assert.match(readmeZh, /internal-ucp get-endpoint/u);
  assert.match(readmeZh, /NOT_IN_INTERNAL_UCP_LIST/u);
  assert.match(readmeZh, /internal checkout/iu);
  assert.match(readmeZh, /get-rest-endpoint/u);
  assert.match(readmeZh, /provider.*clinkbill/u);
  assert.match(readmeZh, /external checkout/u);
});

test('instruction activation waits are FSM-driven and correlated before resume', () => {
  assert.match(skill, /classifyAuthorizationDraftObservation/u);
  assert.match(skill, /classifyAuthorizationActiveVerification/u);
  assert.match(skill, /classifyEventWaitRequest/u);
  assert.match(skill, /classifyEventPollObservation/u);
  assert.match(skill, /clink-cli events poll --type purchase_instruction\.activated --no-ack --format json/u);
  assert.match(skill, /instruction get --purchase-instruction-id/u);
  assert.match(skill, /do not wait for the user to report completion/u);
  assert.match(asyncEvents, /waitSpec/u);
  assert.match(asyncEvents, /instructionId.*purchaseInstructionId/u);
  assert.match(instruction, /ACTIVE/u);
  assert.match(instruction, /classifyAuthorizationDraftObservation/u);
  assert.match(ucpCheckout, /activation waitSpec/u);
});
