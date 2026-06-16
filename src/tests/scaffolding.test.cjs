/**
 * scaffolding.test.cjs — Tests for content scaffolding scripts.
 * Run with: node --test src/tests/scaffolding.test.cjs
 *
 * These tests validate that:
 * 1. Both scripts (new-event.sh, new-era.sh) exist and are executable
 * 2. Running them produces correct output files
 * 3. Error handling works (missing args, existing target, missing template)
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const EVENTS_DIR = path.join(ROOT, 'src', 'content', 'events');
const ERAS_DIR = path.join(ROOT, 'src', 'content', 'eras');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

// ── Helper: run a script and return { stdout, stderr, status } ──
function runScript(script, args = [], opts = {}) {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  const cmd = `bash "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, EDITOR: 'true' }, // fake EDITOR to avoid interactive open
      ...opts,
    });
    return { stdout: stdout || '', stderr: '', status: 0 };
  } catch (e) {
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      status: e.status,
    };
  }
}

// ── Cleanup helper ──
const createdFiles = [];
function cleanup(filePath) {
  createdFiles.push(filePath);
}

// Cleanup after all tests
process.on('exit', () => {
  for (const f of createdFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
});

// ── Test 1: Scripts exist and are executable ──
(function testScriptsExist() {
  for (const script of ['new-event.sh', 'new-era.sh']) {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    assert.ok(fs.existsSync(scriptPath), `${script} must exist`);
    const mode = fs.statSync(scriptPath).mode;
    const isExec = (mode & fs.constants.S_IXUSR) !== 0;
    assert.ok(isExec, `${script} must be executable`);
  }
  console.log('✓ Test 1: Both scripts exist and are executable');
})();

// ── Test 2: Templates exist with required fields ──
(function testTemplatesValid() {
  // 2a: event-template.md
  const evTmpl = path.join(TEMPLATES_DIR, 'event-template.md');
  assert.ok(fs.existsSync(evTmpl), 'templates/event-template.md must exist');
  const evContent = fs.readFileSync(evTmpl, 'utf-8');
  assert.ok(/^id:\s*$/m.test(evContent), 'event-template must have blank id');
  assert.ok(/^title:\s*$/m.test(evContent), 'event-template must have blank title');
  assert.ok(/^start:\s*$/m.test(evContent), 'event-template must have blank start');
  assert.ok(/^end:\s*$/m.test(evContent), 'event-template must have blank end');
  assert.ok(/^description:\s*$/m.test(evContent), 'event-template must have blank description');
  assert.ok(/^mediaId:\s*$/m.test(evContent), 'event-template must have blank mediaId');

  // 2b: era-template.md
  const erTmpl = path.join(TEMPLATES_DIR, 'era-template.md');
  assert.ok(fs.existsSync(erTmpl), 'templates/era-template.md must exist');
  const erContent = fs.readFileSync(erTmpl, 'utf-8');
  assert.ok(/^id:\s*$/m.test(erContent), 'era-template must have blank id');
  assert.ok(/^title:\s*$/m.test(erContent), 'era-template must have blank title');
  assert.ok(/^color:\s*$/m.test(erContent), 'era-template must have blank color');
  assert.ok(/^start:\s*$/m.test(erContent), 'era-template must have blank start');
  assert.ok(/^end:\s*$/m.test(erContent), 'era-template must have blank end');
  assert.ok(/^description:\s*$/m.test(erContent), 'era-template must have blank description');

  // 2c: event-example.md must NOT have sourceId
  const evExample = path.join(TEMPLATES_DIR, 'event-example.md');
  const evExContent = fs.readFileSync(evExample, 'utf-8');
  assert.ok(!/^sourceId:/m.test(evExContent),
    'event-example.md must not have sourceId (field was removed from schema)');

  console.log('✓ Test 2: Template files have correct structure');
})();

// ── Test 3: new-event.sh creates a valid event file ──
(function testNewEventCreatesFile() {
  const id = 'test-scaffolding-event';
  const targetFile = path.join(EVENTS_DIR, `${id}.md`);

  // Ensure clean state
  if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);

  const result = runScript('new-event.sh', [id]);

  assert.equal(result.status, 0, `new-event.sh should exit 0, got ${result.status}`);
  assert.ok(fs.existsSync(targetFile), `Target file ${targetFile} must be created`);
  cleanup(targetFile);

  const content = fs.readFileSync(targetFile, 'utf-8');
  assert.ok(content.includes(`id: "${id}"`), `id field must be prefilled with "${id}"`);
  assert.ok(/^title:\s*$/m.test(content), 'title should remain blank');

  // start and end should remain blank (no year arg)
  assert.ok(/^start:\s*$/m.test(content), 'start should remain blank without year arg');
  assert.ok(/^end:\s*$/m.test(content), 'end should remain blank without year arg');

  console.log(`✓ Test 3: new-event.sh creates file with id: "${id}" and blank start/end`);
})();

// ── Test 4: new-event.sh with year prefills start/end ──
(function testNewEventWithYear() {
  const id = 'test-scaffolding-event-year';
  const year = 1515;
  const targetFile = path.join(EVENTS_DIR, `${id}.md`);

  if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);

  const result = runScript('new-event.sh', [id, String(year)]);

  assert.equal(result.status, 0, `new-event.sh with year should exit 0`);
  assert.ok(fs.existsSync(targetFile), `Target file must exist`);
  cleanup(targetFile);

  const content = fs.readFileSync(targetFile, 'utf-8');
  assert.ok(content.includes(`id: "${id}"`), `id field must be prefilled`);
  assert.ok(content.includes(`start: ${year}`), `start must be ${year}`);
  assert.ok(content.includes(`end: ${year}`), `end must be ${year}`);

  console.log(`✓ Test 4: new-event.sh with year ${year} prefills start/end`);
})();

// ── Test 5: new-era.sh creates a valid era file ──
(function testNewEraCreatesFile() {
  const id = 'test-scaffolding-era';
  const start = 1814;
  const end = 1848;
  const targetFile = path.join(ERAS_DIR, `${id}.md`);

  if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);

  const result = runScript('new-era.sh', [id, String(start), String(end)]);

  assert.equal(result.status, 0, `new-era.sh should exit 0, got ${result.status}`);
  assert.ok(fs.existsSync(targetFile), `Target file ${targetFile} must be created`);
  cleanup(targetFile);

  const content = fs.readFileSync(targetFile, 'utf-8');
  assert.ok(content.includes(`id: "${id}"`), `id field must be prefilled with "${id}"`);
  assert.ok(content.includes(`start: ${start}`), `start must be ${start}`);
  assert.ok(content.includes(`end: ${end}`), `end must be ${end}`);
  assert.ok(/^title:\s*$/m.test(content), 'title should remain blank');
  assert.ok(/^color:\s*$/m.test(content), 'color should remain blank');
  assert.ok(/^description:\s*$/m.test(content), 'description should remain blank');

  console.log(`✓ Test 5: new-era.sh creates file with id, start, end prefilled`);
})();

// ── Test 6: Error when target already exists ──
(function testErrorTargetExists() {
  const id = 'test-scaffolding-duplicate';
  const targetFile = path.join(EVENTS_DIR, `${id}.md`);
  cleanup(targetFile);

  // Create the target file first
  fs.writeFileSync(targetFile, '---\nid: placeholder\n---\n', 'utf-8');

  const result = runScript('new-event.sh', [id]);
  assert.notEqual(result.status, 0, 'Should exit non-zero when target exists');
  assert.ok(result.stderr.includes('already exists'),
    'Error message should mention "already exists"');

  // Clean up manually (process.on exit handler will also try)
  try { fs.unlinkSync(targetFile); } catch { /* ignore */ }

  console.log('✓ Test 6: Script errors when target already exists');
})();

