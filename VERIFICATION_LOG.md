# Verification log

Every value pinned in `release.json` came from the commands below, run on 2026-08-06.
Nothing here was copied from documentation or assumed. If you are Rob, re-run these
yourself before deploy, which is what the `HUMAN CHECKPOINT` line in `release.json` is for.

---

## 1. Stock SeedSigner, Raspberry Pi Zero v1.3

### Which asset

```
curl -s https://api.github.com/repos/SeedSigner/seedsigner/releases/latest
```

Latest release is tag `0.8.7`, published 2026-07-08. Four board images are published:
`pi0`, `pi02w`, `pi2`, `pi4`, each 52,428,800 bytes. The Raspberry Pi Zero v1.3 asset is
`seedsigner_os.0.8.7.pi0.img`. Confirmed against
`seedsigner-os/docs/building.md`, which maps both the Pi Zero and the Pi Zero W to
`seedsigner_os.<tag>.pi0.img`.

### Hash

```
curl -sLO https://github.com/SeedSigner/seedsigner/releases/download/0.8.7/seedsigner_os.0.8.7.pi0.img
sha256sum seedsigner_os.0.8.7.pi0.img
```

```
67f005c7ace26500a78be3f4d97eaf02d76d018550ec54df011741dde1933ce9  seedsigner_os.0.8.7.pi0.img
```

This matches the line for that file in the published `seedsigner.0.8.7.sha256.txt`.

### Signature

The project does **not** publish a detached signature per image. It publishes one checksum
file covering all four images, and a detached signature over that file.

```
curl -sLO https://github.com/SeedSigner/seedsigner/releases/download/0.8.7/seedsigner.0.8.7.sha256.txt
curl -sLO https://github.com/SeedSigner/seedsigner/releases/download/0.8.7/seedsigner.0.8.7.sha256.txt.sig
gpg --import seedsigner_pubkey.gpg
gpg --verify seedsigner.0.8.7.sha256.txt.sig seedsigner.0.8.7.sha256.txt
```

```
gpg: Signature made Tue 07 Jul 2026 05:03:45 PM UTC
gpg:                using RSA key 46739B74B56AD88F14B0882EC7EF709007260119
gpg: Good signature from "seedsigner <btc.hardware.solutions@gmail.com>" [unknown]
Primary key fingerprint: 4673 9B74 B56A D88F 14B0  882E C7EF 7090 0726 0119
```

The "not certified with a trusted signature" warning that gpg prints is expected and is not a
failure. It means the key is not in a web of trust, which is why the page sends you to
independent sources to confirm the fingerprint instead.

### Key provenance

The key used above was compared against the copy the project publishes in its own repository:

```
curl -sLo repo_pubkey.gpg https://raw.githubusercontent.com/SeedSigner/seedsigner/dev/seedsigner_pubkey.gpg
cmp repo_pubkey.gpg seedsigner_pubkey.gpg   # byte-identical
```

Both yield primary fingerprint `46739B74B56AD88F14B0882EC7EF709007260119` and encryption
subkey `7A178C654333F9C4ECB22A6FBAD20F105DEEDE43`.

---

## 2. Smartcard fork, Raspberry Pi Zero v1.3

### Which repo, which asset

This one has a trap. `3rdIteration/seedsigner-os` publishes images tagged
`SeSi-0.8.7+ShSi-B11`, but those are 1 GB `-dev` builds and the latest tag there has no assets
at all. The images users actually want live in the **application** repo,
`3rdIteration/seedsigner`, same tag. Download counts confirm which is which: 48 for the app
repo's pi0 image, 1 for the `-os` repo's.

Pinned asset: `seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img`, 536,870,912 bytes.

### Hash

```
curl -sLO 'https://github.com/3rdIteration/seedsigner/releases/download/SeSi-0.8.7%2BShSi-B11/seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img'
sha256sum seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img
```

```
1b844cffdaa382d32a100d690cc0be5dd1208d23278fe22fea46593f47fb68a0
```

Matches the checksum published in the release notes.

### Signature

