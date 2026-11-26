import * as THREE from 'three';

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.88, metalness: 0 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x5d3a20, roughness: 0.94, metalness: 0 }),
  rope: new THREE.MeshStandardMaterial({ color: 0x6d5734, roughness: 0.98, metalness: 0 }),
  // 金属：没有环境贴图时金属度一高正面就发黑，降到 0.2 左右并补一点冷色自发光，
  // 才能读出"钢"的亮度而不是一片黑铁板
  metal: new THREE.MeshStandardMaterial({
    color: 0xb9c2cd, roughness: 0.38, metalness: 0.18,
    emissive: new THREE.Color(0x1b212a), emissiveIntensity: 0.65,
  }),
  metalBright: new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, roughness: 0.27, metalness: 0.22,
    emissive: new THREE.Color(0x222932), emissiveIntensity: 0.5,
  }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8b8b86, roughness: 0.92, metalness: 0 }),
  food: new THREE.MeshStandardMaterial({ color: 0xe0a92f, roughness: 0.75, metalness: 0 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4c8a3a, roughness: 1, metalness: 0 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc4885f, roughness: 0.72, metalness: 0 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x54606f, roughness: 0.95, metalness: 0 }),
};

function mesh(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// 旋转成形：剖面 [半径, 高度] 绕 y 轴旋成，两端自动收口
function lathe(points, segments = 10) {
  const pts = points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0002), y));
  return new THREE.LatheGeometry(pts, segments);
}

// 沿 y 轴的木柄：两端略放、中段微收，底部平口。原点定在握持处（柄尾往下 8cm）
function handleGeometry(len, rButt = 0.026, rTop = 0.023) {
  const pts = [[0.0002, 0], [rButt * 1.06, 0.005]];
  const n = 6;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const r = THREE.MathUtils.lerp(rButt, rTop, t) * (1 - 0.14 * Math.sin(t * Math.PI));
    pts.push([r, t * len]);
  }
  pts.push([rTop * 1.06, len - 0.005], [0.0002, len]);
  const geo = lathe(pts, 10);
  geo.translate(0, -0.08, 0); // 柄尾落在线下 8cm，手指自然握在原点附近
  return geo;
}

// 挤压成形：把 2D 轮廓挤出成有厚度的板件，带小倒角，边缘不是纸片
function extrudeShape(shape, depth, curveSegments = 12) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.3,
    bevelSize: depth * 0.22,
    bevelSegments: 2,
    curveSegments,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// 缠绳：一圈圈套在柄上，替代原来光秃秃的圆柱
function wrapRing(r, y, mat = MAT.rope, tube = 0.0042) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 5, 12), mat);
  m.position.y = y;
  m.rotation.x = Math.PI / 2;
  return m;
}

// 镐头：内凹的新月剖面，两端收成尖、向下弯，中间厚 —— 真实十字镐的剪影
function pickHeadGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.23, -0.02);
  s.quadraticCurveTo(-0.07, 0.13, 0, 0.145); // 上弧，中央隆起
  s.quadraticCurveTo(0.07, 0.13, 0.23, -0.02); // 右臂下弯收尖
  s.quadraticCurveTo(0.08, 0.05, 0, 0.055); // 内凹下弧
  s.quadraticCurveTo(-0.08, 0.05, -0.23, -0.02); // 左臂回到尖端
  return extrudeShape(s, 0.04, 16);
}

// 斧头：斧背 + 渐宽斧身 + 弧形刃口
function axeHeadGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.062, 0.058);
  s.lineTo(0.012, 0.082);
  s.quadraticCurveTo(0.105, 0.104, 0.152, 0.062); // 上刃肩
  s.quadraticCurveTo(0.176, 0.028, 0.172, -0.004); // 刃口上端
  s.quadraticCurveTo(0.166, -0.052, 0.132, -0.062); // 弧形刃口
  s.quadraticCurveTo(0.07, -0.078, 0.006, -0.062);
  s.lineTo(-0.062, -0.052); // 斧背
  s.closePath();
  return extrudeShape(s, 0.03, 14);
}

// 矛头：压扁的双锥石刃 + 倒刺，绑在杆头
function spearHeadGeometry() {
  const geo = new THREE.OctahedronGeometry(0.05, 0);
  geo.scale(1.05, 2.7, 0.34);
  geo.translate(0, 0.13, 0);
  return geo;
}

