import * as THREE from 'three';

const DAY_LENGTH = 150; // 一昼夜总时长（秒）

const SKY_DAY = new THREE.Color(0x9fc8e8);
const SKY_DUSK = new THREE.Color(0xe89a6a);
const SKY_NIGHT = new THREE.Color(0x0b1026);
const SUN_DAY = new THREE.Color(0xfff2d8);
const SUN_DUSK = new THREE.Color(0xff8a4a);
const NIGHT_TINT = new THREE.Color(0x232c4d);

// 昼夜循环：驱动太阳角度、光照强度/颜色、天空穹顶与雾色、星星显隐
export function createDayNight({ scene, sun, hemi }) {
  let t = 0.25; // 0=日出 0.25=正午 0.5=日落 0.75=午夜

  const stars = buildStars();
  scene.add(stars);

  const skyDome = buildSkyDome();
  scene.add(skyDome);
  const skyMat = skyDome.material;

  // 可见太阳圆盘与月亮：沿太阳轨迹方向置于远处，白天显太阳、夜晚显月亮
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false })
  );
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xdde6f5, fog: false })
  );
  scene.add(sunDisc, moon);

  const clouds = buildClouds();
  scene.add(clouds.group);

  const skyColor = new THREE.Color();
  const sunDir = new THREE.Vector3();

  function buildSkyDome() {
    const geo = new THREE.SphereGeometry(220, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const top = new THREE.Color(0x5f9fd8);
    const horizon = new THREE.Color(0xd6e8f3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = THREE.MathUtils.clamp(pos.getY(i) / 220, 0, 1);
      c.lerpColors(horizon, top, y);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });
    return new THREE.Mesh(geo, mat);
  }

  function buildClouds() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      roughness: 1,
      flatShading: false,
      fog: false,
      depthWrite: false,
    });
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Group();
      const blobs = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < blobs; b++) {
        const r = 2 + Math.random() * 2.5;
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
        m.position.set((b - blobs / 2) * 2.2, Math.random() * 0.8, (Math.random() - 0.5) * 2);
        m.scale.y = 0.6;
        c.add(m);
      }
      c.position.set((Math.random() - 0.5) * 160, 28 + Math.random() * 14, (Math.random() - 0.5) * 160);
      c.userData.speed = 0.6 + Math.random() * 0.8;
      group.add(c);
      clouds.push(c);
    }
    return { group, clouds, mat };
  }

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

    // 太阳轨迹：t=0.25 正午位于天顶，t=0 日出、t=0.5 日落、t=0.75 午夜。
    // 用 cos 做高度、sin 做方位，正午才是最高点（之前用 sin，正午反而压在地平线上，白天一片灰暗）。
    const angle = (t - 0.25) * Math.PI * 2;
    const elevation = Math.cos(angle); // -1 .. 1
    const azimuth = Math.sin(angle);
    sun.position.set(40 * azimuth, 40 * elevation, 20);

    const dayFactor = THREE.MathUtils.smoothstep(elevation, -0.08, 0.25);
    const duskFactor = Math.max(0, 1 - Math.abs(elevation) / 0.22);

    sun.intensity = Math.max(0, elevation) * 2.0;
    sun.color.copy(SUN_DAY).lerp(SUN_DUSK, duskFactor);

    hemi.intensity = 0.4 + dayFactor * 0.6;

    skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, dayFactor);
    skyColor.lerp(SKY_DUSK, duskFactor * 0.6);
    scene.background = skyColor;
    scene.fog.color.copy(skyColor);

    // 穹顶随昼夜压暗 / 偏蓝，黄昏叠一点暖调
    skyMat.color.set(0xffffff).lerp(NIGHT_TINT, 1 - dayFactor);
    skyMat.color.lerp(SKY_DUSK, duskFactor * 0.35);

    stars.material.opacity = (1 - dayFactor) * 0.9;

    // 天体跟随轨迹：太阳白天可见，月亮夜晚可见
    sunDir.set(azimuth, elevation, 0.5).normalize();
    sunDisc.position.copy(sunDir).multiplyScalar(160);
    moon.position.copy(sunDir).multiplyScalar(-160);
    sunDisc.visible = elevation > -0.12;
    moon.visible = elevation < 0.12;
    sunDisc.material.color.copy(SUN_DAY).lerp(SUN_DUSK, duskFactor);

    // 云层缓慢漂移，夜晚随天光压暗
    for (const c of clouds.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 90) c.position.x = -90;
    }
    clouds.mat.color.set(0xffffff).lerp(NIGHT_TINT, 1 - dayFactor);
  }

  function getPhase() {
    const p = phaseOf(t);
    const remaining = Math.max(0, (p.at - t) * DAY_LENGTH);
    return { ...p, remaining };
  }

  // 供主循环把平行光与阴影相机挂到玩家附近使用（返回内部向量，调用方只读拷贝）
  function getSunDir() {
    return sunDir;
  }

  return { update, getPhase, getSunDir };
}
