import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ARCHIVE_FILE,
  MANIFEST_FILE,
  PACKAGE_ROOT,
  PRUNED_DIRECTORIES,
  RESERVED_ROOT_FILES,
  SOURCE_REPOSITORY,
  buildFallbackArtifact,
  collectArtifactEntries,
  computeContentSha256,
} from '../scripts/build-fallback-artifact.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const fixedCommit = gitFixture(repositoryRoot, ['rev-parse', 'HEAD']).trim();
const fixedTimestamp = new Date('2026-08-26T01:02:03.000Z');

test('contentSha256 follows the shared clink-skill-tree-v1 contract', () => {
  const entries = [
    { path: 'z.txt', executable: false, data: Buffer.from('last') },
    { path: 'bin/run', executable: true, data: Buffer.from('#!/bin/sh\n') },
    { path: 'lib/é.mjs', executable: false, data: Buffer.from('export {};\n') },
    {
      path: '.clink-install.json',
      executable: false,
      data: Buffer.from('installer-owned'),
    },
    {
      path: '.clink-provenance.json',
      executable: false,
      data: Buffer.from('installer-owned'),
    },
  ];
  const payloadEntries = entries
    .filter(({ path }) => !RESERVED_ROOT_FILES.includes(path))
    .sort((left, right) => Buffer.compare(
      Buffer.from(left.path, 'utf8'),
      Buffer.from(right.path, 'utf8'),
    ));
  const expected = createHash('sha256');
  expected.update(Buffer.from('clink-skill-tree-v1\0', 'utf8'));
  for (const entry of payloadEntries) {
    expected.update(entry.path, 'utf8');
    expected.update(Buffer.from([0]));
    expected.update(entry.executable ? '1' : '0', 'ascii');
    expected.update(Buffer.from([0]));
    expected.update(String(entry.data.byteLength), 'ascii');
    expected.update(Buffer.from([0]));
    expected.update(entry.data);
    expected.update(Buffer.from([0]));
  }

  assert.equal(computeContentSha256(entries), expected.digest('hex'));
  assert.notEqual(
    computeContentSha256(payloadEntries),
    computeContentSha256(payloadEntries.map((entry) => (
      entry.path === 'bin/run' ? { ...entry, executable: false } : entry
    ))),
  );
});

test('fallback ZIP and manifest are deterministic and contain only runtime payload', async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'clink-skill-artifact-test-'));
  t.after(async () => {
    await rm(temporaryRoot, { recursive: true, force: true });
  });
  const firstOutput = join(temporaryRoot, 'first');
  const secondOutput = join(temporaryRoot, 'second');

  const first = await buildFallbackArtifact({
    repositoryRoot,
    outputDirectory: firstOutput,
    sourceCommit: fixedCommit,
    timestamp: fixedTimestamp,
  });
  const second = await buildFallbackArtifact({
    repositoryRoot,
    outputDirectory: secondOutput,
    sourceCommit: fixedCommit,
    timestamp: fixedTimestamp,
  });
  const firstArchive = await readFile(first.archivePath);
  const secondArchive = await readFile(second.archivePath);
  const firstManifestBytes = await readFile(first.manifestPath);
  const secondManifestBytes = await readFile(second.manifestPath);
  const manifest = JSON.parse(firstManifestBytes.toString('utf8'));

  assert.deepEqual(firstArchive, secondArchive);
  assert.deepEqual(firstManifestBytes, secondManifestBytes);
  assert.equal(first.archivePath, join(firstOutput, ARCHIVE_FILE));
  assert.equal(first.manifestPath, join(firstOutput, MANIFEST_FILE));
  assert.deepEqual(manifest, {
    schemaVersion: 1,
    name: PACKAGE_ROOT,
    skillVersion: JSON.parse(await readFile(join(repositoryRoot, 'package.json'))).version,
    sourceRepository: SOURCE_REPOSITORY,
    sourceCommit: fixedCommit,
    archiveFile: ARCHIVE_FILE,
    archiveSha256: createHash('sha256').update(firstArchive).digest('hex'),
    archiveSizeBytes: firstArchive.byteLength,
    contentSha256: manifest.contentSha256,
    generatedAt: fixedTimestamp.toISOString(),
    prunedDirectories: [...PRUNED_DIRECTORIES],
  });
  assert.match(manifest.contentSha256, /^[a-f0-9]{64}$/u);
  assert.equal(firstManifestBytes.at(-1), 0x0a);

  const zipEntries = parseStoredZip(firstArchive);
  const rootPrefix = `${PACKAGE_ROOT}/`;
  assert.ok(zipEntries.has(rootPrefix));
  assert.ok([...zipEntries.keys()].every((name) => name.startsWith(rootPrefix)));
  assert.ok(zipEntries.has(`${rootPrefix}SKILL.md`));
  assert.ok(zipEntries.has(`${rootPrefix}package.json`));
  assert.ok(zipEntries.has(`${rootPrefix}README.md`));
  assert.ok(zipEntries.has(`${rootPrefix}README.zh.md`));
  for (const directory of ['bin', 'lib', 'references', 'scripts', 'vendor']) {
    assert.ok(zipEntries.has(`${rootPrefix}${directory}/`));
  }
  assert.ok(
    [...zipEntries.keys()].every((name) => !name.startsWith(`${rootPrefix}docs/`)),
  );
  assert.ok(
    [...zipEntries.keys()].every((name) => !name.startsWith(`${rootPrefix}tests/`)),
  );
  assert.deepEqual(
    zipEntries.get(`${rootPrefix}.gitignore`).data,
    gitFixture(repositoryRoot, ['show', 'HEAD:.gitignore'], 'buffer'),
  );
  for (const reservedName of RESERVED_ROOT_FILES) {
    assert.ok(!zipEntries.has(`${rootPrefix}${reservedName}`));
  }

  const archivedSkill = zipEntries.get(`${rootPrefix}SKILL.md`);
  assert.deepEqual(archivedSkill.data, await readFile(join(repositoryRoot, 'SKILL.md')));
  assert.equal(zipEntries.get(`${rootPrefix}bin/clink`).mode & 0o111, 0o111);
  assert.equal(archivedSkill.mode & 0o111, 0);

  const contentEntries = [...zipEntries]
    .filter(([name, entry]) => !entry.directory && name.startsWith(rootPrefix))
    .map(([name, entry]) => ({
      path: name.slice(rootPrefix.length),
      executable: (entry.mode & 0o111) !== 0,
      data: entry.data,
    }));
  assert.equal(computeContentSha256(contentEntries), manifest.contentSha256);

  const expectedTrackedFiles = gitFixture(repositoryRoot, [
    'ls-tree',
    '-r',
    '--name-only',
    '-z',
    'HEAD',
  ], 'buffer')
    .subarray(0, -1)
    .toString('utf8')
    .split('\0')
    .filter((path) => !PRUNED_DIRECTORIES.some(
      (directory) => path === directory || path.startsWith(`${directory}/`),
    ))
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const archivedFiles = contentEntries
    .map(({ path }) => path)
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  assert.deepEqual(archivedFiles, expectedTrackedFiles);
});

