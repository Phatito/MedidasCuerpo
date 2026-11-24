#!/usr/bin/env node
/*
 * Renderiza los recursos de marca de Mesura con Playwright (Chromium) + ffmpeg.
 *
 *   node marketing/render-promo.cjs            # todo: íconos, póster, og-image y los dos videos
 *   node marketing/render-promo.cjs icons      # solo íconos PNG (public/)
 *   node marketing/render-promo.cjs stills     # póster + og-image
 *   node marketing/render-promo.cjs video      # solo videos
 *   node marketing/render-promo.cjs preview 3.2 7 12   # cuadros sueltos en marketing/.preview/
 *
 * Requisitos: paquete `playwright` con Chromium instalado y ffmpeg en el PATH.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const MK = __dirname;
const HTML = pathToFileURL(path.join(MK, 'promo.html')).href;
const FPS = 30;

async function openPromo(browser, f, extra = '') {
  const size = { v: [1080, 1920], h: [1920, 1080], og: [1200, 630] }[f];
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  await page.goto(`${HTML}?f=${f}&render=1${extra}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  return page;
}

async function icons(browser) {
  const svg = fs.readFileSync(path.join(PUB, 'logo.svg'), 'utf8');
  const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  // Fondo a sangre completa (apto para "maskable"); la marca ocupa el 64 % central,
  // dentro de la zona segura (círculo del 80 %).
  const tile = (n) => `<body style="margin:0"><div style="width:${n}px;height:${n}px;display:grid;place-items:center;
    background:linear-gradient(160deg,#24345a,#141c33)">
    <img src="${uri}" style="width:${Math.round(n * 0.64)}px;height:${Math.round(n * 0.64)}px"></div></body>`;
  for (const [n, file] of [[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png']]) {
    const page = await browser.newPage({ viewport: { width: n, height: n } });
    await page.setContent(tile(n));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(PUB, file), omitBackground: false });
    await page.close();
    console.log('✓', file);
  }
}

async function stills(browser) {
  const og = await openPromo(browser, 'og');
  await og.screenshot({ path: path.join(PUB, 'og-image.png') });
  await og.close();
  console.log('✓ og-image.png');
  const p = await openPromo(browser, 'v');
  await p.evaluate(() => window.seek(window.DURATION - 0.5));
  await p.screenshot({ path: path.join(MK, 'promo-poster.png') });
  await p.close();
  console.log('✓ promo-poster.png');
}

async function video(browser, f, out) {
  const page = await openPromo(browser, f);
  const dur = await page.evaluate(() => window.DURATION);
  const frames = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`  ${path.basename(out)} ${i}/${frames}\r`);
  }
  ff.stdin.end();
  await done;
  await page.close();
  console.log('✓', path.relative(ROOT, out), '                ');
}

(async () => {
  const [mode = 'all', ...args] = process.argv.slice(2);
  const browser = await chromium.launch();
  try {
    if (mode === 'preview') {
      const dir = path.join(MK, '.preview'); fs.mkdirSync(dir, { recursive: true });
      for (const f of ['v', 'h']) {
        const p = await openPromo(browser, f);
        for (const t of args) { await p.evaluate(x => window.seek(x), +t); await p.screenshot({ path: path.join(dir, `${f}-${t}.png`) }); }
        await p.close();
      }
      console.log('preview →', dir);
    }
    if (mode === 'all' || mode === 'icons') await icons(browser);
    if (mode === 'all' || mode === 'stills') await stills(browser);
    if (mode === 'all' || mode === 'video') {
      await video(browser, 'v', path.join(MK, 'promo-vertical.mp4'));
      await video(browser, 'h', path.join(MK, 'promo-horizontal.mp4'));
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
