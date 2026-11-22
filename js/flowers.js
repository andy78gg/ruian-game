import * as THREE from 'three';

// 地表野花点缀：细茎 + 小圆花冠，实例化渲染；黄 / 白 / 淡紫 / 淡红随机配色，
// 避开出生点与低洼湿地，纯装饰、不可采集、无碰撞。
export function buildFlowers(heightAt, count = 120) {
  const group = new THREE.Group();

  const stemGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.2, 5);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4c7a3a, roughness: 1 });
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, count);
  stems.receiveShadow = true;

  const headGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  heads.receiveShadow = true;

  const palette = [0xf2d14b, 0xf5f2ea, 0xb98cc9, 0xe88a8a];
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  let i = 0;
  let attempts = 0;
  while (i < count && attempts < count * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    if (Math.hypot(x, z) < 3) continue;
    const y = heightAt(x, z);
    if (y < -0.8) continue; // 低洼湿地不种花

    const s = 0.7 + Math.random() * 0.7;
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s, s, s);

    dummy.position.set(x, y + 0.1 * s, z);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);

    dummy.position.y = y + 0.2 * s;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);

    tint.setHex(palette[Math.floor(Math.random() * palette.length)]);
    heads.setColorAt(i, tint);
    i++;
  }

  stems.count = i;
  heads.count = i;
  heads.instanceColor.needsUpdate = true;
  group.add(stems, heads);

  return group;
}
