import * as THREE from 'three';
import { createNoise2D } from './noise.js';

export const TERRAIN_SIZE = 120;
export const TERRAIN_SEGMENTS = 150;

// 构建起伏地形，返回网格与高度查询函数 heightAt(x, z)
export function buildTerrain() {
  const noise = createNoise2D(20261120);

  const heightAt = (x, z) => {
    const n = noise.fbm(x * 0.035, z * 0.035, 4);
    let h = (n - 0.5) * 7; // 约 -3.5 .. 3.5
    // 高频小起伏，增加地表细节
    h += (noise.fbm(x * 0.15 + 50, z * 0.15, 2) - 0.5) * 0.8;
    // 出生点（原点）附近压平，方便站立与后续建造
    const dist = Math.hypot(x, z);
    const flat = THREE.MathUtils.smoothstep(dist, 4, 16);
    return h * flat;
  };

  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const grassLow = new THREE.Color(0x47663a);
  const grassHigh = new THREE.Color(0x688a48);
  const dry = new THREE.Color(0x87875a);
  const dirt = new THREE.Color(0x6b5a40);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);

    // 按高度混草色
    const t = THREE.MathUtils.clamp((h + 3.5) / 7, 0, 1);
    c.lerpColors(grassLow, grassHigh, t);

    // 干草斑块
    const dryN = noise.fbm(x * 0.12 + 100, z * 0.12, 2);
    if (dryN > 0.62) c.lerp(dry, 0.4);

    // 低洼处偏泥土色
    if (h < -1.2) c.lerp(dirt, THREE.MathUtils.clamp((-1.2 - h) / 2, 0, 0.55));

    colors.push(c.r, c.g, c.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  return { mesh, heightAt };
}
