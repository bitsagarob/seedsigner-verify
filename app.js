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
  advanced: 'SeedSigner. Every value and command is here, so you can check it against their own release.',
  cypherpunk: 'Nobody. Rebuild the firmware from source and derive the hash yourself.',
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
  paintTime();
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
    const img = el('img');
    img.src = p.image;
    img.alt = '';          // decorative: the label beside it carries the meaning
    img.loading = 'lazy';
    b.append(img);
    b.append(el('b', p.label));
    b.append(el('span', p.look));
    if (p.runs) b.append(el('span', p.runs, 'runs'));
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
  $('relNotes').href = f.releasePageUrl;
  $('relIssues').href = f.reproducibleBuild.repo.replace('-os', '') + '/issues';

  $('expHash').textContent = f.sha256;
  $('gotHash').textContent = 'not yet';
  $('gotHash').className = 'mono';

  if (sig.scheme === 'pgp') {
    $('sigBy').textContent = `${f.project}, PGP signature over the published checksum file`;
    $('sigKey').textContent = group(sig.keyFingerprint);
    $('escapeHatch').textContent =
      'Check the same file in Sparrow Wallet, or with gpg using the commands below. Neither needs this page.';
  } else {
    $('sigBy').textContent = `${f.project}, Bitcoin message signature over the checksum block`;
    $('sigKey').textContent = sig.address;
    $('escapeHatch').textContent =
      'Verify the message signature in Sparrow or Electrum against the address above, using the details below. Neither needs this page.';
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

  $('advDl').textContent = [
    `curl -LO ${f.downloadUrl}`,
    `sha256sum ${f.filename}`,
  ].join('\n');

  $('advVerify').textContent = sig.scheme === 'pgp'
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
        `# ${f.project}: the developer signs the checksum block with a Bitcoin message signature.`,
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

  $('cypWrite').textContent = [
    `# Linux. Find the card first and be certain: lsblk`,
    `sudo dd if=${f.filename} of=/dev/sdX bs=4M status=progress conv=fsync`,
    ``,
    `# macOS. diskutil list to find it, note the r in rdiskN for speed.`,
    `diskutil unmountDisk /dev/diskN`,
    `sudo dd if=${f.filename} of=/dev/rdiskN bs=4m status=progress`,
  ].join('\n');

  $('cypTelemetry').textContent = [
    `# Linux`,
    `rpi-imager --disable-telemetry`,
    ``,
    `# macOS`,
    `defaults write org.raspberrypi.Imager.plist telemetry -bool NO`,
    ``,
    `# Windows`,
    `reg add "HKCU\\Software\\Raspberry Pi\\Imager" /v telemetry /t REG_DWORD /d 0`,
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

  // Name the actual file in the caption, so nobody has to guess in a file picker.
  $('capFile').textContent = `: ${f.filename}`;

  paintTime();

  const needs = product.needsDisplaySetting;
  $('displayFix').hidden = !needs;
  if (needs) {
    $('settingsJson').textContent = JSON.stringify(R.displaySettings.settingsJson, null, 4);
  }
}

/* Fifteen minutes is only true for one of the two images, and not at all if you
   are rebuilding from source. */
function timeEstimate() {
  const mode = document.documentElement.dataset.mode;
  if (mode === 'cypherpunk') return 'An hour or more if you rebuild from source.';
  if (!product) return 'About 10 minutes, plus the download.';
  const mb = Math.round(fw().sizeBytes / 1048576);
  return `About 10 minutes, plus a ${mb} MB download.`;
}

function paintTime() {
  const t = timeEstimate();
  for (const id of ['timeEst', 'timeEst2']) { const e = $(id); if (e) e.textContent = t; }
}

const group = (fpr) => (fpr.match(/.{1,4}/g) || []).join(' ');

/* ------------------------------------------------------------------- gate */
/* The rail says where you are, not what you have completed. Nothing on this page
   is ever disabled: someone may legitimately want to read step 3 before they have
   checked a file, or come back to step 4 later. */
function wireScrollSpy() {
  const steps = [1, 2, 3, 4].map((n) => ({ n, el: $(`step-${n}`) }));

  const update = () => {
    const line = innerHeight * 0.35;   // a band a third down the viewport
    let current = null;
    for (const s of steps) {
      const box = s.el.getBoundingClientRect();
      if (box.top <= line) current = s.n;
    }
    for (const li of document.querySelectorAll('.rail li')) {
      li.classList.toggle('now', Number(li.dataset.rail) === current);
    }
  };

  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', () => requestAnimationFrame(update), { passive: true });
  update();
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
  showResult('ok', 'It is genuine.', [
    `This file matches exactly what ${fw().project.split(' (')[0]} released. Keep it, you need it in the next step.`,
  ]);
}

function onMismatch(computed) {
  $('gotHash').textContent = computed;
  $('gotHash').className = 'mono miss';

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
    'Do not use it. Download it again, straight from SeedSigner, and check it here once more.',
    'If it fails a second time, stop and get in touch before you go any further.',
  ], helpForBad());
}

/* The most alarming screen on the page had no way out of it. Order matters: a
   fresh download from source fixes the common case, and only then do we ask
   someone to write in. */
function helpForBad() {
  const d = el('div');

  const links = el('p', '', 'helplinks');
  const a1 = el('a', 'Download again from SeedSigner');
  a1.href = fw().releasePageUrl; a1.target = '_blank'; a1.rel = 'noopener';
  const a2 = el('a', 'Email contact@bitsaga.be');
  a2.href = 'mailto:contact@bitsaga.be?subject=SeedSigner%20file%20did%20not%20check%20out';
  const a3 = el('a', 'Book a call');
  a3.href = 'https://cal.com/bitsaga'; a3.target = '_blank'; a3.rel = 'noopener';
  links.append(a1, a2, a3);
  d.append(links);

  d.append(detailForBad());
  return d;
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

  if (/\.zip$/i.test(file.name)) {
    showResult('warn', 'That is the compressed version.', [
      'Some releases publish a smaller .zip next to the .img. We check the .img itself,',
      'so go back to step 1 and use the download button there. Nothing is wrong with your file.',
    ]);
    return;
  }

  if (!/\.img$/i.test(file.name)) {
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
  wireScrollSpy();
  settingsDownload();

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
