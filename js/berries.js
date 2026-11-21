import * as THREE from 'three';

const LEAF_COLOR = 0x3a6b32;
const BERRY_COLOR = 0xc23b3e;
const REGROW_TIME = 20; // 浆果采完后再生秒数

// 浆果灌木：可采集食物来源，采完一段时间后重新长出。
export function buildBerries(heightAt, count = 24) {
  const group = new THREE.Group();
  const bushes = [];

  const leafMat = new THREE.MeshStandardMaterial({
    color: LEAF_COLOR,
    roughness: 1,
    flatShading: false,
  });
  const berryMat = new THREE.MeshStandardMaterial({
    color: BERRY_COLOR,
    roughness: 0.7,
  });

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 6) continue;

    const y = heightAt(x, z);
    const s = 0.7 + Math.random() * 0.5;

    const bush = new THREE.Group();

    // 叶簇：2~3 团错落的低灌木
    const blobs = 2 + Math.floor(Math.random() * 2);
    for (let b = 0; b < blobs; b++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 * s, 1), leafMat);
      leaf.position.set(
        (Math.random() - 0.5) * 0.4 * s,
        0.35 * s,
        (Math.random() - 0.5) * 0.4 * s
      );
      leaf.scale.y = 0.75;
      leaf.castShadow = true;
      bush.add(leaf);
    }

    // 浆果
    const berryMeshes = [];
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 6, 6), berryMat);
      berry.position.set(
        (Math.random() - 0.5) * 0.5 * s,
        (0.4 + Math.random() * 0.25) * s,
        (Math.random() - 0.5) * 0.5 * s
      );
      bush.add(berry);
      berryMeshes.push(berry);
    }

    bush.position.set(x, y, z);
    group.add(bush);
    bushes.push({
      group: bush,
      x,
      z,
      berries: n,
      maxBerries: n,
      berryMeshes,
      regrow: 0,
      alive: true,
    });
    placed++;
  }

  function update(dt) {
    for (const b of bushes) {
      if (b.berries <= 0) {
        b.regrow -= dt;
        if (b.regrow <= 0) {
          b.berries = b.maxBerries;
          b.berryMeshes.forEach((m) => (m.visible = true));
        }
      }
    }
  }

  // 采一颗浆果，成功返回 true
  function pick(b) {
    if (b.berries <= 0) return false;
    b.berryMeshes[b.berries - 1].visible = false;
    b.berries -= 1;
    if (b.berries <= 0) b.regrow = REGROW_TIME;
    return true;
  }

  return { group, bushes, update, pick };
}
