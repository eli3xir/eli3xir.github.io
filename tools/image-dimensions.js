const fs = require('node:fs');
const path = require('node:path');

// Read the source metadata at build time; no browser fetch or guessed aspect ratio.
function imageDimensions(root, src) {
  if (!src.startsWith('/')) return null;
  const file = path.resolve(root, '.' + decodeURIComponent(src));
  if (!file.startsWith(root + path.sep)) throw new Error(`Image outside site: ${src}`);
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  // One historical .png asset is actually a simple, lossy WebP file.
  if (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,16)==='WEBPVP8 '
      && bytes.subarray(23,26).equals(Buffer.from([0x9d,0x01,0x2a]))) {
    return { width: bytes.readUInt16LE(26)&0x3fff, height: bytes.readUInt16LE(28)&0x3fff };
  }
  if (bytes.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      }
      offset += bytes.readUInt16BE(offset);
    }
  }
  throw new Error(`Unsupported or invalid article image: ${src}`);
}

module.exports = { imageDimensions };
