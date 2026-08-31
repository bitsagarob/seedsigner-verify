#!/bin/bash
# Independently rebuild ShieldSigner SeSi-0.8.7+ShSi-B12 for the Pi Zero and compare
# the hash against the published release. Reproducible build attestation for
# verify.bitsaga.be, the smartcard half of the claim that stock already proved.
#
# Scope is --pi0 only, not the --all the release notes print. The B12 notes say La
# Frite and Luckfox are not yet fully reproducible, so --all would produce an
# expected mismatch that tells us nothing about the board Bitsaga actually ships.
#
# niced because this box runs live services.
set -euo pipefail
mkdir -p /home/rob/ss-rebuild
cd /home/rob/ss-rebuild
export DOCKER_DEFAULT_PLATFORM=linux/amd64
export BOARD_TYPE=pi0
export RELEASE_TAG='SeSi-0.8.7+ShSi-B12'
export APP_REPO=https://github.com/3rdIteration/seedsigner
EXPECTED=1c9f8a1c84b3e626986b62d7ab847126fcb1c5bcd6a96ee15a4be2f76ecbeab6

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
  nice -n 10 sudo -E docker compose up --force-recreate --build
echo "=== build finished $(date -u +%FT%TZ) ==="
df -h / | tail -1

find . -name "seedsigner_os.*smartcard*.img" -newermt "-8 hours" -print0 | xargs -0 -r sha256sum
echo "expected: $EXPECTED"
