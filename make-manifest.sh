#!/bin/sh
# Print a sha256 manifest of every file that gets served.
#
# Deterministic: sorted by path, paths relative to the repo root, the same
# format sha256sum produces so `sha256sum -c` accepts it directly.
#
# Usage:
#   ./make-manifest.sh > signatures/manifest.txt
#   gpg --detach-sign --armor --output signatures/manifest.txt.asc signatures/manifest.txt
#
# To check a live site against a signed manifest, see UPDATING.md.

set -eu
cd "$(dirname "$0")"

find . -type f \
  -not -path './.git/*' \
  -not -path './signatures/*' \
  -not -name '*.asc' \
  -not -name '*.ots' \
  | sed 's|^\./||' \
  | LC_ALL=C sort \
  | xargs sha256sum
