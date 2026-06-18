/**
 * agents.test.cjs — Validation tests for AGENTS.md
 * Run with: node src/tests/agents.test.cjs
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const agentsPath = path.join(__dirname, '..', '..', 'AGENTS.md');

// ── Test 1: AGENTS.md exists ──
assert.ok(fs.existsSync(agentsPath), 'AGENTS.md must exist');
console.log('✓ Test 1: AGENTS.md exists');

const content = fs.readFileSync(agentsPath, 'utf-8');

// ── Test 2: Deployment URL documented ──
assert.ok(
  content.includes('https://france-stats.org/'),
  'AGENTS.md must contain the deployment URL (https://france-stats.org/)'
);
console.log('✓ Test 2: Deployment URL present');

// ── Test 3: GitHub Pages documented ──
assert.ok(
  content.includes('GitHub Pages'),
  'AGENTS.md must mention GitHub Pages'
);
console.log('✓ Test 3: GitHub Pages mentioned');

// ── Test 4: Deployment row mentions gh-pages branch ──
assert.ok(
  content.includes('gh-pages'),
  'AGENTS.md deployment row must reference gh-pages branch'
);
console.log('✓ Test 4: gh-pages branch referenced');

console.log('\n🎉 All AGENTS.md tests passed!');
