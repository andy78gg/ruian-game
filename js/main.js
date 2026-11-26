import * as THREE from 'three';
import { buildTerrain } from './terrain.js?v=26';
import { buildTrees, buildGrass } from './trees.js?v=26';
import { buildRocks } from './rocks.js?v=26';
import { buildBerries } from './berries.js?v=26';
import { buildScatter } from './scatter.js?v=26';
import { buildMountains } from './mountains.js?v=26';
import { buildWater } from './water.js?v=26';
import { buildFlowers } from './flowers.js?v=26';
import { createDayNight } from './daynight.js?v=26';
import { createSurvival } from './survival.js?v=26';
import { createHotbar } from './hotbar.js?v=26';
import { createHeld } from './held.js?v=26';
import { createInventory } from './inventory.js?v=26';
import { createGather } from './gather.js?v=26';
import { createBuilding } from './building.js?v=26';
import { createEnemies } from './enemies.js?v=26';
import { createParticles } from './particles.js?v=26';
import { createAudio } from './audio.js?v=26';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- 场景 / 相机 ----------
// 眼高取成年真人 1.68m；配 72° 视野，接近人眼自然视角。
const EYE_HEIGHT = 1.68;
const scene = new THREE.Scene();
// 雾的近远值配合地形尺度：近处清晰，远处山体自然淡入天色而不是硬切。
scene.fog = new THREE.Fog(0x9fc8e8, 26, 155);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 600);

// 渲染像素比：普通屏也至少按 2x 渲染保证锐利，高分屏用原生倍率，上限 3
const PR = Math.min(Math.max(devicePixelRatio, 2), 3);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
scene.add(camera); // 相机加入场景图，手持物才能作为子节点渲染

// ---------- 后处理：Bloom 辉光（仅高亮自发光体，如火苗/红眼） ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.55, // strength 辉光强度
  0.4,  // radius 扩散半径
  0.85  // threshold 亮度阈值，低于此值不泛光
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
composer.setPixelRatio(PR);

// ---------- 光照 ----------
const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x5a6b45, 0.85);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x3a4250, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(30, 45, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 4;
scene.add(sun);
// 阴影相机跟随玩家时需要一个在场景内的 target，否则矩阵不更新
sun.target.position.set(0, 0, 0);
scene.add(sun.target);
const sunDirWorld = new THREE.Vector3();

// ---------- 地形 / 植被 ----------
const { mesh: terrain, heightAt } = buildTerrain();
scene.add(terrain);
const trees = buildTrees(heightAt, 90);
const rocks = buildRocks(heightAt, 40);
const berries = buildBerries(heightAt, 24);
scene.add(trees.group);
scene.add(rocks.group);
scene.add(berries.group);
const grass = buildGrass(heightAt, 900);
scene.add(grass.group);
scene.add(buildScatter(heightAt));
scene.add(buildMountains(heightAt));
const water = buildWater(heightAt);
scene.add(water.group);
scene.add(buildFlowers(heightAt));

// ---------- 昼夜循环 / 生存数值 ----------
const dayNight = createDayNight({ scene, sun, hemi });
const survival = createSurvival();
let hurtTimer = 0;
survival.setOnHurt(() => { hurtTimer = 0.35; audio.play('hurt'); });

// ---------- 快捷栏 / 手持物 ----------
const hotbar = createHotbar();
const held = createHeld(camera);
hotbar.onChange = (item) => held.setItem(item);
held.setItem(hotbar.getItem(0));

// ---------- 背包 / 采集 ----------
const particles = createParticles(scene);
const audio = createAudio();
const inventory = createInventory({ hotbar });
const gather = createGather({
  camera,
  trees: trees.trees,
  rocks: rocks.rocks,
  berries,
  inventory,
  hotbar,
  onTip: showTip,
  particles,
  onSound: (n) => audio.play(n),
});
const building = createBuilding({ scene, heightAt, inventory, onTip: showTip });

// ---------- HUD ----------
const el = {
  phase: document.getElementById('phase'),
  health: document.getElementById('health-bar'),
  food: document.getElementById('food-bar'),
  stamina: document.getElementById('stamina-bar'),
  hurt: document.getElementById('hurt-overlay'),
};

let tipTimer = null;
function showTip(text) {
  const tip = document.getElementById('gather-tip');
  tip.textContent = text;
  tip.classList.add('show');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => tip.classList.remove('show'), 1200);
}

