import { chromium, firefox } from '/home/rob/apps/abra/node_modules/playwright/index.mjs';
import { existsSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const BASE = 'http://127.0.0.1:8777';
const IMG_STOCK = '/home/rob/ss-check/pi0.img';
const IMG_SMART = '/home/rob/ss-check/seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img';
const ZIP_SMART = '/home/rob/ss-check/seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img.zip';
const IMG_SMART_OLD = '/home/rob/ss-check/seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img';
const IMG_TAMPER = '/home/rob/ss-check/tampered.img';
const NOT_IMG = '/home/rob/ss-check/notanimage.txt';

let fails = 0;
const check = (cond, label, extra = '') => {
  if (cond) console.log(`  OK   ${label}`);
  else { console.log(`  FAIL ${label} ${extra}`); fails++; }
};

// The images are ~900 MB and cannot live in git, so they go missing. Say so in
// one line instead of dying later inside Playwright with an unrelated error.
{
  const missing = [IMG_STOCK, IMG_SMART, ZIP_SMART, IMG_SMART_OLD, IMG_TAMPER, NOT_IMG]
    .filter((p) => !existsSync(p));
  if (missing.length) {
    console.error(`\nMissing ${missing.length} test fixture(s):`);
    for (const m of missing) console.error(`  ${m}`);
    console.error('\nRun:  ./tools/fetch-fixtures.sh\n');
    process.exit(2);
  }
}

/* Build a single-entry zip byte by byte, so the refusal paths in zip.js can be
   driven with archives no publisher would ever produce. Fields are the local
   file header, APPNOTE.TXT 4.3.7. */
function makeZip(o = {}) {
  const body = o.body ?? Buffer.from('hello world');
  const method = o.method ?? 8;
  const data = o.rawData ?? (method === 8 ? deflateRawSync(body) : body);
  const name = Buffer.from(o.name ?? 'seedsigner_os.test.img');
  const extra = o.extra ?? Buffer.alloc(0);
  const h = Buffer.alloc(30);
  h.writeUInt32LE(o.sig ?? 0x04034b50, 0);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(o.flags ?? 0, 6);
  h.writeUInt16LE(method, 8);
  h.writeUInt32LE(0, 14);                              // crc32, unused by zip.js
  h.writeUInt32LE(o.csize ?? data.length, 18);
  h.writeUInt32LE(o.usize ?? body.length, 22);
  h.writeUInt16LE(name.length, 26);
  h.writeUInt16LE(extra.length, 28);
  return Buffer.concat([h, name, extra, data]);
}

/* Run zip.js directly against those bytes, in the real browser. */
async function tryZip(page, buf) {
  return page.evaluate(async (bytes) => {
    const m = await import('./zip.js');
    const file = new File([new Uint8Array(bytes)], 'dropped.img.zip');
    try {
      const r = await m.hashZipImage(file);
      return { ok: true, sha256: r.sha256, name: r.name };
    } catch (e) {
      return { ok: false, err: e.message, isZipError: e instanceof m.ZipError };
    }
  }, [...buf]);
}

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });

async function newPage() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  // /mtm/ is the analytics endpoint, served by nginx in production and absent
  // from python's http.server, so its 404 is expected in the local run only.
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const from = m.location()?.url || '';
    if (from.includes('/mtm/')) return;
    errors.push(`${m.text()} <- ${from}`);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith(BASE)) external.push(r.url()); });
  page.on('requestfailed', (r) => { if (!r.url().startsWith(BASE)) external.push(r.url()); });
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  return { page, ctx, errors, external };
}

async function resultOf(page) {
  await page.waitForSelector('#result:not([hidden])', { timeout: 180000 });
  return {
    cls: await page.getAttribute('#result', 'class'),
    title: (await page.textContent('#result h3'))?.trim(),
    step3Usable: await page.evaluate(() =>
      getComputedStyle(document.getElementById('step-3')).pointerEvents !== 'none'),
  };
}

// ---------------------------------------------------------------- 1. load
console.log('\n1. Page loads clean');
{
  const { page, ctx, errors, external } = await newPage();
  check(errors.length === 0, 'no console errors', errors.join(' | '));
  check(external.length === 0, 'no third-party requests', external.join(' | '));
  check((await page.title()).includes('SeedSigner'), 'title set');
  const cryptoOk = await page.evaluate(async () => {
    const m = await import('./sha256.js');
    const t = m.selfTest(); const c = await m.crossCheck();
    return t.ok && c.ok;
  });
  check(cryptoOk, 'hash self-test and cross-check pass in the browser');
  await ctx.close();
}

