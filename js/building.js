import * as THREE from 'three';

// 可建造构件：cost 为消耗资源，size 为 [宽, 高, 厚]
const PARTS = {
  wall: { name: '墙板', cost: { wood: 2 }, size: [2, 2.2, 0.15] },
  door: { name: '木门', cost: { wood: 3 }, size: [1, 2, 0.12] },
};

const PART_KEYS = Object.keys(PARTS);

const MAT_WOOD = new THREE.MeshStandardMaterial({ color: 0x9c6b3f, flatShading: true, roughness: 1 });
const MAT_DOOR = new THREE.MeshStandardMaterial({ color: 0x7a4f2a, flatShading: true, roughness: 1 });
const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, flatShading: true, roughness: 0.6 });

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

  function buildPartMesh(partKey, material) {
    const size = PARTS[partKey].size;
    if (partKey === 'door') {
      const g = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), MAT_METAL);
      handle.position.set(0.3, 0, size[2] / 2 + 0.02);
      g.add(panel, handle);
      return g;
    }
    return new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
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

    const solid = buildPartMesh(partKey, partKey === 'door' ? MAT_DOOR : MAT_WOOD);
    solid.position.set(p.x, p.y + part.size[1] / 2, p.z);
    solid.rotation.y = p.rot;
    solid.castShadow = true;
    scene.add(solid);
    placed.push({ mesh: solid, partKey });
  }

  function removeAt(camera) {
    ray.setFromCamera(center, camera);
    ray.far = REACH;
    for (let i = placed.length - 1; i >= 0; i--) {
      const obj = placed[i];
      box.setFromObject(obj.mesh);
      if (ray.ray.intersectsBox(box)) {
        scene.remove(obj.mesh);
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

  function toggle() {
    buildMode = !buildMode;
    preview.visible = buildMode;
    if (buildMode) refreshPreview();
  }

  function cycle(dir) {
    partIndex = (partIndex + dir + PART_KEYS.length) % PART_KEYS.length;
    refreshPreview();
  }

  // 供移动碰撞使用：已放置墙板的轴对齐盒体（门位留空可通行）
  function getColliders() {
    return placed
      .filter((p) => p.partKey !== 'door')
      .map((p) => ({
        x: p.mesh.position.x,
        z: p.mesh.position.z,
        rot: p.mesh.rotation.y,
        size: PARTS[p.partKey].size,
      }));
  }

  return {
    toggle,
    cycle,
    place,
    removeAt,
    update,
    getColliders,
    get buildMode() {
      return buildMode;
    },
    get partName() {
      return PARTS[currentPart()].name;
    },
  };
}
