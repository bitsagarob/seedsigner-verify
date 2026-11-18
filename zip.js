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
const CENTRAL_HEADER_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const CENTRAL_LEN = 46;   // a central directory record, before its name
const END_LEN = 22;       // the end of central directory record, with no comment
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
  const crc = h.getUint32(14, true);
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

  const nameBytes = new Uint8Array(await file.slice(30, 30 + nameLen).arrayBuffer());
  await checkLayout(file, start + compressedSize,
    { flags, method, crc, compressedSize, uncompressedSize, nameBytes });
  const name = new TextDecoder().decode(nameBytes);
  return { name, method, start, compressedSize, uncompressedSize };
}

/* We hash the entry at offset 0. unzip, 7-Zip, Windows Explorer, macOS Archive
   Utility and Etcher instead pick what to extract from the central directory
   at the end of the file. A crafted zip can put the genuine image at offset 0
   and point the directory at a second image: this page would then say genuine
   about firmware the user never flashes. So the file must be exactly what a
   one-entry release is and nothing else: the entry, its one directory record,
   then the end record, with no comment and no byte in between. The real B13
   release zip is laid out like this. Field offsets are from APPNOTE.TXT
   sections 4.3.12 and 4.3.16. */
async function checkLayout(file, dataEnd, local) {
  const refuse = () => {
    throw new ZipError('This zip is not built the way the release is. It could hold a second ' +
      'image that an unzip tool would give you instead of the one we checked.');
  };
  if (file.size < dataEnd + CENTRAL_LEN + END_LEN) {
    throw new ZipError('The zip is truncated, so it did not finish downloading.');
  }

  const end = new DataView(await file.slice(file.size - END_LEN).arrayBuffer());
  const dirSize = end.getUint32(12, true);
  const dirStart = end.getUint32(16, true);
  if (end.getUint32(0, true) !== END_SIG
    || end.getUint16(4, true) !== 0 || end.getUint16(6, true) !== 0     // disk numbers
    || end.getUint16(8, true) !== 1 || end.getUint16(10, true) !== 1    // one entry
    || end.getUint16(20, true) !== 0                                    // no comment
    || dirStart !== dataEnd || dirStart + dirSize !== file.size - END_LEN) refuse();

  const dir = await file.slice(dirStart, dirStart + dirSize).arrayBuffer();
  const d = new DataView(dir);
  const nameLen = d.getUint16(28, true);
  if (d.getUint32(0, true) !== CENTRAL_HEADER_SIG
    || CENTRAL_LEN + nameLen + d.getUint16(30, true) + d.getUint16(32, true) !== dirSize
    || d.getUint16(8, true) !== local.flags
    || d.getUint16(10, true) !== local.method
    || d.getUint32(16, true) !== local.crc
    || d.getUint32(20, true) !== local.compressedSize
    || d.getUint32(24, true) !== local.uncompressedSize
    || d.getUint16(34, true) !== 0                                      // disk number
    || d.getUint32(42, true) !== 0                                      // entry at offset 0
    || String(new Uint8Array(dir, CENTRAL_LEN, nameLen)) !== String(local.nameBytes)) refuse();
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
      seen += value.length;
      // Stop at once: a small crafted zip can inflate to hundreds of gigabytes.
      if (seen > entry.uncompressedSize) {
        throw new ZipError('The zip holds more data than it claims, so we stopped reading it.');
      }
      hasher.update(value);
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
    if (e instanceof ZipError) throw e;
    throw new ZipError('The zip could not be decompressed, so the download is damaged.');
  } finally {
    reader.releaseLock();
  }

  if (seen !== entry.uncompressedSize) {
    throw new ZipError('The zip ended early, so the download is incomplete.');
  }

  return { name: entry.name, sha256: hasher.digest() };
}
