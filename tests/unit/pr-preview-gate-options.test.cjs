'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('authorized preview security options remain parse-safe and fail closed', () => {
  const spec = read('tests/playwright/pr-preview-gate.spec.cjs');
  const workflow = read('.github/workflows/shopify-pr-preview-gate.yml');

  assert.doesNotMatch(
    spec,
    /test\.use\(\{\s*trace:\s*'off',\s*video:\s*'off'\s*\}\)/,
    'worker-scoped trace/video options cannot be nested inside test.describe'
  );
  assert.match(
    spec,
    /Authorized storefront acceptance requires only --reporter=line with trace and video off\./
  );
  assert.match(
    workflow,
    /--reporter=line --trace=off --output=test-results-lemonade-authorized/
  );
});
