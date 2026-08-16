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
const browserHandoff = await readFile(new URL('../references/clink-browser-handoff.md', import.meta.url), 'utf8');
const restrictedCategories = await readFile(new URL('../references/clink-restricted-categories.md', import.meta.url), 'utf8');
const networkPreflight = await readFile(new URL('../scripts/network-preflight.mjs', import.meta.url), 'utf8');
const cliWrapper = await readFile(new URL('../bin/clink', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

/** Every doc shipped to the agent, keyed by the path a failure message should name. */
const shippedDocs = {
  'SKILL.md': skill,
  'README.md': readme,
  'README.zh.md': readmeZh,
  'references/clink-wallet-config.md': walletConfig,
  'references/clink-payment-refund.md': paymentRefund,
  'references/clink-ucp-checkout.md': ucpCheckout,
  'references/clink-async-events.md': asyncEvents,
  'references/clink-cli-invocation.md': cliInvocation,
  'references/clink-instruction.md': instruction,
  'references/clink-skill-tip.md': skillTip,
  'references/clink-skill-install.md': skillInstall,
  'references/clink-catalog-discovery.md': catalogDiscovery,
  'references/clink-browser-handoff.md': browserHandoff,
  'references/clink-restricted-categories.md': restrictedCategories,
};

test('skill frontmatter stays compact and trigger-focused', () => {
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
  const description = frontmatter.match(/^description:\s*"?(.+?)"?$/mu)?.[1] ?? '';

  assert.ok(frontmatter.length <= 1024, `frontmatter length ${frontmatter.length} exceeds 1024`);
  assert.match(description, /^Use when/u);
});

test('environment guidance matches the production wallet-init distribution wrapper', () => {
  assert.doesNotMatch(cliWrapper, /--sandbox|--test/u);
  assert.match(cliWrapper, /CLINK_WALLET_INIT_ENVIRONMENT=production/u);
  assert.match(cliInvocation, /Environment selection belongs to `wallet init`/u);
  assert.match(cliInvocation, /pins `wallet init` to production/u);
  assert.match(cliInvocation, /there is no `--base-url` flag/u);
  assert.doesNotMatch(skill, /hardcoded UAT\/sandbox/u);
});

test('network execution contract distinguishes host sandbox failures and protects mutations', () => {
  assert.match(skill, /Network Execution Contract/u);
  assert.match(skill, /node <absolute_skill_path>\/scripts\/network-preflight\.mjs <origin>/u);
  assert.match(skill, /Never resolve the script relative to the user's current working directory/u);
  assert.match(skill, /cannot elevate the host sandbox through `SKILL\.md` or `agents\/openai\.yaml`/u);
  assert.match(skill, /`CODEX_SANDBOX_NETWORK_DISABLED=1` is only a diagnostic hint/u);
  assert.match(skill, /Never skip the preflight or label the host blocked from that variable alone/u);
  assert.match(skill, /Codex execution sandbox is unrelated to Clink's `--sandbox`\/`--test`/u);
  assert.match(skill, /Exit code 6 alone is inconclusive/u);

  assert.match(cliInvocation, /Before the first remote-capable command in each workflow/u);
  assert.match(cliInvocation, /scripts\/network-preflight\.mjs` by absolute path/u);
  assert.match(cliInvocation, /`CODEX_SANDBOX_NETWORK_DISABLED=1` is a non-authoritative hint/u);
  assert.match(cliInvocation, /Never skip the probe or claim the host blocked it from the variable alone/u);
  assert.match(cliInvocation, /sandbox_workspace_write[\s\S]*network_access = true/u);
  assert.match(cliInvocation, /sanitized full `origin` \(including a non-default port\)/u);
  assert.match(cliInvocation, /Any HTTP response[\s\S]*proves DNS\/TCP\/TLS\/HTTP reachability/u);
  assert.match(cliInvocation, /ENOTFOUND[\s\S]*EAI_AGAIN[\s\S]*ETIMEDOUT[\s\S]*TLS/u);
  assert.match(cliInvocation, /Exit status 6[\s\S]*cannot distinguish host sandbox denial/u);
  assert.match(cliInvocation, /Never blindly resubmit `clink pay`[\s\S]*`clink skills tip`[\s\S]*`clink refund create`[\s\S]*`clink ucp-checkout complete`/u);
  assert.match(cliInvocation, /s3\.us-west-2\.amazonaws\.com/u);
  assert.match(cliInvocation, /workflow-resolved merchant origins/u);
  assert.match(cliInvocation, /cannot intercept a destination that one CLI invocation resolves and immediately fetches internally/u);
  assert.doesNotMatch(cliInvocation, /(?:only|solely).*\*\*?\.clinkbill\.com/iu);

  assert.match(paymentRefund, /refund create` exits 6 or times out[\s\S]*Never resubmit automatically/u);
  assert.match(ucpCheckout, /never resubmit complete merely because that GET is inconclusive/u);
  assert.match(networkPreflight, /method: 'HEAD'/u);
  assert.match(networkPreflight, /redirect: 'manual'/u);
  assert.doesNotMatch(networkPreflight, /Authorization|Cookie|api[_-]?key/iu);
});

test('main skill routes direct and session pay through authorization resolver before pay', () => {
  assert.match(skill, /lib\/authorization-workflow-fsm\.mjs/u);
  assert.match(skill, /classifyPaymentAuthorizationResolver/u);
  assert.match(skill, /Direct\/session payment is explicitly authorized/u);
  assert.match(skill, /Visa \+ VIC ready/u);
  assert.match(skill, /non-Visa or Visa without VIC readiness/u);
  assert.doesNotMatch(skill, /Direct\/session non-Visa payment is explicitly authorized \| Run `clink pay`/u);
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
    /clink events poll --type account-created,account-reloaded --max-wait 60 --format json/u,
  );
  assert.match(paymentRefund, /execute the any-of command only once/iu);
  assert.match(paymentRefund, /same poll result[\s\S]*each wait spec/iu);
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
    /clink wallet init --email <email> --open --format json/u,
  );
  assert.match(walletConfig, /derives the display name from the email text before `@`/u);
  assert.match(walletConfig, /There is no `--name` flag on `wallet init`/u);
  assert.match(walletConfig, /Complete authorization in your browser/u);
  assert.match(walletConfig, /only from the latest .* segment of the process's live stderr/u);
  assert.match(walletConfig, /keeping that same token-polling process alive/u);
  assert.match(walletConfig, /Do not navigate to, preview, or prefetch the URL/u);
  assert.match(walletConfig, /duplicate verification-code sends or resend throttling/u);
  assert.match(walletConfig, /hasAuthorization=true/u);
  assert.match(walletConfig, /authorizationType=oauth/u);
  assert.match(walletConfig, /init output[\s\S]*no longer echoes `oauthRequired`/u);
  assert.match(walletConfig, /clink wallet logout --format json/u);
  assert.match(skill, /lib\/wallet-workflow-fsm\.mjs/u);
  assert.match(skill, /classifyWalletStatusObservation/u);
  assert.match(skill, /WAIT_FOR_WALLET_INIT_PROGRESS/u);
  assert.match(skill, /TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT/u);
  assert.match(skill, /SHOW_OAUTH_VERIFICATION_URL_AND_WAIT/u);
  assert.match(skill, /DEFER_OAUTH_TO_WALLET_WORKFLOW/u);
  assert.match(
    skill,
    /`wallet init --open`[\s\S]*Do not show the verification URL/u,
  );
  assert.match(skill, /claim that a visible window was confirmed/iu);
  assert.match(skill, /wallet init --email <email> --open --format json/u);
  assert.doesNotMatch(skill, /wallet init --email <email> \[--name/u);
  assert.match(skill, /there is no `--name` flag/u);
  assert.match(skill, /Only after both browser-launch failure and that wait marker/u);
  assert.match(cliInvocation, /pass `--email` and `--open`/u);
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

test('explicit wallet relogin starts a fresh attempt and never reuses an old URL', () => {
  assert.match(skill, /lib\/wallet-intent-fsm\.mjs/u);
  assert.match(skill, /classifyWalletIntent/u);
  assert.match(skill, /explicit wallet re-login is a high-priority route/iu);
  assert.match(skill, /`START_FRESH_WALLET_INIT`[\s\S]*wallet is ready[\s\S]*older init/iu);
  assert.match(skill, /`ASK_FOR_WALLET_EMAIL`/u);
  assert.match(skill, /`DO_NOT_START_WALLET_INIT`/u);
  assert.match(skill, /explicit `WALLET_RELOGIN`[\s\S]*fresh init/iu);
  assert.match(skill, /Never reuse a URL from prior chat messages, terminal scrollback, logs, or another process/iu);

  assert.match(walletConfig, /重新登录[\s\S]*log in again[\s\S]*fresh login link/iu);
  assert.match(walletConfig, /Prefer an email stated in the current request, then the current wallet-status email/iu);
  assert.match(walletConfig, /Capture stderr from the new child process rather than terminal scrollback or chat history/iu);
  assert.match(walletConfig, /latest `Starting wallet login;/u);

  assert.match(cliInvocation, /new process authoritative[\s\S]*older attempt to stop/iu);
  assert.match(cliInvocation, /Do not use chat history, terminal scrollback, or an older child process/iu);
  assert.match(readme, /explicit request to log in again[\s\S]*fresh `wallet init`/iu);
  assert.match(readmeZh, /明确要求重新登录[\s\S]*新的 `wallet init`/u);
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
  assert.doesNotMatch(skill, /printenv CLINK_CUSTOMER_API_KEY \| clink config set customer-api-key/u);
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

test('typed event polling skips unrelated records without hiding any-of alternatives', () => {
  assert.match(asyncEvents, /With `--type`, `events` contains only listed types/u);
  assert.match(asyncEvents, /ordinary typed polling[\s\S]*acknowledges selected and skipped records/iu);
  assert.match(asyncEvents, /typed `--no-ack` acknowledges skipped records and keeps selected records queued/iu);
  assert.match(asyncEvents, /`--checkout-id` poll is stricter[\s\S]*only locally verified exact matches/iu);
  assert.match(asyncEvents, /both `--checkout-id` and `--no-ack`[\s\S]*acknowledges nothing/iu);
  assert.match(asyncEvents, /`ackedEventIds` may contain IDs absent from `events` only outside checkout-selector mode/u);
  assert.match(asyncEvents, /use one any-of poll/u);
  assert.doesNotMatch(asyncEvents, /poll each valid type in turn/iu);
  assert.match(walletConfig, /typed poll processes and acknowledges non-selected events without returning them/u);
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

test('instruction activation runs on the command own built-in watch', () => {
  assert.match(instruction, /`create` and `sign-url` use their built-in watch/u);
  assert.match(instruction, /Omit `--no-watch` and keep that same process alive/u);
  assert.match(instruction, /Do not start an `events poll` beside it/u);
  // The draft examples must not teach --no-watch, or the copied command silences the watch.
  // Scoped to each command's own fenced block so an unrelated `card binding-link --no-watch`
  // elsewhere in the file cannot satisfy or break this.
  const fencedBlocks = instruction.match(/```bash\n[\s\S]*?```/gu) ?? [];
  for (const block of fencedBlocks) {
    if (!/clink instruction (create|sign-url)/u.test(block)) continue;
    assert.doesNotMatch(block, /--no-watch/u);
  }
  assert.match(asyncEvents, /are no exception: they use their built-in watch too/u);
  assert.match(asyncEvents, /Without `eventType` or `expectedResource`[\s\S]*first non-stale event batch/iu);
  assert.match(asyncEvents, /instruction create\/sign-url watches are exceptions[\s\S]*preserve unmatched records[\s\S]*only a matched event/iu);
});

// A 15-minute timeout or a runtime-killed foreground command leaves the activation unobserved
// while the user may already have completed the Passkey. Reporting failure there would strand a
// live authorization, so both the action contract and the reference must send it to instruction get.
test('a watch that ends without the activation verifies rather than fails', () => {
  assert.match(skill, /VERIFY_AUTHORIZATION_AFTER_WATCH_GAP/u);
  assert.match(skill, /never report failure here/u);
  assert.match(skill, /VERIFY_AUTHORIZATION_ACTIVATION/u);
  assert.match(instruction, /VERIFY_AUTHORIZATION_AFTER_WATCH_GAP/u);
  assert.match(instruction, /\*\*not\*\* a failure/u);
  assert.match(instruction, /at most 15 minutes/u);
});

// The Passkey URL once went out with no listener behind it, and the flow then asked the user to
// report completion by hand. --no-watch is no longer the Skill's path, but the CLI still prints
// the poll to run when someone passes it, and the docs must keep pointing at that line.
test('the --no-watch handoff is documented as the next command to run', () => {
  assert.match(asyncEvents, /Watch not started \(--no-watch\)/u);
  assert.match(
    asyncEvents,
    /Run now: clink events poll --type purchase_instruction\.activated --no-ack --format json/u,
  );
  assert.match(asyncEvents, /Run the printed command before sending the URL/u);
  assert.match(skill, /Do not pass `--no-watch`, do not start an `events poll` alongside it/u);
});

test('wallet init starts the watch and then requires returning the binding URL', () => {
  assert.match(walletConfig, /strips the returned URL to its HTTPS origin/u);
  assert.match(walletConfig, /Never emit that unprotected init copy/u);
  assert.match(walletConfig, /paymentMethodsCached=true[\s\S]*paymentMethodCount=0/u);
  assert.match(
    walletConfig,
    /clink card binding-link --no-open --format json[\s\S]*without `--no-watch`/u,
  );
  assert.match(walletConfig, /first JSON envelope[\s\S]*`data\.watchReady=true`[\s\S]*process remains alive/u);
  assert.match(walletConfig, /scopes a watch to `payment_method\.added`/u);
  assert.match(walletConfig, /first Event Hub poll succeeds/u);
  assert.match(walletConfig, /`data\.watchEventType=payment_method\.added`/u);
  assert.match(walletConfig, /positive count[\s\S]*return ready/u);
  assert.match(walletConfig, /do not start a competing `events poll`/u);
  assert.match(skill, /`START_WATCHED_CARD_BINDING`/u);
  assert.match(skill, /Do not return the unprotected init copy/u);
  assert.match(skill, /`bindingUrlRequired=true`/u);
  assert.match(skill, /must return that command's sanitized origin-only `data\.bindingUrl` to the user/u);
  assert.match(skill, /`paymentMethodsCached=true`, `paymentMethodCount=0`/u);
  assert.match(skill, /`data\.watchReady=true`/u);
  assert.match(
    skill,
    /clink card binding-link --no-open --format json[\s\S]*without `--no-watch`/u,
  );
  assert.doesNotMatch(skill, /proactively send (?:its|the returned) origin-only card-binding URL/iu);
  assert.match(readme, /Start `clink card binding-link --no-open --format json`/u);
  assert.match(readme, /must return that watched `bindingUrl` to the user/u);
  assert.match(readmeZh, /先启动带内置监听的 `clink card binding-link --no-open --format json`/u);
  assert.match(readmeZh, /必须把这份已受监听保护的 `bindingUrl` 返回给用户/u);
  assert.match(asyncEvents, /polls the OAuth device-token endpoint; it does not poll the Event Hub/u);
  assert.match(browserHandoff, /must hand that watched URL to the user/u);
});

test('wallet OAuth polling is distinguished from Event Hub listening', () => {
  assert.match(skill, /`oauthDevicePollActive=true` means that same process is polling the OAuth device-token endpoint/u);
  assert.match(skill, /never start `events poll` for OAuth/u);
  assert.match(walletConfig, /`Waiting for authorization\.\.\.`[\s\S]*`oauthDevicePollActive=true`/u);
  assert.match(asyncEvents, /Consider that poll active only after[\s\S]*`Waiting for authorization\.\.\.`/u);
});

test('UCP checkout workflow uses parse-item as the product analysis command', () => {
  assert.match(skill, /clink tool parse-item --url <item_url>/u);
  assert.match(ucpCheckout, /clink tool parse-item --url <item_url>/u);
  assert.match(ucpCheckout, /parse-item returns product-page facts/u);
  assert.match(ucpCheckout, /quantity comes from the user intent/u);
  assert.match(ucpCheckout, /merchantCategoryCode comes from agent classification/u);
  assert.doesNotMatch(skill, /clink tool item-id/u);
  assert.doesNotMatch(ucpCheckout, /clink tool item-id/u);
});

test('UCP order lookup keeps payment and UCP order identifiers type-safe', () => {
  assert.match(skill, /checkout create\/update\/complete\/get `data\.ucp\.ucp_order_id` is `ucpOrderId`/u);
  assert.match(skill, /completed checkout `data\.order\.id` is a compatibility alias/u);
  assert.match(skill, /agent_order\.succeeded\.data\.orderId\/resourceId` is `paymentOrderId`/u);
  assert.match(skill, /never pass `paymentOrderId` to `ucp-order get`/u);
  assert.match(skill, /only nested payload `data\.checkoutId` \/ `data\.checkout_id`/u);
  assert.match(skill, /classifyUcpOrderResolutionObservation/u);
  assert.match(skill, /classifyUcpOrderFetchObservation/u);
  assert.match(skill, /original internal endpoint/u);
  assert.match(skill, /data\.ucp\.success_info/u);
  assert.match(skill, /events poll --type agent_order\.succeeded --checkout-id <checkoutId>/u);

  assert.match(ucpCheckout, /`ucpOrderId`[\s\S]*data\.ucp\.ucp_order_id/u);
  assert.match(ucpCheckout, /`paymentOrderId`[\s\S]*agent_order\.succeeded/u);
  assert.match(ucpCheckout, /clink ucp-checkout get[\s\S]*original_rest_endpoint/u);
  assert.match(ucpCheckout, /clink ucp-order get --order-id <ucpOrderId>/u);
  assert.match(ucpCheckout, /Never fall back to event top-level checkout fields or `resourceId`/u);
  assert.match(ucpCheckout, /Do not re-poll the acknowledged event, re-run complete, or retry payment/u);
  assert.match(ucpCheckout, /data\.ucp\.success_info/u);
  assert.match(ucpCheckout, /same-type event for another checkout stays queued/u);
  assert.match(ucpCheckout, /`merchantOrderId` is an external merchant reference, never a UCP ID alias/u);

  assert.match(asyncEvents, /Event `orderId`\/`resourceId` is the Clink Payment `paymentOrderId`/u);
  assert.match(asyncEvents, /Only `ucpOrderId` may be passed to `ucp-order get`/u);
  assert.match(asyncEvents, /event payload's nested `data\.checkoutId` \/ `data\.checkout_id`/u);
  assert.match(asyncEvents, /filtering happens before ACK/u);
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
  assert.match(skill, /clink skills list --all --tippable --format json/u);
  assert.match(skill, /clink skills tip --publisher/u);
  assert.doesNotMatch(
    skill,
    /clink skills tip[^\n]*(?:--version|--number|--expected-skill-id)/iu,
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
    /clink skills tip[^\n]*(?:--version|--number|--expected-skill-id)/iu,
  );
  assert.match(skillTip, /status.*paid.*status.*1.*payment success/isu);
  assert.match(skillTip, /expectedTip.*required.*publisher.*skillName.*amount.*currency/isu);
  assert.match(skillTip, /both.*account-created.*account-reloaded.*warning/isu);
  assert.match(skillTip, /account-created.*account-reloaded/isu);
  assert.match(skillTip, /optional/iu);
  assert.match(skillTip, /Never retry exit code 6/iu);
  assert.match(skillTip, /code `402`.*Credit 余额不足，请先绑定银行卡/isu);
  assert.match(skillTip, /Do not run `card binding-link`.*binding\/payment listener.*retry the Tip/isu);
  assert.match(
    skillTip,
    /clink events poll --type account-created,account-reloaded --max-wait 60 --format json/u,
  );
  assert.match(skillTip, /same poll result through the `account-created` and `account-reloaded` wait specs/u);
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
  assert.match(skill, /clink skills install <publisher>\/<skillName>\[@<version>\] --format json/u);
  assert.match(skill, /omit.*version.*latest/isu);
  assert.match(skill, /Number.*confirmation/isu);
  assert.doesNotMatch(skill, /clink skills install[^\n]*--version/iu);
  assert.doesNotMatch(skill, /clink skills install[^\n]*--number/iu);
  assert.doesNotMatch(skill, /clink skills install[^\n]*@latest/iu);
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
  assert.match(skillInstall, /clink skills install <publisher>\/<skillName>\[@<version>\] --format json/u);
  assert.match(skillInstall, /omit.*version.*latest/isu);
  assert.match(skillInstall, /planned.*not.*installed/isu);
  assert.match(skillInstall, /--force.*explicit/isu);
  assert.doesNotMatch(skillInstall, /skills install[^\n]*(?:--number|--version|@latest)/iu);
});

test('CLI invocation reference documents Skill install help and exit code 8', () => {
  assert.match(cliInvocation, /skills install --help/u);
  assert.match(cliInvocation, /\| 8 \| Install error/u);
});

test('skill and package versions stay bumped and in sync', () => {
  assert.match(skill, /version:\s*"1\.12\.0"/u);
  assert.equal(packageJson.version, '1.12.0');
  assert.equal(packageJson.engines?.node, '>=20');
});

// The command was renamed clink-cli -> clink across every doc. A rename verified only by positive
// assertions passes while half of it is still stale, which is exactly what happened here: three
// shipped references kept telling the agent to use a `clink-cli` prefix that no longer existed.
// These two assertions are the negative half.
//
// Split deliberately, because the two failure modes look nothing alike in text. A stale COMMAND
// (`clink-cli pay ...`) is followed by whitespace and a verb; a stale PROSE MENTION
// (the `clink-cli` prefix) is a bare backticked token. One regex cannot see both without also
// matching every path that legitimately keeps the old spelling.
test('no shipped doc hands the agent a clink-cli command line', () => {
  // Paths keep the old spelling legitimately (vendor/clink-cli/clink-cli.bundle.mjs,
  // ~/.clink-cli/config.json, references/clink-cli-invocation.md) but none is followed by
  // whitespace, so this pattern never sees them.
  const commandLine = /clink-cli\s+[a-z][a-z-]*(?:\s+[a-z][a-z-]*)?/gu;
  // The bundled CLI still prints its former name in the --no-watch handoff; that quote is real.
  const allowed = ['clink-cli events poll'];

  for (const [name, body] of Object.entries(shippedDocs)) {
    const stale = (body.match(commandLine) ?? [])
      .map(hit => hit.replace(/\s+/gu, ' '))
      .filter(hit => !allowed.includes(hit));
    assert.deepEqual(stale, [], `${name} still tells the agent to run: ${stale.join(', ')}`);
  }
});

test('no shipped doc names clink-cli as the command in prose', () => {
  // `clink-cli` alone in backticks is how prose names the binary — the exact shape of the three
  // leftovers this rename missed. Paths and filenames carry a slash or dot inside the backticks,
  // so they do not match.
  const proseMention = /`clink-cli`/gu;
  const expected = {
    // Contrasts the two names on purpose: this is the line telling the agent not to use PATH.
    'references/clink-cli-invocation.md': 1,
    // Documents the --ucp-agent header default, which is a server-visible value, not a command.
    'references/clink-ucp-checkout.md': 1,
    // Warn that a PATH-resolved build of either name is a different, unpinned binary.
    'README.md': 1,
    'README.zh.md': 1,
  };

  for (const [name, body] of Object.entries(shippedDocs)) {
    const count = (body.match(proseMention) ?? []).length;
    assert.equal(count, expected[name] ?? 0,
      `${name} names \`clink-cli\` ${count} time(s) in prose; expected ${expected[name] ?? 0}`);
  }
});

// The Passkey signature that activates an instruction needs the user. A scheduled task runs when
// they are gone, so the authorization has to exist and be pinned before the schedule does — and a
// run that finds it missing must stop rather than ask for a signature nobody can give.
test('scheduled purchase tasks authorize before the schedule and pin the ids', () => {
  assert.match(skill, /classifyScheduledAuthorizationScope/u);
  assert.match(skill, /classifyScheduledAuthorizationReuse/u);
  assert.match(skill, /classifyUnattendedAuthorization/u);
  assert.match(skill, /`ASK_FOR_SCHEDULE_SCOPE`/u);
  assert.match(skill, /`CREATE_SCHEDULED_AUTHORIZATION_DRAFT`/u);
  assert.match(skill, /`PIN_SCHEDULED_AUTHORIZATION`/u);
  assert.match(skill, /`SURFACE_UNATTENDED_AUTHORIZATION_GAP`/u);
  assert.match(skill, /never by re-listing and re-matching/u);

  assert.match(instruction, /Scheduled-Task Pre-Authorization/u);
  assert.match(instruction, /There is no `DAILY` frequency/u);
  assert.match(instruction, /`WEEKLY`, `MONTHLY`, and `YEARLY`/u);
  assert.match(instruction, /resets to its full value at the start of every cycle/u);
  assert.match(instruction, /consumed as purchases draw it down/u);
  assert.match(instruction, /perRunCap x 7/u);
  assert.match(instruction, /recurringFrequency":"WEEKLY"/u);
  assert.match(instruction, /entire schedule horizon, never against the next single purchase/u);
  assert.match(instruction, /merchantScopeCovered/u);
  assert.match(instruction, /total_budget_below_projected_spend|exhaustsAfterRuns/u);

  assert.match(ucpCheckout, /Scheduled and unattended checkouts/u);
  assert.match(ucpCheckout, /classifyUnattendedAuthorization/u);
  assert.match(ucpCheckout, /Never create a draft, never re-run `instruction list` to find a substitute/u);
});

// --valid-only keeps reserved mandates on recurring instructions on purpose, because a recurring
// mandate is reusable by design. A blanket reservation filter would drop the one mandate a
// scheduled task depends on and report a false no-match.
test('the reservation filter is scoped to one-time instructions', () => {
  assert.match(ucpCheckout, /\*\*only on one-time instructions\*\*/u);
  assert.match(ucpCheckout, /recurring mandate is reusable by design/u);
  assert.match(ucpCheckout, /false no-match/u);
  assert.match(instruction, /only for one-time instructions/u);
  assert.doesNotMatch(
    ucpCheckout,
    /filter out reserve \/ reserved \/ locked \/ in-use instruction or mandate entries when any returned field/u,
  );
});

// A recurring mandate's amountLimit is the cycle budget. Reading it as the per-order ceiling would
// let one run spend the whole week's budget in a single order.
test('the per-run cap is distinguished from the recurring cycle budget', () => {
  assert.match(ucpCheckout, /cycle budget, not the per-order ceiling/u);
  assert.match(ucpCheckout, /Do not select a broad mandate merely because the backend might accept/u);
  assert.match(instruction, /cycle budget, not the per-order cap/u);
});

test('skill documents atomic sequential batch tipping with itemized outcomes', () => {
  for (const document of [skill, skillTip]) {
    assert.match(document, /skill-tip-batch-workflow-fsm\.mjs/u);
    assert.match(document, /one confirmation|一次确认/iu);
    assert.match(document, /first occurrence|首次出现/iu);
    assert.match(document, /sequential|串行/iu);
    assert.match(document, /one.*clink skills tip.*(?:call|invocation).*distinct Skill/isu);
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
  assert.doesNotMatch(readme, /clink skills tip[^\n]*--number|expected-skill-id/iu);
  assert.match(readme, /account-created.*account-reloaded/isu);
  assert.match(readmeZh, /skills list --all --tippable/u);
  assert.match(readmeZh, /skills tip/u);
  assert.match(readmeZh, /两小时|2 小时/iu);
  assert.match(readmeZh, /编号、发布者、技能名称/u);
  assert.match(readmeZh, /打赏.*publisher\/name.*不传.*version/iu);
  assert.doesNotMatch(readmeZh, /打赏[^\n]*可选 version/iu);
  assert.doesNotMatch(readmeZh, /clink skills tip[^\n]*--number|expected-skill-id/iu);
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

test('UCP checkout route delegates internal detection to clink before profile fallback', () => {
  assert.match(skill, /clink tool internal-ucp get-endpoint/u);
  assert.match(skill, /NOT_IN_INTERNAL_UCP_LIST/u);
  assert.match(skill, /INTERNAL_UCP_CHECKOUT/u);
  assert.match(ucpCheckout, /clink tool internal-ucp get-endpoint/u);
  assert.match(ucpCheckout, /NOT_IN_INTERNAL_UCP_LIST/u);
  assert.match(ucpCheckout, /internal UCP checkout/iu);
  assert.match(ucpCheckout, /\.well-known\/ucp-clink/u);
  assert.match(ucpCheckout, /parseable JSON/u);
  assert.match(ucpCheckout, /clink tool get-rest-endpoint --url <standard_ucp_url> --format json/u);
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
  assert.match(skill, /SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH/u);
  assert.match(skill, /instruction get --purchase-instruction-id/u);
  assert.match(skill, /do not wait for the user to report completion/u);
  assert.match(asyncEvents, /waitSpec/u);
  assert.match(asyncEvents, /instructionId.*purchaseInstructionId/u);
  assert.match(instruction, /ACTIVE/u);
  assert.match(instruction, /classifyAuthorizationDraftObservation/u);
  assert.match(instruction, /instruction get` exits nonzero or returns an explicit error envelope/u);
  assert.match(instruction, /`CREATED`, `PENDING`, or `INPROGRESS`/u);
  assert.match(instruction, /`COMPLETED`, `CANCELLED`, `EXPIRED`, `DECLINED`/u);
  assert.match(ucpCheckout, /built-in watch/u);
});

test('catalog discovery loads the merchant list before matching intent on descriptions', () => {
  assert.match(skill, /references\/clink-catalog-discovery\.md/u);
  assert.match(skill, /lib\/catalog-discovery-fsm\.mjs/u);
  assert.match(skill, /classifyCatalogDiscovery/u);
  assert.match(skill, /clink tool internal-ucp get-merchant-list --format json/u);

  assert.match(catalogDiscovery, /clink tool internal-ucp get-merchant-list --format json/u);
  assert.match(catalogDiscovery, /classifyCatalogDiscovery/u);
  assert.match(catalogDiscovery, /`description`/u);
  assert.match(catalogDiscovery, /merchant_match_not_in_candidates/u);
});

test('catalog discovery keeps merchant-scoped and broad search paths distinct', () => {
  assert.match(skill, /clink ucp-catalog search --merchant-id <id> --query <text> --format json/u);
  assert.match(skill, /clink catalog search --query <text> --format json/u);
  assert.match(skill, /never takes `--merchant-id`/u);

  assert.match(catalogDiscovery, /clink ucp-catalog search --merchant-id <merchant_id> --query <text> --format json/u);
  assert.match(
    catalogDiscovery,
    /clink catalog search --query <text> \[--channel-type <channel>\] \[--context <json>\] --format json/u,
  );
  assert.match(catalogDiscovery, /not merchant-scoped and takes no `--merchant-id`/u);
  assert.match(catalogDiscovery, /empty array falls through to the broad search/u);
});

test('catalog search uses the channel selector and location hint plus exact local store filtering', () => {
  assert.match(skill, /--channel-type eats365/u);
  assert.match(skill, /eats365/u);
  assert.match(skill, /normalize the `eat365` spelling/u);
  assert.match(skill, /context\.address_country` only for established HK\/SG/u);
  assert.match(skill, /US, JP, and other countries mean unknown catalog location/u);
  assert.match(skill, /locally keep only exact matching `store_id` groups and recompute `productCount`/u);

  assert.match(catalogDiscovery, /--channel-type eats365 --context '\{"address_country":"HK"\}'/u);
  assert.match(catalogDiscovery, /does not apply it as a search predicate/u);
  assert.match(catalogDiscovery, /store_id` exactly matches the target[\s\S]*recompute the count/u);
  assert.match(catalogDiscovery, /US, JP[\s\S]*unknown catalog location/u);
  assert.match(catalogDiscovery, /legacy pending input `region=hk` or `region=sg`/u);
  assert.match(catalogDiscovery, /Skip this inference step when `channelType` or `storeId` is already established/u);
  assert.match(catalogDiscovery, /merchant-scoped endpoint accepts neither the channel selector nor store identity/u);
  // Real eats365 store ids are lowercase slugs, not numeric store codes; a fabricated-looking
  // example invites the agent to invent one instead of taking it from context.
  assert.doesNotMatch(catalogDiscovery, /store_id":"[A-Z]{2}\d+/u);
  assert.match(catalogDiscovery, /catalog_channel_type_missing/u);
  assert.match(catalogDiscovery, /Never invent one/u);
  assert.doesNotMatch(catalogDiscovery, /--ext '\{"channel_type"/u);
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

// This skill is installed by many host agents, and some drive a browser of their own. A Passkey page
// cannot succeed in an agent browser at all, a 3DS challenge is fingerprinted and soft-declined, a
// card page would move the PAN into model context, and an OAuth page re-sends its verification code
// on a second load. The prohibition therefore has to be in SKILL.md itself — a host agent that never
// opens a reference must still see it — and it has to enumerate the channels, because an agent
// calling navigate through a browser MCP does not think it is "opening a browser".
test('SKILL.md itself bars the agent runtime from pages a person must complete', () => {
  assert.match(skill, /it does not own the browser pages those commands produce/u);
  assert.match(skill, /## Browser Page Handoff/u);
  assert.match(skill, /classifyPageHandoff/u);
  assert.match(skill, /lib\/page-handoff\.mjs/u);
  assert.match(skill, /references\/clink-browser-handoff\.md/u);
  assert.match(skill, /requiresHumanBrowser/u);

  for (const channel of [
    /built-in browser/u,
    /headless browser/u,
    /CDP\/Playwright\/Puppeteer/u,
    /browser MCP server/u,
    /computer-use/u,
    /embedded webview/u,
    /link preview/u,
  ]) {
    assert.match(skill, channel, `SKILL.md must name the ${channel} channel`);
  }

  // "Do not open it" reads as permission to navigate; the verbs have to be spelled out.
  assert.match(skill, /not even to check that the page loads/u);
  assert.match(skill, /prefetch/u);
  assert.match(skill, /unfurl/u);
});

test('the per-page actor table stays in SKILL.md and the handoff reference', () => {
  for (const body of [skill, browserHandoff]) {
    assert.match(body, /USER_DEVICE_ONLY/u);
    assert.match(body, /USER_PREFERRED/u);
    assert.match(body, /AGENT_ALLOWED/u);
  }

  assert.match(browserHandoff, /OAUTH_DEVICE_VERIFICATION/u);
  assert.match(browserHandoff, /CARD_BINDING/u);
  assert.match(browserHandoff, /VIC_PASSKEY_REGISTRATION/u);
  assert.match(browserHandoff, /INSTRUCTION_PASSKEY_SIGNING/u);
  assert.match(browserHandoff, /THREE_DS_CHALLENGE/u);
  assert.match(browserHandoff, /RISK_RULE_CONFIG/u);
  assert.match(browserHandoff, /MERCHANT_PRODUCT_PAGE/u);
});

// Wallet init deliberately opens the user's system browser. Every other link-producing command
// must keep host-side browser launch suppressed.
test('--no-open covers every link command other than wallet init', () => {
  for (const body of [skill, cliInvocation, browserHandoff]) {
    for (const command of [
      /card binding-link/u,
      /card setup-link/u,
      /card modify-link/u,
      /risk link/u,
      /instruction create/u,
      /instruction sign-url/u,
    ]) {
      assert.match(body, command);
    }
  }

  assert.match(skill, /card binding-link --no-open --format json/u);
  assert.match(skill, /card setup-link --no-open --format json/u);
  assert.match(skill, /card modify-link --no-open --format json/u);
  assert.match(skill, /risk link --no-open --format json/u);
  assert.match(walletConfig, /card binding-link --no-open --format json/u);
  assert.match(walletConfig, /risk link --no-open --format json/u);
  assert.match(instruction, /--no-open/u);

  assert.match(cliInvocation, /belongs on every other link-producing command, not `wallet init`/u);
  // --no-open must not be confused with --no-watch: killing the watch loses the completion event.
  assert.match(cliInvocation, /suppresses launch only/u);
  assert.match(browserHandoff, /does not touch the built-in event watch/u);
});

// defaultOpenLinks lives in the machine-wide config every build shares, so its default being false
// proves nothing about the machine this skill is running on.
test('stored default-open-links is verified rather than assumed', () => {
  for (const body of [skill, cliInvocation, browserHandoff]) {
    assert.match(body, /defaultOpenLinks|default-open-links/u);
  }
  assert.match(cliInvocation, /not safe to assume/u);
  assert.match(cliInvocation, /machine-wide/u);
  assert.match(browserHandoff, /config get --format json/u);
});

test('Passkey pages refuse virtual authenticators as well as fabricated payloads', () => {
  assert.match(instruction, /virtual authenticator/u);
  assert.match(instruction, /authResult/u);
  assert.match(instruction, /fidoBlob/u);
  assert.match(browserHandoff, /virtual authenticator/u);
  assert.match(skill, /virtual authenticator/u);
  assert.match(instruction, /platform authenticator/u);
});

test('the 3DS challenge is handed to the user rather than loaded by the agent', () => {
  assert.match(paymentRefund, /USER_DEVICE_ONLY/u);
  assert.match(paymentRefund, /fingerprints the device/u);
  assert.match(paymentRefund, /single-load page/u);
  assert.match(paymentRefund, /clink-browser-handoff\.md/u);
});

// The event, not the browser, is what proves completion — which is exactly why the flow survives the
// user finishing on a phone, a second machine, or an hour later. Verifying by loading the page is
// both unnecessary and the failure mode.
test('the event stays the proof and no page is verified by loading it', () => {
  assert.match(browserHandoff, /proven by a webhook event, never by anything a browser reports/u);
  assert.match(browserHandoff, /looking is the failure mode/u);
  assert.match(skill, /Never add browser-side verification that a page opened/u);
  assert.match(asyncEvents, /never verify a page by loading it from the Agent runtime/u);
});

test('an unattended run reports a browser-handoff gap instead of waiting', () => {
  assert.match(skill, /SURFACE_BROWSER_HANDOFF_GAP/u);
  assert.match(skill, /is a reported gap, not a wait/u);
  assert.match(browserHandoff, /SURFACE_BROWSER_HANDOFF_GAP/u);
  assert.match(browserHandoff, /Do not emit the URL into an empty room/u);
});

// Blanket "no browser" guidance would break parse-item and the catalog fallback, which require it.
test('the prohibition never spills onto merchant product pages', () => {
  assert.match(skill, /Merchant product pages are the opposite case and stay agent work/u);
  assert.match(skill, /ALLOW_AGENT_BROWSER/u);
  assert.match(browserHandoff, /`AGENT_ALLOWED` is not weakened by any of this/u);
});

// Quick instruction setup (2026-08): a frozen purchase intent plus an uninitialized wallet used to
// force two browser journeys — login+binding, then a second Passkey ceremony to activate a freshly
// created instruction. The quick path rides the instruction context on wallet init and activates
// during the binding ceremony instead. The docs must pin the recipe, the null-id fallback, the
// no-wait-without-a-fresh-binding rule, and the supersede semantics — the failure mode is an agent
// waiting on an activation event that can never arrive.
test('quick instruction setup is documented end to end', () => {
  assert.match(skill, /classifyQuickInstructionActivationGate/u);
  assert.match(skill, /wallet init --email <email> --title <title> --mandates/u);
  assert.match(skill, /null id always means the regular Step 2 authorization gate/u);
  assert.match(skill, /informational only/u);
  assert.match(skill, /the newest intent wins/u);
  assert.match(walletConfig, /## Quick Instruction Setup/u);
  assert.match(walletConfig, /`--title` and `--mandates` become required together/u);
  assert.match(walletConfig, /rejects `--payment-instrument-id` and `--extra`/u);
  assert.match(walletConfig, /`data\.pendingInstructionId` comes back null, and the regular authorization flow takes over/u);
  assert.match(instruction, /## Quick Instruction/u);
  assert.match(instruction, /never satisfies `clink instruction list --valid-only`/u);
  assert.match(instruction, /supersedes the older pending instruction server-side/u);
  assert.match(ucpCheckout, /picks it up naturally/u);
  assert.match(asyncEvents, /`payment_method\.added` envelope, then the instruction activation wait for `purchase_instruction\.activated`/u);
  assert.match(asyncEvents, /classifyQuickInstructionActivationGate/u);
});
