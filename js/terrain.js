import * as THREE from 'three';
import { createNoise2D } from './noise.js';

export const TERRAIN_SIZE = 120;
export const TERRAIN_SEGMENTS = 90;

// 构建低多边形起伏地形，返回网格与高度查询函数 heightAt(x, z)
export function buildTerrain() {
  const noise = createNoise2D(20261120);

  const heightAt = (x, z) => {
    const n = noise.fbm(x * 0.035, z * 0.035, 4);
    let h = (n - 0.5) * 7; // 约 -3.5 .. 3.5
    // 出生点（原点）附近压平，方便站立与后续建造
    const dist = Math.hypot(x, z);
    const flat = THREE.MathUtils.smoothstep(dist, 4, 16);
    return h * flat;
  };

  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const colorLow = new THREE.Color(0x3a7335);
  const colorHigh = new THREE.Color(0x74a854);
  const colorDry = new THREE.Color(0x93a65a);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);

    const t = THREE.MathUtils.clamp((h + 3.5) / 7, 0, 1);
    c.lerpColors(colorLow, colorHigh, t);

    // 随机点缀偏黄的干草斑块
    const dry = noise.fbm(x * 0.12 + 100, z * 0.12, 2);
    if (dry > 0.62) c.lerp(colorDry, 0.4);

    colors.push(c.r, c.g, c.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  return { mesh, heightAt };
}
