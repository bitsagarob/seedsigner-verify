// Draw hw/waveshare-parts.svg: every part and every used GPIO pin of the
// Waveshare 1.3inch LCD HAT, taken from Waveshare's own schematic
// (https://files.waveshare.com/upload/a/a6/1.3inch-LCD-HAT-Schematic.pdf).
// This is our own drawing of facts read off that schematic, not a copy of it.
// No photo of this board exists under an open licence, so this is the reference.
//
//   node tools/draw-waveshare.mjs
import fs from 'node:fs';
import path from 'node:path';

const W = 160, H = 100;
const C = { screen: '#5aa9ff', light: '#fdbd00', joy: '#3ecf8e', key: '#ff9f43',
            v33: '#ff6b6b', gnd: '#9aa4b2', v5: '#c8a2ff', off: '#2b4f8f' };

// pin number -> [group, short label]
const PINS = {
  1: ['v33', '3V3'], 17: ['v33', '3V3'], 2: ['v5', '5V'], 4: ['v5', '5V'],
  6: ['gnd', 'GND'], 9: ['gnd', 'GND'], 14: ['gnd', 'GND'], 20: ['gnd', 'GND'],
  25: ['gnd', 'GND'], 30: ['gnd', 'GND'], 34: ['gnd', 'GND'], 39: ['gnd', 'GND'],
  19: ['screen', 'DIN'], 23: ['screen', 'CLK'], 24: ['screen', 'CS'], 22: ['screen', 'DC'],
  13: ['screen', 'RST'], 18: ['light', 'BL'],
  29: ['joy', 'LEFT'], 31: ['joy', 'UP'], 33: ['joy', 'PRESS'], 35: ['joy', 'DOWN'], 37: ['joy', 'RIGHT'],
  36: ['key', 'KEY3'], 38: ['key', 'KEY2'], 40: ['key', 'KEY1'],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const out = [];
const t = (x, y, s, size, fill = '#ffffff', extra = '') =>
  out.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`);
const box = (x, y, w, h, stroke) =>
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#0a2456" stroke="${stroke}" stroke-width="0.5"/>`);

out.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="#123a86"/>`);
t(6, 7, 'Waveshare 1.3inch LCD HAT: every part, every used pin', 3.4, '#ffffff', 'font-weight="700"');

// 40-pin header, pin 1 bottom left, the same way round as the Pi Zero photo.
const x0 = 23, pitch = 6;
for (let k = 0; k < 20; k++) {
  for (const [pin, y] of [[2 * k + 1, 21], [2 * k + 2, 15]]) {
    const p = PINS[pin];
    const fill = p ? C[p[0]] : C.off;
    out.push(pin === 1
      ? `<rect x="${x0 + pitch * k - 1.8}" y="${y - 1.8}" width="3.6" height="3.6" fill="${fill}"/>`
      : `<circle cx="${x0 + pitch * k}" cy="${y}" r="1.8" fill="${fill}"/>`);
    if (p && !['gnd', 'v33', 'v5'].includes(p[0])) {
      const ly = pin % 2 ? 26.5 : 11.6;
      t(x0 + pitch * k, ly, p[1], 1.55, C[p[0]], 'text-anchor="middle" font-weight="700"');
    }
    t(x0 + pitch * k, y + 0.7, pin, 1.5, '#06142e', 'text-anchor="middle" font-weight="700"');
  }
}
t(6, 16, '40-pin', 2.4, '#cfe0ff'); t(6, 19.2, 'socket', 2.4, '#cfe0ff'); t(6, 22.4, 'to the Pi', 2.4, '#cfe0ff');

// Legend under the header.
let lx = 23;
for (const [g, label] of [['v33', '3.3 V'], ['gnd', 'ground'], ['v5', '5 V, not used'], ['off', 'no connection']]) {
  out.push(`<circle cx="${lx}" cy="30.5" r="1.3" fill="${C[g]}"/>`); t(lx + 2.2, 31.3, label, 2.2, '#cfe0ff');
  lx += label.length * 1.25 + 10;
}

// Part groups.
const group = (x, y, w, h, col, title, lines) => {
  box(x, y, w, h, col);
  t(x + 3, y + 5.5, title, 3, col, 'font-weight="700"');
  lines.forEach((l, i) => t(x + 3, y + 10.5 + i * 4, l, 2.5));
};
group(6, 35, 56, 30, C.screen, 'Screen, 240 x 240', [
  'ST7789 controller sits inside the screen',
  'DIN 19 · CLK 23 · CS 24 · DC 22 · RST 13',
  'C1: one 100 nF capacitor on its 3.3 V',
  'Ribbon soldered straight onto the board',
]);
group(6, 68, 56, 27, C.light, 'Backlight switch', [
  'Q1: S8050 transistor, 3 legs',
  'R1 10 ohm · R2 10k · R3 1k',
  'BL on pin 18 turns the light on and off',
]);
group(66, 35, 46, 30, C.joy, 'Joystick S1', [
  'LEFT 29 · UP 31 · PRESS 33',
  'DOWN 35 · RIGHT 37',
  'Common side to ground',
]);
group(66, 68, 46, 27, C.key, 'Buttons K1 to K3', [
  'KEY1 40 · KEY2 38 · KEY3 36',
  'Other side to ground',
]);

box(116, 35, 38, 60, '#ffffff');
t(135, 52, '11', 14, '#ffffff', 'text-anchor="middle" font-weight="700"');
t(135, 59, 'parts in total', 2.8, '#cfe0ff', 'text-anchor="middle"');
['Socket, screen, C1,', 'Q1, R1, R2, R3,', 'joystick, 3 buttons.', '', 'No chip on the board.', 'The only chip is inside', 'the screen.']
  .forEach((l, i) => t(135, 66 + i * 3.6, l, 2.4, i > 3 ? '#ffffff' : '#cfe0ff', 'text-anchor="middle"'));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">\n${out.join('\n')}\n</svg>\n`;
const dest = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'hw', 'waveshare-parts.svg');
fs.writeFileSync(dest, svg);
console.log('wrote hw/waveshare-parts.svg');