This project signs differently. There is no PGP signature. The developer signs the checksum
block in the release notes with a **Bitcoin message signature** in Electrum format, against
the address `37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi`, which is published on his website, YouTube
channel and Reddit profile.

No suitable library was installed on this machine, so the check was done with a
self-contained script kept alongside this log at `tools/verify_btc_msg.py` (pure standard
library, roughly 130 lines, readable in one sitting).

```
python3 verify_btc_msg.py release-body.txt
```

```
[OK] between separators, stripped: header=32 -> {
      "p2pkh-compressed": "19oji5i6CnM2u1Xs1aD1T3RujFAwiCvLHU",
      "p2pkh-uncompressed": "1MuiJi2ysnA83ZwSuNPhf1gKgU5wNRi2Ew",
      "p2sh-p2wpkh": "37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi"
}

MATCH as p2sh-p2wpkh against 37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi
message was 477 bytes
```

Note for anyone reproducing this: the signature carries recovery header 32, which normally
means a compressed P2PKH address, yet the published address is P2SH-segwit. That is an
Electrum convention and it is why several generic "verify bitcoin message" tools report a
mismatch on this signature. The recovered public key is the same either way; only the address
encoding differs. The signed message is the checksum block between the dashed separator lines
in the release notes, stripped of surrounding whitespace, 477 bytes.

---

## 3. Values used for the helpful-error table

Taken from the same two sources as above, used only so the page can say "that is the image for
a Raspberry Pi 4" instead of showing a tampering alarm.

Stock 0.8.7: `pi02w` f38237cd…, `pi2` 9fc7f2ea…, `pi4` 3c2a11a2…
Smartcard B11: `pi02w` 2866932d…, `pi2` f3f870cf…, `pi4` 97324ab5…

---

## 4. The display setting

Read directly from the pinned 0.8.7 source, not from documentation:

- `src/seedsigner/models/settings_definition.py`: `SETTING__DISPLAY_CONFIGURATION = "display_config"`,
  option `DISPLAY_CONFIGURATION__ST7789__320x240 = "st7789_320x240"`, default is `st7789_240x240`,
  and its `visibility` is `VISIBILITY__HARDWARE`, so it sits in a nested hardware submenu.
- `SETTING__PERSISTENT_SETTINGS = "persistent_settings"`, **default `OPTION__DISABLED`**, where
  `OPTION__ENABLED = "E"`.
- `src/seedsigner/models/settings.py`: settings are written to `/mnt/microsd/settings.json` with
  `json.dump(self._data, ...)`, so the file uses full attribute names, not the abbreviated ones.
  `update()` fills any missing key with its default, so a two-key file is valid.

The image was also inspected to confirm a customer can actually write that file:

```
fdisk -l seedsigner_os.0.8.7.pi0.img
```

One partition, FAT16, 51.4 MB, with 17.75 MB free. Readable and writable on Windows, macOS and
Linux without extra tools.

---

## 5. The page's own hash implementation

`sha256.js` was tested against both real images before it was used for anything:

```
node t.mjs
selfTest: {"ok":true,"detail":"4 NIST vectors passed"}
OK   52 MB  pi0.img
OK   537 MB seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img
```

The 512 MiB image is worth calling out: at exactly 536,870,912 bytes its bit length is exactly
2^32, which is the boundary where a naive 32-bit length field silently produces the wrong
digest. It does not here.

In the browser the same code additionally runs the NIST vectors and a cross-check against
`crypto.subtle.digest` at load, and the page refuses to verify anything if either fails.

---

## 6. End-to-end tests

Run against the real files through the real page in Chromium. See `tools/e2e.mjs`.

- Page loads with no console errors and makes no third-party requests.
- Easy mode contains no monospace anywhere.
- Modes switch instantly and persist. Cypherpunk mode hides the sales block.
- Correct stock image gives a green result and unlocks step 3.
- One flipped byte gives the full stop, and step 3 stays locked.
- The smartcard image while "premium" is selected gives a helpful warning naming the real
  problem, not an alarm, and step 3 stays locked.
