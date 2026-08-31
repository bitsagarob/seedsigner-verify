#!/bin/bash
# Fetch the real firmware images tools/e2e.mjs tests against.
#
# These are ~900 MB of published release images, so they cannot live in git, and
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
B12_ZIP=seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img.zip
B12_IMG=seedsigner_os.SeSi-0.8.7_ShSi-B12_.pi0-smartcard.img
B12_SHA=1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6
B11_IMG=seedsigner_os.SeSi-0.8.7_ShSi-B11_.pi0-smartcard.img
B11_SHA=1b844cffdaa382d32a100d690cc0be5dd1208d23278fe22fea46593f47fb68a0

have() { [ -f "$1" ] && [ "$(sha256sum "$1" | cut -d' ' -f1)" = "$2" ]; }

get() { # url, dest, expected sha
  if have "$2" "$3"; then echo "ok   $2"; return; fi
  echo "get  $2"
  curl -fsSL -o "$2" "$1"
  have "$2" "$3" || { echo "FAIL $2 hash mismatch, refusing to use it" >&2; exit 1; }
}

get "https://github.com/SeedSigner/seedsigner/releases/download/0.8.7/$STOCK" pi0.img "$STOCK_SHA"
get "https://github.com/3rdIteration/seedsigner/releases/download/SeSi-0.8.7%2BShSi-B11/$B11_IMG" "$B11_IMG" "$B11_SHA"

# B12 ships only as a zip, which is the whole reason zip.js exists. Keep both the
# zip and the image inside it: the suite checks that either one verifies.
if ! have "$B12_IMG" "$B12_SHA"; then
  echo "get  $B12_ZIP"
  curl -fsSL -o "$B12_ZIP" \
    "https://github.com/3rdIteration/seedsigner/releases/download/SeSi-0.8.7%2BShSi-B12/$B12_ZIP"
  python3 - "$B12_ZIP" "$B12_IMG" <<'PY'
import shutil, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z, open(sys.argv[2], 'wb') as out:
    with z.open(z.namelist()[0]) as f:
        shutil.copyfileobj(f, out, 8 << 20)
PY
  have "$B12_IMG" "$B12_SHA" || { echo "FAIL $B12_IMG hash mismatch" >&2; exit 1; }
else
  echo "ok   $B12_IMG"
fi
[ -f "$B12_ZIP" ] || { echo "get  $B12_ZIP"; curl -fsSL -o "$B12_ZIP" \
  "https://github.com/3rdIteration/seedsigner/releases/download/SeSi-0.8.7%2BShSi-B12/$B12_ZIP"; }
echo "ok   $B12_ZIP"

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
