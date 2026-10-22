// Renders the canvas artboards (canvas/project/*.dc.html) to PNG files in export/.
//
//   node tools/render.mjs                 # every artboard
//   node tools/render.mjs Cover- Logo-1   # only artboards whose name starts with one of these
//
// Artboards are static markup, so the Design runtime is not needed: the <x-dc> body is
// lifted into a plain page, Google Fonts are swapped for assets/fonts and /_blob/<id>
// uploads are mapped to local files through tools/assets.json.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const projectDir = path.join(root, 'canvas/project');
const assets = JSON.parse(fs.readFileSync(path.join(root, 'tools/assets.json'), 'utf8'));
const fontsCss = pathToFileURL(path.join(root, 'assets/fonts/fonts.css')).href;

const folders = [
  ['Main', '00-profil'], ['Style', '00-profil'],
  ['Logo', '01-logotip'], ['Cover', '02-oblozhki'], ['Vazhno', '03-vazhno'], ['Ceny', '03-vazhno'],
  ['Fill', '04-nachinki'], ['Tpl', '05-zagotovki'], ['Pin', '06-zakreplennye'],
];

const filters = process.argv.slice(2);
const files = fs.readdirSync(projectDir)
  .filter((f) => f.endsWith('.dc.html'))
  .filter((f) => !filters.length || filters.some((p) => f.startsWith(p)))
  .sort();

function toPage(src) {
  const body = src.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1]
    .replace(/<\/?helmet>/g, '')
    .replace(/<link[^>]*fonts\.googleapis[^>]*>/g, `<link rel="stylesheet" href="${fontsCss}">`)
    .replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => {
      if (!assets[id]) throw new Error(`unknown asset ${id}`);
      return pathToFileURL(path.join(root, assets[id])).href;
    });
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

function size(src) {
  const props = src.match(/data-props='([^']*)'/);
  const preview = props && JSON.parse(props[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&')).$preview;
  if (!preview) throw new Error('no $preview size');
  return { width: preview.width, height: preview.height };
}

const browser = await chromium.launch();
for (const file of files) {
  const src = fs.readFileSync(path.join(projectDir, file), 'utf8');
  if (file.startsWith('Promo')) continue; // a scrolling page, not an export
  const name = file.replace('.dc.html', '');
  const folder = (folders.find(([p]) => name.startsWith(p)) || [, 'other'])[1];
  const outDir = path.join(root, 'export', folder);
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = path.join(projectDir, `.${name}.render.html`);
  fs.writeFileSync(tmp, toPage(src));
  const viewport = size(src);
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), clip: { x: 0, y: 0, ...viewport } });
  await page.close();
  fs.unlinkSync(tmp);
  console.log(`${folder}/${name}.png  ${viewport.width}×${viewport.height}`);
}
await browser.close();
