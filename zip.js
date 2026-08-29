/*
 * Just enough of the zip format to hash the image inside one.
 *
 * From SeSi-0.8.7+ShSi-B12 onward the ShieldSigner release publishes only a
 * .zip. The developer signs the SHA-256 of the .img inside it and never of the
 * .zip itself, so the only number we can compare against a signature is the one
 * we get by looking inside. That is the whole reason this file exists.
 *
 * Nothing is written to disk and nothing is held in memory whole: the entry is
 * decompressed as a stream and the bytes are hashed as they go past, the same
 * way a plain .img is read in 4 MiB chunks.
 *
 * Deliberately narrow. One entry, deflate or stored, sizes present in the local
 * header, no zip64. That is what these releases actually are. Anything else is
 * refused with a message rather than guessed at, because a wrong guess here
 * produces a hash, and a hash that looks like an answer is worse than an error.
 */

import { Sha256 } from './sha256.js';

const LOCAL_HEADER_SIG = 0x04034b50;
const STORED = 0;
const DEFLATE = 8;

export class ZipError extends Error {}

export function zipSupported() {
  return typeof DecompressionStream === 'function';
}

/* The local file header, which sits at the very start of a single-entry zip.
   Field offsets are from the spec, APPNOTE.TXT section 4.3.7. */
async function readEntry(file) {
  const buf = await file.slice(0, 30).arrayBuffer();
  if (buf.byteLength < 30) throw new ZipError('The file is too small to be a zip.');

  const h = new DataView(buf);
  if (h.getUint32(0, true) !== LOCAL_HEADER_SIG) {
    throw new ZipError('This does not look like a zip file.');
  }

  const flags = h.getUint16(6, true);
  const method = h.getUint16(8, true);
  const compressedSize = h.getUint32(18, true);
  const uncompressedSize = h.getUint32(22, true);
  const nameLen = h.getUint16(26, true);
  const extraLen = h.getUint16(28, true);

  // Bit 3 means the sizes are zero here and written after the data instead.
  // Reading that needs the central directory, which the releases never need.
  if (flags & 0x08) {
    throw new ZipError('This zip stores its sizes in a trailing descriptor, which we do not read.');
  }
  if (flags & 0x01) throw new ZipError('This zip is encrypted.');
  if (method !== DEFLATE && method !== STORED) {
    throw new ZipError(`This zip uses compression method ${method}, which we do not read.`);
  }
  if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
    throw new ZipError('This is a zip64 archive, which we do not read.');
  }

  const start = 30 + nameLen + extraLen;
  if (start + compressedSize > file.size) {
    throw new ZipError('The zip is truncated, so it did not finish downloading.');
  }

  const name = new TextDecoder().decode(await file.slice(30, 30 + nameLen).arrayBuffer());
  return { name, method, start, compressedSize, uncompressedSize };
}

/* Hash the single entry inside a zip. onProgress receives a fraction of the
   uncompressed size, so the bar tracks the work actually being hashed rather
   than the smaller number of bytes read off the disk. */
export async function hashZipImage(file, onProgress) {
  if (!zipSupported()) {
    throw new ZipError('This browser cannot decompress a zip.');
  }

  const entry = await readEntry(file);
  const body = file.slice(entry.start, entry.start + entry.compressedSize);
  const source = entry.method === STORED
    ? body.stream()
    : body.stream().pipeThrough(new DecompressionStream('deflate-raw'));

  const hasher = new Sha256();
  const reader = source.getReader();
  let seen = 0;
  let lastYield = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hasher.update(value);
      seen += value.length;
      onProgress?.(Math.min(seen / entry.uncompressedSize, 1));
      // Decompressed chunks are small, so yielding on every one of them would
      // cost more than the hashing. Yield per 4 MiB, which is what the plain
      // .img path does, and the bar still paints smoothly.
      if (seen - lastYield >= 4 * 1024 * 1024) {
        lastYield = seen;
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  } catch (e) {
    throw new ZipError('The zip could not be decompressed, so the download is damaged.');
  } finally {
    reader.releaseLock();
  }

  if (seen !== entry.uncompressedSize) {
    throw new ZipError('The zip ended early, so the download is incomplete.');
  }

  return { name: entry.name, sha256: hasher.digest() };
}