- The 512 MiB smartcard image verifies correctly in 14.7 seconds and triggers the display
  setting instructions.
- A non-image file gets a gentle correction.
- A phone-sized viewport is told to finish step 3 on a computer.

**Extended 2026-08-31, after `zip.js` was added.** The suite had been testing only paths where a
file is accepted. Every branch that *refuses* a zip was unexercised, which is backwards: those
are the ones that matter if a download is hostile, and a wrong guess inside a zip still produces
a hash. A hash that looks like an answer is worse than an error.

- Nine malformed archives are each refused with the right reason, driven against `zip.js`
  directly: bad signature, too small for a header, sizes in a trailing data descriptor,
  encrypted, unsupported compression method, zip64, truncated download, corrupted deflate
  stream, and an entry shorter than its header claims. A well-formed zip is checked first as a
  positive control, so a harness that refused everything could not pass.
- A corrupt zip dropped on the real page shows a stop, naming the zip as the problem.
- **Firefox 146**, not only Chromium. `zip.js` depends on `DecompressionStream`, and a second
  engine's implementation is the only way to know that dependence is not Chromium-specific. The
  real 327 MB B12 zip verifies green there with no console errors. Safari is still untested; no
  Apple hardware here.
- The suite now refuses to start if its fixtures are missing, naming `tools/fetch-fixtures.sh`,
  which rebuilds all ~900 MB from the publishers' release pages and rejects any file whose hash
  is wrong. Those images cannot live in git and had been wiped once, which previously surfaced
  as an unrelated Playwright stack trace.

---

## 7. Bitsaga signing key

Generated on 2026-08-06 for signing this site's manifests.

```
pub   ed25519 2026-08-06 [SC] [expires: 2031-12-31]
      715E4B76200E7455C8F0AAB4DE395EC9D53D5FF3
uid   Bitsaga (release signing) <releases@bitsaga.be>
```

Where this key is held is not published. See TRUST.md for what its signature does and does not
prove.

---

## 8. The reproducible build, actually run

Run on 2026-08-27. Until this date the page called the reproducible build "the strongest link in
the chain" without anyone here having ever exercised it. Now it has been exercised.

The build was run with `tools/rebuild-stock-0.8.7.sh`, which clones
`SeedSigner/seedsigner-os` at tag `0.8.7`, checks out its submodules, and builds the pi0 image in
the project's own Docker container:

```
SS_ARGS="--pi0 --app-branch=0.8.7" docker compose up --force-recreate --build
```

Refs the build was pinned to:

```
seedsigner-os tag 0.8.7 = d13859392660fe512a753bc14ecd0edc86c35510
seedsigner    tag 0.8.7 = e0a80d4b33b8eb7fb1e9fd14a27b7cd11c7d2cd6
```

Result, verbatim from the build log:

```
=== build starting 2026-08-26T23:31:15Z ===
=== build finished 2026-08-27T00:34:28Z ===
67f005c7ace26500a78be3f4d97eaf02d76d018550ec54df011741dde1933ce9  ./images/seedsigner_os.0.8.7.pi0.img
expected: 67f005c7ace26500a78be3f4d97eaf02d76d018550ec54df011741dde1933ce9
```

The locally built image was then compared against the file downloaded from SeedSigner's own
release page, not just against a recorded number:

```
sha256sum images/seedsigner_os.0.8.7.pi0.img
67f005c7ace26500a78be3f4d97eaf02d76d018550ec54df011741dde1933ce9

cmp images/seedsigner_os.0.8.7.pi0.img seedsigner_os.0.8.7.pi0.img
(no output: identical, byte for byte)
```

**The build reproduces.** The image SeedSigner published is the image their published source
produces. Nobody has to take the hash on this page on trust.

Cost, so anyone deciding whether to repeat it knows what they are in for: 63 minutes wall clock
on 16 cores, about 800 MB of disk, and a Docker install. It is an evening, not a project.

**Correction, 2026-08-31: that 800 MB figure is wrong, or at least badly misleading.** It measured
the leftover buildroot workspace, not what the build actually occupies while running. The
smartcard rebuild in section 10 was measured properly, start to finish, and consumed **23 GB** of
disk, of which only 1.4 GB was the workspace and the rest was Docker's layer cache. Budget tens of
gigabytes for either build, not hundreds of megabytes.

