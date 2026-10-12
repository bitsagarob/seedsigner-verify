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
//   Front: Waveshare's Amazon listing (B07FJQ4F2C), 1700 px, nearly straight on
//          https://m.media-amazon.com/images/I/71HjVG+JhkL.jpg
//   Back:  https://www.waveshare.com/media/catalog/product/1/_/1.3inch-lcd-hat-2.jpg
//          No straight-on photo of the back exists online; this one is at a slant.
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
  front: { url: 'https://m.media-amazon.com/images/I/71HjVG+JhkL.jpg',
           // hole centres picked by hand (px): 100.3,331  1200,328.3  97.7,783.7  1201.7,771.3
           quad: '32.8:263.1:1264.6:261.7:29.1:853.2:1267.1:837.6' },
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
const inHole = (x, y) => HOLES.some(([a, b]) => Math.hypot(x - a, y - b) < 3.6);
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
  const inScreen = (x, y) => (x > 17.4 && x < 47.8 && y < 29.4) || (x > 47.6 && x < 49.8 && y > 2.0 && y < 22.6);
  const inJoy = (x, y) => Math.abs(x - 7.0) < 6.6 && y > 8.3 && y < 22.3;
  const keys = [9.2, 15.1, 21.0];
  const inKey = (x, y) => x > 51.2 && x < 62.6 && keys.some((c) => y > c - 1.9 && y < c + 1.9);
  // Only the white print is traced here. The copper on this side shows as faint
  // one-sided highlights, so the few traces are drawn along the photo instead.
  const white = await trace(img, (r, g, b, x, y) => !inHole(x, y) && !nearEdge(x, y) && !inScreen(x, y) && !inJoy(x, y) && !inKey(x, y) && isWhite(r, g, b), 4);

  const tr = (d) => `<path d="${d}" fill="none" stroke="${C.gap}" stroke-width="0.62" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="#1a62d4" stroke-width="0.38" stroke-linecap="round"/>`;
  const via = (x, y) => `<circle cx="${x}" cy="${y}" r="0.4" fill="${C.gap}"/><circle cx="${x}" cy="${y}" r="0.18" fill="${C.hole}"/>`;
  const traces = [
    tr('M 9.4 10.9 L 10.5 9.9 C 11.0 9.7 13.2 9.7 14.0 9.8 C 15.0 9.9 16.0 10.6 16.2 12.0'), via(16.3, 12.8),
    tr('M 10.9 12.0 C 11.5 11.7 12.4 11.7 12.9 11.8 C 14.0 12.0 14.8 12.8 14.8 14.2 L 14.8 20.2 C 14.8 21.2 13.6 22.2 11.4 22.3'), via(10.8, 22.3),
    tr('M 9.3 28.4 C 9.8 27.3 10.8 26.7 12.0 26.6 L 17.6 26.4'), via(9.0, 28.7),
    tr('M 12.0 29.0 C 12.5 28.3 13.2 27.9 14.0 27.8 L 17.6 27.7'), via(11.8, 29.2),
    tr('M 51.7 9.2 C 51.0 9.2 50.6 9.8 50.6 10.6 L 50.6 24.8 C 50.6 25.9 49.7 26.3 47.6 26.3'),
    tr('M 51.7 15.1 C 51.3 15.1 51.1 15.5 51.1 16.0 L 51.1 25.2 C 51.1 26.4 50.1 26.9 47.6 26.9'),
    tr('M 51.7 21.0 C 51.6 21.0 51.6 21.3 51.6 21.7 L 51.6 25.6 C 51.6 27.0 50.5 27.5 47.6 27.5'),
    ...[[8.1, 2.6], [12.8, 4.3], [16.0, 2.6], [10.8, 7.3], [1.3, 9.3], [52.5, 1.6], [54.7, 2.8], [63.4, 12.6]].map(([x, y]) => via(x, y)),
  ];
  const screen = [
    rect(17.75, 1.9, 29.65, 27.1, '#e3e6ea', 'rx="0.3"'),
    rect(18.25, 2.5, 26.75, 26.0, '#0b0c10'),
    rect(20.2, 3.9, 23.4, 23.4, '#050608', `stroke="#1d212a" stroke-width="0.12"`),
    rect(45.0, 2.5, 2.4, 26.0, '#15171c'), rect(45.75, 4.5, 1.3, 21.0, '#2a2620'),
  ];
  // Five-way switch as seen from above: body with chamfered corners, two big
  // tabs, three small pins on each diagonal, the round stick in the middle.
  const jx = 7.0, jy = 15.5;
  const joy = [
    rect(2.5, 10.85, 2.5, 2.5, C.silver, 'transform="rotate(45 3.75 12.1)"'),
    rect(9.15, 17.45, 2.5, 2.5, C.silver, 'transform="rotate(45 10.4 18.7)"'),
    ...[[9.2, 11.2], [10.0, 12.3], [11.0, 13.3], [2.7, 17.5], [3.5, 18.7], [4.7, 19.7]].map(([x, y]) =>
      rect(x - 0.55, y - 0.4, 1.1, 0.8, C.silver, `rx="0.15" transform="rotate(45 ${x} ${y})"`)),
    `<path d="M ${jx - 1.8} ${jy - 3.7} L ${jx + 1.8} ${jy - 3.7} L ${jx + 3.7} ${jy - 1.8} L ${jx + 3.7} ${jy + 1.8} L ${jx + 1.8} ${jy + 3.7} L ${jx - 1.8} ${jy + 3.7} L ${jx - 3.7} ${jy + 1.8} L ${jx - 3.7} ${jy - 1.8} Z" fill="#d3d7dc" stroke="#959ba3" stroke-width="0.12"/>`,
    `<circle cx="${jx - 0.2}" cy="${jy - 0.2}" r="1.8" fill="#1f2125" stroke="#3a3d43" stroke-width="0.12"/>`,
    ...[[7.0, 9.3, 'u'], [7.0, 21.0, 'd'], [1.2, 15.2, 'l'], [13.0, 15.2, 'r']].map(([x, y, dir]) => {
      const a = 0.85, l = 1.05;
      const pts = { u: [[x, y - l / 2], [x - a, y + l / 2], [x + a, y + l / 2]], d: [[x, y + l / 2], [x - a, y - l / 2], [x + a, y - l / 2]],
                    l: [[x - l / 2, y], [x + l / 2, y - a], [x + l / 2, y + a]], r: [[x + l / 2, y], [x - l / 2, y - a], [x - l / 2, y + a]] }[dir];
      return `<polygon points="${pts.map((p) => p.map(r2).join(',')).join(' ')}" fill="${C.white}"/>`;
    }),
  ];
  const btn = keys.flatMap((c) => [
    rect(51.7, c - 0.4, 2.2, 0.8, C.silver, 'rx="0.4"'), rect(59.9, c - 0.4, 2.3, 0.8, C.silver, 'rx="0.4"'),
    rect(53.7, c - 1.8, 6.3, 3.6, '#cdd1d7', `rx="0.2" stroke="#8f959e" stroke-width="0.12"`),
    rect(54.4, c - 1.25, 4.9, 2.5, '#b9bec6', 'rx="0.15"'),
    rect(55.5, c - 0.8, 2.7, 1.6, '#efe6cf', `rx="0.15" stroke="#bdb39a" stroke-width="0.06"`),
  ]);
  fs.writeFileSync(new URL('../hw/waveshare-front.svg', import.meta.url), frame([
    ...traces, rect(48.1, 2.6, 1.2, 19.6, C.hole, 'rx="0.6"'), traced(white, C.white), ...joy, ...btn, ...screen,
  ]));
}

await back();
await front();
fs.rmSync(tmp, { recursive: true });
console.log('wrote hw/waveshare-front.svg and hw/waveshare-back.svg');
