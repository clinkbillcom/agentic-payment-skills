import { formatWorkflowMarker } from './workflow-marker.mjs';

export const WalletIntentState = Object.freeze({
  WALLET_RELOGIN_SELECTED: 'WALLET_RELOGIN_SELECTED',
  WALLET_RELOGIN_INPUT_MISSING: 'WALLET_RELOGIN_INPUT_MISSING',
  WALLET_RELOGIN_NOT_AUTHORIZED: 'WALLET_RELOGIN_NOT_AUTHORIZED',
});

export const WalletIntentRoute = Object.freeze({
  WALLET_RELOGIN: 'WALLET_RELOGIN',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
  NO_ACTION: 'NO_ACTION',
});

export const WalletIntentAction = Object.freeze({
  START_FRESH_WALLET_INIT: 'START_FRESH_WALLET_INIT',
  ASK_FOR_WALLET_EMAIL: 'ASK_FOR_WALLET_EMAIL',
  DO_NOT_START_WALLET_INIT: 'DO_NOT_START_WALLET_INIT',
});

const STRUCTURED_RELOGIN_INTENTS = new Set([
  'wallet_relogin',
  'wallet_reauthorize',
  'wallet_login_again',
  'wallet_fresh_login',
]);

const CHINESE_RELOGIN_PATTERN =
  /(?:重新|再次|再)\s*(?:登录|登陆|登入)|(?:重新|再次|再)\s*(?:授权|认证)[^。！？?!\n]{0,8}(?:钱包|账户|账号|登录|登陆|登入|oauth)|(?:钱包|账户|账号|登录|登陆|登入|oauth)[^。！？?!\n]{0,8}(?:重新|再次|再)\s*(?:授权|认证)|(?:登录|登陆|登入|授权|认证)(?:页|页面|链接)?[^。！？?!\n]{0,12}(?:过期|失效|打不开|不能用|没打开)|(?:给我|生成|打开|换|来)[^。！？?!\n]{0,12}(?:一个)?\s*(?:新的?|新)[^。！？?!\n]{0,8}(?:登录|登陆|登入|授权|认证)(?:页|页面|链接)|(?:忘记|忘了|没来得及|错过|没有|还没|未)[^。！？?!\n]{0,10}(?:登录|登陆|登入|授权|认证)/iu;