// ------------------------------------------------------------- 2. modes
console.log('\n2. Modes');
{
  const { page, ctx } = await newPage();
  check(await page.getAttribute('html', 'data-mode') === 'easy', 'defaults to easy');

  const monoVisibleEasy = await page.evaluate(() =>
    [...document.querySelectorAll('.mono')].some((e) => e.offsetParent !== null));
  check(!monoVisibleEasy, 'no monospace anywhere in easy mode');

  await page.click('[data-set-mode="cypherpunk"]');
  check(await page.getAttribute('html', 'data-mode') === 'cypherpunk', 'switches instantly');
  const sellHidden = await page.evaluate(() =>
    document.querySelector('.sell').offsetParent === null);
  check(sellHidden, 'cypherpunk mode sells nothing');

  await page.click('[data-set-mode="advanced"]');
  const sellShown = await page.evaluate(() =>
    document.querySelector('.sell').offsetParent !== null);
  check(sellShown, 'advanced mode still offers the call');

  await page.reload({ waitUntil: 'networkidle' });
  check(await page.getAttribute('html', 'data-mode') === 'advanced', 'mode persists across reload');
  await ctx.close();
}

// --------------------------------------------------- 3. happy path, stock
console.log('\n3. Stock image, correct product');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="premium"]');
  const allUsable = await page.evaluate(() => [...document.querySelectorAll('.step')]
    .every(s => getComputedStyle(s).pointerEvents !== 'none'));
  check(allUsable, 'every step is readable and clickable from the start');

  await page.setInputFiles('#file', IMG_STOCK);
  const r = await resultOf(page);
  check(r.cls === 'ok', 'green result', r.title);
  check(r.step3Usable, 'step 3 remains usable');
  await ctx.close();
}

// ------------------------------- 3b. a real human click, not setInputFiles
console.log('\n3b. The drop zone is actually clickable');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="premium"]');
  // setInputFiles bypasses pointer-events, so it cannot catch a locked step.
  // Clicking the visible button can: Playwright waits for actionability.
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.click('#pick', { timeout: 5000 }),
    ]);
    await chooser.setFiles(IMG_STOCK);
    const r = await resultOf(page);
    check(r.cls === 'ok', 'clicking Choose the file works for a real user', r.title);
  } catch (e) {
    check(false, 'clicking Choose the file works for a real user',
      'the button was not clickable, is step 2 still locked? ' + e.message.split('\n')[0]);
  }
  await ctx.close();
}

// ------------------------------------------------- 4. tamper test, 1 byte
console.log('\n4. Tampered image, one flipped byte');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="premium"]');
  await page.setInputFiles('#file', IMG_TAMPER);
  const r = await resultOf(page);
  check(r.cls === 'bad', 'full stop shown', r.title);
  check(r.step3Usable, 'step 3 is never disabled, the stop message carries the warning');
  await ctx.close();
}

// --------------------------------------------- 5. right file, wrong model
console.log('\n5. Smartcard image while premium is selected');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="premium"]');
  await page.setInputFiles('#file', IMG_SMART);
  const r = await resultOf(page);
  check(r.cls === 'warn', 'helpful warning, not an alarm', r.title);
  check(/different model/i.test(r.title), 'names the actual problem', r.title);
  check(r.step3Usable, 'step 3 is never disabled, the stop message carries the warning');
  await ctx.close();
}

// ----------------------------------------- 6. smartcard product, 537 MB
console.log('\n6. Smartcard image, correct product (537 MB)');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="plus-smartcard"]');
  const t0 = Date.now();
  await page.setInputFiles('#file', IMG_SMART);
  const r = await resultOf(page);
  check(r.cls === 'ok', 'green result on the large image', r.title);
  console.log(`       hashed 512 MiB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const fixShown = await page.evaluate(() => !document.getElementById('displayFix').hidden);
  check(fixShown, 'display setting instructions appear for a Plus model');
  await ctx.close();
}

// ------------------------- 6b. the zip the publisher actually ships now
// From B12 the ShieldSigner release is zip-only, and the signed hash covers the
// .img inside it. If this fails, buyers have no way to check their download.
console.log('\n6b. Smartcard zip, correct product (327 MB zip, 512 MiB inside)');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="plus-smartcard"]');
  const t0 = Date.now();
  await page.setInputFiles('#file', ZIP_SMART);
  const r = await resultOf(page);
  check(r.cls === 'ok', 'green result from inside the zip', r.title);
  console.log(`       unzipped and hashed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await ctx.close();
}

// ------------------------- 6c. a zip where the release is not published as one
console.log('\n6c. Zip dropped while a stock product is selected');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="premium"]');
  await page.setInputFiles('#file', ZIP_SMART);
  const r = await resultOf(page);
  check(r.cls === 'warn', 'gentle correction, not an alarm', r.title);
  check(/compressed/i.test(r.title), 'says it is the compressed version', r.title);
  await ctx.close();
}

// ------------------------------------- 6d. the previous release, still genuine
console.log('\n6d. Superseded B11 image, smartcard product');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="plus-smartcard"]');
  await page.setInputFiles('#file', IMG_SMART_OLD);
  const r = await resultOf(page);
  check(r.cls === 'warn', 'a genuine older file is not treated as tampering', r.title);
  check(/older release/i.test(r.title), 'says it is an older release', r.title);
  await ctx.close();
}

// ------------------------------------------------------ 7. wrong file type
console.log('\n7. Wrong file type');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="premium"]');
  await page.setInputFiles('#file', NOT_IMG);
  const r = await resultOf(page);
  check(r.cls === 'warn', 'gentle correction, not an error', r.title);
  await ctx.close();
}

