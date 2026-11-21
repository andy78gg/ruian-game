import * as THREE from 'three';

const TRUNK_COLOR = 0x4a3320;
const LEAF_DARK = [0x2f5a2a, 0x3a6830, 0x2a4f25];
const LEAF_LIGHT = [0x52843e, 0x5e9248, 0x477a36];

// 在地形上随机放置树木：阔叶橡树 / 尖冠松树，细树干、窄冠幅、整体高挑
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
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: false, emissive: c, emissiveIntensity: 0.06 })
  );
  const leafLightMats = LEAF_LIGHT.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: false, emissive: c, emissiveIntensity: 0.08 })
  );
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 10) continue; // 留出出生点

    const y = heightAt(x, z);
    const scale = 2.0 + Math.random() * 1.0; // 高挑但不粗壮
    const pine = Math.random() < 0.45;

    const tree = new THREE.Group();

    // 两段式细树干：下粗上细，高度保持
    const trunkH = 2.0 * scale;
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * scale, 0.33 * scale, trunkH * 0.55, 7),
      trunkMat
    );
    lower.position.y = (trunkH * 0.55) / 2;
    lower.castShadow = true;
    lower.receiveShadow = true;
    tree.add(lower);

    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13 * scale, 0.2 * scale, trunkH * 0.55, 7),
      trunkMat
    );
    upper.position.y = trunkH * 0.55 + (trunkH * 0.55) / 2;
    upper.castShadow = true;
    upper.receiveShadow = true;
    tree.add(upper);

    if (pine) {
      // 四层逐层收窄的锥形松树，冠幅收窄
      const layers = 4;
      for (let l = 0; l < layers; l++) {
        const r = (0.9 - l * 0.2) * scale;
        const h = 1.1 * scale;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(r, h, 8),
          pick(leafDarkMats)
        );
        cone.position.y = trunkH * 0.55 + l * 0.72 * scale + h * 0.35;
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
      }
    } else {
      // 阔叶橡树：一团主冠 + 2~3 团错落侧冠，窄冠幅
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9 * scale, 1),
        pick(leafLightMats)
      );
      crown.position.y = trunkH + 0.9 * scale;
      crown.scale.y = 0.8;
      crown.castShadow = true;
      crown.receiveShadow = true;
      tree.add(crown);

      const blobs = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < blobs; b++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = (0.35 + Math.random() * 0.35) * scale;
        const r = (0.45 + Math.random() * 0.3) * scale;
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
        blob.receiveShadow = true;
        tree.add(blob);
      }
    }

    tree.position.set(x, y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
    // 圆形碰撞半径随细树干给出
    trees.push({ group: tree, hp: 3, alive: true, kind: 'tree', x, z, radius: 0.32 * scale });
    placed++;
  }

  return { group, trees };
}

// 交叉双片草丛（InstancedMesh），比单片更饱满自然；每株带轻微色差，并随风轻摆
export function buildGrass(heightAt, count = 900) {
  const geo = new THREE.PlaneGeometry(0.22, 0.6);
  geo.translate(0, 0.3, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
  });

  const meshA = new THREE.InstancedMesh(geo, mat, count);
  const meshB = new THREE.InstancedMesh(geo, mat, count);
  meshA.receiveShadow = true;
  meshB.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const base = new THREE.Color(0x557a3c);
  const tint = new THREE.Color();
  const blades = [];

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
    const phase = Math.random() * Math.PI * 2;

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    meshA.setMatrixAt(i, dummy.matrix);

    dummy.rotation.set(0, rot + Math.PI / 2, 0);
    dummy.updateMatrix();
    meshB.setMatrixAt(i, dummy.matrix);

    // 亮度在基准草色上下浮动，避免整片同色
    const k = 0.82 + Math.random() * 0.35;
    tint.copy(base).multiplyScalar(k);
    meshA.setColorAt(i, tint);
    meshB.setColorAt(i, tint);

    blades.push({ x, y, z, rot, s, phase });
    i++;
  }
  meshA.count = i;
  meshB.count = i;
  meshA.instanceColor.needsUpdate = true;
  meshB.instanceColor.needsUpdate = true;

  // 随风轻摆：每株相位错开，绕根部小幅倾斜，time 为累计秒数
  function update(time) {
    for (let b = 0; b < blades.length; b++) {
      const bl = blades[b];
      const sway = Math.sin(time * 1.8 + bl.phase) * 0.12;
      dummy.position.set(bl.x, bl.y, bl.z);
      dummy.rotation.set(sway, bl.rot, sway * 0.5);
      dummy.scale.set(bl.s, bl.s, bl.s);
      dummy.updateMatrix();
      meshA.setMatrixAt(b, dummy.matrix);

      dummy.rotation.set(sway, bl.rot + Math.PI / 2, sway * 0.5);
      dummy.updateMatrix();
      meshB.setMatrixAt(b, dummy.matrix);
    }
    meshA.instanceMatrix.needsUpdate = true;
    meshB.instanceMatrix.needsUpdate = true;
  }

  const group = new THREE.Group();
  group.add(meshA, meshB);
  return { group, update };
}
