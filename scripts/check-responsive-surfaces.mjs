import fs from 'node:fs';

const errors = [];

function read(path) {
  if (!fs.existsSync(path)) {
    errors.push(`${path}: required file missing`);
    return '';
  }
  return fs.readFileSync(path, 'utf8');
}

const config = read('playwright.config.cjs');
const heroV3 = read('sections/bhd-hero.liquid');
const heroV4 = read('sections/bhd-hero-v4.liquid');
const robotic = read('tests/playwright/robotic-validation.spec.cjs');

const projectNames = [...config.matchAll(/name:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
for (const required of ['desktop-chromium', 'mobile-chromium']) {
  if (!projectNames.includes(required)) errors.push(`Playwright missing required ${required} project.`);
}
if (projectNames.some((name) => /tablet/i.test(name))) {
  errors.push('Playwright must not define a tablet project.');
}

if (/bhd-hero-v3__tablet|tablet hydration solutions/i.test(heroV3)) {
  errors.push('Legacy hero still contains a separate tablet design surface.');
}
if (/max-width:\s*1199px\)\s*and\s*\(min-width:\s*750px/i.test(heroV3)) {
  errors.push('Legacy hero still contains the old tablet-only breakpoint.');
}
if (/max-width:\s*899px\)\s*and\s*\(min-width:\s*750px/i.test(heroV4)) {
  errors.push('Current hero still contains the tablet-only breakpoint.');
}
if (/project\.name\.includes\(['"]tablet['"]\)/i.test(robotic)) {
  errors.push('Robotic QA still has a tablet-only branch.');
}

if (errors.length) {
  console.error('Two-surface responsive policy failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Responsive policy PASS: desktop + mobile only; intermediate widths inherit one of those two layouts.');
