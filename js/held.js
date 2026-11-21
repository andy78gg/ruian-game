import * as THREE from 'three';

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, flatShading: false, roughness: 0.9 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x6b4426, flatShading: false, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa2ad, flatShading: false, roughness: 0.45, metalness: 0.5 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8d8d8d, flatShading: false, roughness: 0.9 }),
  food: new THREE.MeshStandardMaterial({ color: 0xe8b339, flatShading: false, roughness: 0.8 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4c8a3a, flatShading: false, roughness: 1 }),
};

function mesh(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// 用基础几何体拼装立体手持模型：握把、金属箍、刃部/倒刺、盾脐铆钉等多部件组合。
function buildModel(type) {
  const g = new THREE.Group();

  switch (type) {
    case 'pickaxe': {
      // 木柄 + 底部缠握 + 顶部金属箍 + 两头下弯的镐头
      const handle = mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.62, 8), MAT.wood, 0, 0, 0);
      const grip1 = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 8), MAT.woodDark, 0, -0.22, 0);
      const grip2 = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 8), MAT.woodDark, 0, -0.14, 0);
      const collar = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.05, 8), MAT.metal, 0, 0.26, 0);
      const block = mesh(new THREE.BoxGeometry(0.12, 0.07, 0.07), MAT.metal, 0, 0.3, 0);
      const tipL = mesh(new THREE.ConeGeometry(0.05, 0.18, 6), MAT.metal, -0.14, 0.28, 0, 0, 0, Math.PI / 2.3);
      const tipR = mesh(new THREE.ConeGeometry(0.05, 0.18, 6), MAT.metal, 0.14, 0.28, 0, 0, 0, -Math.PI / 2.3);
      g.add(handle, grip1, grip2, collar, block, tipL, tipR);
      break;
    }
    case 'axe': {
      // 木柄 + 金属箍 + 斧眼 + 斧背 + 宽斧刃
      const handle = mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.62, 8), MAT.wood, 0, 0, 0);
      const collar = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.05, 8), MAT.metal, 0, 0.25, 0);
      const eye = mesh(new THREE.BoxGeometry(0.07, 0.1, 0.07), MAT.metal, 0, 0.28, 0);
      const back = mesh(new THREE.BoxGeometry(0.05, 0.18, 0.06), MAT.metal, -0.045, 0.28, 0);
      const blade = mesh(new THREE.BoxGeometry(0.15, 0.17, 0.04), MAT.metal, 0.09, 0.28, 0, 0, 0, 0.08);
      const edge = mesh(new THREE.BoxGeometry(0.04, 0.19, 0.02), MAT.metal, 0.17, 0.28, 0, 0, 0, 0.08);
      g.add(handle, collar, eye, back, blade, edge);
      break;
    }
    case 'spear': {
      // 长木杆 + 石质矛头基座 + 主尖 + 两侧倒刺 + 尾锥
      const shaft = mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.85, 8), MAT.wood, 0, 0, 0);
      const base = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), MAT.stone, 0, 0.43, 0);
      const tip = mesh(new THREE.ConeGeometry(0.05, 0.16, 6), MAT.stone, 0, 0.54, 0);
      const barbL = mesh(new THREE.ConeGeometry(0.02, 0.08, 5), MAT.stone, -0.04, 0.45, 0, 0, 0, Math.PI / 2.5);
      const barbR = mesh(new THREE.ConeGeometry(0.02, 0.08, 5), MAT.stone, 0.04, 0.45, 0, 0, 0, -Math.PI / 2.5);
      const butt = mesh(new THREE.ConeGeometry(0.02, 0.08, 6), MAT.woodDark, 0, -0.46, 0, Math.PI, 0, 0);
      g.add(shaft, base, tip, barbL, barbR, butt);
      break;
    }
    case 'shield': {
      // 圆木板 + 金属边缘箍 + 横竖木肋 + 中央金属凸脐 + 一圈铆钉
      const board = mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12),
        MAT.wood,
        0, 0, 0,
        Math.PI / 2, 0, 0
      );
      const rim = mesh(new THREE.TorusGeometry(0.23, 0.016, 8, 28), MAT.metal, 0, 0, 0);
      const ribV = mesh(new THREE.BoxGeometry(0.05, 0.4, 0.03), MAT.woodDark, 0, 0, 0.02);
      const ribH = mesh(new THREE.BoxGeometry(0.4, 0.05, 0.03), MAT.woodDark, 0, 0, 0.02);
      const boss = mesh(new THREE.SphereGeometry(0.06, 12, 8), MAT.metal, 0, 0, 0.04);
      boss.scale.z = 0.5;
      g.add(board, rim, ribV, ribH, boss);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const rivet = mesh(
          new THREE.SphereGeometry(0.018, 8, 6),
          MAT.metal,
          Math.cos(ang) * 0.17,
          Math.sin(ang) * 0.17,
          0.03
        );
        g.add(rivet);
      }
      break;
    }
    case 'food': {
      // 玉米棒 + 纵向苞叶 + 顶部梗
      const cob = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.24, 8), MAT.food, 0, 0, 0);
      const huskL = mesh(new THREE.ConeGeometry(0.05, 0.14, 5), MAT.leaf, -0.04, -0.08, 0, 0, 0, 0.5);
      const huskR = mesh(new THREE.ConeGeometry(0.05, 0.14, 5), MAT.leaf, 0.04, -0.08, 0, 0, 0, -0.5);
      const stem = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5), MAT.woodDark, 0, 0.15, 0);
      g.add(cob, huskL, huskR, stem);
      break;
    }
    case 'berry': {
      const fruitMat = new THREE.MeshStandardMaterial({ color: 0xc23b3e, roughness: 0.6, flatShading: false });
      const fruit = mesh(new THREE.SphereGeometry(0.06, 10, 8), fruitMat, 0, 0, 0);
      const stem = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 5), MAT.woodDark, 0, 0.07, 0);
      const leaf = mesh(new THREE.ConeGeometry(0.035, 0.07, 5), MAT.leaf, 0.02, 0.1, 0, 0, 0, -0.4);
      g.add(fruit, stem, leaf);
      break;
    }
    default: {
      const stick = mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.4, 8), MAT.wood, 0, 0, 0);
      g.add(stick);
    }
  }

  return g;
}

// 手持物：挂在相机右下，切换物品时替换模型，左键触发挥动动画。
export function createHeld(camera) {
  const holder = new THREE.Group();
  holder.position.set(0.32, -0.28, -0.55);
  camera.add(holder);

  let current = null;
  let swing = 0;

  function setItem(item) {
    if (current) holder.remove(current);
    current = buildModel(item.model);
    holder.add(current);
  }

  function triggerSwing() {
    swing = 1;
  }

  function update(dt) {
    if (swing > 0) {
      swing = Math.max(0, swing - dt * 3.2);
      const t = 1 - swing;
      holder.rotation.x = -Math.sin(t * Math.PI) * 0.7;
      holder.position.y = -0.28 - Math.sin(t * Math.PI) * 0.05;
    } else {
      holder.rotation.x = 0;
      holder.position.y = -0.28;
    }
  }

  return { setItem, triggerSwing, update };
}
