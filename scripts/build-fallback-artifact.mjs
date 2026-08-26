#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import {
  mkdir,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ARCHIVE_FILE = 'agentic-payment-skill.zip';
export const MANIFEST_FILE = 'agentic-payment-skill.manifest.json';
export const PACKAGE_ROOT = 'agentic-payment-skills';
export const SOURCE_REPOSITORY =
  'https://github.com/clinkbillcom/agentic-payment-skills';
export const PRUNED_DIRECTORIES = Object.freeze(['docs', 'tests']);
export const RESERVED_ROOT_FILES = Object.freeze([
  '.clink-install.json',
  '.clink-provenance.json',
]);

const RESERVED_INSTALLER_SEGMENTS = Object.freeze(
  RESERVED_ROOT_FILES.map((name) => canonicalInstallerName(name)),
);

const CONTENT_HASH_DOMAIN = Buffer.from('clink-skill-tree-v1\0', 'utf8');
const NUL = Buffer.from([0]);
const REQUIRED_ROOT_FILES = Object.freeze([
  'README.md',
  'README.zh.md',
  'SKILL.md',
  'package.json',
]);
const REQUIRED_ROOT_DIRECTORIES = Object.freeze([
  'bin',
  'lib',
  'references',
  'scripts',
  'vendor',
]);
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_ENTRIES = 4_096;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_DEPTH = 20;
const crc32Table = buildCrc32Table();

/**
 * Collect the exact runtime payload. Repository-only docs and tests are pruned,
 * while release/install marker names remain reserved for the installer.
 */
export async function collectArtifactEntries(repositoryRoot, revision = 'HEAD') {
  const root = resolve(repositoryRoot);
  const treeEntries = readGitTree(root, revision);
  const files = [];
  const directories = new Set();
  for (const entry of treeEntries) {
    const rootName = entry.path.split('/', 1)[0];
    if (PRUNED_DIRECTORIES.includes(rootName)) {
      continue;
    }
    if (findReservedInstallerPath(entry.path) !== undefined) {
      throw new Error(`reserved installer file must not exist in source: ${entry.path}`);
    }
    if (entry.type !== 'blob' || (entry.mode !== '100644' && entry.mode !== '100755')) {
      throw new Error(`unsupported Git tree entry in artifact: ${entry.path}`);
    }
    const segments = entry.path.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join('/'));
    }
    files.push({
      path: entry.path,
      executable: entry.mode === '100755',
      data: gitBytes(root, ['cat-file', 'blob', entry.objectId]),
    });
  }

  const filePaths = new Set(files.map(({ path }) => path));
  for (const rootFile of REQUIRED_ROOT_FILES) {
    if (!filePaths.has(rootFile)) {
      throw new Error(`required artifact file is missing from HEAD: ${rootFile}`);
    }
  }
  for (const rootDirectory of REQUIRED_ROOT_DIRECTORIES) {
    if (!directories.has(rootDirectory)) {
      throw new Error(`required artifact directory is missing from HEAD: ${rootDirectory}`);
    }
  }

  files.sort(compareEntryPaths);
  const sortedDirectories = [...directories].sort(compareUtf8Strings);
  validateConsumerArchiveContract(files, sortedDirectories);
  return { files, directories: sortedDirectories };
}

/**
 * Tree hash shared with Clink CLI.
 *
 * SHA-256 over:
 *   clink-skill-tree-v1\0
 *   path\0exec-bit\0byte-size\0file-bytes\0  (for each sorted regular file)
 */
