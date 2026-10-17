// How many leading bytes hasImageSignature needs to see
export const IMAGE_SIGNATURE_BYTES = 12;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

// The uploader picks the stored Content-Type, so check the file's own magic
// numbers for JPEG, PNG or WebP
export function hasImageSignature(bytes: Uint8Array) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return true;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return true;
  // "RIFF", four size bytes, then "WEBP"
  return (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  );
}
