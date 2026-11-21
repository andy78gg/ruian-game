import * as THREE from 'three';

const TRUNK_COLOR = 0x4a3320;
const LEAF_DARK = [0x2c5226, 0x35602c, 0x274a22];
const LEAF_LIGHT = [0x4a7a38, 0x568a40, 0x3f6f31];

// 在地形上随机放置树木：阔叶橡树 / 尖冠松树两种，树干粗、冠幅小、整体高挑
export function buildTrees(heightAt, count = 90) {
  const group = new THREE.Group();
  const trees = [];

  const trunkMat = new THREE.MeshStandardMaterial({
    color: TRUNK_COLOR,
    roughness: 0.95,
    metalness: 0,
    flatShading: false,
  });
  const leafDarkMats = LEAF_DARK.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: false })
  );
  const leafLightMats = LEAF_LIGHT.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: false })
  );
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 8) continue; // 留出出生点

    const y = heightAt(x, z);
    const scale = 2.6 + Math.random() * 1.8; // 整体高度不变（高挑）
    const pine = Math.random() < 0.45;

    const tree = new THREE.Group();

    // 两段式粗树干：下粗上细，高度保持不变
    const trunkH = 2.0 * scale;
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34 * scale, 0.55 * scale, trunkH * 0.55, 7),
      trunkMat
    );
    lower.position.y = (trunkH * 0.55) / 2;
    lower.castShadow = true;
    tree.add(lower);

    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, trunkH * 0.55, 7),
      trunkMat
    );
    upper.position.y = trunkH * 0.55 + (trunkH * 0.55) / 2;
    upper.castShadow = true;
    tree.add(upper);

    if (pine) {
      // 四层逐层收窄的锥形松树，冠幅收小、层叠高度保持
      const layers = 4;
      for (let l = 0; l < layers; l++) {
        const r = (1.15 - l * 0.24) * scale;
        const h = 1.2 * scale;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(r, h, 8),
          pick(leafDarkMats)
        );
        cone.position.y = trunkH * 0.55 + l * 0.78 * scale + h * 0.35;
        cone.castShadow = true;
        tree.add(cone);
      }
    } else {
      // 阔叶橡树：一团主冠 + 2~3 团错落侧冠，冠幅收小、位置高度保持
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15 * scale, 1),
        pick(leafLightMats)
      );
      crown.position.y = trunkH + 0.9 * scale;
      crown.scale.y = 0.8;
      crown.castShadow = true;
      tree.add(crown);

      const blobs = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < blobs; b++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = (0.4 + Math.random() * 0.4) * scale;
        const r = (0.55 + Math.random() * 0.35) * scale;
        const blob = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 1),
          Math.random() < 0.5 ? pick(leafDarkMats) : pick(leafLightMats)
        );
        blob.position.set(
          Math.cos(ang) * dist,
          trunkH + (0.3 + Math.random() * 0.7) * scale,
          Math.sin(ang) * dist
        );
        blob.scale.y = 0.85;
        blob.castShadow = true;
        tree.add(blob);
      }
    }

    tree.position.set(x, y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
    // 圆形碰撞半径随粗树干给出
    trees.push({ group: tree, hp: 3, alive: true, kind: 'tree', x, z, radius: 0.5 * scale });
    placed++;
  }

  return { group, trees };
}

// 交叉双片草丛（InstancedMesh），比单片更饱满自然
export function buildGrass(heightAt, count = 600) {
  const geo = new THREE.PlaneGeometry(0.22, 0.6);
  geo.translate(0, 0.3, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x557a3c,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
  });

  const meshA = new THREE.InstancedMesh(geo, mat, count);
  const meshB = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();

  let i = 0;
  let attempts = 0;
  while (i < count && attempts < count * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    if (Math.hypot(x, z) < 3) continue;

    const y = heightAt(x, z);
    const rot = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.8;

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    meshA.setMatrixAt(i, dummy.matrix);

    dummy.rotation.set(0, rot + Math.PI / 2, 0);
    dummy.updateMatrix();
    meshB.setMatrixAt(i, dummy.matrix);

    i++;
  }
  meshA.count = i;
  meshB.count = i;

  const group = new THREE.Group();
  group.add(meshA, meshB);
  return group;
}
