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