// ── Test 7: Error when no id argument ──
(function testErrorNoId() {
  const result = runScript('new-event.sh', []);
  assert.notEqual(result.status, 0, 'Should exit non-zero when no id provided');
  assert.ok(result.stderr.includes('Usage:'),
    'Error message should show usage');
  console.log('✓ Test 7: Script errors when no id argument provided');
})();

// ── Test 8: Error when era missing arguments ──
(function testErrorEraMissingArgs() {
  const result = runScript('new-era.sh', ['just-id']);
  assert.notEqual(result.status, 0, 'Should exit non-zero when missing years');
  assert.ok(result.stderr.includes('Usage:'),
    'Error message should show usage');
  console.log('✓ Test 8: new-era.sh errors when missing year arguments');
})();

// ── Test 9: event-example.md has valid structure ──
(function testEventExampleNoSourceId() {
  const evExample = path.join(TEMPLATES_DIR, 'event-example.md');
  const content = fs.readFileSync(evExample, 'utf-8');
  assert.ok(/^mediaId:\s/m.test(content), 'event-example.md should have mediaId');
  assert.ok(!/^sourceId:\s/m.test(content),
    'event-example.md should NOT have sourceId (removed from event schema)');
  console.log('✓ Test 9: event-example.md has mediaId, no sourceId');
})();

console.log('\n🎉 All scaffolding tests passed!');
