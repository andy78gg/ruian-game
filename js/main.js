import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildTrees, buildGrass } from './trees.js';
import { buildRocks } from './rocks.js';
import { buildBerries } from './berries.js';
import { buildScatter } from './scatter.js';
import { buildMountains } from './mountains.js';
import { createDayNight } from './daynight.js';
import { createSurvival } from './survival.js';
import { ITEMS } from './items.js';
import { createHotbar } from './hotbar.js';
import { createHeld } from './held.js';
import { createInventory } from './inventory.js';
import { createGather } from './gather.js';
import { createBuilding } from './building.js';
import { createEnemies } from './enemies.js';
import { createParticles } from './particles.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- 场景 ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc8e8);
scene.fog = new THREE.Fog(0x9fc8e8, 45, 130);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 300);
const EYE_HEIGHT = 1.7;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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

// ---------- 光照 ----------
const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x5a6b45, 0.85);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x3a4250, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(30, 45, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 4;
scene.add(sun);

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

// ---------- 昼夜循环 / 生存数值 ----------
const dayNight = createDayNight({ scene, sun, hemi });
const survival = createSurvival();

// ---------- 快捷栏 / 手持物 ----------
const hotbar = createHotbar(ITEMS);
const held = createHeld(camera);
hotbar.onChange = (item) => held.setItem(item);
held.setItem(ITEMS[0]);

// ---------- 背包 / 采集 ----------
const particles = createParticles(scene);
const inventory = createInventory();
const gather = createGather({
  camera,
  trees: trees.trees,
  rocks: rocks.rocks,
  berries,
  inventory,
  hotbar,
  onTip: showTip,
  particles,
});
const building = createBuilding({ scene, heightAt, inventory, onTip: showTip });

// ---------- HUD ----------
const el = {
  phase: document.getElementById('phase'),
  health: document.getElementById('health-bar'),
  food: document.getElementById('food-bar'),
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
  const item = hotbar.state.items[hotbar.state.selected];
  if (item.model !== 'food' && item.model !== 'berry') return;
  if (item.count <= 0) {
    showTip('没有食物了');
    return;
  }
  item.count -= 1;
  survival.eat();
  hotbar.refresh();
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

  const hint = document.getElementById('build-hint');
  if (building.buildMode) {
    hint.textContent = `建造：${building.partName} · Q/E 或滚轮切换 · 左键放置 · 右键拆除`;
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

  // 墙板（门位留空可通行）
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
  player.yaw = 0;
  player.pitch = 0;
  survival.respawn();
  enemies.reset();
  deathScreen.classList.remove('show');
  dead = false;
}
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= ITEMS.length) hotbar.select(n - 1);
  }
  if (e.code === 'KeyB') building.toggle();
  if (e.code === 'KeyQ') building.cycle(-1);
  if (e.code === 'KeyE') building.cycle(1);
  if (e.code === 'KeyF') tryEat();
});
addEventListener('keyup', (e) => (keys[e.code] = false));

addEventListener('wheel', (e) => {
  if (building.buildMode) building.cycle(e.deltaY > 0 ? 1 : -1);
});

const canvas = renderer.domElement;
let locked = false;
canvas.addEventListener('click', () => canvas.requestPointerLock());
canvas.addEventListener('mousedown', (e) => {
  if (!locked) return;
  if (e.button === 0) {
    held.triggerSwing();
    if (building.buildMode) building.place(player);
    else if (!enemies.tryHit(camera, hotbar.state.items[hotbar.state.selected])) gather.tryHit();
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

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  let moving = false;
  let running = false;

  dayNight.update(dt);
  survival.update(dt);
  building.update(player);
  building.updateFlames();
  berries.update(dt);
  enemies.update(dt);
  particles.update(dt);
  grass.update(elapsed);

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

  if (!dead) {
  running = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = running ? 9 : 5;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3();

  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyA']) move.sub(right);

  moving = move.lengthSq() > 0;

  if (moving) {
    move.normalize().multiplyScalar(speed * dt);
    player.x += move.x;
    player.z += move.z;
    player.x = THREE.MathUtils.clamp(player.x, -55, 55);
    player.z = THREE.MathUtils.clamp(player.z, -55, 55);
  }

  resolveCollisions();

  // 跳跃与重力
  if (keys['Space'] && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
  }
  player.vy -= GRAVITY * dt;
  player.y += player.vy * dt;

  const groundY = heightAt(player.x, player.z);
  if (player.y <= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  }
  }

  held.update(dt, moving, running);

  camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  updateHUD();
  composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
