import * as THREE from 'three';
import { noise3, jitterRadial, paint, paintGradient, merge } from './shape.js?v=27';

// 树皮：根部深褐 → 上部偏亮的灰褐，靠顶点色做渐变，省掉贴图
const BARK_LOW = 0x3a2818;
const BARK_HIGH = 0x74532f;

// 每棵树的叶色从一套里随机取一组，同组内再按高度/噪声分层，避免一片森林同色
const LEAF_PALETTES = [
  [0x274a22, 0x386330, 0x4d7d3b],
  [0x2b5230, 0x3c6b39, 0x517f41],
  [0x365f26, 0x4a7830, 0x5e9248],
  [0x22402a, 0x2f5533, 0x3f6b3e],
  [0x3a6231, 0x4c7a3c, 0x659a4b],
  [0x2f5a35, 0x3f6f43, 0x548a52],
];

// 共享材质：顶点色负责所有色差，全部树共用两个材质，绘制调用保持在每棵 2 次
const BARK_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
const LEAF_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.93,
  metalness: 0,
  flatShading: true, // 平面着色让叶团呈碎面，比光滑球更像枝叶
  // 叶片有透光感：叶背/冠底不该是纯黑，补一点绿色自发光模拟散射
  emissive: new THREE.Color(0x1f3a16),
  emissiveIntensity: 0.55,
});

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 树干：旋转成形做出根部外扩的喇叭口，再叠加弯曲与顶点扰动
function trunkGeometry(s, trunkH, seed) {
  const r0 = 0.3 * s;
  const profile = [
    [0.0001, 0],
    [r0 * 1.5, 0],
    [r0 * 1.05, trunkH * 0.03],
    [r0 * 0.8, trunkH * 0.1],
    [r0 * 0.6, trunkH * 0.32],
    [r0 * 0.45, trunkH * 0.6],
    [r0 * 0.35, trunkH * 0.85],
    [r0 * 0.27, trunkH],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  const geo = new THREE.LatheGeometry(profile, 10);

  // 上段自然倾斜：越靠顶偏移越大
  const bend = rnd(-0.1, 0.1) * s;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = (pos.getY(i) / trunkH) ** 2;
    pos.setX(i, pos.getX(i) + bend * k);
    pos.setZ(i, pos.getZ(i) + bend * 0.35 * k);
  }
  geo.computeVertexNormals();
  jitterRadial(geo, 0.1, seed, { vertical: 0.012 });
  return paintGradient(geo, BARK_LOW, BARK_HIGH, 0, trunkH, seed, 0.08);
}

// 枝：细圆柱从 originY 沿 dir 伸出，根部粗梢部细
function branchGeometry(len, r0, r1, dir, originY, seed) {
  const geo = new THREE.CylinderGeometry(r1, r0, len, 5, 1);
  geo.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  geo.applyQuaternion(q);
  geo.translate(0, originY, 0);
  return paintGradient(geo, BARK_LOW, BARK_HIGH, originY, originY + len, seed, 0.05);
}

// 尖塔松：逐层收窄的锥形树冠，底圈顶点下垂成"裙边"，边缘再做径向扰动
function pineFoliage(s, trunkH, seed, palette) {
  const geos = [];
  const tiers = 5 + Math.floor(Math.random() * 3);
  const startY = trunkH * 0.24;
  const endY = trunkH * 0.96;
  const cDark = new THREE.Color(palette[0]);
  const cLight = new THREE.Color(palette[2]);

  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = (1.3 * (1 - t) ** 0.75 + 0.16) * s;
    const h = (0.95 - 0.3 * t) * s;
    const y = startY + t * (endY - startY);

    const cone = new THREE.ConeGeometry(r, h, 9, 3);
    const pos = cone.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const vz = pos.getZ(v);
      const rad = Math.hypot(vx, vz);
      if (rad > 1e-4 && vy < h * 0.08) {
        const droop = (rad / r) * h * 0.3 * (0.6 + noise3(vx, vy, vz, seed + i) * 0.8);
        pos.setY(v, vy - droop);
      }
    }
    pos.needsUpdate = true;
    jitterRadial(cone, 0.28, seed + i * 31, { vertical: 0.05 });
    cone.rotateY(Math.random() * Math.PI);
    cone.translate(0, y + h * 0.5, 0);

    paint(cone, (c, x, yy, z) => {
      const k = THREE.MathUtils.clamp((yy - y) / h, 0, 1);
      c.copy(cDark).lerp(cLight, k * 0.85);
      c.offsetHSL(0, 0, (noise3(x, yy, z, seed + i) - 0.5) * 0.11);
    });
    geos.push(cone);
  }
  return geos;
}

