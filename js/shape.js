// 造型辅助：定点噪声、顶点扰动、顶点着色、几何合并。
// 目的：让树/石头这类程序化模型摆脱"标准几何体堆叠感"，用不规则顶点 + 顶点色做出手作感。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 整数哈希 → 0..1：同一坐标总得到同一偏移，轮廓不会逐帧抖动
export function hash3(x, y, z, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(seed | 0, 2654435761);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// 连续值噪声：把坐标量化后取哈希，邻近顶点得到相近值
export function noise3(x, y, z, seed = 0) {
  return hash3(Math.round(x * 89), Math.round(y * 89), Math.round(z * 89), seed);
}

// 径向扰动：沿 XZ 把顶点推离/拉近轴心，制造不规则轮廓；vertical 控制高度方向的抖动
export function jitterRadial(geo, amount = 0.2, seed = 0, { vertical = 0.15, center = null } = {}) {
  const pos = geo.attributes.position;
  const cx = center ? center.x : 0;
  const cz = center ? center.z : 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const dx = x - cx;
    const dz = z - cz;
    const r = Math.hypot(dx, dz);
    if (r < 1e-5) continue;
    const k = 1 + (noise3(dx, y, dz, seed) - 0.5) * amount;
    pos.setX(i, cx + dx * k);
    pos.setZ(i, cz + dz * k);
    pos.setY(i, y + (noise3(dz, x, y, seed + 91) - 0.5) * vertical);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// 顶点着色：回调里直接改 Color。写进 color 属性前已是线性空间（THREE.Color 构造时自动转换）
export function paint(geo, fn) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(c, pos.getX(i), pos.getY(i), pos.getZ(i), i);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// 合并：统一转非索引，保证属性集一致（position/normal/uv/color）
export function merge(geos) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(list, false);
  if (!merged) console.warn('[shape] mergeGeometries 失败，退回第一个几何体');
  return merged || list[0];
}

// 沿 y 轴由下往上渐变的顶点色，用于树干、岩体
export function paintGradient(geo, low, high, y0, y1, seed = 0, noiseAmt = 0.05) {
  const a = new THREE.Color(low);
  const b = new THREE.Color(high);
  return paint(geo, (c, x, y, z) => {
    const t = THREE.MathUtils.clamp((y - y0) / Math.max(1e-6, y1 - y0), 0, 1);
    c.copy(a).lerp(b, t);
    const n = (noise3(x, y, z, seed) - 0.5) * noiseAmt;
    c.offsetHSL(0, 0, n);
  });
}
