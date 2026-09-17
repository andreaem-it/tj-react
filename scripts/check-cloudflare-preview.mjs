import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync('wrangler.preview.jsonc', 'utf8'));
const expected = JSON.parse(fs.readFileSync('package.json', 'utf8')).name === 'techjournal-admin' ? 'tj-admin-preview' : 'tj-web-preview';
if (config.name !== expected || config.routes?.length || config.env || config.workers_dev !== true || config.vars?.CLOUDFLARE_PREVIEW !== '1') {
  throw new Error('Preview deployment requires an isolated Worker with no production routes or environment overrides.');
}
if (!config.r2_buckets?.every(b => b.bucket_name === `${expected}-cache`) || !config.services?.every(s => s.service === expected)) {
  throw new Error('Preview cache and service bindings must point only to preview resources.');
}
const manifest = JSON.parse(fs.readFileSync('.next/routes-manifest.json', 'utf8'));
if (!manifest.headers?.some(rule => rule.source === '/:path*' && rule.headers.some(h => h.key.toLowerCase() === 'x-robots-tag' && h.value.includes('noindex')))) {
  throw new Error('Build was not created with preview noindex headers. Run npm run cf:build first.');
}
if (!fs.existsSync('.open-next/worker.js')) throw new Error('Missing Cloudflare bundle. Run npm run cf:build first.');
console.log(`Preview guard passed: ${expected}, isolated bindings, no domain routes, noindex enabled.`);
