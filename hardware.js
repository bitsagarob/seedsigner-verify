/* Step 5: compare your boards with reference images.
 *
 * Everything is drawn in one SVG whose units are millimetres on the board, so
 * zooming is a viewBox change: the vector boards stay sharp at any zoom and the
 * photos are only limited by their own pixels. Marks use the same millimetres.
 * Sources and how each image was made: tools/align-pi-photos.sh and
 * tools/render-plus-hat.mjs.
 */

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

const BOARDS = {
  pi: {
    label: 'Raspberry Pi Zero v1.3 and Pi Zero W, photographed from the top',
    w: 65, h: 30, maxZoom: 8,
    v13: 'hw/pi-zero-v13.jpg',
    w_: 'hw/pi-zero-w.jpg',
    marks: [
      { x: 23.7, y: 11, w: 12, h: 12.1, name: 'Processor with memory on top',
        note: 'One square chip. The processor sits underneath the memory chip, stacked. The text on top can differ between batches.' },
      { x: 1.5, y: 7, w: 11.5, h: 12.2, name: 'microSD slot',
        note: 'The card with the software goes in here. The Pi Zero has no other storage on the board.' },
      { x: 7.5, y: 1.5, w: 50.5, h: 4.6, name: '40 GPIO holes',
        note: 'The screen board plugs in here. Look for extra wires soldered to these holes or between them.' },
      { x: 16.7, y: 20, w: 3.5, h: 2.5, name: 'Crystal X1',
        note: 'Small metal can that sets the clock. Same place on both boards.' },
      { x: 6.5, y: 22.5, w: 11.2, h: 7.5, name: 'Mini HDMI' },
      { x: 37.5, y: 25, w: 7.7, h: 5, name: 'USB (data)' },
      { x: 50, y: 25, w: 8, h: 5, name: 'USB (power)' },
      { x: 61.5, y: 7, w: 3, h: 16.5, name: 'Camera connector',
        note: 'The v1.3 is the first Pi Zero with this connector. Older Zeros (v1.2) do not have it.' },
      { x: 42, y: 7.5, w: 7, h: 9, name: 'Raspberry logo (v1.3)', kind: 'good',
        note: 'On the v1.3 the logo is printed here. On the Zero W this area holds the radio chip and extra parts.' },
      { x: 41, y: 15, w: 5, h: 3.2, name: 'Radio chip (Zero W only)', kind: 'bad',
        note: 'Wi-Fi and Bluetooth chip. A SeedSigner board must not have it. If your board has a black chip here, stop.' },
      { x: 21, y: 25, w: 14, h: 4.5, name: 'Printed antenna (Zero W only)', kind: 'bad',
        note: 'A bare patch of board with a ring of tiny dots (vias) around it, between the HDMI and USB ports. On the v1.3 this area carries the HDMI print and normal traces.' },
      { x: 37.2, y: 18.9, w: 3.6, h: 3.1, name: 'Antenna plug pads (Zero W only)', kind: 'bad',
        note: 'Empty pads for an external antenna connector. If something is soldered here, stop.' },
      { x: 56, y: 10.2, w: 4, h: 4.6, name: 'Large coil (Zero W only)', kind: 'bad',
        note: 'The Zero W has a bigger black wire-wound coil on the power supply here.' },
    ],
  },
  piBack: {
    label: 'Raspberry Pi Zero v1.3 and Pi Zero W, photographed from the bottom',
    w: 65, h: 30, maxZoom: 5,
    v13: 'hw/pi-zero-v13-back.jpg',
    w_: 'hw/pi-zero-w-back.jpg',
    marks: [
      { x: 7, y: 1.5, w: 50.5, h: 4.3, name: 'Solder joints of the 40 GPIO pins',
        note: 'The back of a Pi Zero carries no parts at all, only pads and print. Look here for extra wires or solder bridging two pins. Any part on this side was added.' },
      { x: 7, y: 6.8, w: 4.8, h: 4.5, name: 'RUN and TV holes',
        note: 'Four small holes that are normally empty. A wire in them is not normal.' },
      { x: 51.5, y: 6.5, w: 11, h: 14.5, name: 'Test pads, right',
        note: 'Round gold pads used in the factory, labelled PP on the v1.3. Nothing should be soldered to them.' },
      { x: 9.5, y: 21, w: 19.5, h: 8, name: 'Test pads, bottom', note: 'Same: factory test pads, nothing soldered to them.' },
      { x: 24.5, y: 9, w: 17.5, h: 3.3, name: '"Raspberry Pi Zero V1.3"', kind: 'good',
        note: 'The v1.3 prints its name and version here.' },
      { x: 11.75, y: 5.75, w: 37.75, h: 4.25, name: '"Raspberry Pi Zero W" and an FCC ID', kind: 'bad',
        note: 'The W prints its own name, plus FCC and IC numbers for its radio. If your board says Zero W, stop.' },
      { x: 28, y: 26.5, w: 18, h: 3, name: '"Uses antenna technology licensed from Proant AB"', kind: 'bad',
        note: 'Only the W carries this line, because only the W has an antenna.' },
    ],
  },
  front: {
    label: 'SeedSigner Plus screen board, front, drawn from the published Gerber files',
    w: 137.85, h: 52.03, maxZoom: 300,
    svg: 'hw/plus-hat-front.svg',
    marks: [
      { x: 44.8, y: 1.9, w: 67.2, h: 48.1, name: 'Under the 2.8 inch screen',
        note: 'The screen covers this area. On your device you see the board only after you lift the screen.' },
      { x: 12.5, y: 12, w: 25.4, h: 26.3, name: 'Joystick: five buttons J6 to J10',
        note: 'Five C&K PTS636 push buttons in a cross. Each one has two pads and one trace.' },
      { x: 112.8, y: 12, w: 9.5, h: 25.9, name: 'Three buttons J3 to J5' },
      { x: 55.1, y: 5.6, w: 49.5, h: 4.3, name: '40 pins to the Pi Zero',
        note: 'These holes line up with the Pi Zero GPIO header.' },
      { x: 91.7, y: 12.9, w: 3.9, h: 25.9, name: 'Slot for the screen ribbon' },
      { x: 31.9, y: 43.9, w: 10.3, h: 6.5, name: 'USB-C mounting holes' },
    ],
  },
  back: {
    label: 'SeedSigner Plus screen board, back, drawn from the published Gerber files',
    w: 137.85, h: 52.03, maxZoom: 300,
    svg: 'hw/plus-hat-back.svg',
    marks: [
      { x: 32.7, y: 3.4, w: 50.8, h: 8.6, name: 'CONN2: 40-pin socket to the Pi Zero',
        note: 'Every trace to the rest of the board starts at one of these pins. Follow them.' },
      { x: 60.7, y: 12.9, w: 6.5, h: 26.3, name: 'J2: screen ribbon connector',
        note: 'Samtec ZF5S, 40 contacts at 0.5 mm. The screen ribbon clips in here.' },
      { x: 71.9, y: 13.6, w: 11.6, h: 6.2, name: 'R1 to R4: zero-ohm links',
        note: 'The print marks them IM0 and IM1, the pins that set how the screen talks.' },
      { x: 71.9, y: 20.2, w: 8.1, h: 22, name: 'R5 to R10, C1, Q5',
        note: 'Small resistors, one capacitor and one transistor (Q5, SI2302). Compare their place and count with the parts list.' },
      { x: 82.5, y: 39.4, w: 25.3, h: 12.3, name: 'J11: USB-C, with R12, R13, C2',
        note: 'The designer printed "Power Only, Data Pins Disabled" next to it. R12 and R13 (5.1k) are the standard resistors that ask a charger for 5 V.' },
      { x: 42.4, y: 13.3, w: 3.4, h: 25.4, name: 'Slot for the screen ribbon' },
    ],
  },
  waveshare: {
    label: 'Waveshare 1.3 inch screen board: every part and every used pin, drawn from Waveshare\'s schematic',
    w: 160, h: 100, maxZoom: 12,
    svg: 'hw/waveshare-parts.svg',
    marks: [
      { x: 2, y: 9.5, w: 139, h: 18.5, name: '40-pin socket to the Pi',
        note: 'Only 14 pins carry a signal, plus 3.3 V and ground. No part uses 5 V. A trace to a dark blue pin is not in Waveshare\'s schematic.' },
      { x: 6, y: 35, w: 56, h: 30, name: 'Screen and C1',
        note: 'The ST7789 controller is inside the screen. Five signal lines go to the Pi. The ribbon is soldered onto the back of the board. C1 is one small capacitor.' },
      { x: 6, y: 68, w: 56, h: 27, name: 'Backlight: Q1, R1, R2, R3',
        note: 'One transistor and three resistors switch the screen light. Q1 has three legs, the most of any part soldered on the board itself.' },
      { x: 66, y: 35, w: 46, h: 30, name: 'Joystick S1',
        note: 'Five directions, five pins. The common side goes to ground.' },
      { x: 66, y: 68, w: 46, h: 27, name: 'Buttons K1 to K3',
        note: 'One pin each. The other side goes to ground.' },
      { x: 116, y: 35, w: 38, h: 60, name: 'Count the parts: 11', kind: 'good',
        note: 'If you count more parts, or find a chip with many legs, stop. A board revision can differ from the schematic, so compare with a second board when you can.' },
    ],
  },
};

