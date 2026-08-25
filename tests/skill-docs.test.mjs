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
const paymentIntentContract = await readFile(
  new URL('../references/clink-payment-intent-contract.md', import.meta.url),
  'utf8',
);
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
  'references/clink-payment-intent-contract.md': paymentIntentContract,
  'references/clink-browser-handoff.md': browserHandoff,
  'references/clink-restricted-categories.md': restrictedCategories,
};

function plainMarkdownCell(cell) {
  return cell.replace(/`/gu, '').replace(/\*\*/gu, '').trim();
}

function markdownTableRows(markdown) {
  return markdown
    .split('\n')
    .filter(line => /^\s*\|.*\|\s*$/u.test(line))
    .map(line => line.trim().slice(1, -1).split('|').map(plainMarkdownCell))
    .filter(cells => !cells.every(cell => /^:?-{3,}:?$/u.test(cell)));
}

function markdownTableRow(markdown, firstCell) {
  const matches = markdownTableRows(markdown).filter(cells => cells[0] === firstCell);
  assert.equal(
    matches.length,
    1,
    `expected exactly one Markdown table row whose first cell is ${firstCell}`,
  );
  return matches[0];
}

function jsonExamples(markdown) {
  return [...markdown.matchAll(/```json\n([\s\S]*?)```/gu)].map(([, source]) => JSON.parse(source));
}

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

test('UCP checkout docs leave idempotency-key generation to the CLI', () => {
  const bashExamples = [...ucpCheckout.matchAll(/```bash\n([\s\S]*?)```/gu)]
    .map(([, source]) => source)
    .join('\n');

  assert.match(ucpCheckout, /CLI generates the create idempotency key/u);
  assert.match(ucpCheckout, /CLI also generates the complete idempotency key/u);
  assert.match(ucpCheckout, /Do not pass `--idempotency-key`/u);
  assert.doesNotMatch(bashExamples, /--idempotency-key/u);
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
  const directPayRow = markdownTableRow(paymentIntentContract, 'DIRECT_PAY');
  assert.equal(directPayRow[2], 'REQUIRE_STATUS');
  const authorizationSourceRow = markdownTableRow(paymentIntentContract, 'authorizationSource');
  assert.match(authorizationSourceRow[1], /DIRECT_PAY/u);
  assert.match(authorizationSourceRow[1], /CURRENT_USER_TURN/u);
  assert.match(authorizationSourceRow[1], /UPSTREAM_MERCHANT_WORKFLOW/u);
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
  const pollRow = markdownTableRow(skill, 'POLL_PAYMENT_SUCCESS_EVENT');
  const checkoutFallbackRow = markdownTableRow(skill, 'GET_CHECKOUT_FOR_UCP_ORDER');
  const orderFallbackRow = markdownTableRow(skill, 'FETCH_UCP_ORDER');

  assert.match(skill, /checkout create\/update\/complete\/get `data\.ucp\.ucp_order_id` is `ucpOrderId`/u);
  assert.match(skill, /completed checkout `data\.order\.id` is a compatibility alias/u);
  assert.match(skill, /agent_order\.succeeded\.data\.orderId\/resourceId` is `paymentOrderId`/u);
  assert.match(skill, /never pass `paymentOrderId` to `ucp-order get`/u);
  assert.match(skill, /canonical processed `data\.checkoutId` \/ `data\.checkout_id`/u);
  assert.match(skill, /normalizes a verified nested UCP `agentInstructionInfo` selector/u);
  assert.match(skill, /classifyUcpOrderResolutionObservation/u);
  assert.match(skill, /classifyUcpOrderFetchObservation/u);
  assert.match(skill, /original internal endpoint/u);
  assert.match(skill, /data\.ucp\.success_info/u);
  assert.match(skill, /events poll --type agent_order\.succeeded --checkout-id <checkoutId>/u);
  assert.match(pollRow[1], /--ucp-order-id <frozenUcpOrderId>/u);
  assert.match(pollRow[1], /fetches the UCP order in the same process/u);
  assert.match(pollRow[1], /keeps the event queued[\s\S]*ACKs immediately before output/u);
  assert.match(pollRow[1], /eventAckWarning/u);
  assert.match(pollRow[1], /nextToken/u);
  assert.match(pollRow[1], /must not dispatch a second checkout\/order command/u);
  assert.match(checkoutFallbackRow[1], /^Legacy-bundle fallback only\./u);
  assert.match(orderFallbackRow[1], /^Legacy-bundle fallback only\./u);

  assert.match(ucpCheckout, /`ucpOrderId`[\s\S]*data\.ucp\.ucp_order_id/u);
  assert.match(ucpCheckout, /`paymentOrderId`[\s\S]*agent_order\.succeeded/u);
  assert.match(ucpCheckout, /clink ucp-checkout get[\s\S]*original_rest_endpoint/u);
  assert.match(ucpCheckout, /clink ucp-order get --order-id <ucpOrderId>/u);
  assert.match(ucpCheckout, /Never fall back to event top-level checkout fields or `resourceId`/u);
  assert.match(ucpCheckout, /Do not re-poll the acknowledged event, re-run complete, or retry payment/u);
  assert.match(ucpCheckout, /data\.ucp\.success_info/u);
  assert.match(ucpCheckout, /same-type event for another checkout stays queued/u);
  assert.match(ucpCheckout, /keeps it unacknowledged[\s\S]*ACKs immediately before output/u);
  assert.match(ucpCheckout, /eventAckWarning/u);
  assert.match(ucpCheckout, /preserving `nextToken`/u);
  assert.match(ucpCheckout, /`merchantOrderId` is an external merchant reference, never a UCP ID alias/u);

  assert.match(asyncEvents, /Event `orderId`\/`resourceId` is the Clink Payment `paymentOrderId`/u);
  assert.match(asyncEvents, /Only `ucpOrderId` may be passed to `ucp-order get`/u);
  assert.match(asyncEvents, /event payload's nested `data\.checkoutId` \/ `data\.checkout_id`/u);
  assert.match(asyncEvents, /filtering happens before ACK/u);
});

