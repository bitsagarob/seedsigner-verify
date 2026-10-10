#!/bin/bash
# Fetch the real firmware images tools/e2e.mjs tests against.
#
# These are ~1.5 GB of published release images, so they cannot live in git, and
# they have been wiped at least once (2026-08-31), which made the test suite die
# with an unrelated Playwright stack trace. This script rebuilds them from the
# publishers' own release pages and refuses to accept a file whose hash is wrong.
#
# Idempotent: run it as often as you like, it only downloads what is missing or
# corrupt. Needs no sudo.
set -euo pipefail
DIR=${SS_FIXTURES:-/home/rob/ss-check}
mkdir -p "$DIR"
cd "$DIR"

STOCK=seedsigner_os.0.8.7.pi0.img          # downloaded under this name, used as pi0.img
STOCK_SHA=67f005c7ace26500a78be3f4d97eaf02d76d018550ec54df011741dde1933ce9
B13_ZIP=seedsigner_os.SeSi-0.8.7_ShSi-B13_.pi0-smartcard.img.zip
B13_IMG=seedsigner_os.SeSi-0.8.7_ShSi-B13_.pi0-smartcard.img
B13_SHA=59fcd057bc4e4f8c4933253bb0f1e477c4ff58eff88cd2fa532d6f55bca4ea26
B12_ZIP=seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img.zip
B12_IMG=seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img
B12_SHA=1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6

have() { [ -f "$1" ] && [ "$(sha256sum "$1" | cut -d' ' -f1)" = "$2" ]; }

get() { # url, dest, expected sha
  if have "$2" "$3"; then echo "ok   $2"; return; fi
  echo "get  $2"
  curl -fsSL -o "$2" "$1"
  have "$2" "$3" || { echo "FAIL $2 hash mismatch, refusing to use it" >&2; exit 1; }
}

get "https://github.com/SeedSigner/seedsigner/releases/download/0.8.7/$STOCK" pi0.img "$STOCK_SHA"

# From B12 ShieldSigner ships only as a zip, which is the whole reason zip.js
# exists. The current release (B13) is kept as both the zip and the image inside
# it, since the suite checks that either one verifies. The previous release (B12)
# is the genuine-but-older case, so only its image is kept.
unzip_to() { # zip, image, expected sha
  python3 - "$1" "$2" <<'PY'
import shutil, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z, open(sys.argv[2], 'wb') as out:
    with z.open(z.namelist()[0]) as f:
        shutil.copyfileobj(f, out, 8 << 20)
PY
  have "$2" "$3" || { echo "FAIL $2 hash mismatch, refusing to use it" >&2; exit 1; }
}

REL=https://github.com/3rdIteration/seedsigner/releases/download
[ -f "$B13_ZIP" ] || { echo "get  $B13_ZIP"; curl -fsSL -o "$B13_ZIP" "$REL/SeSi-0.8.7%2BShSi-B13/$B13_ZIP"; }
if have "$B13_IMG" "$B13_SHA"; then echo "ok   $B13_IMG"; else unzip_to "$B13_ZIP" "$B13_IMG" "$B13_SHA"; fi
echo "ok   $B13_ZIP"

if have "$B12_IMG" "$B12_SHA"; then
  echo "ok   $B12_IMG"
else
  echo "get  $B12_ZIP"
  curl -fsSL -o "$B12_ZIP" "$REL/SeSi-0.8.7%2BShSi-B12/$B12_ZIP"
  unzip_to "$B12_ZIP" "$B12_IMG" "$B12_SHA"
  rm -f "$B12_ZIP"
fi

# Derived fixtures. One flipped byte is the tamper case; the text file is the
# wrong-file-type case.
if ! [ -f tampered.img ] || cmp -s tampered.img pi0.img; then
  cp pi0.img tampered.img
  python3 - <<'PY'
f = open('tampered.img', 'r+b'); f.seek(1000)
b = f.read(1); f.seek(1000); f.write(bytes([b[0] ^ 1])); f.close()
PY
  echo "made tampered.img"
else
  echo "ok   tampered.img"
fi
[ -f notanimage.txt ] || echo notanimage > notanimage.txt
echo "ok   notanimage.txt"

echo
echo "fixtures ready in $DIR"
du -sh "$DIR"