// What the reader picks: a board, then a side. Waveshare has one view, which
// covers both sides because it is a parts list, not a picture.
const GROUPS = [
  { key: 'pi', name: 'Pi Zero', views: { front: 'pi', back: 'piBack' } },
  { key: 'plus', name: 'SeedSigner Plus board', views: { front: 'front', back: 'back' } },
  { key: 'waveshare', name: 'Waveshare 1.3 inch board', views: { front: 'waveshare' } },
];
let group = GROUPS[0];
let side = 'front';

let board = null;
let svg = null;
let vb = null;
let marksG = null;
let split = 0.5;
let active = -1;

/* ------------------------------------------------------------ view box */
function fit() { return { x: 0, y: 0, w: board.w, h: board.h }; }

function clamp(v) {
  const minW = board.w / board.maxZoom;
  const w = Math.min(board.w, Math.max(minW, v.w));
  const h = w * board.h / board.w;
  return { w, h, x: Math.min(board.w - w, Math.max(0, v.x)), y: Math.min(board.h - h, Math.max(0, v.y)) };
}

function paint() {
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const zoomed = vb.w < board.w * 0.999;
  // Let the page scroll under a finger until the user has zoomed in.
  svg.style.touchAction = zoomed ? 'none' : 'pan-y';
  $('hwZoom').textContent = `${(board.w / vb.w).toFixed(board.w / vb.w < 10 ? 1 : 0)}x`;
  // Badges keep the same size on screen at every zoom.
  const r = vb.w * 0.018;
  for (const g of marksG.children) {
    const c = g.querySelector('circle'), t = g.querySelector('text');
    const x = Number(g.dataset.x), y = Number(g.dataset.y);
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r);
    t.setAttribute('x', x); t.setAttribute('y', y + r * 0.38); t.setAttribute('font-size', r * 1.1);
  }
}