test('artifact collection rejects symlinks and installer-owned provenance', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'clink-skill-artifact-safety-'));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(join(root, 'README.md'), '# fixture\n');
  await writeFile(join(root, 'README.zh.md'), '# fixture\n');
  await writeFile(join(root, 'package.json'), '{"version":"1.0.0"}\n');
  await writeFile(
    join(root, 'SKILL.md'),
    '---\nname: fixture\nmetadata:\n  version: "1.0.0"\n---\n',
  );
  for (const directory of ['bin', 'lib', 'references', 'scripts', 'vendor']) {
    await mkdir(join(root, directory), { recursive: true });
    await writeFile(join(root, directory, 'fixture.txt'), `${directory}\n`);
  }
  await writeFile(join(root, 'bin', 'clink'), '#!/bin/sh\n');
  await symlink('../SKILL.md', join(root, 'lib', 'linked-skill'));
  gitFixture(root, ['init', '--quiet']);
  gitFixture(root, ['add', '--all', '--force']);
  commitFixture(root, 'unsafe symlink');

  await assert.rejects(
    collectArtifactEntries(root),
    /unsupported Git tree entry/u,
  );
  await rm(join(root, 'lib', 'linked-skill'));
  await writeFile(join(root, '.clink-provenance.json'), '{}\n');
  gitFixture(root, ['add', '--all', '--force']);
  commitFixture(root, 'reserved provenance');
  await assert.rejects(
    collectArtifactEntries(root),
    /reserved installer file must not exist/u,
  );
});

function commitFixture(root, message) {
  gitFixture(root, [
    '-c',
    'user.name=Clink Artifact Test',
    '-c',
    'user.email=artifact-test@invalid.example',
    'commit',
    '--quiet',
    '--message',
    message,
  ]);
}

function gitFixture(root, args, encoding = 'utf8') {
  return execFileSync('git', ['-C', root, ...args], {
    encoding,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseStoredZip(buffer) {
  const endOffset = buffer.byteLength - 22;
  assert.equal(buffer.readUInt32LE(endOffset), 0x06054b50);
  assert.equal(buffer.readUInt16LE(endOffset + 20), 0);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let centralOffset = buffer.readUInt32LE(endOffset + 16);
  const result = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(buffer.readUInt32LE(centralOffset), 0x02014b50);
    assert.equal(buffer.readUInt16LE(centralOffset + 10), 0);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const externalAttributes = buffer.readUInt32LE(centralOffset + 38);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.subarray(
      centralOffset + 46,
      centralOffset + 46 + nameLength,
    ).toString('utf8');

    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50);
    assert.equal(buffer.readUInt16LE(localOffset + 8), 0);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataOffset, dataOffset + compressedSize);
    assert.equal(data.byteLength, uncompressedSize);
    result.set(name, {
      data,
      directory: name.endsWith('/'),
      mode: externalAttributes >>> 16,
    });
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  assert.equal(centralOffset, endOffset);
  return result;
}