### The one caveat, and it did not bite

The build installs two Python packages from PyPI without pinning a version, `babel` and
`fonttools`, and their output ships inside the image. That is a real hole: a bad day at PyPI is
inside the trust boundary of a build whose whole point is that it does not need one. This run
resolved `babel-2.18.0` and `fonttools-4.63.0` and still produced identical bytes, so the hole is
theoretical today rather than active. It is worth knowing about, and it is upstream's to close,
not ours.

---

## 9. ShieldSigner moved to SeSi-0.8.7+ShSi-B12, and the release became zip-only

Checked 2026-08-29. Stock SeedSigner was still on 0.8.7, so only the smartcard fork moved.

```
curl -s https://api.github.com/repos/SeedSigner/seedsigner/releases | head
0.8.7  2026-07-08   The "Summer of SeedSigner" Release      <- still the latest

curl -s https://api.github.com/repos/3rdIteration/seedsigner/releases | head
SeSi-0.8.7+ShSi-B12      2026-08-21
SeSi-0.8.7+ShSi-B12-pre  2026-08-11  (prerelease)
SeSi-0.8.7+ShSi-B11      2026-07-14  <- what this page had pinned
```

### The signature, checked with this repository's own tool

```
python3 tools/verify_btc_msg.py tools/release-body-SeSi-0.8.7_ShSi-B12.txt

[OK] between separators, stripped: header=31 -> {
      "p2pkh-compressed": "19oji5i6CnM2u1Xs1aD1T3RujFAwiCvLHU",
      "p2pkh-uncompressed": "1MuiJi2ysnA83ZwSuNPhf1gKgU5wNRi2Ew",
      "p2sh-p2wpkh": "37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi"
}

MATCH as p2sh-p2wpkh against 37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi
message was 600 bytes
```

Same address as B11, same Electrum framing, so no new key had to be established.
The full release body is kept at `tools/release-body-SeSi-0.8.7_ShSi-B12.txt`.

### The image hash, downloaded and computed rather than copied

```
sha256sum seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img
1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6

signed release notes say:
1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6
```

### What changed structurally: there is no .img to download any more

B11 published both a 536870912 byte `.img` and a `.img.zip`, for every board. B12 publishes
**only the `.zip`**, again for every board. `3rdIteration/seedsigner-os` at the B12 tag carries
zero assets, so there is no bare `.img` anywhere to point at.

```
B11 assets:  ...pi0-smartcard.img      536870912
             ...pi0-smartcard.img.zip  326954255
B12 assets:  ...pi0-smartcard.img.zip  326996688      (no .img)
```

That breaks the rule this page was built on, point at the `.img` and never at the `.zip`, which
existed because the developer signs the hash of the `.img` and never of the `.zip`. The `.zip`
has no publisher-published hash, so pointing at it and printing our own number would have meant
asking the reader to trust Bitsaga, which is the one thing the page is arguing against.

Resolved by teaching the page to look inside the zip instead, in `zip.js`. It reads the local
file header, streams the entry through the browser's own `DecompressionStream('deflate-raw')`,
and hashes the decompressed bytes with the streaming SHA-256 that was already here. The number
it compares is therefore still the developer-signed hash of the `.img`. Nothing is written to
disk and nothing is held whole in memory.

The reader is deliberately narrow: one entry, deflate or stored, sizes present in the local
header, no zip64. It refuses anything else with a message rather than guessing, because a wrong
guess would still produce a hash, and a hash that looks like an answer is worse than an error.
The B12 zips are exactly that shape:

```
local header: sig 04034b50  flags 0x0000  method 8 (deflate)
              csize 326996434  usize 536870912  entries 1  (not zip64)
```

### Tests

`node tools/e2e.mjs`, all pass, including three new cases: the zip verifying green for a
smartcard buyer, a zip refused for a product whose release still ships a bare `.img`, and a
genuine B11 image reported as a superseded release rather than as tampering.

