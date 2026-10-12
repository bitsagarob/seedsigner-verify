// Draw hw/waveshare-front.svg and hw/waveshare-back.svg: a vector drawing of the
// Waveshare 1.3inch LCD HAT, made from Waveshare's own product photos.
//
// Waveshare publishes no board layout and no open-licence photo of this board.
// So this is a redrawing: each photo is flattened onto the 65 x 30.2 mm board
// using its four mounting holes, the FLAT features (copper outlines, white print,
// the soldered screen ribbon, pads) are traced to vectors with potrace, and the
// TALL parts (screen, joystick, buttons, header, the five small parts) are drawn
// to measured size, because on a photo taken at a slant they lean.
//
//   Front: https://www.waveshare.com/media/catalog/product/1/_/1.3inch-lcd-hat-1.jpg
//   Back:  https://www.waveshare.com/media/catalog/product/1/_/1.3inch-lcd-hat-2.jpg
//
//   mkdir /tmp/wst && cd /tmp/wst && npm i potrace@2 jimp@0.22
//   NODE_PATH=/tmp/wst/node_modules node tools/trace-waveshare.mjs
// Needs ffmpeg and curl.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Jimp = require('jimp');
const { Potrace } = require('potrace');

const W = 65, H = 30.2, PX = 40;
const HOLES = [[3.5, 3.5], [61.5, 3.5], [3.5, 26.7], [61.5, 26.7]];
const SRC = {
  front: { url: 'https://www.waveshare.com/media/catalog/product/1/_/1.3inch-lcd-hat-1.jpg',
           // hole centres picked by hand (px): 836,369  271,577  718,189  166,383
           quad: '887.2:385.0:251.7:620.6:732.6:151.7:116.1:366.9' },
  back:  { url: 'https://www.waveshare.com/media/catalog/product/1/_/1.3inch-lcd-hat-2.jpg',
           // hole centres picked by hand (px): 171,415  694,176  300,620  830,362
           quad: '118.6:400.3:703.7:135.4:285.9:668.8:881.2:376.2' },
};
const C = { board: '#1153bd', gap: '#04205e', white: '#f4f6fb', orange: '#d88f22', silver: '#cfd4dc',
            ring: '#e8ecf1', hole: '#0b0f14', black: '#141418' };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wst-'));
function flatten(side) {
  const src = path.join(tmp, `${side}.jpg`), out = path.join(tmp, `${side}.png`);
  execFileSync('curl', ['-sfL', '-A', 'Mozilla/5.0', '-o', src, SRC[side].url]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf',
    `perspective=${SRC[side].quad}:sense=source:interpolation=cubic,scale=${W * PX}:${Math.round(H * PX)}:flags=lanczos`, out]);
  return out;
}

async function trace(img, pred, turd) {
  const { width: w, height: h, data } = img.bitmap;
  const m = new Jimp(w, h, 0xffffffff), md = m.bitmap.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (pred(data[i], data[i + 1], data[i + 2], x / PX, y / PX)) md[i] = md[i + 1] = md[i + 2] = 0;
  }
  const p = new Potrace({ turdSize: turd, alphaMax: 1, optTolerance: 0.4, threshold: 128 });
  await new Promise((ok, no) => m.getBuffer(Jimp.MIME_PNG, (e, buf) => e ? no(e) : p.loadImage(buf, (e2) => e2 ? no(e2) : ok())));
  return p.getPathTag().match(/ d="([^"]*)"/)[1];
}
const traced = (d, fill, extra = '') => d ? `<path transform="scale(${1 / PX})" fill="${fill}" fill-rule="evenodd" ${extra} d="${d}"/>` : '';
const inHole = (x, y) => HOLES.some(([a, b]) => Math.hypot(x - a, y - b) < 3.3);
const nearEdge = (x, y) => {
  if (x < 0.8 || x > W - 0.8 || y < 0.8 || y > H - 0.8) return true;
  const cx = Math.min(Math.max(x, 3), W - 3), cy = Math.min(Math.max(y, 3), H - 3);
  return Math.hypot(x - cx, y - cy) > 2.2; // the rounded corners: photo background, not board
};
const isGap = (r, g, b) => r < 45 && g < 66 && b > 78 && b < 132 && b - r > 60;
const isWhite = (r, g, b) => r > 170 && g > 170 && b > 170;
const r2 = (v) => Math.round(v * 100) / 100;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}" ${extra}/>`;

function frame(inner) {
  const holes = HOLES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${C.ring}"/><circle cx="${x}" cy="${y}" r="1.45" fill="${C.hole}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">\n`
    + `<rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="${C.board}"/>\n${inner.join('\n')}\n${holes.join('\n')}\n</svg>\n`;
}