export function computeContentSha256(files) {
  const normalized = files
    .filter(({ path }) => !RESERVED_ROOT_FILES.includes(path))
    .map((entry) => normalizeContentEntry(entry))
    .sort(compareEntryPaths);
  const seen = new Set();
  const hash = createHash('sha256');
  hash.update(CONTENT_HASH_DOMAIN);

  for (const entry of normalized) {
    if (seen.has(entry.path)) {
      throw new Error(`duplicate artifact path: ${entry.path}`);
    }
    seen.add(entry.path);
    hash.update(entry.path, 'utf8');
    hash.update(NUL);
    hash.update(entry.executable ? '1' : '0', 'ascii');
    hash.update(NUL);
    hash.update(String(entry.data.byteLength), 'ascii');
    hash.update(NUL);
    hash.update(entry.data);
    hash.update(NUL);
  }

  return hash.digest('hex');
}

/**
 * Write a deterministic, dependency-free ZIP using the STORE method. Sorting,
 * timestamps, Unix modes, and UTF-8 names are normalized by this function.
 */
export function createDeterministicZip({ files, directories, timestamp }) {
  const zipTimestamp = normalizeTimestamp(timestamp);
  const { dosDate, dosTime } = toDosDateTime(zipTimestamp);
  const zipEntries = createZipEntries(files, directories);
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  if (zipEntries.length > MAX_UINT16) {
    throw new Error('artifact has too many ZIP entries');
  }

  for (const entry of zipEntries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = entry.directory ? Buffer.alloc(0) : entry.data;
    const checksum = crc32(data);
    assertZipField(name.byteLength, MAX_UINT16, `ZIP path length for ${entry.name}`);
    assertZipField(data.byteLength, MAX_UINT32, `ZIP file size for ${entry.name}`);
    assertZipField(localOffset, MAX_UINT32, 'ZIP local header offset');

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(ZIP_STORE_METHOD, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.byteLength, 18);
    localHeader.writeUInt32LE(data.byteLength, 22);
    localHeader.writeUInt16LE(name.byteLength, 26);
    localHeader.writeUInt16LE(0, 28);

    const unixMode = entry.directory
      ? 0o040755
      : entry.executable
        ? 0o100755
        : 0o100644;
    const externalAttributes = (
      ((unixMode << 16) >>> 0) | (entry.directory ? 0x10 : 0)
    ) >>> 0;
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x031e, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(ZIP_STORE_METHOD, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.byteLength, 20);
    centralHeader.writeUInt32LE(data.byteLength, 24);
    centralHeader.writeUInt16LE(name.byteLength, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(externalAttributes, 38);
    centralHeader.writeUInt32LE(localOffset, 42);

    localParts.push(localHeader, name, data);
    centralParts.push(centralHeader, name);
    localOffset += localHeader.byteLength + name.byteLength + data.byteLength;
  }

  const centralDirectory = Buffer.concat(centralParts);
  assertZipField(localOffset, MAX_UINT32, 'ZIP central directory offset');
  assertZipField(centralDirectory.byteLength, MAX_UINT32, 'ZIP central directory size');

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(zipEntries.length, 8);
  endOfCentralDirectory.writeUInt16LE(zipEntries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.byteLength, 12);
  endOfCentralDirectory.writeUInt32LE(localOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

export async function buildFallbackArtifact({
  repositoryRoot,
  outputDirectory,
  sourceCommit,
  timestamp,
}) {
  const root = resolve(repositoryRoot);
  const output = resolve(outputDirectory);
  const normalizedCommit = normalizeSourceCommit(sourceCommit);
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const { files, directories } = await collectArtifactEntries(root, normalizedCommit);
  const { skillVersion } = readSkillIdentity(files);
  const contentSha256 = computeContentSha256(files);
  const archive = createDeterministicZip({
    files,
    directories,
    timestamp: normalizedTimestamp,
  });
  if (archive.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error('fallback ZIP exceeds the Clink CLI download limit');
  }
  const archiveSha256 = createHash('sha256').update(archive).digest('hex');
  const manifest = {
    schemaVersion: 1,
    name: PACKAGE_ROOT,
    skillVersion,
    sourceRepository: SOURCE_REPOSITORY,
    sourceCommit: normalizedCommit,
    archiveFile: ARCHIVE_FILE,
    archiveSha256,
    archiveSizeBytes: archive.byteLength,
    contentSha256,
    generatedAt: normalizedTimestamp.toISOString(),
    prunedDirectories: [...PRUNED_DIRECTORIES],
  };

  await mkdir(output, { recursive: true });
  const archivePath = join(output, ARCHIVE_FILE);
  const manifestPath = join(output, MANIFEST_FILE);
  await writeFile(archivePath, archive, { mode: 0o644 });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o644,
  });

  return { archivePath, manifestPath, manifest };
}

function normalizeContentEntry(entry) {
  assertSafeRelativePath(entry.path);
  if (!Buffer.isBuffer(entry.data)) {
    throw new Error(`artifact entry data must be a Buffer: ${entry.path}`);
  }
  return {
    path: entry.path,
    executable: entry.executable === true,
    data: entry.data,
  };
}

function validateConsumerArchiveContract(files, directories) {
  const entryCount = 1 + files.length + directories.length;
  if (entryCount > MAX_ENTRIES) {
    throw new Error('artifact exceeds the Clink CLI entry limit');
  }

  const canonicalPaths = new Map();
  for (const directory of directories) {
    assertNoReservedInstallerPath(directory);
    registerCanonicalPath(canonicalPaths, directory, 'directory');
  }

  let totalBytes = 0;
  for (const file of files) {
    const depth = file.path.split('/').length + 1;
    if (depth > MAX_ARCHIVE_DEPTH) {
      throw new Error(`artifact path exceeds the Clink CLI depth limit: ${file.path}`);
    }
    assertNoReservedInstallerPath(file.path);
    if (file.data.byteLength > MAX_FILE_BYTES) {
      throw new Error(`artifact file exceeds the Clink CLI size limit: ${file.path}`);
    }
    totalBytes += file.data.byteLength;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('artifact exceeds the Clink CLI expanded-size limit');
    }
    registerCanonicalPath(canonicalPaths, file.path, 'file');
  }
}