function tryEat() {
  const item = hotbar.getItem(hotbar.state.selected);
  if (!item || (item.model !== 'food' && item.model !== 'berry')) return;
  if (item.count <= 0) {
    showTip('没有食物了');
    return;
  }
  item.count -= 1;
  survival.eat();
  hotbar.refresh();
  audio.play('eat');
  showTip('进食：饱食度 +25，生命 +10');
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function updateHUD() {
  const p = dayNight.getPhase();
  el.phase.textContent = `${p.label} · ${p.next} ${formatTime(p.remaining)}`;
  el.health.style.width = `${survival.state.health}%`;
  el.food.style.width = `${survival.state.food}%`;
  el.stamina.style.width = `${survival.state.stamina}%`;
  // 体力见底时血条旁闪一下，提示跑不动了
  el.stamina.style.opacity = survival.state.stamina < 15 ? (0.55 + Math.sin(elapsed * 14) * 0.35).toFixed(2) : '1';

  const hint = document.getElementById('build-hint');
  if (building.buildMode) {
    hint.textContent = `建造：${building.partName} · Q 或滚轮切换 · 左键放置 · 右键拆除`;
    hint.classList.add('show');
  } else {
    hint.classList.remove('show');
  }
}

// ---------- 玩家（第一人称） ----------
const GRAVITY = 20;
const JUMP_SPEED = 7.5;
const player = {
  x: 0,
  z: 0,
  y: heightAt(0, 0),
  yaw: 0,
  pitch: 0,
  vy: 0,
  onGround: true,
};
// 水平速度（带惯性），与垂直速度 vy 分开管理
const vel = { x: 0, z: 0 };
camera.position.set(0, player.y + EYE_HEIGHT, 0);

// ---------- 敌人 AI ----------
const enemies = createEnemies({
  scene,
  heightAt,
  player,
  survival,
  dayNight,
  onTip: showTip,
  trees,
  rocks,
  building,
  inventory,
  particles,
  onSound: (n) => audio.play(n),
});

// ---------- 死亡 / 重生 ----------
let dead = false;
let deathTimer = 0;
const deathScreen = document.getElementById('death-screen');

// ---------- 实体碰撞：树 / 岩石圆形推挤，墙板 AABB 推挤 ----------
const PLAYER_RADIUS = 0.35;

function resolveCollisions() {
  // 树木
  for (const t of trees.trees) {
    if (!t.alive) continue;
    const dx = player.x - t.x;
    const dz = player.z - t.z;
    const d = Math.hypot(dx, dz);
    const min = PLAYER_RADIUS + t.radius;
    if (d < min && d > 1e-4) {
      player.x = t.x + (dx / d) * min;
      player.z = t.z + (dz / d) * min;
    }
  }

  // 岩石
  for (const r of rocks.rocks) {
    if (!r.alive) continue;
    const dx = player.x - r.x;
    const dz = player.z - r.z;
    const d = Math.hypot(dx, dz);
    const min = PLAYER_RADIUS + r.radius;
    if (d < min && d > 1e-4) {
      player.x = r.x + (dx / d) * min;
      player.z = r.z + (dz / d) * min;
    }
  }

  // 墙体 / 门 / 栅栏等实体构件 AABB 阻挡
  for (const c of building.getColliders()) {
    const [w, , th] = c.size;
    const rotated = Math.abs(Math.sin(c.rot)) > 0.5;
    const hw = (rotated ? th : w) / 2;
    const hd = (rotated ? w : th) / 2;
    const dx = player.x - c.x;
    const dz = player.z - c.z;
    const cx = THREE.MathUtils.clamp(dx, -hw, hw);
    const cz = THREE.MathUtils.clamp(dz, -hd, hd);
    const px = dx - cx;
    const pz = dz - cz;
    const d = Math.hypot(px, pz);
    if (d >= PLAYER_RADIUS) continue;

    if (d > 1e-4) {
      player.x = c.x + cx + (px / d) * PLAYER_RADIUS;
      player.z = c.z + cz + (pz / d) * PLAYER_RADIUS;
    } else {
      // 圆心落入盒内：沿穿透最浅的轴推出
      const pushLeft = dx + hw;
      const pushRight = hw - dx;
      const pushDown = dz + hd;
      const pushUp = hd - dz;
      const m = Math.min(pushLeft, pushRight, pushDown, pushUp);
      if (m === pushLeft) player.x = c.x - hw - PLAYER_RADIUS;
      else if (m === pushRight) player.x = c.x + hw + PLAYER_RADIUS;
      else if (m === pushDown) player.z = c.z - hd - PLAYER_RADIUS;
      else player.z = c.z + hd + PLAYER_RADIUS;
    }
  }
}

const keys = {};

function respawn() {
  player.x = 0;
  player.z = 0;
  player.y = heightAt(0, 0);
  player.vy = 0;
  player.onGround = true;
  vel.x = 0;
  vel.z = 0;
  player.yaw = 0;
  player.pitch = 0;
  survival.respawn();
  enemies.reset();
  deathScreen.classList.remove('show');
  dead = false;
}
addEventListener('keydown', (e) => {
  audio.ensure();
  if (e.code === 'KeyE') {
    inventory.toggle();
    return;
  }
  // 背包打开时屏蔽移动、切槽、建造、进食等其余按键
  if (inventory.isOpen) return;
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= hotbar.size) hotbar.select(n - 1);
  }
  if (e.code === 'KeyB') building.toggle();
  if (e.code === 'KeyQ') building.cycle(-1);
  if (e.code === 'KeyF') tryEat();
});
addEventListener('keyup', (e) => (keys[e.code] = false));

