// Render the SeedSigner Plus display hat Gerbers to the two SVGs in hw/.
//
// Source: github.com/3rdIteration/seedsigner-hardware at commit
// 7e4f05816bac9b20943996b960d65f37322d617e, folder
// display_hats/plus_hat/designspark_format/ (CERN-OHL-S v2).
//
//   git clone https://github.com/3rdIteration/seedsigner-hardware /tmp/sshw
//   git -C /tmp/sshw checkout 7e4f05816bac9b20943996b960d65f37322d617e
//   mkdir /tmp/stk && cd /tmp/stk && npm i pcb-stackup@4
//   NODE_PATH=/tmp/stk/node_modules node tools/render-plus-hat.mjs /tmp/sshw/display_hats/plus_hat/designspark_format
//
// The page's CSP forbids inline <style>, and pcb-stackup colours its layers
// with one, so the class colours are moved onto plain attributes here.
// Nothing else in the drawing is touched. Fixed ids make the output byte-for-byte
// reproducible, so `sha256sum hw/plus-hat-*.svg` should match the manifest.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const stackup = require('pcb-stackup');

const dir = process.argv[2];
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'hw');

const kind = (f) =>
  /Top Copper/.test(f) ? ['top', 'copper'] :
  /Bottom Copper/.test(f) ? ['bottom', 'copper'] :
  /Top Solder Mask/.test(f) ? ['top', 'soldermask'] :
  /Bottom Solder Mask/.test(f) ? ['bottom', 'soldermask'] :
  /Top Silkscreen/.test(f) ? ['top', 'silkscreen'] :
  /Bottom Silkscreen/.test(f) ? ['bottom', 'silkscreen'] :
  /Outline/.test(f) ? ['all', 'outline'] :
  /Gerber Drill Data/.test(f) ? ['all', 'drill'] : null;

const layers = fs.readdirSync(dir).filter((f) => f.endsWith('.gbr') && kind(f))
  .sort()
  .map((f, i) => ({ filename: f, gerber: fs.createReadStream(path.join(dir, f)),
                    side: kind(f)[0], type: kind(f)[1], options: { id: `l${i}` } }));

// HASL finish per the fab notes, so exposed pads are drawn silver, not gold.
const color = { fr4: '#666666', cu: '#cccccc', cf: '#d6d6d6', sm: '#004200bf',
                ss: '#ffffff', sp: '#999999', out: '#000000' };

function flatten(svg) {
  const css = svg.match(/<style>([\s\S]*?)<\/style>/)[1];
  const rules = {};
  for (const m of css.matchAll(/\.(\S+)\s*\{([^}]*)\}/g)) {
    const attrs = [];
    for (const d of m[2].split(';')) {
      const [k, v] = d.split(':').map((s) => s && s.trim());
      if (k === 'color' || k === 'opacity') attrs.push(`${k}="${v}"`);
    }
    rules[m[1]] = attrs.join(' ');
  }
  return svg.replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/class="([^"]+)"/g, (_, c) => rules[c] ?? `class="${c}"`);
}

const s = await stackup(layers, { color, id: 'plushat' });
fs.writeFileSync(path.join(out, 'plus-hat-front.svg'), flatten(s.top.svg));
fs.writeFileSync(path.join(out, 'plus-hat-back.svg'), flatten(s.bottom.svg));
console.log('wrote hw/plus-hat-front.svg and hw/plus-hat-back.svg');
