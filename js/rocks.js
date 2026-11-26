import * as THREE from 'three';
import { noise3, jitterRadial, paint, merge } from './shape.js?v=27';

const ROCK_COLORS = [0x7c766b, 0x8a8375, 0x6e6a61, 0x8a7a66, 0x756f68, 0x93887a];
// 岩石形态：round 圆润卧石 / spire 高瘦立石 / flat 扁平垫石 / cluster 多块团簇
const KINDS = ['round', 'round', 'spire', 'flat', 'cluster'];

const MOSS = new THREE.Color(0x4a6b32); // 顶面青苔
const DIRT = new THREE.Color(0x5a4a35); // 贴地土色

// 全部岩石共用一个材质，色差全靠顶点色
const ROCK_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.96,
  metalness: 0,
  flatShading: true, // 平面着色 → 硬朗的碎石棱面，而不是光滑面团
});

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 给一块石头着色：顶部苔藓、贴地一圈土色、整体带噪声斑驳
function shadeRock(geo, baseHex, seed) {
  const base = new THREE.Color(baseHex);
  paint(geo, (c, x, y, z, i) => {
    const ny = geo.attributes.normal.getY(i);
    c.copy(base);
    const n = noise3(x, y, z, seed);
    c.offsetHSL(0, 0, (n - 0.5) * 0.1);
    // 越朝上的面越容易长苔
    if (ny > 0.35) c.lerp(MOSS, Math.min(0.7, (ny - 0.35) * 1.7 * (0.3 + n)));
    // 根部偏土色，和地面衔接
    if (y < 0.35) c.lerp(DIRT, 0.4 * (1 - Math.max(0, y) / 0.35));
  });
  return geo;
}

// 主岩体：二十面体 → 大振幅径向扰动 → 非均匀比例 → 削平底部
function mainGeometry(kind, s, seed, baseHex) {
  const geo = new THREE.IcosahedronGeometry(s, 2);

  const k = kind === 'spire'
    ? [0.72, 1.8, 0.72]
    : kind === 'flat'
      ? [1.35, 0.48, 1.15]
      : kind === 'cluster'
        ? [1.0, 0.8, 0.95]
        : [1.0, 0.88, 0.95];
  geo.scale(k[0], k[1], k[2]);

  jitterRadial(geo, 0.6, seed, { vertical: 0.16 * s });

  // 削掉底部约四分之一，再把切面推到 y=0，让石头稳稳坐在地上
  const pos = geo.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  const cut = minY + s * 0.24 * k[1];
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < cut) pos.setY(i, cut);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.translate(0, -cut, 0);

  return shadeRock(geo, baseHex, seed);
}

// 碎石：同一套工艺的小块，绕主石散布
function chipGeometry(s, seed, baseHex) {
  const geo = new THREE.IcosahedronGeometry(s, 1);
  jitterRadial(geo, 0.55, seed, { vertical: 0.2 * s });
  const pos = geo.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < minY + s * 0.3) pos.setY(i, minY + s * 0.3);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.translate(0, -(minY + s * 0.3), 0);
  return shadeRock(geo, baseHex, seed + 13);
}

// 散布可挖掘的岩石：主岩体 + 1~4 块附属碎石，整体合并成一个网格
export function buildRocks(heightAt, count = 40) {
  const group = new THREE.Group();
  const rocks = [];

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 6) continue;

    const y = heightAt(x, z);
    const s = rnd(0.55, 1.05);
    const kind = pick(KINDS);
    const seed = Math.floor(Math.random() * 99991);
    const baseHex = pick(ROCK_COLORS);

    const parts = [mainGeometry(kind, s, seed, baseHex)];

    const debris = kind === 'cluster' ? 3 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
    for (let d = 0; d < debris; d++) {
      const ds = s * rnd(0.3, 0.55);
      const chip = chipGeometry(ds, seed + d * 41, baseHex);
      const ang = Math.random() * Math.PI * 2;
      const dist = s * rnd(0.55, 0.95);
      chip.translate(Math.cos(ang) * dist, rnd(-0.02, 0.04) * s, Math.sin(ang) * dist);
      chip.rotateY(Math.random() * Math.PI * 2);
      parts.push(chip);
    }

    const mesh = new THREE.Mesh(merge(parts), ROCK_MAT);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const rockGroup = new THREE.Group();
    rockGroup.add(mesh);
    rockGroup.position.set(x, y - s * 0.06, z);
    rockGroup.rotation.y = Math.random() * Math.PI * 2;
    group.add(rockGroup);

    const radius = kind === 'spire' ? s * 0.75 : s * 0.9;
    rocks.push({ group: rockGroup, hp: 4, alive: true, kind: 'rock', x, z, radius });
    placed++;
  }

  return { group, rocks };
}
