import * as THREE from 'three';

// 地表散落细节：贴地小石子 + 枯叶，实例化渲染，增加地表层次（不可采集、无碰撞）。
export function buildScatter(heightAt, pebbleCount = 120, leafCount = 150) {
  const group = new THREE.Group();

  // ---- 小石子 ----
  const pebbleGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const pebbleMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: false });
  const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
  pebbles.receiveShadow = true;

  const pebbleBase = new THREE.Color(0x7c766b);
  const tint = new THREE.Color();
  const dummy = new THREE.Object3D();

  let i = 0;
  let attempts = 0;
  while (i < pebbleCount && attempts < pebbleCount * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    if (Math.hypot(x, z) < 3) continue;
    const y = heightAt(x, z);
    const s = 0.6 + Math.random() * 0.9;
    dummy.position.set(x, y + 0.04, z);
    dummy.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    dummy.scale.set(s, s * 0.6, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    tint.copy(pebbleBase).multiplyScalar(0.8 + Math.random() * 0.35);
    pebbles.setColorAt(i, tint);
    i++;
  }
  pebbles.count = i;
  pebbles.instanceColor.needsUpdate = true;
  group.add(pebbles);

  // ---- 枯叶 ----
  const leafGeo = new THREE.PlaneGeometry(0.2, 0.14);
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
  });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leaves.receiveShadow = true;

  const leafBase = new THREE.Color(0x8a6a3a);
  i = 0;
  attempts = 0;
  while (i < leafCount && attempts < leafCount * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    if (Math.hypot(x, z) < 3) continue;
    const y = heightAt(x, z);
    const s = 0.7 + Math.random() * 0.8;
    dummy.position.set(x, y + 0.02, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    tint.copy(leafBase).multiplyScalar(0.75 + Math.random() * 0.4);
    leaves.setColorAt(i, tint);
    i++;
  }
  leaves.count = i;
  leaves.instanceColor.needsUpdate = true;
  group.add(leaves);

  return group;
}