function assertNoReservedInstallerPath(path) {
  const reservedName = findReservedInstallerPath(path);
  if (reservedName !== undefined) {
    throw new Error(`artifact contains reserved installer metadata (${reservedName}): ${path}`);
  }
}

function findReservedInstallerPath(path) {
  return path
    .split('/')
    .map(canonicalInstallerName)
    .find((segment) => RESERVED_INSTALLER_SEGMENTS.includes(segment));
}

function canonicalInstallerName(value) {
  return value.normalize('NFC').toLowerCase();
}

function registerCanonicalPath(paths, path, kind) {
  const canonical = path.normalize('NFC').toLowerCase();
  const previous = paths.get(canonical);
  if (previous !== undefined) {
    throw new Error(
      `artifact path collides after Clink CLI normalization: ${previous.path} and ${path}`,
    );
  }
  paths.set(canonical, { path, kind });
}

function createZipEntries(files, directories) {
  const entries = [{
    name: `${PACKAGE_ROOT}/`,
    data: Buffer.alloc(0),
    directory: true,
    executable: true,
  }];
  for (const path of directories) {
    assertSafeRelativePath(path);
    entries.push({
      name: `${PACKAGE_ROOT}/${path}/`,
      data: Buffer.alloc(0),
      directory: true,
      executable: true,
    });
  }
  for (const rawEntry of files) {
    const entry = normalizeContentEntry(rawEntry);
    entries.push({
      name: `${PACKAGE_ROOT}/${entry.path}`,
      data: entry.data,
      directory: false,
      executable: entry.executable,
    });
  }
  entries.sort((left, right) => compareUtf8Strings(left.name, right.name));
  return entries;
}

