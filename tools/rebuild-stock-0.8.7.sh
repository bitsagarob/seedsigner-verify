#!/bin/bash
# Independently rebuild SeedSigner 0.8.7 for the Pi Zero and compare the hash
# against the published release. Reproducible build attestation for verify.bitsaga.be.
set -euo pipefail
mkdir -p /home/rob/ss-rebuild
cd /home/rob/ss-rebuild
export DOCKER_DEFAULT_PLATFORM=linux/amd64
export BOARD_TYPE=pi0
export RELEASE_TAG=0.8.7

if [ ! -d seedsigner-os ]; then
  git clone -q https://github.com/SeedSigner/seedsigner-os
fi
cd seedsigner-os
git fetch -q --all --tags
git checkout -q "$RELEASE_TAG"
git submodule init -q
git submodule update -q

echo "=== build starting $(date -u +%FT%TZ) ==="
SS_ARGS="--$BOARD_TYPE --app-branch=$RELEASE_TAG" sudo -E docker compose up --force-recreate --build
echo "=== build finished $(date -u +%FT%TZ) ==="

find . -name "seedsigner_os.*.img" -newermt "-6 hours" -print0 | xargs -0 -r sha256sum
echo "expected: 67f005c7ace26500a78be3f4d97eaf02d76d018550ec54df011741dde1933ce9"