const ENGLISH_RELOGIN_PATTERN =
  /\b(?:re-?login|re-?log\s+in|log\s+in\s+again|login\s+again|sign\s+in\s+again)\b|\b(?:re-?authori[sz]e|authenticate\s+again)\b[^.?!\n]{0,20}\b(?:wallet|account|login|oauth)\b|\b(?:wallet|account|login|oauth)\b[^.?!\n]{0,20}\b(?:re-?authori[sz]e|authenticate\s+again)\b|\b(?:new|fresh|another|replacement)\s+(?:login|sign-in|authorization)\s+(?:link|page)\b|\b(?:login|sign-in|authorization)\s+(?:link|page)\s+(?:expired|failed|did not open|didn't open|does not work|doesn't work)\b|\b(?:forgot|missed|did not|didn't|never got to)\s+(?:log|sign)\s+in\b/iu;

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function normalizedIntent(input = {}) {
  return normalizedString(input.intent ?? input.route ?? input.type)?.toLowerCase() ?? null;
}

function booleanValue(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function walletReloginSignal(text = '') {
  const source = String(text);
  return CHINESE_RELOGIN_PATTERN.test(source) || ENGLISH_RELOGIN_PATTERN.test(source);
}

function walletReloginNegated(text = '') {
  const source = String(text);
  return /(?:不要|别|停止|取消|不用|不必|不想|不需要|无需|暂时不|先不)[^。！？?!\n]{0,24}(?:重新|再次|再)?\s*(?:登录|登陆|登入|授权|认证)/iu.test(source)
    || /\b(?:do\s+not|don't|never|stop|cancel)\b[^.?!\n]{0,40}\b(?:re-?login|log\s+in\s+again|sign\s+in\s+again|re-?authori[sz]e)\b/iu.test(source);
}

function walletReloginQuestion(text = '') {
  const source = String(text);
  return /[?？]/u.test(source)
    || /(?:怎么|如何|怎样|为什么|是否|能否|可不可以|要不要|该不该|会不会|有什么[^。！？?!\n]{0,8}(?:问题|影响|风险)|会怎样)/iu.test(source)
    || /\b(?:how\s+to|can\s+i|could\s+i|should\s+i|would\s+i|what\s+if|why)\b/iu.test(source);
}

function walletReloginHistoricalConditionalOrDiscussion(text = '') {
  const source = String(text);
  const historical =
    /(?:已经|刚才|之前|昨天|曾经)[^。！？?!\n]{0,24}(?:重新|再次|再)\s*(?:登录|登陆|登入|授权|认证)[^。！？?!\n]{0,8}(?:过|了|完成|成功)/iu.test(source)
    || /\b(?:already|previously|yesterday|just)\b[^.?!\n]{0,40}\b(?:re-?logged\s+in|logged\s+in\s+again|signed\s+in\s+again|re-?authori[sz]ed)\b/iu.test(source);
  const conditional =
    /(?:如果|假如|要是|万一)[^。！？?!\n]{0,40}(?:重新|再次|再)\s*(?:登录|登陆|登入|授权|认证)/iu.test(source)
    || /\b(?:if|when)\b[^.?!\n]{0,60}\b(?:re-?login|log\s+in\s+again|sign\s+in\s+again|re-?authori[sz]e)\b/iu.test(source);
  const discussionWord = /问题|bug|缺陷|场景|逻辑|意图|测试|验证|模拟|复现|\b(?:bug|issue|scenario|logic|intent|test|verify|simulate|reproduce)\b/iu;
  const reportedSpeech =
    /(?:用户|trae|agent|机器人)[^。！？?!\n]{0,16}(?:说|请求|要求)[^。！？?!\n]{0,20}(?:重新|再次|再)\s*(?:登录|登陆|登入|授权|认证)/iu.test(source);
  return historical || conditional || (discussionWord.test(source) && walletReloginSignal(source))
    || reportedSpeech;
}

function emailFrom(input = {}, text = '') {
  const candidates = [
    String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu)?.[0],
    input.email,
    input.walletEmail,
    input.wallet_email,
    input.currentEmail,
    input.current_email,
    input.walletStatus?.data?.email,
    input.wallet_status?.data?.email,
    input.status?.data?.email,
  ];
  for (const candidate of candidates) {
    const value = normalizedString(candidate);
    if (value && /^[^\s@]+@[^\s@]+$/u.test(value)) return value;
  }
  return null;
}

function reject(reason) {
  return {
    state: WalletIntentState.WALLET_RELOGIN_NOT_AUTHORIZED,
    route: WalletIntentRoute.NO_ACTION,
    action: WalletIntentAction.DO_NOT_START_WALLET_INIT,
    terminal: true,
    reason,
  };
}

export function classifyWalletIntent(input = {}) {
  const text = normalizedString(input.text ?? input.message ?? input.prompt) ?? '';
  const structuredIntent = normalizedIntent(input);
  const structuredRelogin = STRUCTURED_RELOGIN_INTENTS.has(structuredIntent);
  const textualRelogin = walletReloginSignal(text);
  if (!structuredRelogin && !textualRelogin) return null;

  if (walletReloginNegated(text)) return reject('wallet_relogin_negated');
  if (walletReloginQuestion(text)) return reject('wallet_relogin_question_or_advice');
  if (walletReloginHistoricalConditionalOrDiscussion(text)) {
    return reject('wallet_relogin_historical_conditional_or_discussion');
  }

  const authorizationValues = [
    input.walletReloginAuthorized,
    input.wallet_relogin_authorized,
    input.reloginAuthorized,
    input.relogin_authorized,
  ].map(booleanValue).filter((value) => value !== null);
  if (authorizationValues.some((value) => value === false)) {
    return reject('wallet_relogin_not_authorized');
  }

  const email = emailFrom(input, text);
  if (!email) {
    return {
      state: WalletIntentState.WALLET_RELOGIN_INPUT_MISSING,
      route: WalletIntentRoute.INPUT_REQUIRED,
      action: WalletIntentAction.ASK_FOR_WALLET_EMAIL,
      terminal: false,
      reason: 'wallet_relogin_email_missing',
      missing: ['email'],
    };
  }

  return {
    state: WalletIntentState.WALLET_RELOGIN_SELECTED,
    route: WalletIntentRoute.WALLET_RELOGIN,
    action: WalletIntentAction.START_FRESH_WALLET_INIT,
    terminal: false,
    reason: 'wallet_relogin_explicitly_requested',
    email,
  };
}

export function formatWalletIntentFsmMarker(workflow, marker = 'WALLET_INTENT_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
