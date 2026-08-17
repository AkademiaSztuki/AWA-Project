export type ShareImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Detect real image type from magic bytes — GCS copies were often labeled image/webp. */
export function sniffImageMime(bytes: ArrayBuffer | Uint8Array): ShareImageMime {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (arr.length >= 3 && arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    return 'image/jpeg';
  }
  if (arr.length >= 8 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
    return 'image/png';
  }
  if (
    arr.length >= 12 &&
    arr[0] === 0x52 &&
    arr[1] === 0x49 &&
    arr[2] === 0x46 &&
    arr[3] === 0x46 &&
    arr[8] === 0x57 &&
    arr[9] === 0x45 &&
    arr[10] === 0x42 &&
    arr[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (arr.length >= 6 && arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
    return 'image/gif';
  }
  return 'image/jpeg';
}