```
6b. Smartcard zip, correct product (327 MB zip, 512 MiB inside)
  OK   green result from inside the zip
       unzipped and hashed in 15.4s
6c. Zip dropped while a stock product is selected
  OK   gentle correction, not an alarm
  OK   says it is the compressed version
6d. Superseded B11 image, smartcard product
  OK   a genuine older file is not treated as tampering
  OK   says it is an older release

ALL PASS
```

Reading the zip costs nothing measurable: 15.4s against 15.1s for the same image as a plain
`.img`, on the same machine.

### Not verified

The smartcard reproducible build still has not been run. `buildArgs` now carries the command
the developer publishes in the B12 notes verbatim, including `--app-repo=`, rather than the
adapted `--pi0` variant that was there before and had never been executed either. It is
documented, not tested. The stock rebuild in section 8 remains the only one actually run.

The staleness window was cut from 180 days to 45. B12 landed eight days after the previous
`lastConfirmed` date, so at 180 days the page would not have warned anyone until roughly
February 2027. The fork's recent cadence is B9 in March, B10 in April, B11 in July, B12 in
August, so 45 days matches how often this actually moves. No new process was added: it is still
the visitor's own clock doing the comparison, and nothing runs in the background.

---

## 10. The smartcard reproducible build, actually run, and it PASSES

Run 2026-08-31, the first time anyone had executed it. Until now the page's cypherpunk claim,
that you can rebuild the firmware yourself and get the same bytes, was proven for stock 0.8.7
only. The smartcard half was documented and untested, which on a page arguing you should not have
to trust anyone is exactly the wrong kind of gap.

`tools/rebuild-smartcard-B12.sh`, scope `--pi0` only:

```
SS_ARGS="--pi0 --smartcard --app-repo=https://github.com/3rdIteration/seedsigner --app-branch=SeSi-0.8.7+ShSi-B12" \
  sudo -E docker compose up --force-recreate --build

=== build starting 2026-08-31T12:35:09Z ===
=== build finished 2026-08-31T13:57:26Z ===
```

The build's own output, and then the same file hashed independently afterwards:

```
sha256sum images/seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img
1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6
expected:
1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6
```

And, as with stock, compared against the file actually downloaded from the developer's release
page rather than only against a recorded number:

```
cmp images/seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img \
    seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img
(no output: identical, byte for byte)
```

**The build reproduces.** Both firmwares this page pins are now independently rebuilt and
confirmed. Nobody has to take either hash on trust.

A small detail that is itself evidence of reproducibility discipline: the resulting file carries a
fixed timestamp of 2025-07-01 rather than the time it was built, so two builds on different days
still produce identical bytes.

### Cost, measured rather than estimated

82 minutes wall clock on 16 cores. **23 GB of disk consumed**, of which the buildroot workspace was
1.4 GB and the remainder was Docker's layer cache. Docker required, and root, since the build calls
docker compose. Longer and heavier than the stock build, which is expected: the smartcard image is
512 MiB against stock's 50 MiB.

### Why --pi0 and not the --all the release notes print

The B12 notes publish `--all`, which builds five boards. The same notes also say La Frite and
Luckfox "still have a few things that need to be tweaked for full reproducibility. Pi versions are
reproducible as normal." Following `--all` would therefore produce mismatches upstream already
knows about, on boards Bitsaga does not ship, and a reader hitting those would reasonably conclude
their download had been tampered with. `release.json` now carries the `--pi0` command that was
actually executed here, so what the page prints is what has been tested.

The printed command also now says that docker needs root unless the user is in the docker group.
That cost real time during this run, and it is the same class of defect as the `--no-op` bug found
in section 8: instructions that cannot be followed as written.

### Still not verified

Nothing on the reproducible-build claim. Both firmwares are now covered.
The unpinned-PyPI concern from section 8 applies here too and remains upstream's to close.

---

## 11. ShieldSigner moved to SeSi-0.8.7+ShSi-B13

Checked 2026-10-10. Stock SeedSigner is still on 0.8.7, so again only the smartcard fork moved.

