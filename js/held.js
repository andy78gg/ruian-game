import * as THREE from 'three';

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, flatShading: true, roughness: 1 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa2ad, flatShading: true, roughness: 0.6 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8d8d8d, flatShading: true, roughness: 1 }),
  food: new THREE.MeshStandardMaterial({ color: 0xe8b339, flatShading: true, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4c8a3a, flatShading: true, roughness: 1 }),
};

function mesh(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// 用基础几何体拼低多边形手持模型
function buildModel(type) {
  const g = new THREE.Group();

  switch (type) {
    case 'pickaxe': {
      const handle = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5), MAT.wood, 0, 0, 0);
      const head = mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), MAT.metal, 0, 0.24, 0);
      g.add(handle, head);
      break;
    }
    case 'axe': {
      const handle = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5), MAT.wood, 0, 0, 0);
      const blade = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.05), MAT.metal, 0.09, 0.16, 0);
      g.add(handle, blade);
      break;
    }
    case 'spear': {
      const shaft = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5), MAT.wood, 0, 0, 0);
      const tip = mesh(new THREE.ConeGeometry(0.045, 0.14, 5), MAT.stone, 0, 0.47, 0);
      g.add(shaft, tip);
      break;
    }
    case 'shield': {
      const board = mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8),
        MAT.wood,
        0, 0, 0,
        Math.PI / 2, 0, 0
      );
      const crossV = mesh(new THREE.BoxGeometry(0.05, 0.34, 0.05), MAT.metal, 0, 0, 0.02);
      const crossH = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), MAT.metal, 0, 0, 0.02);
      g.add(board, crossV, crossH);
      break;
    }
    case 'food': {
      const cob = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 6), MAT.food, 0, 0, 0);
      const husk = mesh(new THREE.ConeGeometry(0.05, 0.1, 6), MAT.leaf, 0, -0.15, 0);
      g.add(cob, husk);
      break;
    }
    default: {
      const stick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), MAT.wood, 0, 0, 0);
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