// 阔叶 / 圆团：主冠 + 几团错落侧冠，冠块由噪声推挤成不规则体积，另配可见主枝
function broadFoliage(s, trunkH, seed, palette, wide) {
  const foliage = [];
  const branches = [];
  const lobes = 5 + Math.floor(Math.random() * 3);
  const centers = [];
  const c0 = new THREE.Color(palette[0]);
  const c1 = new THREE.Color(palette[2]);

  for (let i = 0; i < lobes; i++) {
    const ang = (i / lobes) * Math.PI * 2 + rnd(-0.35, 0.35);
    const spread = (i === 0 ? 0.05 : rnd(0.3, 0.62)) * s;
    const rx = Math.cos(ang) * spread * (wide ? 1.3 : 1);
    const rz = Math.sin(ang) * spread * (wide ? 1.3 : 1);
    const ry = trunkH * 0.78 + (i === 0 ? 0.62 : rnd(0.26, 0.95)) * s;
    const rad = (i === 0 ? rnd(0.64, 0.8) : rnd(0.42, 0.64)) * s;

    const blob = new THREE.IcosahedronGeometry(rad, 1);
    jitterRadial(blob, 0.32, seed + i * 17, { vertical: 0.22 });
    blob.scale(wide ? 1.1 : 1, wide ? 0.6 : 0.8, wide ? 1.1 : 1);
    blob.translate(rx, ry, rz);

    const shade = rnd(0.55, 1);
    paint(blob, (c, x, y, z) => {
      const k = THREE.MathUtils.clamp((y - (ry - rad)) / (rad * 2), 0, 1);
      c.copy(c0).lerp(c1, 0.2 + k * 0.75 * shade);
      c.offsetHSL(0, 0, (noise3(x, y, z, seed + i) - 0.5) * 0.13);
    });

    foliage.push(blob);
    centers.push({ x: rx, y: ry, z: rz, r: rad });
  }

  // 主枝：从树干分叉处伸向几团大冠，树干与树冠之间不再悬空
  const forkY = trunkH * 0.9;
  const count = Math.min(4, centers.length - 1);
  for (let i = 1; i <= count; i++) {
    const t = centers[i];
    const dx = t.x;
    const dy = Math.max(0.18 * s, t.y - forkY);
    const dz = t.z;
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const len = Math.hypot(dx, dy, dz) * 0.8;
    branches.push(branchGeometry(len, 0.06 * s, 0.026 * s, dir, forkY, seed + i * 5));
  }

  return { foliage, branches };
}

// 高瘦疏冠：细长树干，顶部 2~3 团稀疏枝叶
function sparseFoliage(s, trunkH, seed, palette) {
  const foliage = [];
  const branches = [];
  const c0 = new THREE.Color(palette[0]);
  const c1 = new THREE.Color(palette[2]);
  const blobs = 2 + Math.floor(Math.random() * 2);

  for (let i = 0; i < blobs; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spread = rnd(0.25, 0.55) * s;
    const rx = Math.cos(ang) * spread;
    const rz = Math.sin(ang) * spread;
    const ry = trunkH * 0.82 + rnd(0.05, 0.5) * s;
    const rad = rnd(0.3, 0.46) * s;

    const blob = new THREE.IcosahedronGeometry(rad, 1);
    jitterRadial(blob, 0.3, seed + i * 23, { vertical: 0.24 });
    blob.scale(1, 0.85, 1);
    blob.translate(rx, ry, rz);
    paint(blob, (c, x, y, z) => {
      const k = THREE.MathUtils.clamp((y - (ry - rad)) / (rad * 2), 0, 1);
      c.copy(c0).lerp(c1, 0.3 + k * 0.6);
      c.offsetHSL(0, 0, (noise3(x, y, z, seed + i) - 0.5) * 0.12);
    });
    foliage.push(blob);

    const dy = Math.max(0.2 * s, ry - trunkH * 0.92);
    const dir = new THREE.Vector3(rx, dy, rz).normalize();
    const len = Math.hypot(rx, dy, rz) * 0.85;
    branches.push(branchGeometry(len, 0.045 * s, 0.02 * s, dir, trunkH * 0.9, seed + i * 3));
  }
  return { foliage, branches };
}

