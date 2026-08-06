# seedsigner-verify

The source of [verify.bitsaga.be](https://verify.bitsaga.be), a single page that walks a
SeedSigner buyer from a downloaded file to a checked, ready microSD card without opening a
terminal, in about fifteen minutes.

Three levels of detail on one page. Easy for someone setting up their first hardware wallet,
Advanced for someone who wants to see the values, Cypherpunk for someone who intends to verify
everything without trusting this page at all.

## The trust model in five sentences

Every byte of firmware comes from the publisher's own GitHub release; this site hosts no
firmware and never will. The check runs entirely in your browser, so nothing you drop on the
page leaves your computer. The page's whole source is here in public, and every released
version has a manifest of all its files signed by Bitsaga. The site is served from Bitsaga's
server while its source and signed manifest live here on GitHub, so altering what a visitor
receives without leaving a trace means compromising both. And because a page can never vouch
for itself, every claim it makes is accompanied by a way to check it with tools you did not get
from us, up to rebuilding the firmware from source and deriving the hash yourself.

See [TRUST.md](TRUST.md) for the long version, including what this cannot prove.

## What is pinned, and where it came from

`release.json` holds every fact the page asserts: versions, filenames, download URLs, sizes,
SHA-256 hashes, signing identities and their independent publication sources. A new firmware
release is one small reviewable commit to that file.

Nothing in it was assumed. [VERIFICATION_LOG.md](VERIFICATION_LOG.md) records the exact
commands used to obtain and verify each value, with their output, including the gpg
verification of the stock release and the Bitcoin message signature check on the smartcard
fork.

## How to audit this page

It is plain HTML, CSS and JavaScript. No framework, no build step, no bundler, no npm, no
dependencies at all. What is in this repository is byte for byte what gets served.

```
index.html      the whole page, all three modes
style.css       Bitsaga tokens, light and dark
app.js          mode switching, product choice, file handling, result states
sha256.js       streaming SHA-256, the only cryptographic code here
release.json    every pinned value
```

`sha256.js` is the piece worth reading closely. The browser's built-in hash cannot stream, and
the smartcard image is 512 MiB, which exceeds what a tab may allocate on many machines, so this
reads the file in 4 MiB chunks at constant memory. It runs the official NIST test vectors and a
cross-check against the browser's own implementation at page load, and the page refuses to
verify anything if either fails.

Run it locally:

```
python3 -m http.server 8000
```

Then open <http://127.0.0.1:8000>. There are no other requirements.

## Verifying a release against its signed manifest

```
git clone https://github.com/bitsagarob/seedsigner-verify
cd seedsigner-verify
gpg --verify signatures/manifest.txt.asc signatures/manifest.txt
sha256sum -c signatures/manifest.txt
```

To check that what a live server sent you matches, mirror the site and compare:

```
wget -r -np -nH --reject-regex '\?' https://verify.bitsaga.be/
./make-manifest.sh > /tmp/live.txt
diff /tmp/live.txt signatures/manifest.txt
```

Signing key:

```
Bitsaga (release signing) <releases@bitsaga.be>
715E4B76 200E7455 C8F0AAB4 DE395EC9 D53D5FF3
ed25519, expires 2031-12-31
```

Where that key is held is deliberately not published. Key custody is not provable by anyone, so
a claim about it would be unverifiable. See TRUST.md.

## Privacy

There is no tracking code on this page. No analytics script, no beacon, no cookie, no consent
banner, and nothing recorded about the file you check. The only requests the page makes are for
its own files, and the file you drop on it is read inside the tab and never sent anywhere.

Visits are counted from the web server's access log, which every web server writes anyway. That
happens entirely off the page, so there is nothing in what your browser receives that reports
back, and nothing to disable.

An earlier commit in this repository's history added a first-party Matomo script to record
in-page interactions. It was removed, deliberately and quickly, because a page asking you not to
have to trust it should not also be watching what you do on it. The history is left intact rather
than rewritten, since a project about tamper-evident records should not quietly edit its own.

## Dependencies

None at runtime. The fonts are Bitsaga's own, self-hosted from `vendor/fonts/`, taken from the
same files bitsaga.be serves.

An earlier draft of this project vendored openpgp.js so the browser could check the PGP
signature directly. It was dropped: the expected hash is pinned in this repository anyway, so
an in-browser signature check adds reassurance rather than proof, and a large minified bundle
would have broken the one property that matters most here, which is that a reviewer can read
everything in this repository in twenty minutes. The signature check is offered instead as a
command you run yourself, in cypherpunk mode.

## Deployment

Served from Bitsaga's VPS. `deploy/nginx-verify.conf` is the live server block. Deployment is a
`git pull` in the checkout; there is no build step and nothing between this repository and what
is served.

`deploy/FALLBACK.md` documents moving to GitHub Pages instead, which takes about ten minutes
since DNS stays under bitsaga.be control.

## Updating

See [UPDATING.md](UPDATING.md). Short version: edit `release.json`, re-run the verification
commands, regenerate and sign the manifest, commit, push.

## Licence

MIT. Fork it, mirror it, sell hardware with it. If you improve the copy, a pull request would
be welcome.

Not affiliated with the SeedSigner project. SeedSigner is an independent open-source project,
and the smartcard firmware is an independent fork of it.
