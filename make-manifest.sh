#!/bin/sh
# Print a sha256 manifest of every file that gets served.
#
# Deterministic: sorted by path, paths relative to the repo root, the same
# format sha256sum produces so `sha256sum -c` accepts it directly.
#
# Usage:
#   ./make-manifest.sh > signatures/manifest.txt
#   gpg --detach-sign --armor --local-user 715E4B76200E7455C8F0AAB4DE395EC9D53D5FF3 \
#       --output signatures/manifest.txt.asc signatures/manifest.txt
#
# If the release key is in its own keyring, set GNUPGHOME first (see UPDATING.md).
#
# To check a live site against a signed manifest, see UPDATING.md.

set -eu
cd "$(dirname "$0")"

find . -type f \
  -not -path './.git/*' \
  -not -path './signatures/*' \
  -not -name '*.asc' \
  -not -name '*.ots' \
  -not -name '*.pyc' \
  | sed 's|^\./||' \
  | LC_ALL=C sort \
  | xargs sha256sum
