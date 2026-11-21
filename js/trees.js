import * as THREE from 'three';

const TRUNK_COLOR = 0x5e3f28;
const LEAF_COLORS = [0x2f6b2e, 0x3a7a33, 0x275c2a, 0x46853a];

// 在地形上随机放置低多边形树木：圆冠橡树 / 尖冠松树两种
export function buildTrees(heightAt, count = 90) {
  const group = new THREE.Group();
  const trees = [];

  const trunkMat = new THREE.MeshStandardMaterial({
    color: TRUNK_COLOR,
    flatShading: true,
    roughness: 1,
  });
  const leafMats = LEAF_COLORS.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 1 })
  );

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 7) continue; // 留出出生点

    const y = heightAt(x, z);
    const scale = 1.3 + Math.random() * 0.9;
    const pine = Math.random() < 0.45;
    const leafMat = leafMats[Math.floor(Math.random() * leafMats.length)];

    const tree = new THREE.Group();

    const trunkH = 1.6 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, trunkH, 5),
      trunkMat
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    if (pine) {
      // 三层锥形松树
      for (let l = 0; l < 3; l++) {
        const r = (1.4 - l * 0.32) * scale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.25 * scale, 6), leafMat);
        cone.position.y = trunkH + l * 0.72 * scale + 0.45 * scale;
        cone.castShadow = true;
        tree.add(cone);
      }
    } else {
      // 圆冠橡树，偶尔加一团侧冠
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45 * scale, 0), leafMat);
      crown.position.y = trunkH + 0.8 * scale;
      crown.scale.y = 0.85;
      crown.castShadow = true;
      tree.add(crown);

      if (Math.random() < 0.5) {
        const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * scale, 0), leafMat);
        crown2.position.set(0.6 * scale, trunkH + 0.4 * scale, 0.25 * scale);
        crown2.castShadow = true;
        tree.add(crown2);
      }
    }

    tree.position.set(x, y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
    trees.push({ group: tree, hp: 3, alive: true, kind: 'tree' });
    placed++;
  }

  return { group, trees };
}

// 用 InstancedMesh 撒一层低多边形草叶
export function buildGrass(heightAt, count = 450) {
  const geo = new THREE.PlaneGeometry(0.18, 0.5);
  geo.translate(0, 0.25, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4c8a3a,
    flatShading: true,
    side: THREE.DoubleSide,
    roughness: 1,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();

  let i = 0;
  let attempts = 0;
  while (i < count && attempts < count * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 110;
    const z = (Math.random() - 0.5) * 110;
    if (Math.hypot(x, z) < 3) continue;

    dummy.position.set(x, heightAt(x, z), z);
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.8;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    i++;
  }
  mesh.count = i;
  return mesh;
}
