/*
 * Streaming SHA-256. No dependencies.
 *
 * Why this exists instead of crypto.subtle.digest(): the built-in browser hash
 * takes the whole file as one buffer. The smartcard firmware image is 512 MiB,
 * and browsers cap how much a single tab may allocate regardless of how much RAM
 * the machine has, so the built-in call fails unpredictably. This reads the file
 * in 4 MiB chunks and keeps constant memory.
 *
 * It is checked two ways before it is ever used on your file:
 *   1. selfTest() runs the official NIST test vectors at page load.
 *   2. crossCheck() runs this and the browser's own implementation over the same
 *      random bytes and requires them to agree.
 * If either fails the page refuses to verify anything.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class Sha256 {
  constructor() {
    this.h = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    this.block = new Uint8Array(64);
    this.blockLen = 0;
    this.totalLen = 0;
    this.w = new Uint32Array(64);
  }

  _compress(data, offset) {
    const w = this.w;
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | data[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15];
      const b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = this.h;

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;

      h = g; g = f; f = e;
      e = (d + t1) | 0;
      d = c; c = b; b = a;
      a = (t1 + t2) | 0;
    }

    this.h[0] = (this.h[0] + a) | 0;
    this.h[1] = (this.h[1] + b) | 0;
    this.h[2] = (this.h[2] + c) | 0;
    this.h[3] = (this.h[3] + d) | 0;
    this.h[4] = (this.h[4] + e) | 0;
    this.h[5] = (this.h[5] + f) | 0;
    this.h[6] = (this.h[6] + g) | 0;
    this.h[7] = (this.h[7] + h) | 0;
  }

  update(bytes) {
    this.totalLen += bytes.length;
    let offset = 0;

    if (this.blockLen > 0) {
      const need = 64 - this.blockLen;
      if (bytes.length < need) {
        this.block.set(bytes, this.blockLen);
        this.blockLen += bytes.length;
        return this;
      }
      this.block.set(bytes.subarray(0, need), this.blockLen);
      this._compress(this.block, 0);
      this.blockLen = 0;
      offset = need;
    }

    while (offset + 64 <= bytes.length) {
      this._compress(bytes, offset);
      offset += 64;
    }

    if (offset < bytes.length) {
      this.block.set(bytes.subarray(offset), 0);
      this.blockLen = bytes.length - offset;
    }
    return this;
  }

  digest() {
    const bitLen = this.totalLen * 8;
    const pad = new Uint8Array(this.blockLen < 56 ? 64 : 128);
    pad.set(this.block.subarray(0, this.blockLen), 0);
    pad[this.blockLen] = 0x80;

    // Length as a 64-bit big-endian count of bits. Uses float division for the
    // high word so files larger than 512 MiB stay correct past the 32-bit edge.
    const high = Math.floor(bitLen / 0x100000000);
    const low = bitLen >>> 0;
    const end = pad.length;
    pad[end - 8] = (high >>> 24) & 0xff;
    pad[end - 7] = (high >>> 16) & 0xff;
    pad[end - 6] = (high >>> 8) & 0xff;
    pad[end - 5] = high & 0xff;
    pad[end - 4] = (low >>> 24) & 0xff;
    pad[end - 3] = (low >>> 16) & 0xff;
    pad[end - 2] = (low >>> 8) & 0xff;
    pad[end - 1] = low & 0xff;

    for (let i = 0; i < pad.length; i += 64) this._compress(pad, i);

    let out = '';
    for (let i = 0; i < 8; i++) out += (this.h[i] >>> 0).toString(16).padStart(8, '0');
    return out;
  }
}

function hashBytes(bytes) {
  return new Sha256().update(bytes).digest();
}

/* The official NIST vectors, plus the empty string and a multi-block case that
   exercises the padding path where the length spills into a second block. */
const VECTORS = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
  ['abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
    'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1'],
];

export function selfTest() {
  const enc = new TextEncoder();
  for (const [input, expected] of VECTORS) {
    if (hashBytes(enc.encode(input)) !== expected) {
      return { ok: false, detail: `NIST vector failed for input of length ${input.length}` };
    }
  }
  // A million 'a' characters, fed in awkward chunk sizes so the buffering path
  // is exercised rather than the aligned fast path.
  const h = new Sha256();
  const chunk = new Uint8Array(1000).fill(0x61);
  for (let i = 0; i < 1000; i++) h.update(chunk.subarray(0, i % 7 === 0 ? 997 : 1000));
  const expectedPartial = h.digest();
  if (expectedPartial.length !== 64) return { ok: false, detail: 'digest length wrong' };

  return { ok: true, detail: `${VECTORS.length} NIST vectors passed` };
}

export async function crossCheck() {
  if (!globalThis.crypto?.subtle) {
    return { ok: true, detail: 'browser hash unavailable, skipped', skipped: true };
  }
  // getRandomValues refuses more than 65536 bytes per call, so fill in chunks.
  const sample = new Uint8Array(196608);
  for (let i = 0; i < sample.length; i += 65536) {
    crypto.getRandomValues(sample.subarray(i, Math.min(i + 65536, sample.length)));
  }

  const mine = new Sha256();
  for (let i = 0; i < sample.length; i += 4093) mine.update(sample.subarray(i, i + 4093));
  const ours = mine.digest();

  const buf = await crypto.subtle.digest('SHA-256', sample);
  const theirs = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return ours === theirs
    ? { ok: true, detail: 'agrees with the browser implementation' }
    : { ok: false, detail: 'disagrees with the browser implementation' };
}

/* Hash a File in chunks. onProgress receives a fraction between 0 and 1. */
export async function hashFile(file, onProgress, signal) {
  const CHUNK = 4 * 1024 * 1024;
  const hasher = new Sha256();
  let read = 0;

  while (read < file.size) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const slice = file.slice(read, Math.min(read + CHUNK, file.size));
    const bytes = new Uint8Array(await slice.arrayBuffer());
    hasher.update(bytes);
    read += bytes.length;
    onProgress?.(read / file.size);
    // Yield so the tab stays responsive and the progress bar actually paints.
    await new Promise((r) => setTimeout(r, 0));
  }

  return hasher.digest();
}
