// Renders the canvas artboards (iron-prince/canvas/project/*.dc.html) to PNG files in iron-prince/export/.
//
//   node iron-prince/tools/render.mjs                 # every artboard
//   node iron-prince/tools/render.mjs Cover- Logo-1   # only artboards whose name starts with one of these
//
// Artboards are static markup, so the Design runtime is not needed: the <x-dc> body is
// lifted into a plain page, Google Fonts are swapped for assets/fonts and /_blob/<id>
// uploads are mapped to local files through tools/assets.json (if there is one).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const projectDir = path.join(root, 'canvas/project');
const assetsFile = path.join(root, 'tools/assets.json');
const assets = fs.existsSync(assetsFile) ? JSON.parse(fs.readFileSync(assetsFile, 'utf8')) : {};
const fontsCss = pathToFileURL(path.join(root, 'assets/fonts/fonts.css')).href;

const folders = [
  ['Main', '00-profil'], ['Style', '00-profil'], ['Avatar', '01-avatar'],
  ['Cover', '02-oblozhki'], ['Story', '03-istorii'], ['Post', '04-posty'],
  ['V1-', '05-varianty/1-kollazh'], ['V2-', '05-varianty/2-kontrast'], ['V3-', '05-varianty/3-zhurnal'],
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
