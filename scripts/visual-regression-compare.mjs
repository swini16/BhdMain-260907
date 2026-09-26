import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

const baselineDir = process.argv[2] || 'visual-baseline';
const currentDir = process.argv[3] || 'visual-current';
const diffDir = process.argv[4] || 'visual-diff';

const PIXELMATCH_THRESHOLD = Number(process.env.VISUAL_PIXEL_THRESHOLD || '0.12');
const MAX_DIFF_RATIO = Number(process.env.VISUAL_MAX_DIFF_RATIO || '0.015');
const MAX_DIMENSION_DRIFT_RATIO = Number(process.env.VISUAL_MAX_DIMENSION_DRIFT_RATIO || '0.02');

fs.mkdirSync(diffDir, { recursive: true });

const listImages = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => /^visual-.*\.jpg$/i.test(name)).sort()
    : [];

const baselineNames = listImages(baselineDir);
const currentNames = listImages(currentDir);
const common = currentNames.filter((name) => baselineNames.includes(name));

if (!baselineNames.length) {
  console.log('No visual baseline images found. Skipping screenshot diff for this run.');
  process.exit(0);
}
if (!currentNames.length) {
  throw new Error('No current visual screenshots found.');
}
if (!common.length) {
  throw new Error(
    `No matching visual screenshots. Baseline: ${baselineNames.join(', ')} Current: ${currentNames.join(', ')}`
  );
}

const results = [];
let failed = false;

for (const name of common) {
  const baselinePath = path.join(baselineDir, name);
  const currentPath = path.join(currentDir, name);

  const [baselineMeta, currentMeta] = await Promise.all([
    sharp(baselinePath).metadata(),
    sharp(currentPath).metadata(),
  ]);

  const bw = baselineMeta.width || 0;
  const bh = baselineMeta.height || 0;
  const cw = currentMeta.width || 0;
  const ch = currentMeta.height || 0;

  const widthDrift = Math.abs(cw - bw) / Math.max(1, bw);
  const heightDrift = Math.abs(ch - bh) / Math.max(1, bh);
  const dimensionDrift = Math.max(widthDrift, heightDrift);

  const width = Math.max(bw, cw);
  const height = Math.max(bh, ch);

  const normalize = (file, sourceW, sourceH) =>
    sharp(file)
      .flatten({ background: '#ffffff' })
      .extend({
        top: 0,
        left: 0,
        right: Math.max(0, width - sourceW),
        bottom: Math.max(0, height - sourceH),
        background: '#ffffff',
      })
      .ensureAlpha()
      .raw()
      .toBuffer();

  const [baselineRaw, currentRaw] = await Promise.all([
    normalize(baselinePath, bw, bh),
    normalize(currentPath, cw, ch),
  ]);

  const diffRaw = Buffer.alloc(width * height * 4);
  const diffPixels = pixelmatch(
    baselineRaw,
    currentRaw,
    diffRaw,
    width,
    height,
    {
      threshold: PIXELMATCH_THRESHOLD,
      includeAA: false,
      alpha: 0.55,
      diffColor: [255, 0, 0],
      aaColor: [255, 255, 0],
    }
  );

  const diffRatio = diffPixels / Math.max(1, width * height);
  const imageFailed =
    diffRatio > MAX_DIFF_RATIO ||
    dimensionDrift > MAX_DIMENSION_DRIFT_RATIO;

  if (imageFailed) {
    failed = true;
    await sharp(diffRaw, { raw: { width, height, channels: 4 } })
      .jpeg({ quality: 78 })
      .toFile(path.join(diffDir, name.replace(/\.jpg$/i, '-diff.jpg')));
  }

  results.push({
    image: name,
    baseline: { width: bw, height: bh },
    current: { width: cw, height: ch },
    diffPixels,
    diffRatio: Number(diffRatio.toFixed(6)),
    dimensionDriftRatio: Number(dimensionDrift.toFixed(6)),
    status: imageFailed ? 'FAIL' : 'PASS',
  });
}

const summary = {
  thresholds: {
    pixelmatch: PIXELMATCH_THRESHOLD,
    maxDiffRatio: MAX_DIFF_RATIO,
    maxDimensionDriftRatio: MAX_DIMENSION_DRIFT_RATIO,
  },
  compared: common.length,
  missingFromBaseline: currentNames.filter((name) => !baselineNames.includes(name)),
  missingFromCurrent: baselineNames.filter((name) => !currentNames.includes(name)),
  results,
};

fs.writeFileSync(
  path.join(diffDir, 'visual-regression-summary.json'),
  JSON.stringify(summary, null, 2)
);

for (const result of results) {
  console.log(
    `${result.status} ${result.image}: diff=${(result.diffRatio * 100).toFixed(3)}% dimensionDrift=${(result.dimensionDriftRatio * 100).toFixed(3)}%`
  );
}

if (failed) {
  console.error(
    `Visual regression threshold exceeded. Review ${diffDir}/visual-regression-summary.json and generated diff images.`
  );
  process.exit(1);
}
