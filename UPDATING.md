# Updating

Two things happen here: pinning a new firmware release, and cutting a signed release of the
site itself. They are independent.

---

## A new firmware release

There is deliberately no watcher process. Processes that ping on change die silently and you
find out months later. Instead the page carries `lastConfirmed` in `release.json` and compares
it to the visitor's own clock: past `stalenessWarningAfterDays` it tells every visitor, you
included, that the data may be out of date. Nothing is running, so nothing can fail quietly.

When you hear about a new release, or the page starts warning:

**1. Find the real asset.**

```
curl -s https://api.github.com/repos/SeedSigner/seedsigner/releases/latest | grep browser_download_url
curl -s https://api.github.com/repos/3rdIteration/seedsigner/releases?per_page=1
```

For ShieldSigner, images live in `3rdIteration/seedsigner`, **not** in
`3rdIteration/seedsigner-os`. That repo publishes 1 GB `-dev` builds and sometimes tags with no
assets at all. Check download counts if unsure.

**2. Download and hash both images.**

```
sha256sum seedsigner_os.<version>.pi0.img
sha256sum seedsigner_os.<version>.pi0-smartcard.img
```

**3. Verify the signatures. Do not skip this.**

Stock, PGP over the checksum file:

```
gpg --verify seedsigner.<version>.sha256.txt.sig seedsigner.<version>.sha256.txt
```

Expect `Good signature` and fingerprint `46739B74B56AD88F14B0882EC7EF709007260119`.

ShieldSigner, Bitcoin message signature over the checksum block in the release notes:

```
python3 tools/verify_btc_msg.py release-body.txt
```

Expect a match against `37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi`. Update the address and signature
in that script if the developer publishes new ones, and confirm any new address against his
website, YouTube and Reddit before trusting it.

**4. Edit `release.json`.** Version, filename, size, sha256, download URL, release page URL,
published date, signature block. Move the outgoing hashes into `knownFiles` with kind
`old-version` so anyone still holding the previous image gets a helpful message rather than a
tampering alarm. Add the new other-board hashes as `wrong-board`. Update `lastConfirmed`.

**5. Append to VERIFICATION_LOG.md**, with the commands and their real output.

**5b. Update the two version badges** at the top of README.md, the `stock` one and the
`ShieldSigner` one. They are the only badges that carry a value which can go stale; the rest
state structural facts about this repository that stay true, which is why none of them claim a
test result. There is no CI here, so a green badge asserting something that is only checked by
hand would be exactly the kind of unverifiable claim this project argues against.

**6. Run the tests** against the new images: `node tools/e2e.mjs`.

**7. Cut a signed release**, below.

---

## Cutting a signed release of the site

```
./make-manifest.sh > signatures/manifest.txt
gpg --detach-sign --armor --output signatures/manifest.txt.asc signatures/manifest.txt
git add -A
git commit -m "release: <what changed>"
git tag -s site-$(date +%Y-%m-%d) -m "signed site release"
git push && git push --tags
```

Then deploy, which is just:

```
ssh vps2 'cd /srv/verify.bitsaga.be && git pull'
```

There is no build step. What is in the repository is what is served.

### Timestamping

Timestamping needs no key, so it is automated and safe to automate. It proves the manifest
existed at a point in time, which means nobody can produce a convincing backdated version later,
including us. It proves nothing about correctness.

```
ots stamp signatures/manifest.txt.asc
# hours later, once it has been included in a block
ots upgrade signatures/manifest.txt.asc.ots
git add signatures/*.ots && git commit -m "timestamp" && git push
```

Verify against your own node rather than a block explorer:

```
ots --bitcoin-node http://127.0.0.1:8332 verify signatures/manifest.txt.asc.ots
```

---

## The signing key

```
Bitsaga (release signing) <releases@bitsaga.be>
715E4B76200E7455C8F0AAB4DE395EC9D53D5FF3
ed25519, expires 2031-12-31
```

**Diary the expiry.** If it lapses, verification starts failing for everyone and nothing will
warn you.

### If you move to a device-held key

Announce the **rotation**, never the custody. A rotation is provable: new fingerprint, old key
revoked, both timestamped. Custody is not provable by anyone, since a signature looks identical
whether it was made on an airgapped device or a server. Publish the new fingerprint everywhere
the old one appears: this README, TRUST.md, `release.json`, bitsaga.be, and the printed card if
one is shipping by then.

Rotation is cheap before a fingerprint has been publicised and expensive afterwards, so if you
are going to do it, do it before promoting the site.

### If the key is ever exposed

Revoke, publish the revocation, generate a new key, re-sign every manifest you still stand
behind, and say plainly what happened and when. The timestamps are what let people tell your
real history from anything an attacker produces afterwards.