// 用基础几何 + 旋转/挤压成形拼装手持模型
function buildModel(type) {
  const g = new THREE.Group();

  switch (type) {
    case 'pickaxe': {
      // 0.72m 木柄（握柄缠绳）+ 金属颈箍 + 新月镐头
      const len = 0.72;
      const handle = mesh(handleGeometry(len), MAT.wood, 0, 0, 0);
      // 镐头坐在柄顶，内凹的下弧刚好咬住柄端，不像浮在杆子尖端；略微上仰让刃面吃到天光
      const head = mesh(pickHeadGeometry(), MAT.metal, 0, len - 0.135, 0, -0.13, 0, 0);
      const collar = mesh(
        lathe([[0.014, 0], [0.026, 0.01], [0.026, 0.042], [0.014, 0.052]], 10),
        MAT.metal,
        0,
        len - 0.3,
        0
      );
      g.add(handle, head, collar);
      for (const y of [-0.055, 0.0, 0.055]) g.add(wrapRing(0.0275, y));
      break;
    }
    case 'axe': {
      const len = 0.7;
      const handle = mesh(handleGeometry(len, 0.025, 0.022), MAT.wood, 0, 0, 0);
      const head = mesh(axeHeadGeometry(), MAT.metal, 0, len - 0.075, 0);
      const wedge = mesh(new THREE.BoxGeometry(0.05, 0.02, 0.032), MAT.woodDark, 0, len - 0.058, 0);
      g.add(handle, head, wedge);
      for (const y of [-0.045, 0.02]) g.add(wrapRing(0.0265, y));
      break;
    }
    case 'steelAxe': {
      const len = 0.7;
      const handle = mesh(handleGeometry(len, 0.025, 0.022), MAT.woodDark, 0, 0, 0);
      const head = mesh(axeHeadGeometry(), MAT.metalBright, 0, len - 0.075, 0);
      const wedge = mesh(new THREE.BoxGeometry(0.05, 0.02, 0.032), MAT.metal, 0, len - 0.058, 0);
      const guard = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.014, 10), MAT.metalBright, 0, len - 0.152, 0);
      g.add(handle, head, wedge, guard);
      for (const y of [-0.045, 0.02]) g.add(wrapRing(0.0265, y));
      break;
    }
    case 'spear': {
      // 细长木杆 + 石刃 + 两道绑绳 + 尾锥
      const len = 1.0;
      const shaft = mesh(handleGeometry(len, 0.019, 0.015), MAT.wood, 0, 0, 0);
      const head = mesh(spearHeadGeometry(), MAT.stone, 0, len - 0.2, 0);
      const barbL = mesh(new THREE.ConeGeometry(0.016, 0.07, 5), MAT.stone, -0.035, len - 0.16, 0, 0, 0, 0.9);
      const barbR = mesh(new THREE.ConeGeometry(0.016, 0.07, 5), MAT.stone, 0.035, len - 0.16, 0, 0, 0, -0.9);
      const butt = mesh(new THREE.ConeGeometry(0.017, 0.05, 6), MAT.woodDark, 0, -0.1, 0, Math.PI, 0, 0);
      g.add(shaft, head, barbL, barbR, butt);
      for (const y of [len - 0.212, len - 0.245]) g.add(wrapRing(0.0205, y));
      break;
    }
    case 'shield': {
      // 圆木板（边缘略厚）+ 包边 + 横竖木肋 + 中央铁脐 + 一圈铆钉
      const board = mesh(
        lathe([[0.225, -0.022], [0.235, -0.01], [0.235, 0.01], [0.225, 0.022]], 16),
        MAT.wood,
        0, 0, 0,
        Math.PI / 2, 0, 0
      );
      const rim = mesh(new THREE.TorusGeometry(0.232, 0.014, 6, 30), MAT.metal, 0, 0, 0);
      const ribV = mesh(new THREE.BoxGeometry(0.05, 0.42, 0.022), MAT.woodDark, 0, 0, 0.03);
      const ribH = mesh(new THREE.BoxGeometry(0.42, 0.05, 0.022), MAT.woodDark, 0, 0, 0.03);
      const boss = mesh(new THREE.SphereGeometry(0.06, 14, 10), MAT.metal, 0, 0, 0.036);
      boss.scale.z = 0.45;
      g.add(board, rim, ribV, ribH, boss);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rivet = mesh(
          new THREE.SphereGeometry(0.014, 8, 6),
          MAT.metal,
          Math.cos(ang) * 0.2,
          Math.sin(ang) * 0.2,
          0.024
        );
        g.add(rivet);
      }
      break;
    }
    case 'food': {
      // 玉米棒：逐节收窄的棒身 + 两片苞叶 + 顶部断梗
      const cob = mesh(lathe([[0.03, -0.11], [0.052, -0.06], [0.056, 0.03], [0.046, 0.09], [0.026, 0.12]], 9), MAT.food, 0, 0, 0);
      const huskL = mesh(new THREE.ConeGeometry(0.045, 0.15, 5), MAT.leaf, -0.035, -0.06, 0, 0, 0, 0.55);
      const huskR = mesh(new THREE.ConeGeometry(0.045, 0.15, 5), MAT.leaf, 0.035, -0.06, 0, 0, 0, -0.55);
      const stem = mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.05, 5), MAT.woodDark, 0, 0.145, 0);
      g.add(cob, huskL, huskR, stem);
      break;
    }
    case 'berry': {
      const fruitMat = new THREE.MeshStandardMaterial({ color: 0xbe2f36, roughness: 0.55, metalness: 0 });
      const fruit = mesh(new THREE.SphereGeometry(0.055, 12, 10), fruitMat, 0, 0, 0);
      const fruit2 = mesh(new THREE.SphereGeometry(0.04, 10, 8), fruitMat, 0.045, -0.02, 0.02);
      const stem = mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.05, 5), MAT.woodDark, 0, 0.06, 0);
      const leaf = mesh(new THREE.ConeGeometry(0.032, 0.07, 5), MAT.leaf, 0.02, 0.085, 0, 0, 0, -0.5);
      g.add(fruit, fruit2, stem, leaf);
      break;
    }
    case 'torch': {
      // 短木柄 + 缠布头 + 自发光火焰，配合 Bloom 会有光晕
      const stick = mesh(handleGeometry(0.34, 0.019, 0.016), MAT.wood, 0, 0, 0);
      const wrap = mesh(new THREE.CylinderGeometry(0.026, 0.021, 0.06, 8), MAT.rope, 0, 0.27, 0);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
      const flame = mesh(new THREE.ConeGeometry(0.028, 0.08, 7), flameMat, 0, 0.335, 0);
      const core = mesh(new THREE.SphereGeometry(0.017, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }), 0, 0.3, 0);
      g.add(stick, wrap, flame, core);
      break;
    }
    default: {
      g.add(mesh(handleGeometry(0.42, 0.02, 0.017), MAT.wood, 0, 0, 0));
    }
  }

  return g;
}