```
gh release list -R SeedSigner/seedsigner
0.8.7                    2026-07-08  Latest

gh release list -R 3rdIteration/seedsigner
SeSi-0.8.7+ShSi-B13      2026-10-06  Latest
SeSi-0.8.7+ShSi-B13-pre  2026-09-24  Pre-release
SeSi-0.8.7+ShSi-B12      2026-08-21  <- what this page had pinned
```

B13 matters for buyers, not only for freshness. Its notes list a crafted-PSBT verification
bypass closed for multisig outputs (upstream #1044) and a fix for multisig signing with
Satochip cards.

### The signature, checked with this repository's own tool

The full release body is kept at `tools/release-body-SeSi-0.8.7_ShSi-B13.txt`.

```
python3 tools/verify_btc_msg.py tools/release-body-SeSi-0.8.7_ShSi-B13.txt

signature from the release notes: IH6xlTcrqQfR4KkdduZgiOOc73rqIhw45OYNUyTQNtBETKnYr+n/VskbdN6NEvxrMeOPBVher7mUGR9XYeFEzhA=
[OK] between separators, stripped: header=32 -> {
      "p2pkh-compressed": ...,
      "p2pkh-uncompressed": ...,
      "p2sh-p2wpkh": "37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi"
}

MATCH as p2sh-p2wpkh against 37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi
message was 1365 bytes
```

Same address as B11 and B12, same framing, so no new key had to be established.

The tool had to change first, and failed closed rather than open. B13's separator lines no
longer end in a space, so the script printed "could not locate the separator lines". It also
carried the B12 signature hardcoded, which UPDATING.md told the reader to edit by hand. It now
matches the separator either way and reads the signature out of the release notes. The address
stays fixed in the script, because it is the trust anchor and the signature is not. Re-run on
the two older bodies after the change, both still verify:

```
B11: MATCH as p2sh-p2wpkh, message was 477 bytes
B12: MATCH as p2sh-p2wpkh, message was 600 bytes
```

### The image hash, downloaded and computed rather than copied

```
curl -LO .../SeSi-0.8.7%2BShSi-B13/seedsigner_os.SeSi-0.8.7_ShSi-B13_.pi0-smartcard.img.zip
314179794 bytes

sha256 of the .img inside the zip:
59fcd057bc4e4f8c4933253bb0f1e477c4ff58eff88cd2fa532d6f55bca4ea26

signed release notes say:
59fcd057bc4e4f8c4933253bb0f1e477c4ff58eff88cd2fa532d6f55bca4ea26
```

The zip is the same shape as B12's, so `zip.js` needed no change:

```
local header: sig 04034b50  flags 0x0000  method 8 (deflate)
              csize 314179540  usize 536870912  entries 1  (not zip64)
```

### What changed in release.json

B13 is the `match`. The B12 image is demoted to `old-version`, not deleted, so a buyer still
holding it is told it is an older release rather than shown a tampering alarm. The four other
B13 boards are added as `wrong-board`. `lastConfirmed` is 2026-10-10, so the staleness warning
fires after 2026-11-24.

### The rebuild claim, held back until it is true

The page said "We rebuilt this image on 2026-08-31" for the smartcard firmware. That was true
of B12 and would be false of B13, which nobody here has rebuilt. `reproducibleBuild.confirmed`
is therefore removed from the smartcard entry, and `app.js` now shows the two "we rebuilt it"
lines only when that field exists for the version on the page. Stock keeps its claim, because
0.8.7 is the release that was actually rebuilt. The rebuild command itself still shows, so
anyone can run it.

`tools/rebuild-smartcard-B13.sh` is the B12 script with the tag and the expected hash changed.
Running it and recording the result here is what puts the claim back. The B13 notes say the
developer rebuilt every production image byte for byte. That is the developer's claim, not ours, so the
page does not repeat it.

### Tests

`./tools/fetch-fixtures.sh` now fetches B13 as the current release and B12 as the older one.
`node tools/e2e.mjs`: all pass. One new case, 2b, checks that stock shows its rebuild and that
the smartcard firmware claims none before one is run.

```
2b. Rebuild claim only for a release we rebuilt
  OK   stock shows the rebuild it actually had
  OK   smartcard claims no rebuild before one is run
6b. Smartcard zip, correct product (314 MB zip, 512 MiB inside)
  OK   green result from inside the zip
6d. Superseded B12 image, smartcard product
  OK   a genuine older file is not treated as tampering
  OK   says it is an older release
10. Firefox, the real B13 zip end to end
  OK   the real smartcard zip verifies green in Firefox

ALL PASS
```

### Not verified

The B13 reproducible build. Until `tools/rebuild-smartcard-B13.sh` has been run, the page makes
no rebuild claim for this release.

## 12. Step 5, hardware reference images (2026-10-12)

The page gained a fifth step: reference images to compare a buyer's boards against.

**Plus screen board.** Drawn from the designer's own Gerber files in
`3rdIteration/seedsigner-hardware` at commit `7e4f05816bac9b20943996b960d65f37322d617e`,
`display_hats/plus_hat/designspark_format/` (CERN-OHL-S v2). `tools/render-plus-hat.mjs` with
`pcb-stackup@4` was run twice and produced the same bytes both times:

    3cc17d3279c1a8517eb85d449f1e51214f03fb2b2070069042b43deb08bceb03  hw/plus-hat-front.svg
    a204341123f7aae918261916b7eaf27856cc087e5965fd075b602f949ea1ddc4  hw/plus-hat-back.svg

The only change to pcb-stackup's output is moving its `<style>` colours onto attributes, because
the page's CSP forbids inline styles.

**Pi Zero.** Raspberry Pi publishes no board layout for the Pi Zero, so the reference is two
Wikimedia Commons photos (v1.3 by Horst-Josef, WH by the Raspberry Pi Foundation, both
CC BY-SA 4.0), warped onto one 65 x 30 mm frame by `tools/align-pi-photos.sh`. The four
mounting-hole centres were picked by hand; the script holds them. Source photo
`Raspberry_Pi_Zero_1.3.jpg` hashed `341d1e5a6f35becb36647964671a55af102138d5d98ce7f662b170cd19d0865d`.

**Pi Zero backs (added the same day).** One Commons photo by Ubahnverleih shows both backs
(`Raspberry_Pi_Zero_W_vs_Zero_(backside).jpeg`, CC BY-SA 4.0, sha256
`5de02cb51319b6959aa10129c04ff21fc76105605fb96e1ecbfe156edd6603a9`). Each board is cut out and
flattened with the same four-hole method; the board is flat on this side, so the warp is clean.
The giveaway is the print: "Raspberry Pi Zero V1.3" against "Raspberry Pi Zero W V1.1" with an FCC ID
and a line crediting the antenna licence.

**Waveshare 1.3 inch board.** No open-licence photo and no layout exist. A first version showed a
card of the parts and pins; Rob found it confusing, so it was replaced the same day by a vector
redrawing of Waveshare's two product photos (`tools/trace-waveshare.mjs`): each photo flattened on
its mounting holes, flat features traced with potrace, tall parts drawn to measured size. The
resistor markings read off the back photo (100, 103, 102) agree with the schematic values
(10 ohm, 10k, 1k). A wider search (Waveshare, LCSC, Amazon, retailers, SeedSigner docs) found no
straight-on photo of the back at any useful size; the front now comes from Waveshare's 1700 px
Amazon photo, which is nearly straight on. Two print versions exist: newer boards add the word
"Waveshare" under the logo and a QC sticker.

### Not verified

- The Waveshare drawing has not been compared with a physical board. Source photos are 1024 px,
  so positions can be off by a fraction of a millimetre, and the traces that run under the
  header and the screen are not drawn.
- The part marks were placed by eye on these two photos and the Gerber drawing. They are a guide.
- "Power Only, Data Pins Disabled" is the designer's silkscreen text. Nobody here has traced the
  USB-C data pads on the copper layers.
- The newer KiCad version of the Plus board (6-pin USB-C) is not drawn.
