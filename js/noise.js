// 可复现的 2D 值噪声 + 分形叠加（fBm），用于地形起伏与颜色变化。

export function createNoise2D(seed = 1337) {
  let s = seed >>> 0;

  function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const SIZE = 256;
  const perm = new Uint8Array(SIZE * 2);
  const grad = new Float32Array(SIZE * 2);
  const p = Array.from({ length: SIZE }, (_, i) => i);

  for (let i = SIZE - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < SIZE * 2; i++) {
    perm[i] = p[i % SIZE];
    grad[i] = rand();
  }

  const fade = (t) => t * t * (3 - 2 * t);

  function hash(ix, iy) {
    return grad[perm[(perm[ix & (SIZE - 1)] + iy) & (SIZE - 1)]];
  }

  // 单帧值噪声，返回 0..1
  function noise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    const u = fade(fx);
    const v = fade(fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // 分形噪声，返回 0..1
  function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise, fbm };
}
