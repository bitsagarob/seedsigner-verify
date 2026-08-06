import { hashFile, selfTest, crossCheck } from './sha256.js';

const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};

let R = null;
let product = null;
let cryptoReady = false;

/* ------------------------------------------------------------------ modes */
const MODE_NOTE = {
  easy: 'Bitsaga. The page checks the file for you and you take its word for it.',
  advanced: 'SeedSigner. Every value is shown so you can check it against their own release page.',
  cypherpunk: 'Nobody. Every step can be repeated, and the firmware rebuilt from source, without Bitsaga.',
};

function setMode(mode) {
  document.documentElement.dataset.mode = mode;
  for (const b of document.querySelectorAll('[data-set-mode]')) {
    b.setAttribute('aria-pressed', String(b.dataset.setMode === mode));
  }
  const pop = $('modeNote');
  pop.textContent = '';
  pop.append(el('b', 'Who you have to trust'));
  pop.append(document.createTextNode(MODE_NOTE[mode]));
  try { localStorage.setItem('mode', mode); } catch {}
}

for (const b of document.querySelectorAll('[data-set-mode]')) {
  b.addEventListener('click', () => setMode(b.dataset.setMode));
}

/* The trust line is one line too many in the header, so it lives behind the i. */
function wireInfo() {
  const btn = $('infoBtn');
  const pop = $('modeNote');
  const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = pop.hidden;
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    // Clicking a mode button keeps it open so the three can be compared.
    if (!pop.hidden && !e.target.closest('.modewrap')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
wireInfo();

/* ---------------------------------------------------------------- product */
function buildPicker() {
  const wrap = $('picker');
  wrap.textContent = '';
  for (const p of R.products) {
    const b = el('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.dataset.product = p.id;
    b.append(el('b', p.label));
    b.append(el('span', p.firmware === 'smartcard' ? 'Has a smartcard slot' : 'No smartcard slot'));
    b.addEventListener('click', () => selectProduct(p.id));
    wrap.append(b);
  }
}

function selectProduct(id) {
  product = R.products.find((p) => p.id === id);
  for (const b of document.querySelectorAll('#picker button')) {
    b.setAttribute('aria-pressed', String(b.dataset.product === id));
  }
  try { localStorage.setItem('product', id); } catch {}
  applyProduct();
  unlock('step-1');
  unlock('step-2');   // both are usable as soon as the product is known
  markRail(1);
}

function fw() { return R.firmware[product.firmware]; }

function applyProduct() {
  const f = fw();
  const sig = f.signature;

  $('dlBtn').href = f.downloadUrl;
  $('dlMeta').textContent =
    `${f.filename} · ${(f.sizeBytes / 1048576).toFixed(0)} MB · version ${f.version}, published ${f.publishedAt}`;
  $('dlUrl').textContent = f.downloadUrl;
  $('relPage').href = f.releasePageUrl;

  $('expHash').textContent = f.sha256;
  $('gotHash').textContent = 'not yet';
  $('gotHash').className = 'mono';

  if (sig.scheme === 'pgp') {
    $('sigBy').textContent = `${f.project}, PGP signature over the published checksum file`;
    $('sigKey').textContent = group(sig.keyFingerprint);
    $('escapeHatch').textContent =
      'Check the same file in Sparrow Wallet, or with gpg, using the commands in cypherpunk mode. Neither needs this page.';
  } else {
    $('sigBy').textContent = `${f.project}, Bitcoin message signature over the checksum block`;
    $('sigKey').textContent = sig.address;
    $('escapeHatch').textContent =
      'Verify the message signature in Sparrow or Electrum against the address above. The checksums are in the release notes. Neither needs this page.';
  }

  const ul = $('keySources');
  ul.textContent = '';
  for (const s of sig.keySources) {
    const li = el('li');
    const a = el('a', s.label);
    a.href = s.url;
    a.rel = 'noopener';
    li.append(a);
    ul.append(li);
  }

  $('cypDl').textContent = [
    `curl -LO ${f.downloadUrl}`,
    `sha256sum ${f.filename}`,
  ].join('\n');

  $('cypVerify').textContent = sig.scheme === 'pgp'
    ? [
        `curl -LO ${sig.signedFileUrl}`,
        `curl -LO ${sig.signatureUrl}`,
        `curl -LO https://raw.githubusercontent.com/SeedSigner/seedsigner/dev/seedsigner_pubkey.gpg`,
        ``,
        `gpg --import seedsigner_pubkey.gpg`,
        `gpg --verify ${sig.signedFile}.sig ${sig.signedFile}`,
        `sha256sum -c ${sig.signedFile} --ignore-missing`,
        ``,
        `# expect: Good signature, key ${sig.keyFingerprint}`,
      ].join('\n')
    : [
        `# The developer signs the checksum block with a Bitcoin message signature.`,
        `# Address: ${sig.address}`,
        `# Verify in Sparrow: Tools, Verify Message. Paste the checksum block from`,
        `# the release notes as the message, and the signature below.`,
        ``,
        sig.signatureB64,
        ``,
        `sha256sum ${f.filename}`,
        `# expect: ${f.sha256}`,
      ].join('\n');

  $('cypRebuild').textContent = [
    `git clone ${f.reproducibleBuild.repo}`,
    `cd ${f.reproducibleBuild.repo.split('/').pop()}`,
    `git checkout ${f.version}`,
    `git submodule init && git submodule update`,
    `docker compose up --force-recreate --build`,
    ``,
    `# the printed SHA256 must equal ${f.sha256}`,
  ].join('\n');

  $('cypCard').textContent = [
    `# Linux or macOS, read the card back and hash what is actually on it.`,
    `# Replace /dev/sdX with your card. Getting this wrong overwrites a disk.`,
    `sudo dd if=/dev/sdX bs=4M count=${Math.ceil(f.sizeBytes / 4194304)} | sha256sum`,
    `# expect: ${f.sha256}`,
  ].join('\n');

  $('cypSite').textContent = [
    `# Check that what your browser received matches the signed manifest.`,
    `git clone https://github.com/bitsagarob/seedsigner-verify`,
    `cd seedsigner-verify && ./make-manifest.sh > /tmp/local.txt`,
    `gpg --verify signatures/manifest.txt.asc signatures/manifest.txt`,
    `diff /tmp/local.txt signatures/manifest.txt`,
  ].join('\n');

  const needs = product.needsDisplaySetting;
  $('displayFix').hidden = !needs;
  if (needs) {
    $('settingsJson').textContent = JSON.stringify(R.displaySettings.settingsJson, null, 4);
  }
}

const group = (fpr) => (fpr.match(/.{1,4}/g) || []).join(' ');

/* ------------------------------------------------------------------- gate */
function unlock(id) { $(id).classList.remove('locked'); }
function lock(id) { $(id).classList.add('locked'); }

function markRail(n) {
  for (const li of document.querySelectorAll('.rail li')) {
    const i = Number(li.dataset.rail);
    li.classList.toggle('done', i < n);
    li.classList.toggle('now', i === n);
  }
}

/* ----------------------------------------------------------------- result */
function showResult(kind, title, lines, extra) {
  const box = $('result');
  box.hidden = false;
  box.className = kind;
  box.textContent = '';

  if (kind === 'ok') box.append(el('span', '✓', 'tick'));
  box.append(el('h3', title));
  for (const l of lines) box.append(el('p', l));

  if (extra) box.append(extra);

  if (kind === 'ok' && document.documentElement.dataset.mode === 'easy') {
    const p = el('p', '', 'howknow');
    const b = el('button', 'How do I know this?');
    b.type = 'button';
    b.addEventListener('click', () => {
      setMode('advanced');
      $('step-2').scrollIntoView({ block: 'center' });
    });
    p.append(b);
    box.append(p);
  }
  box.scrollIntoView({ block: 'center' });
}

function onVerified(computed) {
  $('gotHash').textContent = computed;
  $('gotHash').className = 'mono hit';
  unlock('step-3');
  unlock('step-4');
  markRail(3);
  showResult('ok', 'It is genuine. You are safe to continue.', [
    'This file matches the version the publisher released. Keep it, you need it in the next step.',
  ]);
}

function onMismatch(computed) {
  $('gotHash').textContent = computed;
  $('gotHash').className = 'mono miss';
  lock('step-3');
  lock('step-4');
  markRail(2);

  const known = R.knownFiles.find((k) => k.sha256 === computed);

  if (known && known.kind === 'match') {
    const other = R.products.find((p) => p.firmware === known.firmware);
    showResult('warn', 'That is the file for a different model.', [
      `This is ${known.name}, which is the software for ${other ? other.label : known.firmware}.`,
      `You chose ${product.label}, which needs a different file. Go back to step 1 and use the button there.`,
    ]);
    return;
  }

  if (known && known.kind === 'wrong-board') {
    showResult('warn', 'That is the image for a different board.', [
      `This is ${known.name}, built for the ${known.board}.`,
      'Your device is a Raspberry Pi Zero v1.3. Go back to step 1 and download the file the button points at.',
    ]);
    return;
  }

  showResult('bad', 'Something is wrong with this file. Stop here.', [
    'Do not use it. Download it again using the button in step 1.',
    'If this happens twice, do not continue, and contact me before you go any further.',
  ], detailForBad());
}

function detailForBad() {
  const d = el('div', '', 'adv');
  d.append(el('p', 'Likely causes, in order: the download did not finish, you dropped a file from an older release, or the file was changed between the publisher and you.'));
  d.append(el('p', 'Version pinned here: ' + fw().version + '. If the publisher has released something newer, we may not have checked it yet.'));
  return d;
}

/* ------------------------------------------------------------------- file */
async function handleFile(file) {
  if (!product) return;
  if (!cryptoReady) return;

  $('result').hidden = true;

  if (!/\.(img|zip)$/i.test(file.name)) {
    showResult('warn', 'That does not look like the right file.', [
      'The file you want ends in .img and is the one you downloaded in step 1.',
      'Try again with that one. Nothing is wrong.',
    ]);
    return;
  }

  $('progWrap').hidden = false;
  $('fill').style.width = '0%';
  $('progText').textContent = 'Reading the file. Nothing is being uploaded.';

  try {
    const computed = await hashFile(file, (frac) => {
      $('fill').style.width = (frac * 100).toFixed(1) + '%';
      $('progText').textContent = `Checking… ${Math.round(frac * 100)}%`;
    });
    $('progText').textContent = 'Done.';
    if (computed === fw().sha256) onVerified(computed);
    else onMismatch(computed);
  } catch (e) {
    showResult('bad', 'The file could not be read.', [
      'This usually means it was moved or deleted while we were reading it. Try again.',
    ]);
  }
}

function wireDrop() {
  const drop = $('drop');
  const input = $('file');

  const open = () => input.click();
  $('pick').addEventListener('click', (e) => { e.stopPropagation(); open(); });
  drop.addEventListener('click', open);
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  for (const ev of ['dragenter', 'dragover']) {
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
  }
  for (const ev of ['dragleave', 'drop']) {
    drop.addEventListener(ev, () => drop.classList.remove('over'));
  }
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  });
}

/* --------------------------------------------------------------- trimmings */
function staleness() {
  const days = (Date.now() - Date.parse(R.lastConfirmed)) / 86400000;
  if (days <= R.stalenessWarningAfterDays) return;
  const n = $('staleNotice');
  n.hidden = false;
  n.textContent =
    `We last confirmed this release data on ${R.lastConfirmed}, which is more than ` +
    `${Math.round(days)} days ago. There may be a newer version we have not checked. ` +
    `Compare against the publisher's releases page before you rely on this.`;
}

function mobile() {
  if (matchMedia('(pointer: coarse)').matches && innerWidth < 820) {
    $('mobileNote').hidden = false;
  }
}

function settingsDownload() {
  const box = $('optinDl');
  if (!box) return;
  box.addEventListener('change', () => {
    const link = $('settingsDl');
    link.hidden = !box.checked;
    if (box.checked) {
      const blob = new Blob([JSON.stringify(R.displaySettings.settingsJson, null, 4)],
        { type: 'application/json' });
      link.href = URL.createObjectURL(blob);
    }
  });
}

/* ------------------------------------------------------------------- boot */
async function boot() {
  try { setMode(localStorage.getItem('mode') || 'easy'); } catch { setMode('easy'); }

  R = await (await fetch('release.json')).json();

  $('bitsagaKey').textContent = group(R.bitsagaKey.fingerprint);
  $('footBrand').textContent =
    `Bitsaga · verified release data last confirmed ${R.lastConfirmed}`;

  buildPicker();
  staleness();
  mobile();
  wireDrop();
  settingsDownload();
  markRail(0);

  const test = selfTest();
  const cross = await crossCheck();
  cryptoReady = test.ok && cross.ok;
  if (!cryptoReady) {
    showResult('bad', 'This page cannot verify anything right now.', [
      'Its own hash function failed a self-check, so any result it gave you would be meaningless.',
      `Detail: ${test.ok ? cross.detail : test.detail}`,
      'Do not proceed. Use the terminal commands in cypherpunk mode instead.',
    ]);
    return;
  }

  let saved = null;
  try { saved = localStorage.getItem('product'); } catch {}
  if (saved && R.products.some((p) => p.id === saved)) selectProduct(saved);
}

boot();
