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
const catalogDiscovery = await readFile(new URL('../references/clink-catalog-discovery.md', import.meta.url), 'utf8');
const cliWrapper = await readFile(new URL('../bin/clink-cli', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('skill frontmatter stays compact and trigger-focused', () => {
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
  const description = frontmatter.match(/^description:\s*"?(.+?)"?$/mu)?.[1] ?? '';

  assert.ok(frontmatter.length <= 1024, `frontmatter length ${frontmatter.length} exceeds 1024`);
  assert.match(description, /^Use when/u);
});

test('environment guidance matches the UAT wallet-init distribution wrapper', () => {
  assert.doesNotMatch(cliWrapper, /--sandbox/u);
  assert.match(cliWrapper, /CLINK_WALLET_INIT_ENVIRONMENT=sandbox/u);
  assert.match(cliInvocation, /UAT distribution supplies sandbox\/UAT internally/u);
  assert.match(cliInvocation, /follow-up command uses the plain wrapper/u);
  assert.doesNotMatch(skill, /hardcoded UAT\/sandbox/u);
});

test('main skill routes direct and session pay through authorization resolver before pay', () => {
  assert.match(skill, /lib\/authorization-workflow-fsm\.mjs/u);
  assert.match(skill, /classifyPaymentAuthorizationResolver/u);
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

test('wallet init documents OAuth browser authorization without OTP recovery', () => {
  assert.match(walletConfig, /OAuth Device Authorization/u);
  assert.match(
    walletConfig,
    /clink-cli wallet init --email <email> \[--name <name>\] --no-open --format json/u,
  );
  assert.match(walletConfig, /derives the display name from the email text before `@`/u);
  assert.match(walletConfig, /Do not ask the user for a name during ordinary initialization/u);
  assert.match(walletConfig, /Complete authorization in your browser/u);
  assert.match(walletConfig, /only from the original process's live stderr/u);
  assert.match(walletConfig, /keep that same process alive/u);
  assert.match(walletConfig, /Do not navigate to, preview, or prefetch the URL/u);
  assert.match(walletConfig, /duplicate verification-code sends or resend throttling/u);
  assert.match(walletConfig, /hasAuthorization=true/u);
  assert.match(walletConfig, /authorizationType=oauth/u);
  assert.match(walletConfig, /init output[\s\S]*no longer echoes `oauthRequired`/u);
  assert.match(walletConfig, /clink-cli wallet logout --format json/u);
  assert.match(skill, /lib\/wallet-workflow-fsm\.mjs/u);
  assert.match(skill, /classifyWalletStatusObservation/u);
  assert.match(skill, /SHOW_OAUTH_VERIFICATION_URL_AND_WAIT/u);
  assert.match(
    skill,
    /complete value of `authorizationUrl` verbatim on its own line[\s\S]*Do not add, remove, parse, encode, decode, rebuild, reduce to an origin, or truncate any character[\s\S]*preserve the query after `\?` and the fragment after `#`/u,
  );
  assert.match(skill, /wallet init --email <email> \[--name <name>\] --no-open --format json/u);
  assert.match(skill, /Do not ask for a name by default/u);
  assert.match(skill, /verification URL only from the original process's live stderr/u);
  assert.match(cliInvocation, /`--no-open`[\s\S]*overrid/iu);
  assert.match(cliInvocation, /OAuth verification URL[\s\S]*live progress message on stderr/iu);
  assert.doesNotMatch(walletConfig, /attempts to open it|Automatic browser launch may fail/u);
  assert.doesNotMatch(skill, /Automatic browser-open failure/u);
  assert.doesNotMatch(walletConfig, /BOOTSTRAP_OTP_REQUIRED|--otp <email_otp>/u);
  assert.doesNotMatch(skill, /ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT|--otp <email_otp>/u);
  assert.match(readme, /New wallet initialization uses OAuth Device Authorization/u);
  assert.match(readme, /derives the name from the email text before `@`/u);
  assert.match(readmeZh, /新的钱包初始化使用 OAuth Device Authorization/u);
  assert.match(readmeZh, /默认取邮箱 `@` 前部分作为姓名/u);
});

test('OAuth authentication guidance distinguishes 401 from 403 and keeps CSK legacy-only', () => {
  assert.match(cliInvocation, /OAuth authorization is bound to its issuer origin/u);
  assert.match(cliInvocation, /If OAuth `401`[\s\S]*reauthorize/u);
  assert.match(cliInvocation, /For `403`[\s\S]*without refresh or retry/u);
  assert.match(ucpCheckout, /OAuth Bearer[\s\S]*legacy/u);
  assert.match(ucpCheckout, /`oauthRequired` is absent or exactly `false`/u);
  assert.match(skill, /OAuth refresh is owned by the CLI/u);
  assert.match(cliInvocation, /oauthRequired=true[\s\S]*stored\/env\/flag CSK is ignored/u);
});

test('legacy CSK readiness remains compatible without weakening OAuth fail-closed behavior', () => {
  assert.match(walletConfig, /Legacy CSK ready/u);
  assert.match(walletConfig, /migration is recommended but must not block/u);
  assert.match(walletConfig, /Invalid OAuth state[\s\S]*never fall back to CSK/u);
  assert.match(walletConfig, /OAuth reauthorization required[\s\S]*never inspect stored\/env\/flag CSK/u);
  assert.match(skill, /Preserve legacy CSK compatibility/u);
  assert.match(skill, /Do not force[\s\S]*to migrate/u);
  assert.match(skill, /New `wallet init` always creates OAuth/u);
  assert.match(skill, /Once OAuth succeeds, `oauthRequired=true` is permanent/u);
  assert.doesNotMatch(skill, /printenv CLINK_CUSTOMER_API_KEY \| clink-cli config set customer-api-key/u);
});

test('latest CLI identity continuity and effective wallet status are documented', () => {
  assert.match(walletConfig, /hasStoredAuthorization/u);
  assert.match(walletConfig, /authorizationEnvironmentMatches/u);
  assert.match(walletConfig, /leaves the stored authorization in the config but makes it ineffective/iu);
  assert.match(walletConfig, /another process replaces the login/u);
  assert.match(walletConfig, /without overwriting the newer wallet/u);
  assert.match(asyncEvents, /bound to the customer\/device\/session identity/u);
  assert.match(asyncEvents, /without caching or acknowledging/u);
  assert.match(cliInvocation, /authorization identity observed when it starts/u);
  assert.match(skill, /CLI reports that authentication\/login changed/u);
  assert.match(skill, /webhook event customer does not match/u);
});

test('latest CLI config mutation boundaries are documented', () => {
  assert.match(walletConfig, /always rejects `config set customer-api-key`/u);
  assert.match(walletConfig, /`config unset customer-api-key` remains available/u);
  assert.match(walletConfig, /`config set customer-id` is allowed only for a never-OAuth wallet/u);
  assert.match(walletConfig, /Changing it clears cached payment methods and risk rules/u);
  assert.match(cliInvocation, /`config set customer-api-key` is always rejected/u);
  assert.match(walletConfig, /Refresh Token expiry[\s\S]*`invalid_grant`[\s\S]*clear active credentials/iu);
  assert.match(walletConfig, /Transient refresh failures[\s\S]*leave the current credentials intact/iu);
  assert.match(walletConfig, /CLINK_BASE_URL[\s\S]*hasStoredAuthorization=true[\s\S]*authorizationEnvironmentMatches=false/iu);
  assert.doesNotMatch(walletConfig, /--base-url/u);
  assert.match(walletConfig, /config set base-url[\s\S]*clears the stored OAuth authorization/iu);
});

test('instruction activation uses one explicit Event FSM watcher', () => {
  assert.match(instruction, /instruction create[\s\S]*--no-watch[\s\S]*--format json/u);
  assert.match(instruction, /instruction sign-url[\s\S]*--no-watch[\s\S]*--format json/u);
  assert.match(instruction, /one Event FSM owns correlation/u);
  assert.match(asyncEvents, /avoids duplicate watchers/u);
  assert.match(asyncEvents, /Without `eventType` or `expectedResource`[\s\S]*first non-stale event batch/iu);
  assert.match(asyncEvents, /With either target[\s\S]*acknowledges unrelated events[\s\S]*matching event/iu);
});

// The Passkey URL once went out with no listener behind it, and the flow then asked the user to
// report completion by hand. The CLI now prints the poll to run; the docs must point at that line
// so it reads as the handoff it is rather than a notice.
test('the --no-watch handoff is documented as the next command to run', () => {
  assert.match(asyncEvents, /Watch not started \(--no-watch\)/u);
  assert.match(
    asyncEvents,
    /Run now: clink-cli events poll --type purchase_instruction\.activated --no-ack --format json/u,
  );
  assert.match(asyncEvents, /Run that command before sending the Passkey URL/u);
  assert.match(skill, /`Watch not started \(--no-watch\)`[\s\S]*that line is the handoff/u);
});

test('wallet init proactively returns and surfaces the card binding URL', () => {
  assert.match(walletConfig, /strips the returned URL to its HTTPS origin/u);
  assert.match(walletConfig, /Proactively send a non-empty `data\.bindingUrl`/u);
  assert.match(walletConfig, /never expose its original path, query string, or encoded email/u);
  assert.match(skill, /`RETURN_WALLET_READY`[\s\S]*`data\.bindingUrl`/u);
  assert.match(skill, /proactively send the returned origin-only card-binding URL/u);
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
  assert.match(skill, /classifyPaymentIntent/u);
  assert.match(skill, /explicit buy\/order\/checkout language or an upstream purchaseIntent/u);
  assert.match(skill, /lib\/ucp-checkout-route-fsm\.mjs/u);
  assert.match(skill, /classifyUcpCheckoutRoute/u);
});

test('skill documents public skill listing and explicitly authorized tip routing', () => {
  assert.match(skill, /references\/clink-skill-tip\.md/u);
  assert.match(skill, /lib\/skill-tip-workflow-fsm\.mjs/u);
  assert.match(skill, /SKILL_TIP/u);
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
  assert.match(skillTip, /code `402`.*Credit 余额不足，请先绑定银行卡/isu);
  assert.match(skillTip, /Do not run `card binding-link`.*binding\/payment listener.*retry the Tip/isu);
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
  assert.match(skill, /classifySkillInstallPrerequisites/u);
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

test('ordinary Skill installation does not run project tests', () => {
  assert.match(skill, /ordinary public Skill installation or reinstallation.*do not run.*test suite/isu);
  assert.match(skill, /npm test.*node --test/isu);
  assert.match(skill, /Verify only the CLI exit code.*JSON result binding.*install path.*agent publication result/isu);
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

test('skill and package versions are bumped for OAuth wallet routing', () => {
  assert.match(skill, /version:\s*"1\.8\.0"/u);
  assert.equal(packageJson.version, '1.8.0');
  assert.equal(packageJson.engines?.node, '>=20');
});

test('skill documents atomic sequential batch tipping with itemized outcomes', () => {
  for (const document of [skill, skillTip]) {
    assert.match(document, /skill-tip-batch-workflow-fsm\.mjs/u);
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

test('catalog discovery loads the merchant list before matching intent on descriptions', () => {
  assert.match(skill, /references\/clink-catalog-discovery\.md/u);
  assert.match(skill, /lib\/catalog-discovery-fsm\.mjs/u);
  assert.match(skill, /classifyCatalogDiscovery/u);
  assert.match(skill, /clink-cli tool internal-ucp get-merchant-list --format json/u);

  assert.match(catalogDiscovery, /clink-cli tool internal-ucp get-merchant-list --format json/u);
  assert.match(catalogDiscovery, /classifyCatalogDiscovery/u);
  assert.match(catalogDiscovery, /`description`/u);
  assert.match(catalogDiscovery, /merchant_match_not_in_candidates/u);
});

test('catalog discovery keeps merchant-scoped and broad search paths distinct', () => {
  assert.match(skill, /clink-cli ucp-catalog search --merchant-id <id> --query <text> --format json/u);
  assert.match(skill, /clink-cli catalog search --query <text> --format json/u);
  assert.match(skill, /never takes `--merchant-id`/u);

  assert.match(catalogDiscovery, /clink-cli ucp-catalog search --merchant-id <merchant_id> --query <text> --format json/u);
  assert.match(catalogDiscovery, /clink-cli catalog search --query <text> \[--ext <json>\] --format json/u);
  assert.match(catalogDiscovery, /not merchant-scoped and takes no `--merchant-id`/u);
  assert.match(catalogDiscovery, /empty array falls through to the broad search/u);
});

test('catalog ext narrowing pins the eats365 channel and supported region', () => {
  assert.match(skill, /channel_type/u);
  assert.match(skill, /eats365/u);
  assert.match(skill, /normalize the `eat365` spelling/u);
  assert.match(skill, /`region` `hk` only/u);
  assert.match(skill, /never send `region` or `store_id` without `channel_type`/u);

  assert.match(catalogDiscovery, /"channel_type":"eats365","region":"hk","store_id":"arabica_cheklapkok"/u);
  // Real eats365 store ids are lowercase slugs, not numeric store codes; a fabricated-looking
  // example invites the agent to invent one instead of taking it from context.
  assert.doesNotMatch(catalogDiscovery, /store_id":"[A-Z]{2}\d+/u);
  assert.match(catalogDiscovery, /unsupported_catalog_region/u);
  assert.match(catalogDiscovery, /catalog_channel_type_missing/u);
  assert.match(catalogDiscovery, /Never invent one/u);
});

// A platform-store item has no product detail page. When the docs did not say so, the agent read
// parse-item's empty `items` array as a failed lookup, went browsing for a page that cannot exist,
// and ended the turn asking the user for a link the catalog had already returned.
test('platform-store checkout uses the candidate url and its manual-facts envelope', () => {
  assert.match(skill, /manual_item_facts/u);
  assert.match(skill, /success envelope and an instruction, not a failure/u);
  assert.match(skill, /do not browse for a product detail page that does not exist/iu);
  assert.match(skill, /store ordering page carrying `\?product_id=`/u);

  assert.match(catalogDiscovery, /manual_item_facts/u);
  assert.match(catalogDiscovery, /store ordering page with `\?product_id=`/u);
  assert.doesNotMatch(skill, /Resolve a product detail URL for `parse-item` before checkout create/u);
});

// --line-items is a major-unit string while catalogs report minor units, so passing the catalog
// value straight through bills 100x the agreed amount.
test('the line-item price unit conversion is stated where checkout is built', () => {
  assert.match(skill, /major-unit decimal string/u);
  assert.match(skill, /minor units[\s\S]{0,200}100x/u);
  assert.match(skill, /`totalAmountMinor` stays in minor units/u);
  assert.match(catalogDiscovery, /overcharges by 100x/u);
});

test('catalog discovery delegates outward instead of claiming unavailability', () => {
  assert.match(skill, /DELEGATE_EXTERNAL_PRODUCT_DISCOVERY/u);
  assert.match(skill, /browser, MCP, or another Skill/u);
  assert.match(skill, /Do not report the product as unavailable or retry the same query/u);

  assert.match(catalogDiscovery, /EXTERNAL_DISCOVERY_REQUIRED/u);
  assert.match(catalogDiscovery, /browser, MCP, or another Skill/u);
  assert.match(catalogDiscovery, /not that the product does not exist/u);
  assert.match(catalogDiscovery, /do not retry the same query/u);
});

test('catalog discovery results are not purchase authorization', () => {
  assert.match(skill, /Catalog discovery results are discovery only, never purchase authorization/u);
  assert.match(catalogDiscovery, /is not purchase authorization/u);
  assert.match(catalogDiscovery, /discovery only/u);
  assert.match(catalogDiscovery, /clink-ucp-checkout\.md/u);
});

test('described product purchase routes through catalog discovery before checkout', () => {
  assert.match(skill, /CATALOG_PURCHASE/u);
  assert.match(skill, /RUN_CATALOG_DISCOVERY_WORKFLOW/u);
  assert.match(skill, /RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT/u);
  assert.match(skill, /never straight to `UCP_CHECKOUT`/u);
  assert.match(skill, /bare purchase verb/u);

  assert.match(catalogDiscovery, /Described Product Purchase Route/u);
  assert.match(catalogDiscovery, /RUN_CATALOG_DISCOVERY_WORKFLOW/u);
  assert.match(catalogDiscovery, /USER_SELECTS_ONE_PRODUCT/u);
  assert.match(catalogDiscovery, /needs a product detail URL/u);
});

test('catalog product selection belongs to the user and resolves only presented candidates', () => {
  assert.match(skill, /ASK_FOR_CATALOG_PRODUCT_SELECTION/u);
  assert.match(skill, /CANCEL_PENDING_CATALOG_PRODUCT_SELECTION/u);
  assert.match(skill, /structured product id, structured index, or a bare ordinal/u);
  assert.match(skill, /never auto-select/u);

  assert.match(catalogDiscovery, /AWAITING_SELECTION/u);
  assert.match(catalogDiscovery, /selected_product_not_in_candidates/u);
  assert.match(catalogDiscovery, /selected_index_out_of_range/u);
  assert.match(catalogDiscovery, /Do not preselect a product/u);
  assert.match(catalogDiscovery, /mutually exclusive/u);
});

test('catalog selection does not bypass UCP checkout guards', () => {
  assert.match(catalogDiscovery, /clink-ucp-checkout\.md/u);
  assert.match(catalogDiscovery, /Selecting a product does not skip any of them/u);
  assert.match(catalogDiscovery, /Selection is not authorization to skip/u);
});