addEventListener('wheel', (e) => {
  if (building.buildMode) building.cycle(e.deltaY > 0 ? 1 : -1);
});

const canvas = renderer.domElement;
let locked = false;
canvas.addEventListener('click', () => { audio.ensure(); canvas.requestPointerLock(); });
canvas.addEventListener('mousedown', (e) => {
  if (!locked) return;
  if (e.button === 0) {
    held.triggerSwing();
    audio.play('swing');
    if (building.buildMode) building.place(player);
    else if (!enemies.tryHit(camera, hotbar.getItem(hotbar.state.selected))) gather.tryHit();
  } else if (e.button === 2) {
    if (building.buildMode) building.removeAt(camera);
    else tryEat();
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
});

addEventListener('mousemove', (e) => {
  if (!locked) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch -= e.movementY * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
});

// ---------- 主循环 ----------
const clock = new THREE.Clock();
let elapsed = 0;
let splashTimer = 0;
let stepDist = 0;
// 镜头状态：步频相位 / 晃动幅度 / 落地缓冲 / 呼吸计时
let bobPhase = 0;
let bobAmp = 0;
let landDip = 0;
let breathTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  let moving = false;
  let running = false;

  dayNight.update(dt);
  const phaseKey = dayNight.getPhase().key;
  audio.setNight(phaseKey === 'night' || phaseKey === 'dusk');

  // 太阳光与阴影相机跟着玩家走：走出原点那片区域后不再丢影子
  sunDirWorld.copy(dayNight.getSunDir()).multiplyScalar(58);
  sun.position.set(player.x + sunDirWorld.x, Math.max(6, sunDirWorld.y), player.z + sunDirWorld.z);
  sun.target.position.set(player.x, 0, player.z);
  sun.target.updateMatrixWorld();

  hurtTimer = Math.max(0, hurtTimer - dt);
  el.hurt.style.opacity = hurtTimer > 0 ? (hurtTimer / 0.35) * 0.55 : 0;
  building.update(player);
  building.updateFlames();
  berries.update(dt);
  enemies.update(dt);
  particles.update(dt);
  grass.update(elapsed);
  water.update(elapsed);

  if (!dead) {
  const invOpen = inventory.isOpen;
  const inWater = water.isInWater(player.x, player.z);
  // 体力见底时跑不动，只能走
  const canSprint = survival.state.stamina > 1;
  running = !invOpen && (keys['ShiftLeft'] || keys['ShiftRight']) && canSprint;
  const speed = (running ? 9 : 5) * (inWater ? 0.6 : 1);
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3();

  if (!invOpen) {
    if (keys['KeyW']) move.add(forward);
    if (keys['KeyS']) move.sub(forward);
    if (keys['KeyD']) move.add(right);
    if (keys['KeyA']) move.sub(right);
  }

  const hasInput = move.lengthSq() > 0;
  if (hasInput) move.normalize();

  // 速度惯性：向目标速度指数逼近，起步比刹车慢，走动不再像无质量瞬移
  const smoothing = 1 - Math.exp(-(hasInput ? 9 : 13) * dt);
  vel.x += (move.x * speed - vel.x) * smoothing;
  vel.z += (move.z * speed - vel.z) * smoothing;
  const velLen = Math.hypot(vel.x, vel.z);
  moving = velLen > 0.35;

  if (velLen > 0.01) {
    player.x += vel.x * dt;
    player.z += vel.z * dt;
    player.x = THREE.MathUtils.clamp(player.x, -55, 55);
    player.z = THREE.MathUtils.clamp(player.z, -55, 55);

    // 蹚水时脚边间歇溅起水花
    if (inWater) {
      splashTimer -= dt;
      if (splashTimer <= 0) {
        splashTimer = 0.28;
        const p = new THREE.Vector3(player.x, player.y + 0.1, player.z);
        particles.burst(p, { color: 0xbfe3ef, count: 5, size: 0.035, speed: 1.2, gravity: 6, life: 0.4 });
        audio.play('splash');
      }
    } else {
      splashTimer = 0;
    }

    // 地面脚步：按实际移动速度和步距累计触发，奔跑步幅更大
    if (player.onGround) {
      stepDist += velLen * dt;
      const stride = running ? 2.6 : 1.8;
      if (stepDist >= stride) {
        stepDist = 0;
        audio.play('footstep');
      }
    }
  } else {
    splashTimer = 0;
  }

  resolveCollisions();

  // 跳跃与重力：起跳要花一点体力，落地按下落速度产生下沉缓冲
  if (keys['Space'] && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
    survival.spend(6);
  }
  player.vy -= GRAVITY * dt;
  player.y += player.vy * dt;

  const groundY = heightAt(player.x, player.z);
  if (player.y <= groundY) {
    if (!player.onGround && player.vy < -4) {
      landDip = Math.min(0.16, -player.vy * 0.014);
      audio.play('land');
    }
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  }
  }

  // 生存数值：疾跑消耗体力，停下后延迟回复；空腹时几乎回不了体力
  survival.update(dt, { sprinting: running && moving });

  // 死亡检测与重生计时
  if (survival.state.health <= 0 && !dead) {
    dead = true;
    deathTimer = 0;
    deathScreen.classList.add('show');
    document.exitPointerLock();
  }
  if (dead) {
    deathTimer += dt;
    if (deathTimer >= 2.5) respawn();
  }

  held.update(dt, moving, running);

  // 体力见底时粗重呼吸，越低越频繁
  breathTimer -= dt;
  if (survival.state.stamina < 30 && breathTimer <= 0) {
    breathTimer = 1.0 + survival.state.stamina * 0.012;
    audio.play('breath');
  }

  // 镜头晃动：走动按步频起伏（垂直双频 + 横向单频），静止时转为缓慢呼吸起伏；
  // 疾跑视野外扩制造速度感，落地时先下沉再回弹。
  if (moving && !dead) bobPhase += dt * (running ? 11.5 : 7.6);
  const bobTarget = moving && !dead ? (running ? 0.058 : 0.034) : 0;
  bobAmp += (bobTarget - bobAmp) * Math.min(1, dt * 7);
  const bobY = Math.sin(bobPhase * 2) * bobAmp + Math.sin(elapsed * 1.5) * 0.006;
  const bobX = Math.cos(bobPhase) * bobAmp * 0.75;
  landDip *= Math.exp(-dt * 9);
  camera.position.set(
    player.x + Math.cos(player.yaw) * bobX,
    player.y + EYE_HEIGHT + bobY - landDip,
    player.z - Math.sin(player.yaw) * bobX
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.rotation.z = bobX * 0.5;

  const targetFov = running ? 77 : 72;
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 5);
    camera.updateProjectionMatrix();
  }

  updateHUD();
  composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(PR);
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(PR);
  composer.setSize(innerWidth, innerHeight);
});