// A 0603/0805 part seen from above: body plus two silver ends.
function chip(x, y, w, h, body, label) {
  const e = 0.42;
  return [rect(x, y, w, h, C.silver), rect(x + e, y, w - 2 * e, h, body),
    label ? `<text x="${r2(x + w / 2)}" y="${r2(y + h / 2 + 0.2)}" font-size="0.55" fill="#ffffff" text-anchor="middle">${label}</text>` : '',
    rect(x - 0.2, y - 0.18, w + 0.4, h + 0.36, 'none', `stroke="${C.white}" stroke-width="0.1"`)].join('');
}

async function back() {
  const img = await Jimp.read(flatten('back'));
  const blur = img.clone().blur(10), bd = blur.bitmap.data, bw = img.bitmap.width;
  const local = (x, y) => bd[(Math.round(y * PX) * bw + Math.round(x * PX)) * 4 + 2];
  const inSmd = (x, y) => x > 32.4 && x < 37.6 && y > 7.0 && y < 17.9;
  const inText = (x, y) => x > 37.8 && x < 61 && y > 9.4 && y < 17;
  const inFpc = (x, y) => x > 17.8 && x < 27.6 && y > 3.8 && y < 18;
  const top = 23.2; // below this the tall header and its shadow take over
  const gap = await trace(img, (r, g, b, x, y) => y < top && !inHole(x, y) && !inText(x, y) && !inFpc(x, y) && !inSmd(x, y)
    && (y < 21.2 ? isGap(r, g, b) : (r < 60 && b > 60 && b - r > 50 && b < local(x, y) - 18)), 6);
  const white = await trace(img, (r, g, b, x, y) => y < top && !inHole(x, y) && !nearEdge(x, y) && !inSmd(x, y) && isWhite(r, g, b), 4);
  const orange = await trace(img, (r, g, b, x, y) => y < top && r > 120 && g > 60 && g < 200 && b < 110 && r - b > 70, 30);
  const silver = await trace(img, (r, g, b, x, y) => y < top && x > 23 && x < 32.4 && !inHole(x, y)
    && r > 100 && g > 100 && b > 100 && Math.abs(r - b) < 50 && !(r > 200 && g > 200 && b > 200), 4);

  const smd = [
    chip(34.4, 7.5, 2.2, 1.05, '#b98257'),            // C1, 100 nF
    chip(34.4, 9.25, 2.2, 1.1, C.black, '100'),       // R1, 10 ohm
    rect(32.75, 11.95, 1.2, 0.5, C.silver), rect(35.7, 11.15, 1.2, 0.5, C.silver), rect(35.7, 13.0, 1.2, 0.5, C.silver),
    rect(33.95, 10.95, 1.8, 2.8, C.black, 'rx="0.12"'),  // Q1, S8050 in SOT-23
    rect(33.7, 10.75, 2.3, 3.2, 'none', `stroke="${C.white}" stroke-width="0.1"`),
    chip(34.4, 14.55, 2.2, 1.1, C.black, '103'),      // R2, 10k
    chip(34.4, 16.2, 2.2, 1.1, C.black, '102'),       // R3, 1k
  ];
  const header = [rect(7.1, 24.16, 50.8, 5.08, '#1d1f23', `rx="0.4" stroke="#2c2f34" stroke-width="0.15"`)];
  for (let i = 0; i < 20; i++) for (const y of [25.43, 27.97]) header.push(rect(8.37 + 2.54 * i - 0.5, y - 0.5, 1, 1, '#050507'));
  fs.writeFileSync(new URL('../hw/waveshare-back.svg', import.meta.url), frame([
    traced(gap, C.gap, `stroke="${C.gap}" stroke-width="1.6"`),
    rect(15.6, 2.6, 1.4, 19.4, C.hole, 'rx="0.7"'),
    traced(orange, C.orange), traced(silver, C.silver), ...smd, traced(white, C.white), ...header,
  ]));
}

