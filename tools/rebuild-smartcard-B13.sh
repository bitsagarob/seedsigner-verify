#!/bin/bash
# Independently rebuild ShieldSigner SeSi-0.8.7+ShSi-B13 for the Pi Zero and compare
# the hash against the published release. Reproducible build attestation for
# verify.bitsaga.be, the smartcard half of the claim that stock already proved.
#
# Scope is --pi0 only, not the --all the release notes print. The B13 notes say every
# board now reproduces, but Bitsaga ships the Pi Zero only, and --all builds five
# boards for one answer. The same command reproduced B12 on 2026-08-31 in 82 minutes.
#
# This box runs live services and the build will use every core. Note that nicing
# the docker CLI would not help: the work runs under dockerd, not as a child of
# this script. The stock 0.8.7 rebuild ran here on 2026-08-27 without incident,
# which is the only evidence either way. Stop it if the live apps go sluggish.
set -euo pipefail
mkdir -p /home/rob/ss-rebuild
cd /home/rob/ss-rebuild
export DOCKER_DEFAULT_PLATFORM=linux/amd64
export BOARD_TYPE=pi0
export RELEASE_TAG='SeSi-0.8.7+ShSi-B13'
export APP_REPO=https://github.com/3rdIteration/seedsigner
EXPECTED=59fcd057bc4e4f8c4933253bb0f1e477c4ff58eff88cd2fa532d6f55bca4ea26

if [ ! -d seedsigner-os-smartcard ]; then
  git clone -q https://github.com/3rdIteration/seedsigner-os seedsigner-os-smartcard
fi
cd seedsigner-os-smartcard
git fetch -q --all --tags
git checkout -q "$RELEASE_TAG"
git submodule init -q
git submodule update -q

df -h / | tail -1
echo "=== build starting $(date -u +%FT%TZ) ==="
SS_ARGS="--$BOARD_TYPE --smartcard --app-repo=$APP_REPO --app-branch=$RELEASE_TAG" \
  sudo -E docker compose up --force-recreate --build
echo "=== build finished $(date -u +%FT%TZ) ==="
df -h / | tail -1

find . -name "seedsigner_os.*smartcard*.img" -newermt "-8 hours" -print0 | xargs -0 -r sha256sum
echo "expected: $EXPECTED"
