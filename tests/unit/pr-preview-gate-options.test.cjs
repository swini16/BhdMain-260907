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
  const smokeWorkflow = read('.github/workflows/storefront-playwright-smoke.yml');

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
  assert.match(workflow, /--grep 'Lemonade authorized hosted development preview'/);
  assert.match(smokeWorkflow, /--grep-invert 'Lemonade authorized hosted development preview'/);
});

test('disabled US market is positively checked without skipping Canadian acceptance', () => {
  const spec = read('tests/playwright/pr-preview-gate.spec.cjs');
  assert.match(spec, /country: 'US'.*disabled: true/);
  assert.match(spec, /disabled US selection stays in Canada/);
  assert.match(spec, /disabled US product redirects to Canadian product/);
  assert.match(spec, /51937870741788.*toHaveCount\(0\)/);
  assert.match(spec, /evidence\.hostedSelection = await assertPreviewPage\(localize, true, hostedOrigin\)/);
  assert.doesNotMatch(spec, /test\.skip\(.*US/);
});
