# What this page can prove, and what it cannot

Short version: this page is a guide, not an authority. If you only trust it, you have gained
less than you think. Everything on it is arranged so you can check it with tools you did not
get from us.

## The chain

A firmware image reaches your card through a chain, and every link can fail:

1. **The source code.** Public, reviewed by people who are not us. Out of our hands entirely.
2. **Source to binary.** SeedSigner OS builds reproducibly. Anyone can rebuild the image from
   source and get the same bytes. This is the strongest link in the chain and the reason the
   hash on this page is not something you have to take anyone's word for.
3. **Binary to published hash.** Signed by the publisher. PGP for the stock image, a Bitcoin
   message signature for the smartcard fork.
4. **Signing key to identity.** Published in several places that one person cannot all control.
   The page links them so you can compare rather than trust.
5. **Published hash to your file.** The check this page performs.
6. **The checker itself.** See below.
7. **File to card.** Verified by Raspberry Pi Imager after writing, and on the smartcard
   firmware the device can verify a card directly.
8. **Card to device to seed.** Where software stops helping.

## What this page proves

That the file you dropped on it has the same SHA-256 as the file the publisher released, as
computed by code running on your own machine.

That is genuinely useful. It catches a truncated download, a corrupted file, a file swapped in
transit, and the wrong image for your model.

## What it does not prove

**That we are honest.** This page supplies the expected hash *and* performs the comparison. If
someone controlled this page, they could show you a green tick for a file that was not the
publisher's. No amount of good code inside the page fixes that, because the page cannot
vouch for itself.

This is why every mode offers a way out:

- **Advanced mode** shows the values and links independent sources for the signing identity, so
  you can compare against places we do not control.
- **Cypherpunk mode** gives you the commands to do the whole thing without this page, and the
  reproducible build that lets you derive the hash from source yourself.

If the result matters to you, use one of those. Do not let a checkmark on a seller's website
be the only thing standing between you and your keys.

**That the hardware is clean.** Software cannot verify hardware. A perfectly verified image on
a tampered board is still a tampered board. What helps instead: buy from someone you can hold
accountable, inspect the open hardware, and remember that a stateless signer that stores no key
bounds the damage.

**That your seed is safe.** Verified firmware does nothing if the seed was generated badly or
seen by something else. Use your own entropy, confirm the xpub on a second independent path,
and send a small test amount before funding properly.

**Where our signing key is held.** We publish that this site's manifests are signed by Bitsaga,
and we do not publish where that key lives. Key custody cannot be proven by anyone: a signature
looks identical whether it was made on an airgapped device or on a web server, so any claim we
made would be unverifiable. Treat the signature as evidence that the same party signed each
release, which makes silent substitution detectable, and rely on the public commit history for
anything stronger.

## Where this page is served from

The site is served from Bitsaga's own server. Its complete source lives in a public repository
on GitHub, along with a signed manifest of every file. Those are two different places under two
different administrations, which means changing what you receive without leaving a trace
requires compromising both. Comparing what your browser received against the signed manifest in
the repository is a check anyone can run, and cypherpunk mode shows you how.

## The honest ceiling

You cannot verify your way out of trusting everything. At some point it is the compiler, the
processor, or the source itself. Reproducible builds push that boundary a very long way. They
do not remove it. Anyone who tells you otherwise is selling something.