async function front() {
  const img = await Jimp.read(flatten('front'));
  const inScreen = (x, y) => x > 16.8 && x < 48 && y > 1.2 && y < 29.9;
  // The joystick leans on the photo and glints, so its whole area, printed arrows
  // included, is drawn instead of traced. Arrow tips measured on the flattened photo.
  const inJoy = (x, y) => Math.abs(x - 7.0) < 6.6 && y > 8.3 && y < 22.7;
  const keys = [9.1, 15.0, 20.9];
  const inKey = (x, y) => x > 50.8 && x < 62.4 && keys.some((c) => y > c - 1.95 && y < c + 2.7);
  const white = await trace(img, (r, g, b, x, y) => !inHole(x, y) && !nearEdge(x, y) && !inScreen(x, y) && !inJoy(x, y) && !inKey(x, y) && isWhite(r, g, b), 4);

  // The few traces the screen does not cover, drawn along the photo.
  const tr = (d) => `<path d="${d}" fill="none" stroke="${C.gap}" stroke-width="0.62" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="#1a62d4" stroke-width="0.38" stroke-linecap="round"/>`;
  const via = (x, y) => `<circle cx="${x}" cy="${y}" r="0.42" fill="${C.gap}"/><circle cx="${x}" cy="${y}" r="0.2" fill="${C.hole}"/>`;
  const traces = [
    tr('M 9.6 10.6 C 10.5 9.3 13.8 9.1 15.0 10.5 L 16.2 12.7'), via(16.2, 13.2),
    tr('M 11.4 12.2 C 12.6 11.8 14.4 12.3 14.9 13.7 L 15.0 18.6 C 15.0 20.6 12.4 21.2 10.9 22.5'), via(10.8, 22.8),
    tr('M 51.6 9.1 C 50.9 9.1 50.6 9.8 50.6 10.8 L 50.6 26.6 C 50.6 27.6 49.9 28.1 48.0 28.1'),
    tr('M 51.6 15.0 C 51.4 15.0 51.3 15.4 51.3 16.0 L 51.3 27.3 C 51.3 28.3 50.5 28.8 48.0 28.8'),
    tr('M 51.6 20.9 C 52.0 20.9 52.0 21.3 52.0 21.9 L 52.0 28.0 C 52.0 29.0 51.2 29.5 48.0 29.5'),
  ];
  const screen = [
    rect(17.6, 2.0, 29.9, 25.8, '#d9dde3', 'rx="0.3"'),
    rect(17.75, 2.15, 25.65, 25.5, '#0b0c10'),
    rect(18.9, 3.2, 23.4, 23.4, '#050608', `stroke="#1d212a" stroke-width="0.12"`),
    rect(43.4, 2.15, 2.9, 25.5, '#15171c'), rect(44.2, 6.0, 0.4, 18.0, '#7d828a'),
    rect(46.3, 2.6, 1.25, 24.6, C.orange, 'rx="0.3"'),
  ];
  const jx = 7.0, jy = 15.5;
  const joy = [
    ...[[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]].map(([dx, dy]) => rect(jx + dx - 0.75, jy + dy - 0.75, 1.5, 1.5, C.silver)),
    rect(jx - 3.5, jy - 3.5, 7, 7, '#c3c8cf', `rx="0.8" stroke="#8f959e" stroke-width="0.12"`),
    `<circle cx="${jx}" cy="${jy}" r="2.5" fill="#dfe3e8" stroke="#9aa0a8" stroke-width="0.1"/>`,
    rect(jx - 0.9, jy - 0.9, 1.8, 1.8, '#222428', 'rx="0.25"'),
    ...[[0, -6.0], [0, 6.0], [-5.9, 0], [5.75, 0]].map(([dx, dy]) => {
      const x = jx + dx, y = jy + dy, a = 0.85, l = 1.05; // half width, length
      const pts = dy ? (dy < 0 ? [[x, y - l / 2], [x - a, y + l / 2], [x + a, y + l / 2]] : [[x, y + l / 2], [x - a, y - l / 2], [x + a, y - l / 2]])
                     : (dx < 0 ? [[x - l / 2, y], [x + l / 2, y - a], [x + l / 2, y + a]] : [[x + l / 2, y], [x - l / 2, y - a], [x - l / 2, y + a]]);
      return `<polygon points="${pts.map((p) => p.map(r2).join(',')).join(' ')}" fill="${C.white}"/>`;
    }),
  ];
  const btn = keys.flatMap((c) => [
    rect(51.4, c - 0.45, 2.0, 0.9, C.silver, 'rx="0.2"'), rect(59.8, c - 0.45, 2.0, 0.9, C.silver, 'rx="0.2"'),
    rect(53.4, c - 1.75, 6.4, 3.5, '#c9ced6', `rx="0.25" stroke="#8f959e" stroke-width="0.12"`),
    rect(54.9, c - 0.9, 3.4, 1.8, '#f3f4f6', `rx="0.2" stroke="#b7bcc4" stroke-width="0.08"`),
  ]);
  fs.writeFileSync(new URL('../hw/waveshare-front.svg', import.meta.url), frame([
    ...traces, rect(48, 2.6, 1.4, 19.4, C.hole, 'rx="0.7"'), traced(white, C.white), ...joy, ...btn, ...screen,
  ]));
}

await back();
await front();
fs.rmSync(tmp, { recursive: true });
console.log('wrote hw/waveshare-front.svg and hw/waveshare-back.svg');
