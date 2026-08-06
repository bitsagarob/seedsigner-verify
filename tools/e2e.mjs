import { chromium } from '/home/rob/apps/abra/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:8777';
const IMG_STOCK = '/home/rob/ss-check/pi0.img';
const IMG_SMART = '/home/rob/ss-check/seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img';
const IMG_TAMPER = '/home/rob/ss-check/tampered.img';
const NOT_IMG = '/home/rob/ss-check/notanimage.txt';

let fails = 0;
const check = (cond, label, extra = '') => {
  if (cond) console.log(`  OK   ${label}`);
  else { console.log(`  FAIL ${label} ${extra}`); fails++; }
};

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
    step3Locked: await page.evaluate(() => document.getElementById('step-3').classList.contains('locked')),
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
  check(!(await page.evaluate(() => document.getElementById('step-1').classList.contains('locked'))),
    'step 1 unlocks on product choice');
  check(await page.evaluate(() => document.getElementById('step-3').classList.contains('locked')),
    'step 3 starts locked');

  await page.setInputFiles('#file', IMG_STOCK);
  const r = await resultOf(page);
  check(r.cls === 'ok', 'green result', r.title);
  check(!r.step3Locked, 'step 3 unlocked after a good check');
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
  check(r.step3Locked, 'step 3 stays locked');
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
  check(r.step3Locked, 'step 3 stays locked');
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

await browser.close();
console.log(fails === 0 ? '\nALL PASS\n' : `\n${fails} FAILURES\n`);
process.exit(fails ? 1 : 0);
