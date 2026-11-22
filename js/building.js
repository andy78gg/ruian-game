import * as THREE from 'three';

// 可建造构件：cost 消耗资源，size [宽,高,厚]，hp 耐久；collide 是否挡路，trap 是否为伤敌陷阱，light 是否带光源
const PARTS = {
  wall:   { name: '墙板',     cost: { wood: 2 },          size: [2, 2.2, 0.15], hp: 6, collide: true },
  door:   { name: '木门',     cost: { wood: 3 },          size: [1, 2, 0.12],  hp: 4, collide: false },
  fence:  { name: '栅栏',     cost: { wood: 1 },          size: [2, 1.1, 0.1], hp: 4, collide: true },
  pillar: { name: '柱子',     cost: { wood: 1 },          size: [0.4, 2.6, 0.4], hp: 5, collide: true },
  floor:  { name: '地板',     cost: { wood: 2 },          size: [2, 0.15, 2],  hp: 4, collide: false },
  roof:   { name: '屋顶',     cost: { wood: 2 },          size: [2, 0.12, 2],  hp: 4, collide: false },
  spike:  { name: '尖刺陷阱', cost: { wood: 1, stone: 1 }, size: [1, 0.5, 1],  hp: 3, collide: false, trap: true },
  stairs: { name: '楼梯',     cost: { wood: 2 },          size: [1.6, 1.2, 2],  hp: 4, collide: false },
  window: { name: '窗户墙',   cost: { wood: 2 },          size: [2, 2.2, 0.15], hp: 6, collide: true },
  chest:  { name: '储物箱',   cost: { wood: 2 },          size: [1, 0.9, 0.8],  hp: 4, collide: true },
  campfire: { name: '火堆',   cost: { wood: 1, stone: 1 }, size: [1, 0.6, 1],  hp: 3, collide: false, light: true },
};

const PART_KEYS = Object.keys(PARTS);

const MAT_WOOD = new THREE.MeshStandardMaterial({ color: 0x9c6b3f, flatShading: false, roughness: 0.85 });
const MAT_DOOR = new THREE.MeshStandardMaterial({ color: 0x7a4f2a, flatShading: false, roughness: 0.9 });
const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, flatShading: false, roughness: 0.5, metalness: 0.4 });
const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0xa97c50, flatShading: false, roughness: 0.9 });
const MAT_ROOF = new THREE.MeshStandardMaterial({ color: 0x6b5138, flatShading: false, roughness: 0.95 });
const MAT_SPIKE = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, flatShading: false, roughness: 0.85, metalness: 0.15 });
const MAT_CHEST = new THREE.MeshStandardMaterial({ color: 0x6e4a2c, flatShading: false, roughness: 0.9 });
const MAT_GLASS = new THREE.MeshStandardMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.45, roughness: 0.2, metalness: 0.1 });
const MAT_FLAME = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a2a, emissiveIntensity: 1.4, roughness: 0.6 });

const REACH = 3.5;