test('skill documents the normative v2 semantic intent contract and checkout route FSM', () => {
  assert.match(skill, /lib\/payment-intent-router-fsm\.mjs/u);
  assert.match(skill, /classifyPaymentIntent/u);
  assert.match(skill, /references\/clink-payment-intent-contract\.md/u);

  const versionRow = markdownTableRow(paymentIntentContract, 'routingContractVersion');
  assert.match(versionRow[1], /2/u);
  const operationRow = markdownTableRow(paymentIntentContract, 'operation');
  for (const operation of [
    'CATALOG_SEARCH',
    'CATALOG_PURCHASE',
    'UCP_CHECKOUT',
    'DIRECT_PAY',
    'NO_ACTION',
  ]) {
    assert.match(operationRow[1], new RegExp(`\\b${operation}\\b`, 'u'));
  }
  const decisionRow = markdownTableRow(paymentIntentContract, 'executionDecision');
  for (const decision of ['AUTHORIZED', 'DENIED', 'CLARIFY']) {
    assert.match(decisionRow[1], new RegExp(`\\b${decision}\\b`, 'u'));
  }

  const examplesByOperation = new Map(
    jsonExamples(paymentIntentContract).map(example => [example.operation, example]),
  );
  for (const operation of ['CATALOG_SEARCH', 'CATALOG_PURCHASE', 'DIRECT_PAY']) {
    const example = examplesByOperation.get(operation);
    assert.equal(example?.routingContractVersion, 2);
    assert.equal(typeof example?.requestId, 'string');
    assert.equal(typeof example?.turnId, 'string');
    assert.equal(example?.executionDecision, 'AUTHORIZED');
    assert.equal(typeof example?.target, 'object');
  }
  assert.equal(examplesByOperation.get('CATALOG_SEARCH')?.authorizationSource, undefined);
  assert.equal(
    examplesByOperation.get('CATALOG_PURCHASE')?.authorizationSource,
    'CURRENT_USER_TURN',
  );
  assert.equal(
    examplesByOperation.get('DIRECT_PAY')?.authorizationSource,
    'UPSTREAM_MERCHANT_WORKFLOW',
  );

  const textRow = markdownTableRow(paymentIntentContract, 'text');
  assert.match(textRow[1], /audit\/context/u);
  assert.match(textRow[1], /cannot authorize or veto/u);
  assert.match(paymentIntentContract, /legacy compatibility adapter/iu);
  assert.match(paymentIntentContract, /do not extend it with new phrase-specific regexes/iu);
  for (const body of [skill, catalogDiscovery]) {
    assert.doesNotMatch(body, /Text forms share one verb family/iu);
    assert.doesNotMatch(body, /every search synonym/iu);
    assert.doesNotMatch(body, /canonical purchase-wrapped ordinal/iu);
    assert.doesNotMatch(body, /Text may authorize the transition/iu);
  }

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
  assert.match(skill, /version:\s*"1\.13\.1"/u);
  assert.equal(packageJson.version, '1.13.1');
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
  assert.match(skill, /clink tool internal-ucp get-merchant-list[^\n]*--test/u);

  assert.match(catalogDiscovery, /clink tool internal-ucp get-merchant-list \[--test\|--sandbox\] --format json/u);
  assert.match(catalogDiscovery, /classifyCatalogDiscovery/u);
  assert.match(catalogDiscovery, /`description`/u);
  assert.match(catalogDiscovery, /merchant_match_not_in_candidates/u);
});

