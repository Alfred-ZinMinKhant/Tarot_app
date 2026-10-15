import { getRandomBytes } from 'expo-crypto';

/** RFC 4122 version-4 UUID from the platform CSPRNG. */
export function uuidV4(bytes: (n: number) => Uint8Array = getRandomBytes): string {
  const b = bytes(16);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