function zoomAt(f, px, py) {
  const w = vb.w / f, h = vb.h / f;
  vb = clamp({ w, h, x: px - (px - vb.x) / f, y: py - (py - vb.y) / f });
  paint();
}

let anim = 0;
function flyTo(target) {
  cancelAnimationFrame(anim);
  const from = { ...vb }, to = clamp(target);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { vb = to; paint(); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 380), e = 1 - (1 - k) ** 3;
    vb = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e,
           w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
    paint();
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}

function toBoard(ev) {
  const r = svg.getBoundingClientRect();
  return { x: vb.x + (ev.clientX - r.left) / r.width * vb.w,
           y: vb.y + (ev.clientY - r.top) / r.height * vb.h };
}

function wireGestures() {
  const pts = new Map();
  let last = null;

  svg.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = toBoard(ev);
    zoomAt(Math.exp(-ev.deltaY * 0.0015), p.x, p.y);
  }, { passive: false });

  svg.addEventListener('dblclick', (ev) => { const p = toBoard(ev); zoomAt(2.5, p.x, p.y); });

  // Pointer capture retargets the click away from the mark, so a tap on a
  // mark is detected here: a single pointer that went down on it and barely moved.
  let tap = null;
  svg.addEventListener('pointerdown', (ev) => {
    const mark = ev.target.closest && ev.target.closest('.hw-mark');
    tap = pts.size === 0 && mark ? { i: Number(mark.dataset.i), x: ev.clientX, y: ev.clientY } : null;
    svg.setPointerCapture(ev.pointerId);
    pts.set(ev.pointerId, ev);
    last = null;
  });
  const end = (ev) => {
    if (tap && ev.type === 'pointerup' && Math.hypot(ev.clientX - tap.x, ev.clientY - tap.y) < 6) select(tap.i);
    tap = null;
    pts.delete(ev.pointerId); last = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  svg.addEventListener('pointermove', (ev) => {
    if (!pts.has(ev.pointerId)) return;
    pts.set(ev.pointerId, ev);
    const r = svg.getBoundingClientRect();
    const list = [...pts.values()];
    const mid = { x: list.reduce((s, p) => s + p.clientX, 0) / list.length,
                  y: list.reduce((s, p) => s + p.clientY, 0) / list.length };
    const dist = list.length > 1 ? Math.hypot(list[0].clientX - list[1].clientX, list[0].clientY - list[1].clientY) : 0;
    if (last) {
      const s = vb.w / r.width;
      vb = clamp({ ...vb, x: vb.x - (mid.x - last.mid.x) * s, y: vb.y - (mid.y - last.mid.y) * s });
      if (dist && last.dist) {
        const p = toBoard({ clientX: mid.x, clientY: mid.y });
        zoomAt(dist / last.dist, p.x, p.y);
      } else paint();
    }
    last = { mid, dist };
  });
}

