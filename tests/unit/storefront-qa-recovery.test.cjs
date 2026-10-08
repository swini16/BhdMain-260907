const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workflowPath = path.resolve(__dirname, '../../.github/workflows/storefront-playwright-smoke.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function stepSource(name) {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `workflow step must exist: ${name}`);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next < 0 ? undefined : next);
}

const recoveryStep = stepSource('Auto-close recovered live validation issue');
const runMarker = '        run: |\n';
const recoveryScript = recoveryStep.slice(recoveryStep.indexOf(runMarker) + runMarker.length)
  .split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');

function runRecovery({ category = 'Visual regression', body, verified = '', approved = '', issue = '221' } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bhd-recovery-test-'));
  const logPath = path.join(tmp, 'calls.jsonl');
  const ghPath = path.join(tmp, 'gh');
  fs.writeFileSync(ghPath, `#!${process.execPath}\n` + `
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] !== 'issue') throw new Error('Unexpected gh call: ' + args.join(' '));
const action = args[1];
const record = { args };
if (action === 'edit') record.body = fs.readFileSync(args[args.indexOf('--body-file') + 1], 'utf8');
fs.appendFileSync(process.env.TEST_GH_LOG, JSON.stringify(record) + '\\n');
if (action === 'list') process.stdout.write(process.env.TEST_ISSUE);
else if (action === 'view') process.stdout.write(process.env.TEST_ISSUE_BODY);
else if (!['edit', 'close'].includes(action)) throw new Error('Unexpected gh issue action: ' + action);
`, { mode: 0o755 });
  try {
    const result = spawnSync('bash', ['-euo', 'pipefail', '-c', recoveryScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tmp}${path.delimiter}${process.env.PATH}`,
        GITHUB_REPOSITORY: 'example/storefront', GITHUB_RUN_ID: '12345',
        VISUAL_COMPARE_VERIFIED: verified, VISUAL_BASELINE_APPROVED: approved,
        TEST_ISSUE: issue, TEST_ISSUE_BODY: body ?? `## Current failure\n\n**Category:** ${category}  \n\nOriginal evidence is preserved.\n`,
        TEST_GH_LOG: logPath,
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const calls = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
    return { output: result.stdout, calls, writes: calls.filter(call => ['edit', 'close'].includes(call.args[1])) };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('scheduled/manual success cannot close a visual-regression issue', () => {
  const result = runRecovery();
  assert.equal(result.writes.length, 0);
  assert.match(result.output, /no passing comparison or explicit baseline approval/);
});

test('baseline bootstrap success cannot close a visual-regression issue', () => {
  assert.equal(runRecovery({ verified: '', approved: '' }).writes.length, 0);
});

test('false and arbitrary output values are not evidence of visual recovery', () => {
  for (const value of ['false', 'success', 'TRUE', '1']) {
    assert.equal(runRecovery({ verified: value, approved: value }).writes.length, 0);
  }
});

for (const evidence of [{ verified: 'true' }, { approved: 'true' }]) {
  test(`visual issue closes with ${evidence.verified ? 'passing comparison' : 'explicit baseline approval'}`, () => {
    const result = runRecovery(evidence);
    assert.deepEqual(result.writes.map(call => call.args[1]), ['edit', 'close']);
    assert.match(result.writes[0].body, /Original evidence is preserved/);
    assert.match(result.writes[0].body, /Recovered automatically/);
    assert.match(result.writes[0].body, /example\/storefront\/actions\/runs\/12345/);
    assert.ok(result.writes.every(call => call.args[2] === '221'));
  });
}

for (const category of ['Live storefront functionality / layout / accessibility', 'Visual capture pipeline', 'CI infrastructure', 'Validation pipeline']) {
  test(`${category} recovery remains available on ordinary successful validation`, () => {
    assert.equal(runRecovery({ category }).writes.length, 2);
  });
}

test('missing or unknown categories fail closed', () => {
  assert.equal(runRecovery({ body: 'Legacy issue with no category', verified: 'true' }).writes.length, 0);
  assert.equal(runRecovery({ category: 'New unrecognized category', approved: 'true' }).writes.length, 0);
});

test('no open issue does not attempt a read or mutation', () => {
  const result = runRecovery({ issue: '' });
  assert.deepEqual(result.calls.map(call => call.args[1]), ['list']);
});

test('workflow requires overall success and binds visual proof outputs', () => {
  assert.match(recoveryStep, /if: \$\{\{ success\(\) && github.event_name != 'pull_request' \}\}/);
  assert.ok(recoveryStep.includes('VISUAL_COMPARE_VERIFIED: ${{ steps.visual_compare.outputs.verified }}'));
  assert.ok(recoveryStep.includes('VISUAL_BASELINE_APPROVED: ${{ steps.visual_baseline.outputs.approved }}'));
  assert.ok(workflow.includes('run: node --test tests/unit/*.test.cjs'));
});

test('only an actual comparison sets verified, after every bootstrap return', () => {
  const compare = stepSource('Compare screenshots with last approved main run');
  const check = compare.indexOf('node scripts/visual-regression-compare.mjs');
  const proof = compare.indexOf("echo 'verified=true' >> \"$GITHUB_OUTPUT\"");
  assert.match(compare, /id: visual_compare/);
  assert.ok(check > compare.lastIndexOf('exit 0'));
  assert.ok(proof > check);
  assert.equal(compare.match(/verified=true/g).length, 1);
  assert.match(compare, /set -euo pipefail/);
});

test('baseline approval is restricted to the existing explicit push marker', () => {
  const baseline = stepSource('Record approved visual baseline');
  assert.match(baseline, /id: visual_baseline/);
  assert.ok(baseline.includes("github.event_name == 'push' && !cancelled() && contains(github.event.head_commit.message, '[approve-visual-baseline]')"));
  assert.ok(baseline.includes("echo 'approved=true' >> \"$GITHUB_OUTPUT\""));
});