// ------------------------------------------------- 7b. rail tracks scrolling
console.log('\n7b. The rail follows scroll position');
{
  const { page, ctx } = await newPage();
  let ok = true;
  for (const n of [1, 2, 3, 4]) {
    await page.evaluate((i) =>
      document.getElementById(`step-${i}`).scrollIntoView({ block: 'start', behavior: 'instant' }), n);
    await page.waitForTimeout(200);
    const now = await page.evaluate(() =>
      [...document.querySelectorAll('.rail li.now')].map((l) => Number(l.dataset.rail)));
    if (now.length !== 1 || now[0] !== n) { ok = false; console.log(`       at step ${n} rail showed [${now}]`); }
  }
  check(ok, 'each step highlights exactly itself while being read');
  await ctx.close();
}

// ---------------------------------------------------------- 8. mobile
console.log('\n8. Mobile at step 3');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await page.click('[data-product="premium"]');
  const noteShown = await page.evaluate(() => !document.getElementById('mobileNote').hidden);
  check(noteShown, 'phone users are told to finish on a computer');
  await ctx.close();
}

// --------------------------------------- 9. zip.js refuses what it cannot read
// These are the branches that matter most if a download is hostile, and until
// now not one of them had ever executed. A wrong guess inside a zip still
// produces a hash, and a hash that looks like an answer is worse than an error,
// so every rejection is checked by message, not just by "it threw".
console.log('\n9. Malformed zips are refused, not guessed at');
{
  const { page, ctx } = await newPage();

  const body = Buffer.from('hello world');
  const expected = createHash('sha256').update(body).digest('hex');

  // Positive control first. If this fails the other nine prove nothing.
  const good = await tryZip(page, makeZip({ body }));
  check(good.ok && good.sha256 === expected, 'a well-formed zip still hashes the image inside',
    JSON.stringify(good));
  check(good.name === 'seedsigner_os.test.img', 'and reports the entry name', good.name);

  const cases = [
    ['not a zip at all', makeZip({ sig: 0x02014b50 }), /does not look like a zip/i],
    ['a file too small to hold a header', Buffer.alloc(10), /too small/i],
    ['sizes in a trailing data descriptor', makeZip({ flags: 0x08 }), /trailing descriptor/i],
    ['an encrypted entry', makeZip({ flags: 0x01 }), /encrypted/i],
    ['an unsupported compression method', makeZip({ method: 12 }), /method 12/i],
    ['a zip64 archive', makeZip({ csize: 0xffffffff }), /zip64/i],
    ['a truncated download', makeZip({ csize: 99999 }), /truncated/i],
    ['a corrupted deflate stream', makeZip({ rawData: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]) }),
      /could not be decompressed/i],
    ['an entry shorter than it claims', makeZip({ body, usize: 999999 }), /ended early/i],
  ];

  for (const [label, buf, pattern] of cases) {
    const r = await tryZip(page, buf);
    const refused = !r.ok && r.isZipError && pattern.test(r.err);
    check(refused, `refuses ${label}`, r.ok ? `ACCEPTED IT, sha ${r.sha256}` : r.err);
  }

  await ctx.close();
}

// ------------------------------- 9b. a bad zip through the actual user interface
console.log('\n9b. A corrupt zip dropped on the page');
{
  const { page, ctx } = await newPage();
  await page.click('[data-product="plus-smartcard"]');
  const bad = makeZip({ rawData: Buffer.from([9, 9, 9, 9, 9, 9, 9, 9]) });
  await page.setInputFiles('#file',
    { name: 'seedsigner_os.broken.img.zip', mimeType: 'application/zip', buffer: bad });
  const r = await resultOf(page);
  check(r.cls === 'bad', 'shown as a stop, not a green tick', r.title);
  check(/zip could not be opened/i.test(r.title), 'names the zip as the problem', r.title);
  await ctx.close();
}

await browser.close();

// ------------------------------------------------ 10. a second browser engine
// zip.js leans on DecompressionStream, which is not Chromium-specific but had
// only ever been exercised in Chromium. Firefox is a different implementation.
console.log('\n10. Firefox, the real B12 zip end to end');
{
  const ff = await firefox.launch();
  try {
    const ctx = await ff.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

    const supported = await page.evaluate(() => typeof DecompressionStream === 'function');
    check(supported, 'Firefox has DecompressionStream');

    await page.click('[data-product="plus-smartcard"]');
    await page.setInputFiles('#file', ZIP_SMART);
    const r = await resultOf(page);
    check(r.cls === 'ok', 'the real smartcard zip verifies green in Firefox', r.title);
    check(errors.length === 0, 'no Firefox console errors', errors.join(' | '));
    await ctx.close();
  } catch (e) {
    check(false, 'Firefox run completed', e.message.split('\n')[0]);
  } finally {
    await ff.close();
  }
}

console.log(fails === 0 ? '\nALL PASS\n' : `\n${fails} FAILURES\n`);
process.exit(fails ? 1 : 0);