// 不同手持物的基础前倾角：工具柄朝前伸（相机 -z），柄尾收向手；盾平持正对镜头。
const TILT = {
  pickaxe: -0.62,
  axe: -0.62,
  steelAxe: -0.62,
  spear: -1.32,
  shield: 0,
  food: -0.7,
  berry: -0.7,
  default: -1.1,
};

// 绕握柄轴（局部 y）的滚转：镐/斧略微侧转，让刃面朝向镜头可见（转太多会只剩一条边）。
const ROLL = {
  pickaxe: 0.16,
  axe: 0.16,
  steelAxe: 0.16,
  spear: 0,
  shield: 0,
  food: 0,
  berry: 0,
  default: 0,
};

// 偏航内拐：绕握持点把工具前端向准星（画面中心）收；镐/斧多拐，矛保持自然前伸。
const YAW = {
  pickaxe: 0.3,
  axe: 0.3,
  steelAxe: 0.3,
  spear: 0.12,
  shield: 0,
  food: 0.12,
  berry: 0.12,
  default: 0.16,
};

// 第一人称手臂：握拳包住柄尾，小臂与袖口斜伸向画面右下
function buildArm() {
  const g = new THREE.Group();
  // 手掌：主体 + 指节 + 拇指，比原来的大方块更像手
  const palm = mesh(new THREE.BoxGeometry(0.072, 0.086, 0.076), MAT.skin, 0, -0.012, 0);
  const knuckle = mesh(new THREE.BoxGeometry(0.07, 0.026, 0.08), MAT.skin, 0, 0.026, -0.004);
  const thumb = mesh(new THREE.BoxGeometry(0.026, 0.044, 0.028), MAT.skin, -0.038, 0.01, -0.026, 0.2, 0, -0.35);
  // 小臂用圆柱而不是方盒：圆柱的明暗过渡更像肢体，方盒看起来像根木头
  const fore = mesh(new THREE.CylinderGeometry(0.031, 0.038, 0.17, 10), MAT.skin, 0.013, -0.13, 0.016, 0, 0, 0.13);
  const wrist = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.022, 10), MAT.rope, 0.016, -0.2, 0.019, 0, 0, 0.13);
  const cuff = mesh(new THREE.BoxGeometry(0.078, 0.075, 0.078), MAT.sleeve, 0.02, -0.25, 0.022, 0, 0, 0.13);
  g.add(palm, knuckle, thumb, fore, wrist, cuff);
  return g;
}

// 手持物：挂在相机右下，切换物品时替换模型，左键触发挥砍动画。
export function createHeld(camera) {
  const holder = new THREE.Group();
  holder.position.set(0.37, -0.22, -0.61);
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
    if (current) { grip.remove(current); current = null; }
    if (!item) return;
    current = buildModel(item.model);
    // 模型的握持原点已在柄尾上方 8cm，无需再抬高；盾/食物居中，给一点纵向偏移
    current.position.y = item.model === 'shield' || item.model === 'food' || item.model === 'berry' ? 0.06 : 0.01;
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
      holder.position.x = 0.37;
      holder.position.y = -0.22 - arc * 0.06;
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

    holder.position.x = 0.37 + walkX * moveBlend;
    holder.position.y = -0.22 + breathY - walkY * moveBlend;
    holder.rotation.x = walkRx * moveBlend;
    holder.rotation.z = breathRz + walkRz * moveBlend;
  }

  return { setItem, triggerSwing, update, _holder: holder };
}
