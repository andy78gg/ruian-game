import * as THREE from 'three';

const DAY_LENGTH = 150; // 一昼夜总时长（秒）

const SKY_DAY = new THREE.Color(0x9fc8e8);
const SKY_DUSK = new THREE.Color(0xe89a6a);
const SKY_NIGHT = new THREE.Color(0x0b1026);
const SUN_DAY = new THREE.Color(0xfff2d8);
const SUN_DUSK = new THREE.Color(0xff8a4a);

// 昼夜循环：驱动太阳角度、光照强度/颜色、天空与雾色、星星显隐
export function createDayNight({ scene, sun, hemi }) {
  let t = 0.15; // 0=日出 0.25=正午 0.5=日落 0.75=午夜

  const stars = buildStars();
  scene.add(stars);

  const skyColor = new THREE.Color();

  function buildStars() {
    const count = 400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 140;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  function phaseOf(time) {
    if (time < 0.08) return { key: 'dawn', label: '黎明', next: '白天', at: 0.08 };
    if (time < 0.45) return { key: 'day', label: '白天', next: '黄昏', at: 0.45 };
    if (time < 0.55) return { key: 'dusk', label: '黄昏', next: '夜晚', at: 0.55 };
    if (time < 0.95) return { key: 'night', label: '夜晚', next: '黎明', at: 0.95 };
    return { key: 'dawn', label: '黎明', next: '白天', at: 1.0 };
  }

  function update(dt) {
    t = (t + dt / DAY_LENGTH) % 1;

    // 太阳轨迹：t=0.25 正午位于最高点
    const angle = (t - 0.25) * Math.PI * 2;
    const elevation = Math.sin(angle); // -1 .. 1
    const azimuth = Math.cos(angle);
    sun.position.set(40 * azimuth, 40 * elevation, 20);

    const dayFactor = THREE.MathUtils.smoothstep(elevation, -0.08, 0.25);
    const duskFactor = Math.max(0, 1 - Math.abs(elevation) / 0.22);

    sun.intensity = Math.max(0, elevation) * 1.8;
    sun.color.copy(SUN_DAY).lerp(SUN_DUSK, duskFactor);

    hemi.intensity = 0.25 + dayFactor * 0.65;

    skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, dayFactor);
    skyColor.lerp(SKY_DUSK, duskFactor * 0.6);
    scene.background = skyColor;
    scene.fog.color.copy(skyColor);

    stars.material.opacity = (1 - dayFactor) * 0.9;
  }

  function getPhase() {
    const p = phaseOf(t);
    const remaining = Math.max(0, (p.at - t) * DAY_LENGTH);
    return { ...p, remaining };
  }

  return { update, getPhase };
}