/* --------------------------------------------------------------- build */
async function inlineSvg(url) {
  const text = await (await fetch(url)).text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const node = document.importNode(doc.documentElement, true);
  node.setAttribute('x', 0); node.setAttribute('y', 0);
  node.setAttribute('width', board.w); node.setAttribute('height', board.h);
  node.setAttribute('preserveAspectRatio', 'none');
  node.removeAttribute('id');
  return node;
}

function setSplit(v) {
  split = v;
  const x = board.w * split;
  const clip = svg.querySelector('#hwClipW rect');
  if (!clip) return;
  clip.setAttribute('x', x); clip.setAttribute('width', board.w - x);
  const line = svg.querySelector('.hw-split');
  line.setAttribute('x1', x); line.setAttribute('x2', x);
}

async function show(g, sd) {
  group = g;
  side = g.views[sd] ? sd : 'front';
  const key = g.views[side];
  board = BOARDS[key];
  active = -1;
  for (const b of document.querySelectorAll('#hwTabs button')) {
    b.setAttribute('aria-selected', String(b.dataset.group === g.key));
  }
  $('hwSelect').value = g.key;
  $('hwSides').hidden = !g.views.back;
  for (const b of $('hwSides').children) b.setAttribute('aria-pressed', String(b.dataset.side === side));
  $('hwCompare').hidden = !board.v13;

  svg = svgEl('svg', { class: 'hw-svg', role: 'img', 'aria-label': board.label });
  const stage = $('hwStage');
  stage.replaceChildren(svg);
  vb = fit();

  if (board.v13) {
    const defs = svgEl('defs');
    const clip = svgEl('clipPath', { id: 'hwClipW' });
    clip.append(svgEl('rect', { x: 0, y: 0, width: board.w, height: board.h }));
    defs.append(clip);
    svg.append(defs,
      svgEl('image', { href: board.v13, x: 0, y: 0, width: board.w, height: board.h }),
      svgEl('image', { href: board.w_, x: 0, y: 0, width: board.w, height: board.h, 'clip-path': 'url(#hwClipW)' }),
      svgEl('line', { class: 'hw-split', y1: 0, y2: board.h, 'vector-effect': 'non-scaling-stroke' }));
    setSplit(split);
  } else {
    svg.append(await inlineSvg(board.svg));
  }

  marksG = svgEl('g', { class: 'hw-marks' });
  board.marks.forEach((m, i) => {
    const g = svgEl('g', { class: `hw-mark ${m.kind || ''}`, 'data-i': i,
      'data-x': m.x, 'data-y': m.y });
    g.append(svgEl('rect', { x: m.x, y: m.y, width: m.w, height: m.h, 'vector-effect': 'non-scaling-stroke' }),
      svgEl('circle'), Object.assign(svgEl('text', { 'text-anchor': 'middle' }), { textContent: String(i + 1) }));
    marksG.append(g);
  });
  svg.append(marksG);
  marksG.classList.toggle('off', !$('hwLabels').checked);

  wireGestures();
  paint();
  list();
}