function readSkillIdentity(files) {
  const byPath = new Map(files.map((entry) => [entry.path, entry.data]));
  const packageBytes = byPath.get('package.json');
  const skillBytes = byPath.get('SKILL.md');
  if (!packageBytes || !skillBytes) {
    throw new Error('Skill identity files are missing from the artifact');
  }
  const packageJson = JSON.parse(packageBytes.toString('utf8'));
  const skillDocument = skillBytes.toString('utf8');
  const frontmatter = extractSkillFrontmatter(skillDocument);
  const declaredVersion = readSkillMetadataVersion(frontmatter);
  if (packageJson.name !== 'clink-payment-skill') {
    throw new Error('package.json name must be clink-payment-skill');
  }
  if (!isSemanticVersion(packageJson.version)) {
    throw new Error('package.json version must be a semantic version');
  }
  if (!isSemanticVersion(declaredVersion)) {
    throw new Error('SKILL.md metadata.version must be a semantic version');
  }
  if (declaredVersion !== packageJson.version) {
    throw new Error(
      `Skill version mismatch: package.json=${packageJson.version}, SKILL.md=${declaredVersion}`,
    );
  }
  if (!/^name:\s*["']?clink-payment-skill["']?\s*$/mu.test(frontmatter)) {
    throw new Error('SKILL.md name must be clink-payment-skill');
  }
  const requiredExecutablePaths = [
    'bin/clink',
    'vendor/clink-cli/clink-cli.bundle.mjs',
  ];
  for (const path of requiredExecutablePaths) {
    const file = files.find((entry) => entry.path === path);
    if (!file?.executable) {
      throw new Error(`required artifact executable is missing: ${path}`);
    }
  }
  if (!files.some((entry) => entry.path === 'scripts/network-preflight.mjs')) {
    throw new Error('required network preflight script is missing');
  }
  return { skillVersion: packageJson.version };
}

function extractSkillFrontmatter(skillDocument) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(skillDocument);
  if (!match) {
    throw new Error('SKILL.md YAML frontmatter is missing');
  }
  return match[1];
}

function readSkillMetadataVersion(frontmatter) {
  // Parse an intentionally small YAML subset: plain-key block mappings with
  // single-line scalar values. Reject flow collections, block scalars, and
  // indentation constructs whose semantic nesting cannot be inferred safely.
  const lines = frontmatter.split(/\r?\n/u);
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^metadata[ \t]*:(.*)$/u.exec(lines[index]);
    if (!match) {
      continue;
    }
    if (!isEmptyOrYamlComment(match[1])) {
      throw new Error('SKILL.md metadata must be a YAML mapping block');
    }
    let end = index + 1;
    while (end < lines.length) {
      const line = lines[end];
      const trimmed = line.trimStart();
      if (
        trimmed.length > 0
        && !trimmed.startsWith('#')
        && line.length === trimmed.length
      ) {
        break;
      }
      end += 1;
    }
    blocks.push(lines.slice(index + 1, end));
    index = end - 1;
  }

  if (blocks.length === 0) {
    throw new Error('SKILL.md metadata.version is missing');
  }
  if (blocks.length !== 1) {
    throw new Error('SKILL.md metadata.version must be declared exactly once');
  }

  let directEntryCanContainMapping = false;
  const versionScalars = [];
  for (const line of blocks[0]) {
    const trimmed = line.trimStart();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const entry = /^( {2}| {4})([A-Za-z][A-Za-z0-9_-]*) *:(.*)$/u.exec(line);
    if (!entry) {
      throw new Error('SKILL.md metadata must be a YAML block mapping subset');
    }
    const scalar = readSimpleYamlScalar(entry[3]);
    if (entry[1].length === 2) {
      directEntryCanContainMapping = !scalar.hasValue;
      if (entry[2] === 'version') {
        versionScalars.push(scalar.value);
      }
    } else if (!directEntryCanContainMapping) {
      throw new Error('SKILL.md metadata must be a YAML block mapping subset');
    }
  }

  if (versionScalars.length === 0) {
    throw new Error('SKILL.md metadata.version is missing');
  }
  if (versionScalars.length !== 1) {
    throw new Error('SKILL.md metadata.version must be declared exactly once');
  }
  if (versionScalars[0] === null) {
    throw new Error('SKILL.md metadata.version is missing');
  }
  return versionScalars[0];
}