// 在地形上随机放置树木：尖塔松 / 圆团阔叶 / 扁宽伞盖 / 高瘦疏冠
export function buildTrees(heightAt, count = 90) {
  const group = new THREE.Group();
  const trees = [];

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 7) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 11) continue; // 留出出生点

    const y = heightAt(x, z);
    const s = rnd(2.0, 3.1);
    const seed = Math.floor(Math.random() * 99991);
    const roll = Math.random();
    const form = roll < 0.44 ? 'pine' : roll < 0.7 ? 'broad' : roll < 0.88 ? 'round' : 'sparse';
    const palette = pick(LEAF_PALETTES);

    const trunkH = (form === 'pine' ? 2.05 : form === 'sparse' ? 2.95 : 2.3) * s;
    const bark = [trunkGeometry(s, trunkH, seed)];
    let foliage;

    if (form === 'pine') {
      foliage = pineFoliage(s, trunkH, seed, palette);
    } else if (form === 'sparse') {
      const r = sparseFoliage(s, trunkH, seed, palette);
      foliage = r.foliage;
      bark.push(...r.branches);
    } else {
      const r = broadFoliage(s, trunkH, seed, palette, form === 'broad');
      foliage = r.foliage;
      bark.push(...r.branches);
    }

    const tree = new THREE.Group();
    const barkMesh = new THREE.Mesh(merge(bark), BARK_MAT);
    barkMesh.castShadow = true;
    barkMesh.receiveShadow = true;
    const leafMesh = new THREE.Mesh(merge(foliage), LEAF_MAT);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    tree.add(barkMesh, leafMesh);

    tree.position.set(x, y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);

    // 圆形碰撞半径按树干粗细给
    trees.push({ group: tree, hp: 3, alive: true, kind: 'tree', x, z, radius: 0.34 * s });
    placed++;
  }

  return { group, trees };
}

// 尖叶草丛（InstancedMesh）：交叉双片，叶片收窄成尖梢并轻微后弯；根部深绿、梢部浅绿的顶点渐变，每株再带色差，随风轻摆
export function buildGrass(heightAt, count = 900) {
  const geo = new THREE.PlaneGeometry(0.22, 0.6, 1, 2);
  geo.translate(0, 0.3, 0);

  // 收窄叶宽成尖梢，梢部略向后弯
  const pos = geo.attributes.position;
  const rootCol = new THREE.Color(0x3c5d2e);
  const tipCol = new THREE.Color(0x779c4f);
  const colArr = [];
  const tmpCol = new THREE.Color();
  for (let v = 0; v < pos.count; v++) {
    const y = pos.getY(v);
    const t = y / 0.6; // 0=根 1=梢
    const width = 0.22 * (1 - 0.72 * t);
    pos.setX(v, (pos.getX(v) / 0.22) * width);
    pos.setZ(v, t * t * 0.06);
    tmpCol.copy(rootCol).lerp(tipCol, t);
    colArr.push(tmpCol.r, tmpCol.g, tmpCol.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
  });

  const meshA = new THREE.InstancedMesh(geo, mat, count);
  const meshB = new THREE.InstancedMesh(geo, mat, count);
  meshA.receiveShadow = true;
  meshB.receiveShadow = true;
  const dummy = new THREE.Object3D();
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

    // 亮度在基准上下浮动，避免整片同色；绿色基调由顶点渐变提供
    const k = 0.85 + Math.random() * 0.3;
    tint.setScalar(k);
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
