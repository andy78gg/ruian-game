import * as THREE from 'three';

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, flatShading: false, roughness: 0.9 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x6b4426, flatShading: false, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa2ad, flatShading: false, roughness: 0.45, metalness: 0.5 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8d8d8d, flatShading: false, roughness: 0.9 }),
  food: new THREE.MeshStandardMaterial({ color: 0xe8b339, flatShading: false, roughness: 0.8 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4c8a3a, flatShading: false, roughness: 1 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc98d63, flatShading: false, roughness: 0.7 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x5a6472, flatShading: false, roughness: 0.95 }),
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

// 不同手持物的基础前倾角：工具柄朝前伸（相机 -z），柄尾收向手；盾平持正对镜头。
const TILT = {
  pickaxe: -1.22,
  axe: -1.22,
  spear: -1.35,
  shield: 0,
  food: -0.7,
  berry: -0.7,
  default: -1.15,
};

// 绕握柄轴（局部 y）的滚转：镐/斧的工作面原本朝左右(x)，转 90° 让头部朝前(-z)对准星。
const ROLL = {
  pickaxe: Math.PI / 2,
  axe: Math.PI / 2,
  spear: 0,
  shield: 0,
  food: 0,
  berry: 0,
  default: 0,
};

// 偏航内拐：绕握持点把工具前端向准星（画面中心）收；镐/斧多拐，矛保持自然前伸。
const YAW = {
  pickaxe: 0.28,
  axe: 0.28,
  spear: 0.1,
  shield: 0,
  food: 0.12,
  berry: 0.12,
  default: 0.16,
};

// 方块风第一人称手臂：手掌包住柄尾，小臂与袖口斜伸向画面底边；与工具挂在同一 grip 下，随前倾一起动。
function buildArm() {
  const g = new THREE.Group();
  // 手掌（方块），中心即握持点
  const fist = mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), MAT.skin, 0, -0.02, 0);
  // 小臂，略向后下倾斜
  const fore = mesh(new THREE.BoxGeometry(0.075, 0.28, 0.075), MAT.skin, 0.012, -0.24, 0.02, 0, 0, 0.12);
  const sleeve = mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), MAT.sleeve, 0.016, -0.4, 0.025, 0, 0, 0.12);
  g.add(fist, fore, sleeve);
  return g;
}

// 手持物：挂在相机右下，切换物品时替换模型，左键触发挥砍动画。
export function createHeld(camera) {
  const holder = new THREE.Group();
  holder.position.set(0.34, -0.17, -0.55);
  camera.add(holder);

  // grip 承载基础前倾姿态；手臂与工具都挂在 grip 下，保证手握柄不脱节。
  const grip = new THREE.Group();
  holder.add(grip);

  const arm = buildArm();
  grip.add(arm);

  let current = null;
  let swing = 0;
  let idleTime = 0;      // 待机呼吸累积时间
  let walkPhase = 0;     // 步伐相位
  let moveBlend = 0;      // 静止↔移动平滑过渡 0..1

  function setItem(item) {
    if (current) grip.remove(current);
    current = buildModel(item.model);
    // 把模型握把处抬到 grip 原点（手掌位置），柄尾落在掌心
    current.position.y = 0.18;
    current.rotation.y = ROLL[item.model] ?? ROLL.default;
    grip.rotation.x = TILT[item.model] ?? TILT.default;
    grip.rotation.y = YAW[item.model] ?? YAW.default;
    grip.rotation.z = 0.06;
    grip.add(current);
  }

  function triggerSwing() {
    swing = 1;
  }

  // moving：是否按移动键；running：是否奔跑。待机做呼吸浮动，移动叠加步伐左右/上下摆动。
  function update(dt, moving = false, running = false) {
    idleTime += dt;

    const blendTarget = moving ? 1 : 0;
    moveBlend += (blendTarget - moveBlend) * Math.min(1, dt * 8);

    // 挥砍动画优先级最高：起手抬后 → 劈下 → 回收，带前后弧线与轻微横摆
    if (swing > 0) {
      swing = Math.max(0, swing - dt * 3.0);
      const k = 1 - swing;              // 0 → 1
      const arc = Math.sin(k * Math.PI); // 0 → 1 → 0
      holder.rotation.x = -arc * 0.65;
      holder.rotation.z = Math.sin(k * Math.PI * 2) * 0.05;
      holder.position.x = 0.34;
      holder.position.y = -0.17 - arc * 0.06;
      return;
    }

    // 步频：奔跑比走路更快
    walkPhase += dt * (running ? 11 : 7);

    // 待机呼吸：轻微上下浮动 + 极小幅倾斜
    const breathY = Math.sin(idleTime * 1.6) * 0.008;
    const breathRz = Math.sin(idleTime * 0.8) * 0.012;

    // 步伐摆动：左右平移、落地上下起伏、横滚与俯仰随步频
    const walkX = Math.sin(walkPhase) * 0.028;
    const walkY = Math.abs(Math.cos(walkPhase)) * 0.02;
    const walkRz = Math.sin(walkPhase) * 0.04;
    const walkRx = -Math.cos(walkPhase) * 0.03;

    holder.position.x = 0.34 + walkX * moveBlend;
    holder.position.y = -0.17 + breathY - walkY * moveBlend;
    holder.rotation.x = walkRx * moveBlend;
    holder.rotation.z = breathRz + walkRz * moveBlend;
  }

  return { setItem, triggerSwing, update, _holder: holder };
}
