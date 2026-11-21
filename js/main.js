import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildTrees, buildGrass } from './trees.js';

// ---------- 场景 ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc8e8);
scene.fog = new THREE.Fog(0x9fc8e8, 40, 110);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 300);
const EYE_HEIGHT = 1.7;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- 光照 ----------
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a6b3a, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(30, 45, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.far = 120;
scene.add(sun);

// ---------- 地形 / 植被 ----------
const { mesh: terrain, heightAt } = buildTerrain();
scene.add(terrain);
scene.add(buildTrees(heightAt, 90));
scene.add(buildGrass(heightAt, 350));

// ---------- 玩家（第一人称） ----------
const player = { x: 0, z: 0, yaw: 0, pitch: 0 };
camera.position.set(0, heightAt(0, 0) + EYE_HEIGHT, 0);

const keys = {};
addEventListener('keydown', (e) => (keys[e.code] = true));
addEventListener('keyup', (e) => (keys[e.code] = false));

const canvas = renderer.domElement;
let locked = false;
canvas.addEventListener('click', () => canvas.requestPointerLock());
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

  const groundY = heightAt(player.x, player.z);
  camera.position.set(player.x, groundY + EYE_HEIGHT, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