test('catalog discovery keeps merchant-scoped and broad search paths distinct', () => {
  assert.match(skill, /clink ucp-catalog search --merchant-id <id> --query <text>[^\n]*--test/u);
  assert.match(skill, /clink catalog search --query <text>[^\n]*--test/u);
  assert.match(skill, /never takes `--merchant-id`/u);

  assert.match(catalogDiscovery, /clink ucp-catalog search --merchant-id <merchant_id> --query <text>[^\n]*--test/u);
  assert.match(
    catalogDiscovery,
    /clink catalog search --query <text> \[--channel-type <channel>\] --language <BCP47> \[--context <json>\] \[--test\|--sandbox\] --format json/u,
  );
  assert.match(catalogDiscovery, /not merchant-scoped and takes no `--merchant-id`/u);
  assert.match(catalogDiscovery, /empty array falls through to the broad search/u);
});

test('public Catalog is config-free, environment-explicit, language-aware, and checkout-safe', () => {
  assert.match(cliInvocation, /Public Catalog discovery is the deliberate exception/u);
  assert.match(cliInvocation, /do not read `~\/\.clink-cli\/config\.json`/u);
  assert.match(cliInvocation, /no environment flag means production/u);
  assert.match(cliInvocation, /`--sandbox` means sandbox\/UAT/u);
  assert.match(cliInvocation, /`--test` means test/u);
  assert.match(cliInvocation, /send no `Authorization`/u);
  assert.match(cliInvocation, /three Gateway Catalog API actions[\s\S]*HTTP `401` or `403`[\s\S]*exit 5/u);
  assert.match(cliInvocation, /Production `tool internal-ucp get-merchant-list`[\s\S]*network-error exit 6/u);
  assert.match(cliInvocation, /preflight `https:\/\/www\.clinkbill\.com`[\s\S]*preflight the selected Catalog API origin/u);
  assert.match(cliInvocation, /wallet status, OAuth refresh, or re-login cannot repair it/u);

  assert.match(catalogDiscovery, /Freeze one `catalogEnvironment`/u);
  assert.match(catalogDiscovery, /valid BCP47 tag/u);
  assert.match(catalogDiscovery, /Agent owns result-language detection/u);
  assert.match(catalogDiscovery, /--language zh-Hans --context '\{"address_country":"HK"\}'/u);
  assert.doesNotMatch(catalogDiscovery, /let (?:search|the query) infer language/iu);
  assert.doesNotMatch(catalogDiscovery, /--context '\{[^'\n]*"language"/u);
  assert.match(cliInvocation, /writes the effective value to request `context\.language`/u);
  assert.match(cliInvocation, /sends the same value as `Accept-Language`/u);
  assert.match(cliInvocation, /query is never used to guess a target language/u);
  assert.match(catalogDiscovery, /Broad `catalog search` forwards the declared language/u);
  assert.match(ucpCheckout, /Pass it with `--language` on both search and product/u);
  assert.match(ucpCheckout, /two views can disagree/u);
  const catalogLanguageRow = markdownTableRow(paymentIntentContract, 'target.catalogLanguage');
  assert.match(catalogLanguageRow[1], /Required for CATALOG_SEARCH and CATALOG_PURCHASE/u);
  assert.match(catalogLanguageRow[1], /--language/u);
  assert.match(catalogDiscovery, /Preserve `catalogEnvironment` on every candidate/u);
  assert.match(catalogDiscovery, /pending selection is authoritative/u);
  assert.match(catalogDiscovery, /current `wallet status`/u);
  assert.match(catalogDiscovery, /test or sandbox candidate must never flow silently into production checkout/u);
  assert.match(catalogDiscovery, /production merchant-list non-2xx[\s\S]*network error exit 6/u);
  assert.match(ucpCheckout, /anonymous `POST \/agent\/ucp/u);
  assert.match(ucpCheckout, /require a successful current `wallet status`[\s\S]*verify that its API origin matches[\s\S]*Stop if/u);
  assert.match(ucpCheckout, /selected product without that frozen environment is invalid/u);
  assert.match(
    ucpCheckout,
    /explicit `walletBaseUrl` may only corroborate[\s\S]*never replace missing, malformed, error, or missing-origin status/u,
  );

  assert.match(skill, /catalogEnvironment[\s\S]*catalogLanguage/u);
  assert.match(skill, /Gateway Catalog API[\s\S]*`401`\/`403`[\s\S]*not a wallet-login problem/u);
  assert.match(skill, /pending selection is authoritative[\s\S]*candidate copy/u);
  assert.match(readme, /Semantic v2 intent routing with derived wallet gates/u);
  assert.match(readmeZh, /基于语义的 v2 意图路由和派生钱包门禁/u);
  assert.match(readme, /agent chooses the Catalog result language[\s\S]*`--language`/iu);
  assert.match(readmeZh, /Catalog 结果语言由 Agent[\s\S]*`--language`/u);
});

test('pure product search routes anonymously before wallet readiness', () => {
  const searchRow = markdownTableRow(paymentIntentContract, 'CATALOG_SEARCH');
  const purchaseDiscoveryRow = markdownTableRow(paymentIntentContract, 'CATALOG_PURCHASE');
  const checkoutRow = markdownTableRow(paymentIntentContract, 'UCP_CHECKOUT');
  const directPayRow = markdownTableRow(paymentIntentContract, 'DIRECT_PAY');
  assert.equal(searchRow[2], 'SKIP');
  assert.equal(purchaseDiscoveryRow[2], 'DEFER_UNTIL_SELECTION');
  assert.equal(checkoutRow[2], 'REQUIRE_STATUS');
  assert.equal(directPayRow[2], 'REQUIRE_STATUS');
  assert.match(skill, /`CATALOG_SEARCH` \| `SKIP`[\s\S]*without `wallet status` or `wallet init`/u);
  assert.match(catalogDiscovery, /state: CATALOG_SEARCH_SELECTED/u);
  assert.match(catalogDiscovery, /action: RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW/u);
  assert.match(catalogDiscovery, /walletGate: SKIP/u);
  assert.match(walletConfig, /`CATALOG_SEARCH` returns `walletGate=SKIP`/u);
  assert.match(cliInvocation, /`CATALOG_SEARCH=SKIP`/u);
  assert.match(readme, /product search runs anonymously with `walletGate=SKIP`/u);
  assert.match(readmeZh, /商品搜索使用 `walletGate=SKIP`/u);
  assert.match(readme, /validated route returns `walletGate=REQUIRE_STATUS`/u);
  assert.match(readmeZh, /验证后的路由返回 `walletGate=REQUIRE_STATUS`/u);
  assert.doesNotMatch(readme, /must immediately continue with wallet initialization/iu);
  assert.doesNotMatch(readmeZh, /必须立即继续钱包初始化/u);
});

test('discovery-only results require semantic purchase authorization before checkout', () => {
  assert.match(skill, /Candidate binding cannot create authorization/iu);
  assert.match(skill, /candidate ID or ordinal identifies a result but is not purchase authorization/iu);
  assert.match(catalogDiscovery, /status:'AWAITING_SELECTION'/u);
  assert.match(catalogDiscovery, /candidate number[\s\S]*does not authorize purchase/u);
  assert.match(catalogDiscovery, /Only an authorized purchase decision may be bound to a candidate/u);
  assert.match(catalogDiscovery, /resultMode:'PURCHASE_SELECTION'/u);
  assert.match(catalogDiscovery, /catalog_product_selection_conflict/u);
  const textRow = markdownTableRow(paymentIntentContract, 'text');
  assert.match(textRow[1], /cannot authorize or veto/u);
  assert.match(catalogDiscovery, /legacy `purchaseIntent` boolean cannot create authorization/iu);
  assert.match(paymentIntentContract, /A turn may deny purchase while authorizing discovery/u);
  assert.match(
    catalogDiscovery,
    /`CATALOG_SEARCH` returns it as discovery-only output[\s\S]*only purchase-origin `CATALOG_PURCHASE` continues/u,
  );
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
  assert.match(
    skill,
    /store ordering page[\s\S]{0,160}`product_id`[\s\S]{0,160}candidate's product ID/iu,
  );

  assert.match(catalogDiscovery, /manual_item_facts/u);
  assert.match(
    catalogDiscovery,
    /store ordering page[\s\S]{0,160}`\?product_id=`[\s\S]{0,160}candidate product ID/iu,
  );
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

  const catalogPurchaseRow = markdownTableRow(paymentIntentContract, 'CATALOG_PURCHASE');
  assert.match(catalogPurchaseRow[1], /target\.catalogQuery/u);
  assert.match(catalogPurchaseRow[1], /target\.productName/u);
  assert.equal(catalogPurchaseRow[2], 'DEFER_UNTIL_SELECTION');
  const checkoutRow = markdownTableRow(paymentIntentContract, 'UCP_CHECKOUT');
  assert.match(checkoutRow[1], /target\.productUrl/u);
  assert.equal(checkoutRow[2], 'REQUIRE_STATUS');
  assert.match(paymentIntentContract, /described-product purchase is not checkout-ready/iu);
  assert.match(catalogDiscovery, /merchant ID is optional discovery scope, not a product identity/iu);

  assert.match(catalogDiscovery, /Described Product Purchase Route/u);
  assert.match(catalogDiscovery, /RUN_CATALOG_DISCOVERY_WORKFLOW/u);
  assert.match(catalogDiscovery, /USER_SELECTS_ONE_PRODUCT/u);
});

test('catalog product selection belongs to the user and resolves only presented candidates', () => {
  assert.match(skill, /ASK_FOR_CATALOG_PRODUCT_SELECTION/u);
  assert.match(skill, /ASK_FOR_CATALOG_DISCOVERY_INPUT/u);
  assert.match(skill, /CANCEL_PENDING_CATALOG_PRODUCT_SELECTION/u);
  assert.match(skill, /never auto-select/iu);

  assert.deepEqual(
    markdownTableRow(catalogDiscovery, 'Structured product id').slice(0, 1),
    ['Structured product id'],
  );
  assert.deepEqual(
    markdownTableRow(catalogDiscovery, 'Structured index, 1-based').slice(0, 1),
    ['Structured index, 1-based'],
  );
  assert.deepEqual(
    markdownTableRow(catalogDiscovery, 'Bare ordinal in the reply text').slice(0, 1),
    ['Bare ordinal in the reply text'],
  );
  assert.match(catalogDiscovery, /AWAITING_SELECTION/u);
  assert.match(catalogDiscovery, /original `catalogQuery`/u);
  assert.match(catalogDiscovery, /Damaged context becomes `INVALID`/u);
  assert.match(catalogDiscovery, /selected_product_not_in_candidates/u);
  assert.match(catalogDiscovery, /selected_index_out_of_range/u);
  assert.match(catalogDiscovery, /Do not preselect a product/u);
  assert.match(catalogDiscovery, /mutually exclusive/u);
  assert.match(catalogDiscovery, /checks bind a prior semantic decision and never supply purchase authorization/iu);
  assert.match(
    catalogDiscovery,
    /selector from `DISCOVERY_ONLY` context cannot cross into checkout[\s\S]*authorized semantic purchase decision/iu,
  );
});

test('semantic denial and the purchase wallet boundary fail closed', () => {
  const decisionRow = markdownTableRow(paymentIntentContract, 'executionDecision');
  assert.match(decisionRow[1], /DENIED/u);
  assert.match(decisionRow[1], /CLARIFY/u);
  const noActionRow = markdownTableRow(paymentIntentContract, 'NO_ACTION');
  assert.equal(noActionRow[2], 'SKIP');
  assert.match(
    paymentIntentContract,
    /Invalid, denied, unsupported, or unbound contracts fail closed[\s\S]*requiresWallet:false[\s\S]*walletGate:SKIP/iu,
  );
  assert.match(catalogDiscovery, /executionDecision=DENIED/u);
  assert.match(catalogDiscovery, /DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY/u);
  assert.match(skill, /AWAITING_SELECTION -> EXECUTING/u);
  assert.match(skill, /walletGate=REQUIRE_STATUS/u);
  assert.match(skill, /Candidate resolution only binds the authorized decision/u);
  assert.match(skill, /Preserve and validate the frozen query, product aliases/u);
  assert.match(catalogDiscovery, /price, currency, and quantity/u);
  assert.match(catalogDiscovery, /failed claim or replay runs no checkout/iu);
});

test('UCP minimal skeleton parses and classifies the item before card refresh', () => {
  const skeleton = ucpCheckout.match(/## Minimal End-To-End Skeleton\n\n```bash\n([\s\S]*?)```/u)?.[1] ?? '';
  const parseItemIndex = skeleton.indexOf('clink tool parse-item --url <item_url> --format json');
  const cardRefreshIndex = skeleton.indexOf(
    'clink card binding-link --no-watch --no-open --format json',
  );

  assert.ok(parseItemIndex >= 0, 'minimal skeleton must include parse-item');
  assert.ok(cardRefreshIndex >= 0, 'minimal skeleton must include card refresh');
  assert.ok(parseItemIndex < cardRefreshIndex, 'parse-item must run before card refresh');
  assert.match(skeleton, /Finish fulfillment classification[\s\S]*before touching payment readiness/u);
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

  let cardRefreshRecommendationCount = 0;
  for (const [name, body] of Object.entries(shippedDocs)) {
    const recommendations = [...body.matchAll(
      /`((?:clink )?card binding-link --no-watch[^`\n]*)`/gu,
    )].map(match => match[1]);
    cardRefreshRecommendationCount += recommendations.length;
    for (const command of recommendations) {
      assert.match(command, /(?:^|\s)--no-open(?:\s|$)/u,
        `${name} card refresh recommendation must suppress browser launch: ${command}`);
    }
  }
  assert.ok(cardRefreshRecommendationCount > 0, 'shipped docs must retain card refresh guidance');

  const fencedCommandNames = [
    'wallet init',
    'card binding-link',
    'card setup-link',
    'card modify-link',
    'risk link',
    'instruction create',
    'instruction sign-url',
    'instruction update',
    'instruction cancel',
  ];
  const commandStart = new RegExp(
    `^\\s*(clink (${fencedCommandNames.join('|').replaceAll(' ', '\\s+')})\\b.*)$`,
    'u',
  );
  const seenFencedCommands = new Set();

  for (const [name, body] of Object.entries(shippedDocs)) {
    for (const block of body.match(/```bash\n[\s\S]*?```/gu) ?? []) {
      const lines = block.split('\n');
      for (let index = 0; index < lines.length; index += 1) {
        const start = lines[index].match(commandStart);
        if (!start) continue;

        const commandName = start[2].replace(/\s+/gu, ' ');
        let command = start[1];
        while (/\\\s*$/u.test(command) && index + 1 < lines.length) {
          command += `\n${lines[index += 1].trim()}`;
        }
        seenFencedCommands.add(commandName);

        if (commandName === 'wallet init') {
          assert.match(command, /(?:^|\s)--open(?:\s|$)/u,
            `${name} wallet init example must request the system browser: ${command}`);
          assert.doesNotMatch(command, /--no-open/u);
        } else {
          assert.match(command, /(?:^|\s)--no-open(?:\s|$)/u,
            `${name} link command must suppress host-side browser launch: ${command}`);
        }
      }
    }
  }
  for (const commandName of fencedCommandNames) {
    assert.ok(seenFencedCommands.has(commandName),
      `shipped Bash examples must cover clink ${commandName}`);
  }

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

// Quick instruction setup (2026-08) rides the instruction context on wallet init. CWallet does not
// activate at payment_method.added, though: that event precedes VIC readiness. The docs must pin
// the restricted-category preflight, exact-card refresh, bounded VIC stage, null-id regular-gate
// fallback, and final exact instruction+card verification.
test('quick instruction setup is documented end to end', () => {
  assert.match(skill, /classifyQuickInstructionActivationGate/u);
  assert.match(skill, /wallet init --email <email> --title <title> --mandates/u);
  assert.match(skill, /null is ambiguous between deliberate skip and swallowed creation failure/u);
  assert.match(skill, /never means “list unconditionally(?:\.”|”\.)/u);
  assert.match(skill, /WAIT_VIC_READINESS/u);
  assert.match(skill, /payment_method\.update,vic_device\.binding_succeeded/u);
  assert.match(skill, /singleAttempt=true/u);
  assert.match(skill, /vicReadinessWaitAttempted=true/u);
  assert.match(skill, /activationWaitAttempted=true/u);
  assert.match(skill, /never supplies a resume poll/u);
  assert.match(skill, /exact new `paymentInstrumentId`/u);
  assert.match(skill, /informational only/u);
  assert.match(skill, /newest intent wins/u);
  assert.match(walletConfig, /## Quick Instruction Setup/u);
  assert.match(walletConfig, /`--title` and `--mandates` become required together/u);
  assert.match(walletConfig, /rejects `--payment-instrument-id` and `--extra`/u);
  assert.match(walletConfig, /must carry `description`, `amountLimit`, and `currencyCode`/u);
  assert.match(walletConfig, /at most 10 entries/u);
  assert.match(walletConfig, /16384 UTF-8 bytes/u);
  assert.match(walletConfig, /no usable Quick ID was returned/u);
  assert.match(walletConfig, /classifyInstructionRestriction/u);
  assert.match(instruction, /## Quick Instruction/u);
  assert.match(instruction, /never satisfies `clink instruction list --valid-only`/u);
  assert.match(instruction, /supersedes the older pending instruction server-side/u);
  assert.match(instruction, /only card-addition evidence/u);
  assert.match(instruction, /Never fall back to the default or first card/u);
  assert.match(instruction, /null cannot distinguish a deliberate backend skip from swallowed creation failure/u);
  assert.match(instruction, /Bind verification to both that exact instruction ID and the newly added card ID/u);
  assert.match(ucpCheckout, /picks it up naturally/u);
  assert.match(asyncEvents, /three distinct stages/u);
  assert.match(asyncEvents, /proves only that the card exists, not that VIC is ready/u);
  assert.match(asyncEvents, /regular authorization resolver rather than listing instructions unconditionally/u);
  assert.match(asyncEvents, /classifyQuickInstructionActivationGate/u);
  assert.match(asyncEvents, /final PENDING returns to the regular authorization list with no second Quick poll/u);
  assert.match(restrictedCategories, /Quick setup that carries `instructionContext`/u);
});