function select(i) {
  active = i;
  const m = board.marks[i];
  const w = Math.max(m.w, m.h * board.w / board.h) * 1.8;
  flyTo({ w, h: w * board.h / board.w, x: m.x + m.w / 2 - w / 2, y: m.y + m.h / 2 - w * board.h / board.w / 2 });
  for (const g of marksG.children) g.classList.toggle('on', Number(g.dataset.i) === i);
  for (const li of $('hwList').children) li.classList.toggle('on', Number(li.dataset.i) === i);
}

function list() {
  const ol = $('hwList');
  ol.replaceChildren();
  board.marks.forEach((m, i) => {
    const li = document.createElement('li');
    li.dataset.i = i;
    if (m.kind) li.className = m.kind;
    const b = document.createElement('button');
    b.type = 'button';
    const n = document.createElement('span'); n.className = 'hw-n'; n.textContent = i + 1;
    const t = document.createElement('b'); t.textContent = m.name;
    b.append(n, t);
    b.addEventListener('click', () => select(i));
    li.append(b);
    if (m.note) { const p = document.createElement('p'); p.textContent = m.note; li.append(p); }
    ol.append(li);
  });
}

function wire() {
  const tabs = $('hwTabs'), sel = $('hwSelect');
  for (const g of GROUPS) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.role = 'tab'; btn.dataset.group = g.key; btn.textContent = g.name;
    btn.addEventListener('click', () => show(g, side));
    tabs.append(btn);
    const o = document.createElement('option');
    o.value = g.key; o.textContent = g.name;
    sel.append(o);
  }
  sel.addEventListener('change', () => show(GROUPS.find((g) => g.key === sel.value), side));
  for (const b of $('hwSides').children) b.addEventListener('click', () => show(group, b.dataset.side));
  $('hwIn').addEventListener('click', () => zoomAt(1.6, vb.x + vb.w / 2, vb.y + vb.h / 2));
  $('hwOut').addEventListener('click', () => zoomAt(1 / 1.6, vb.x + vb.w / 2, vb.y + vb.h / 2));
  $('hwFit').addEventListener('click', () => flyTo(fit()));
  $('hwFull').addEventListener('click', () => {
    const v = $('hwViewer');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
  });
  $('hwLabels').addEventListener('change', (e) => marksG && marksG.classList.toggle('off', !e.target.checked));
  $('hwSplit').addEventListener('input', (e) => setSplit(Number(e.target.value) / 100));

  // The photos are ~2 MB, so nothing loads until the step is near the screen.
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); show(GROUPS[0], 'front'); }
  }, { rootMargin: '600px 0px' });
  io.observe($('step-5'));
}

wire();