function readSimpleYamlScalar(rawValue) {
  const value = rawValue.trimStart();
  if (value.length === 0 || value.startsWith('#')) {
    return { hasValue: false, value: null };
  }

  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const closingQuote = value.indexOf(quote, 1);
    if (closingQuote < 0) {
      throw new Error('SKILL.md metadata must use single-line YAML scalars');
    }
    const suffix = value.slice(closingQuote + 1);
    if (!/^(?:[ \t]*|[ \t]+#[^\r\n]*)$/u.test(suffix)) {
      throw new Error('SKILL.md metadata must use single-line YAML scalars');
    }
    return { hasValue: true, value: value.slice(1, closingQuote) };
  }

  const commentOffset = value.search(/[ \t]+#/u);
  const scalar = (commentOffset < 0 ? value : value.slice(0, commentOffset)).trimEnd();
  if (
    scalar.length === 0
    || /^[|>]/u.test(scalar)
    || /^[&*!]/u.test(scalar)
    || /[\[\]{}"']/u.test(scalar)
  ) {
    throw new Error('SKILL.md metadata must be a YAML block mapping subset');
  }
  return { hasValue: true, value: scalar };
}

function isEmptyOrYamlComment(value) {
  const trimmed = value.trimStart();
  return trimmed.length === 0 || trimmed.startsWith('#');
}

function isSemanticVersion(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    return false;
  }
  const plusIndex = value.indexOf('+');
  if (plusIndex !== -1 && plusIndex !== value.lastIndexOf('+')) {
    return false;
  }
  const versionWithoutBuild = plusIndex === -1 ? value : value.slice(0, plusIndex);
  if (
    plusIndex !== -1
    && !isDotSeparatedSemanticVersionIdentifiers(value.slice(plusIndex + 1), false)
  ) {
    return false;
  }

  const dashIndex = versionWithoutBuild.indexOf('-');
  const core = dashIndex === -1
    ? versionWithoutBuild
    : versionWithoutBuild.slice(0, dashIndex);
  const coreParts = core.split('.');
  if (
    coreParts.length !== 3
    || coreParts.some((part) => !/^(?:0|[1-9][0-9]*)$/u.test(part))
  ) {
    return false;
  }
  if (dashIndex === -1) {
    return true;
  }
  return isDotSeparatedSemanticVersionIdentifiers(
    versionWithoutBuild.slice(dashIndex + 1),
    true,
  );
}

function isDotSeparatedSemanticVersionIdentifiers(value, prerelease) {
  if (value.length === 0) {
    return false;
  }
  return value.split('.').every((identifier) => (
    /^[0-9A-Za-z-]+$/u.test(identifier)
    && !(
      prerelease
      && /^[0-9]+$/u.test(identifier)
      && identifier.length > 1
      && identifier.startsWith('0')
    )
  ));
}

function normalizeSourceCommit(value) {
  const commit = String(value ?? '').trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/u.test(commit)) {
    throw new Error('sourceCommit must be a 40-character Git object ID');
  }
  return commit;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('artifact timestamp must be a valid date');
  }
  const year = date.getUTCFullYear();
  if (year < 1980 || year > 2107) {
    throw new Error('artifact timestamp must be within the ZIP date range (1980-2107)');
  }
  date.setUTCMilliseconds(0);
  return date;
}

function assertSafeRelativePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.split('/').some((part) => part.length === 0 || part === '.' || part === '..')
  ) {
    throw new Error(`unsafe artifact path: ${String(value)}`);
  }
}

function compareEntryPaths(left, right) {
  return compareUtf8Strings(left.path, right.path);
}

