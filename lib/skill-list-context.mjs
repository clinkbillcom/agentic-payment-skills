export const SKILL_LIST_CONTEXT_TTL_MS = 2 * 60 * 60 * 1000;

export function normalizedSkillContextString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

export function normalizedSkillIdentityString(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

export function positiveSkillNumber(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

export function skillContextTimestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSkillListRow(row = {}) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const number = positiveSkillNumber(row.Number ?? row.number);
  const publisher = normalizedSkillIdentityString(row.publisher);
  const skillName = normalizedSkillIdentityString(row.name ?? row.skillName ?? row.skill_name);
  const skillId = normalizedSkillIdentityString(row.skillId ?? row.skill_id);
  const versionValue = row.versionNo ?? row.version_no ?? row.version;
  const versionNo = normalizedSkillIdentityString(versionValue);
  if (number === null || !publisher || !skillName || !skillId) return null;
  if (versionValue !== undefined && versionValue !== null && versionValue !== '' && !versionNo) return null;
  if (versionNo && !/^[A-Za-z0-9._+-]{1,128}$/u.test(versionNo)) return null;
  return {
    number,
    publisher,
    skillName,
    skillId,
    ...(versionNo ? { versionNo } : {}),
  };
}

export function normalizeSkillListRows(rows) {
  if (!Array.isArray(rows)) return null;
  const normalized = rows.map(normalizeSkillListRow);
  if (normalized.some((row) => row === null)) return null;
  if (new Set(normalized.map((row) => row.number)).size !== normalized.length) return null;
  return normalized;
}

function markdownCell(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replace(/\r?\n/gu, ' ');
}

function skillListTableHeaders(presentation = {}) {
  const supplied = presentation.headers;
  if (supplied && typeof supplied === 'object' && !Array.isArray(supplied)) {
    const number = normalizedSkillIdentityString(supplied.number);
    const publisher = normalizedSkillIdentityString(supplied.publisher);
    const skillName = normalizedSkillIdentityString(supplied.skillName ?? supplied.skill_name);
    if (number && publisher && skillName) return { number, publisher, skillName };
  }
  const language = normalizedSkillContextString(
    presentation.language ?? presentation.displayLanguage ?? presentation.display_language,
  )?.toLowerCase();
  return language?.startsWith('zh')
    ? { number: '编号', publisher: '发布者', skillName: '技能名称' }
    : { number: 'Number', publisher: 'Publisher', skillName: 'Skill Name' };
}

export function renderSkillListTable(rows, presentation = {}) {
  const labels = skillListTableHeaders(presentation);
  const header = [
    `| ${markdownCell(labels.number)} | ${markdownCell(labels.publisher)} | ${markdownCell(labels.skillName)} |`,
    '| ---: | --- | --- |',
  ];
  const body = rows.map((row) => (
    `| ${row.number} | ${markdownCell(row.publisher)} | ${markdownCell(row.skillName)} |`
  ));
  return [...header, ...body].join('\n');
}

export function skillContextIdentity(value = {}) {
  return {
    userId: normalizedSkillContextString(value.userId ?? value.user_id),
    conversationId: normalizedSkillContextString(
      value.conversationId ?? value.conversation_id ?? value.sessionId ?? value.session_id,
    ),
    environment: normalizedSkillContextString(
      value.environmentKey ?? value.environment_key ?? value.environment,
    ),
  };
}

export function sameSkillContextIdentity(left = {}, right = {}) {
  const a = skillContextIdentity(left);
  const b = skillContextIdentity(right);
  return a.userId !== null
    && a.conversationId !== null
    && a.environment !== null
    && a.userId === b.userId
    && a.conversationId === b.conversationId
    && a.environment === b.environment;
}

function normalizedSnapshotScope(snapshot = {}) {
  const scope = normalizedSkillContextString(snapshot.scope ?? snapshot.listScope ?? snapshot.list_scope);
  return scope?.toLowerCase() ?? null;
}

export function recentDisplayedSkillListSnapshot(context = {}, options = {}) {
  const now = skillContextTimestampMs(context.now ?? context.nowMs ?? context.now_ms);
  const snapshots = context.skillListSnapshots ?? context.skill_list_snapshots;
  const allowedScopes = new Set(options.allowedScopes ?? ['tippable', 'all']);
  if (now === null || !Array.isArray(snapshots)) return null;

  const candidates = snapshots.map((snapshot) => {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
    if (!sameSkillContextIdentity(context, snapshot)) return null;
    const scope = normalizedSnapshotScope(snapshot);
    if (!allowedScopes.has(scope)) return null;
    const displayedAtMs = skillContextTimestampMs(
      snapshot.displayedAtMs ?? snapshot.displayed_at_ms ?? snapshot.displayedAt ?? snapshot.displayed_at,
    );
    if (displayedAtMs === null) return null;
    const age = now - displayedAtMs;
    if (age < 0 || age > SKILL_LIST_CONTEXT_TTL_MS) return null;
    return { ...snapshot, scope, displayedAtMs };
  }).filter(Boolean);

  const sorted = candidates.sort((left, right) => right.displayedAtMs - left.displayedAtMs);
  const newest = sorted[0];
  if (!newest || sorted[1]?.displayedAtMs === newest.displayedAtMs) return null;
  const rows = normalizeSkillListRows(newest.rows);
  return rows === null ? null : { ...newest, rows };
}

export function resolvedSkillIdentity(row = {}) {
  return {
    publisher: row.publisher,
    skillName: row.skillName,
    skillId: row.skillId,
    ...(row.versionNo ? { versionNo: row.versionNo } : {}),
  };
}
