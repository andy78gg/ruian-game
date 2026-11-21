import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildTrees, buildGrass } from './trees.js';
import { buildRocks } from './rocks.js';
import { createDayNight } from './daynight.js';
import { createSurvival } from './survival.js';
import { ITEMS } from './items.js';
import { createHotbar } from './hotbar.js';
import { createHeld } from './held.js';
import { createInventory } from './inventory.js';
import { createGather } from './gather.js';
import { createBuilding } from './building.js';

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
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
scene.add(camera); // 相机加入场景图，手持物才能作为子节点渲染

// ---------- 光照 ----------
const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x5a6b45, 0.85);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x3a4250, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(30, 45, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.far = 120;
scene.add(sun);

// ---------- 地形 / 植被 ----------
const { mesh: terrain, heightAt } = buildTerrain();
scene.add(terrain);
const trees = buildTrees(heightAt, 90);
const rocks = buildRocks(heightAt, 40);
scene.add(trees.group);
scene.add(rocks.group);
scene.add(buildGrass(heightAt, 600));

// ---------- 昼夜循环 / 生存数值 ----------
const dayNight = createDayNight({ scene, sun, hemi });
const survival = createSurvival();

// ---------- 快捷栏 / 手持物 ----------
const hotbar = createHotbar(ITEMS);
const held = createHeld(camera);
hotbar.onChange = (item) => held.setItem(item);
held.setItem(ITEMS[0]);

// ---------- 背包 / 采集 ----------
const inventory = createInventory();
const gather = createGather({
  camera,
  trees: trees.trees,
  rocks: rocks.rocks,
  inventory,
  hotbar,
  onTip: showTip,
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
  if (item.model !== 'food') return;
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

const keys = {};
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
    else gather.tryHit();
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

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  dayNight.update(dt);
  survival.update(dt);
  held.update(dt);
  building.update(player);

  const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 9 : 5;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3();

  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyA']) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    player.x += move.x;
    player.z += move.z;
    player.x = THREE.MathUtils.clamp(player.x, -55, 55);
    player.z = THREE.MathUtils.clamp(player.z, -55, 55);
  }

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

  camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  updateHUD();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