function compareUtf8Strings(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function toDosDateTime(date) {
  const dosTime = (
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    Math.floor(date.getUTCSeconds() / 2)
  );
  const dosDate = (
    ((date.getUTCFullYear() - 1980) << 9) |
    ((date.getUTCMonth() + 1) << 5) |
    date.getUTCDate()
  );
  return { dosDate, dosTime };
}

function assertZipField(value, maximum, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${name} exceeds the non-ZIP64 limit`);
  }
}

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? (value >>> 1) ^ 0xedb88320
        : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function crc32(data) {
  let checksum = 0xffffffff;
  for (const byte of data) {
    checksum = (checksum >>> 8) ^ crc32Table[(checksum ^ byte) & 0xff];
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

function git(repositoryRoot, args) {
  return execFileSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function gitBytes(repositoryRoot, args) {
  return execFileSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

function readGitTree(repositoryRoot, revision) {
  const output = gitBytes(repositoryRoot, [
    'ls-tree',
    '-r',
    '-z',
    '--full-tree',
    revision,
  ]);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries = [];
  let offset = 0;
  while (offset < output.byteLength) {
    const end = output.indexOf(0, offset);
    if (end < 0) {
      throw new Error('Git tree output is not NUL terminated');
    }
    const record = decoder.decode(output.subarray(offset, end));
    const match = /^(\d{6}) (blob|commit|tree) ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/u.exec(record);
    if (!match) {
      throw new Error('Git tree contains an unsupported record');
    }
    const path = match[4];
    assertSafeRelativePath(path);
    entries.push({
      mode: match[1],
      type: match[2],
      objectId: match[3],
      path,
    });
    offset = end + 1;
  }
  return entries;
}

function resolveSourceTimestamp(repositoryRoot) {
  const configured = process.env.SOURCE_DATE_EPOCH;
  if (configured !== undefined) {
    if (!/^(?:0|[1-9]\d*)$/u.test(configured)) {
      throw new Error('SOURCE_DATE_EPOCH must be a non-negative integer');
    }
    return new Date(Number(configured) * 1000);
  }
  const commitEpoch = git(repositoryRoot, ['show', '-s', '--format=%ct', 'HEAD']);
  return new Date(Number(commitEpoch) * 1000);
}

function parseArguments(argv, repositoryRoot) {
  let outputDirectory = join(repositoryRoot, 'dist');
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--output-dir') {
      const value = argv[index + 1];
      if (!value) throw new Error('--output-dir requires a path');
      outputDirectory = resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      return { help: true, outputDirectory };
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return { help: false, outputDirectory };
}

async function runCli() {
  const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
  const args = parseArguments(process.argv.slice(2), repositoryRoot);
  if (args.help) {
    process.stdout.write(
      'Usage: node scripts/build-fallback-artifact.mjs [--output-dir <path>]\n',
    );
    return;
  }

  const dirty = git(repositoryRoot, ['status', '--porcelain', '--untracked-files=all']);
  if (dirty.length > 0) {
    throw new Error(
      'refusing to publish provenance from a dirty worktree; commit or stash changes first',
    );
  }
  const sourceCommit = git(repositoryRoot, ['rev-parse', 'HEAD']);
  const result = await buildFallbackArtifact({
    repositoryRoot,
    outputDirectory: args.outputDirectory,
    sourceCommit,
    timestamp: resolveSourceTimestamp(repositoryRoot),
  });
  process.stdout.write(`${JSON.stringify({
    archivePath: result.archivePath,
    manifestPath: result.manifestPath,
    manifest: result.manifest,
  }, null, 2)}\n`);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(realpathSync(resolve(process.argv[1]))).href
  : null;
if (invokedPath === import.meta.url) {
  runCli().catch((error) => {
    process.stderr.write(`Failed to build fallback artifact: ${error.message}\n`);
    process.exitCode = 1;
  });
}
