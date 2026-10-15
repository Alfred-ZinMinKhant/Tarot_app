/**
 * Synthesises the app's original sound effects into assets/sounds/*.wav (mono, 22.05 kHz, 16-bit).
 * Everything is generated from code, so there are no third-party audio licences to track.
 *
 *   npm run render:sounds
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const out = join(__dirname, '..', 'assets', 'sounds');

/** Small deterministic PRNG so the files are byte-identical on every run. */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.6 / peak : 0; // leave headroom; these are meant to be quiet
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * gain)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** A soft paper "swish": low-passed noise with a quick rise and gentle fall. */
function swish(seconds: number, seed: number, brightness = 0.12): Float32Array {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  const rand = noise(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * Math.min(1, t * 2.5)) ** 2 * (1 - t);
    lp += brightness * (rand() - lp);
    out[i] = lp * env;
  }
  return out;
}

/** A small bell: a few inharmonic partials with exponential decay. */
function chime(seconds: number, base: number): Float32Array {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  const partials: [number, number, number][] = [
    [1, 1, 3],
    [2.01, 0.5, 4.5],
    [2.76, 0.3, 6],
    [5.4, 0.12, 9],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    let v = 0;
    for (const [ratio, amp, decay] of partials) v += amp * Math.sin(2 * Math.PI * base * ratio * t) * Math.exp(-decay * t);
    out[i] = v * attack;
  }
  return out;
}

function concat(...parts: { at: number; samples: Float32Array }[]): Float32Array {
  const len = Math.max(...parts.map((p) => Math.round(p.at * RATE) + p.samples.length));
  const out = new Float32Array(len);
  for (const p of parts) {
    const start = Math.round(p.at * RATE);
    p.samples.forEach((v, i) => (out[start + i]! += v));
  }
  return out;
}

mkdirSync(out, { recursive: true });
const files: Record<string, Float32Array> = {
  'flip.wav': swish(0.22, 7, 0.18),
  'shuffle.wav': concat(
    ...[0, 0.09, 0.17, 0.26, 0.33, 0.42].map((at, i) => ({ at, samples: swish(0.12, 11 + i, 0.25) })),
  ),
  'chime.wav': concat({ at: 0, samples: chime(1.4, 880) }, { at: 0.12, samples: chime(1.2, 1318.5) }),
};
for (const [name, samples] of Object.entries(files)) {
  writeFileSync(join(out, name), wav(samples));
  console.log(`assets/sounds/${name}: ${(samples.length / RATE).toFixed(2)} s`);
}