// 建造系统：预览幽灵模型、网格对齐放置、右键拆除返还。
export function createBuilding({ scene, heightAt, inventory, onTip }) {
  const placed = [];
  let partIndex = 0;
  let buildMode = false;

  const preview = new THREE.Group();
  preview.visible = false;
  scene.add(preview);

  const ray = new THREE.Raycaster();
  const box = new THREE.Box3();
  const center = new THREE.Vector2(0, 0);

  function currentPart() {
    return PART_KEYS[partIndex];
  }

  function boxMesh(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  function buildPartMesh(partKey, material) {
    const size = PARTS[partKey].size;

    switch (partKey) {
      case 'wall': {
        const g = new THREE.Group();
        const w = size[0], h = size[1], d = size[2];
        // 竖向分板，板间留细缝
        const boards = 4;
        const bw = w / boards;
        for (let b = 0; b < boards; b++) {
          const board = boxMesh(bw - 0.025, h, d, material, -w / 2 + bw * (b + 0.5), h / 2, 0);
          g.add(board);
        }
        // 两侧立柱 + 上下横档，深色木框收边
        g.add(boxMesh(0.12, h + 0.08, d + 0.04, MAT_DOOR, -w / 2 + 0.06, (h + 0.08) / 2, 0));
        g.add(boxMesh(0.12, h + 0.08, d + 0.04, MAT_DOOR, w / 2 - 0.06, (h + 0.08) / 2, 0));
        g.add(boxMesh(w, 0.12, d + 0.02, MAT_DOOR, 0, 0.06, 0));
        g.add(boxMesh(w, 0.12, d + 0.02, MAT_DOOR, 0, h - 0.06, 0));
        return g;
      }
      case 'door': {
        const g = new THREE.Group();
        const panel = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), MAT_METAL);
        handle.position.set(0.3, 0, size[2] / 2 + 0.02);
        g.add(panel, handle);
        return g;
      }
      case 'fence': {
        const g = new THREE.Group();
        const postL = boxMesh(0.08, size[1], 0.08, material, -size[0] / 2 + 0.04, size[1] / 2, 0);
        const postR = boxMesh(0.08, size[1], 0.08, material, size[0] / 2 - 0.04, size[1] / 2, 0);
        const rail1 = boxMesh(size[0], 0.12, 0.05, material, 0, size[1] * 0.4, 0);
        const rail2 = boxMesh(size[0], 0.12, 0.05, material, 0, size[1] * 0.78, 0);
        g.add(postL, postR, rail1, rail2);
        return g;
      }
      case 'spike': {
        const g = new THREE.Group();
        const base = boxMesh(size[0], 0.08, size[2], material, 0, 0.04, 0);
        g.add(base);
        const off = size[0] / 4;
        for (const ox of [-off, off]) {
          for (const oz of [-off, off]) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 5), MAT_SPIKE);
            cone.position.set(ox, 0.08 + 0.2, oz);
            g.add(cone);
          }
        }
        return g;
      }
      case 'stairs': {
        const g = new THREE.Group();
        const steps = 4;
        const stepD = size[2] / steps;
        const stepH = size[1] / steps;
        for (let i = 0; i < steps; i++) {
          const step = boxMesh(
            size[0], stepH * (i + 1), stepD, material,
            0, (stepH * (i + 1)) / 2,
            -size[2] / 2 + stepD * (i + 0.5)
          );
          g.add(step);
        }
        return g;
      }
      case 'window': {
        const g = new THREE.Group();
        const w = size[0], h = size[1], d = size[2];
        const sillH = 0.85;
        const lintelH = 0.6;
        const winW = 1.3;
        const winH = h - sillH - lintelH;
        const sideW = (w - winW) / 2;
        g.add(boxMesh(w, sillH, d, material, 0, sillH / 2, 0));
        g.add(boxMesh(w, lintelH, d, material, 0, h - lintelH / 2, 0));
        g.add(boxMesh(sideW, winH, d, material, -winW / 2 - sideW / 2, sillH + winH / 2, 0));
        g.add(boxMesh(sideW, winH, d, material, winW / 2 + sideW / 2, sillH + winH / 2, 0));
        const glass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.05), MAT_GLASS);
        glass.position.set(0, sillH + winH / 2, 0);
        g.add(glass);
        return g;
      }
      case 'chest': {
        const g = new THREE.Group();
        const body = boxMesh(size[0], 0.7, size[2], MAT_CHEST, 0, 0.35, 0);
        const lid = boxMesh(size[0] + 0.05, 0.2, size[2] + 0.05, MAT_CHEST, 0, 0.8, 0);
        const latch = boxMesh(0.12, 0.16, 0.06, MAT_METAL, 0, 0.62, size[2] / 2 + 0.02);
        g.add(body, lid, latch);
        return g;
      }
      case 'campfire': {
        const g = new THREE.Group();
        const stones = 6;
        for (let i = 0; i < stones; i++) {
          const ang = (i / stones) * Math.PI * 2;
          const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), MAT_SPIKE);
          rock.position.set(Math.cos(ang) * 0.4, 0.08, Math.sin(ang) * 0.4);
          g.add(rock);
        }
        const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), MAT_WOOD);
        log1.rotation.z = Math.PI / 2;
        log1.position.y = 0.15;
        const log2 = log1.clone();
        log2.rotation.x = Math.PI / 2;
        g.add(log1, log2);
        const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), MAT_FLAME);
        flame1.position.y = 0.45;
        const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), MAT_FLAME);
        flame2.position.set(0.08, 0.4, 0.05);
        g.add(flame1, flame2);
        g.userData.flames = [flame1, flame2];
        return g;
      }
      default: {
        return new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
      }
    }
  }

  function refreshPreview() {
    while (preview.children.length) preview.remove(preview.children[0]);
    const ghost = new THREE.MeshBasicMaterial({
      color: 0x66ff88,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    preview.add(buildPartMesh(currentPart(), ghost));
    preview.userData.ghost = ghost;
  }

  function canAfford(partKey) {
    return Object.entries(PARTS[partKey].cost).every(
      ([k, v]) => inventory.state[k] >= v
    );
  }

  function computeTransform(player) {
    const dir = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const px = player.x + dir.x * 2.5;
    const pz = player.z + dir.z * 2.5;
    const gx = Math.round(px);
    const gz = Math.round(pz);
    const gy = heightAt(gx, gz);
    const rot = Math.round(player.yaw / (Math.PI / 2)) * (Math.PI / 2);
    return { x: gx, y: gy, z: gz, rot };
  }

  function isValid(x, z, player) {
    if (Math.abs(x) > 55 || Math.abs(z) > 55) return false;
    if (Math.hypot(x - player.x, z - player.z) < 1.2) return false;
    return true;
  }

  function update(player) {
    if (!buildMode) return;
    const p = computeTransform(player);
    const size = PARTS[currentPart()].size;
    preview.position.set(p.x, p.y + size[1] / 2, p.z);
    preview.rotation.y = p.rot;

    const ok = isValid(p.x, p.z, player) && canAfford(currentPart());
    preview.userData.ghost.color.set(ok ? 0x66ff88 : 0xff5555);
  }

  function place(player) {
    const partKey = currentPart();
    const part = PARTS[partKey];

    if (!canAfford(partKey)) {
      onTip('资源不足');
      return;
    }
    const p = computeTransform(player);
    if (!isValid(p.x, p.z, player)) {
      onTip('此处无法放置');
      return;
    }

    for (const [k, v] of Object.entries(part.cost)) inventory.add(k, -v);

    const solidMat =
      partKey === 'door' ? MAT_DOOR :
      partKey === 'floor' ? MAT_FLOOR :
      partKey === 'roof' ? MAT_ROOF :
      MAT_WOOD;
    const solid = buildPartMesh(partKey, solidMat);
    solid.position.set(p.x, p.y + part.size[1] / 2, p.z);
    solid.rotation.y = p.rot;
    solid.castShadow = true;
    solid.receiveShadow = true;
    scene.add(solid);

    if (PARTS[partKey].light) {
      const light = new THREE.PointLight(0xff8a3a, 1.2, 9, 2);
      light.position.set(p.x, p.y + 0.9, p.z);
      scene.add(light);
      solid.userData.light = light;
    }

    placed.push({ mesh: solid, partKey, hp: PARTS[partKey].hp });
  }

  function removeAt(camera) {
    ray.setFromCamera(center, camera);
    ray.far = REACH;
    for (let i = placed.length - 1; i >= 0; i--) {
      const obj = placed[i];
      box.setFromObject(obj.mesh);
      if (ray.ray.intersectsBox(box)) {
        detach(obj);
        // 拆除返还一半资源（向下取整）
        for (const [k, v] of Object.entries(PARTS[obj.partKey].cost)) {
          const refund = Math.floor(v / 2);
          if (refund > 0) inventory.add(k, refund);
        }
        placed.splice(i, 1);
        onTip('已拆除，返还部分资源');
        return;
      }
    }
  }

  // 移除构件及其挂接的光源
  function detach(obj) {
    scene.remove(obj.mesh);
    if (obj.mesh.userData.light) scene.remove(obj.mesh.userData.light);
  }

  function toggle() {
    buildMode = !buildMode;
    preview.visible = buildMode;
    if (buildMode) refreshPreview();
  }

  function cycle(dir) {
    partIndex = (partIndex + dir + PART_KEYS.length) % PART_KEYS.length;
    refreshPreview();
  }

  // 供移动碰撞使用：可挡路构件的轴对齐盒体（门/地板/屋顶/陷阱留空可通行）
  function getColliders() {
    return placed
      .filter((p) => PARTS[p.partKey].collide)
      .map((p) => ({
        x: p.mesh.position.x,
        z: p.mesh.position.z,
        rot: p.mesh.rotation.y,
        size: PARTS[p.partKey].size,
      }));
  }

  // 尖刺陷阱位置（供敌人踩踏判定）
  function getTraps() {
    return placed
      .filter((p) => PARTS[p.partKey].trap)
      .map((p) => ({
        x: p.mesh.position.x,
        z: p.mesh.position.z,
        size: PARTS[p.partKey].size,
      }));
  }

  // 敌人攻击：对身边 range 内的构件造成 dmg 耐久，归零则塌掉（不返还资源）。返回是否命中构件。
  function damageNearby(x, z, range, dmg) {
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i];
      const dx = p.mesh.position.x - x;
      const dz = p.mesh.position.z - z;
      if (Math.hypot(dx, dz) > range) continue;
      p.hp -= dmg;
      if (p.hp <= 0) {
        detach(p);
        placed.splice(i, 1);
        onTip(`${PARTS[p.partKey].name}被敌人撞塌了！`);
      }
      return true;
    }
    return false;
  }

  // 火焰闪烁：光源强度与火苗缩放随时间抖动
  function updateFlames() {
    const now = performance.now() * 0.001;
    for (const p of placed) {
      if (!PARTS[p.partKey].light) continue;
      const flick = 1 + Math.sin(now * 7 + p.mesh.position.x * 3) * 0.15;
      if (p.mesh.userData.light) p.mesh.userData.light.intensity = 1.2 * flick;
      const flames = p.mesh.userData.flames || [];
      flames.forEach((f, i) => {
        const s = 1 + Math.sin(now * 9 + i * 2 + p.mesh.position.z * 3) * 0.12;
        f.scale.set(s, 1 + (s - 1) * 1.5, s);
      });
    }
  }

  return {
    toggle,
    cycle,
    place,
    removeAt,
    update,
    updateFlames,
    getColliders,
    getTraps,
    damageNearby,
    get buildMode() {
      return buildMode;
    },
    get partName() {
      return PARTS[currentPart()].name;
    },
  };
}
