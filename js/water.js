import * as THREE from 'three';

// 扫描地形低洼处聚类成若干池塘，铺半透明水面；水面随时间轻微起伏与明暗脉动。
// 不做复杂物理水体，仅静态洼地积水 + 视觉波纹，玩家可蹚水走过。
export function buildWater(heightAt) {
  const group = new THREE.Group();

  const STEP = 4;          // 洼地采样步长
  const RANGE = 55;        // 扫描范围（与玩家活动边界一致）
  const THRESH = -1.05;    // 低于此高度视为低洼可积水
  const MAX_POOLS = 4;     // 最多生成几个池塘
  const FILL = 0.4;        // 水面距洼地最低点的抬升量

  const key = (x, z) => `${x},${z}`;

  // 1. 采样所有低洼格点
  const map = new Map();
  for (let x = -RANGE; x <= RANGE; x += STEP) {
    for (let z = -RANGE; z <= RANGE; z += STEP) {
      const h = heightAt(x, z);
      if (h < THRESH) map.set(key(x, z), { x, z, h });
    }
  }

  // 2. 8 邻域聚类，合并连片洼地
  const visited = new Set();
  const pools = [];
  const DIRS = [[-STEP, 0], [STEP, 0], [0, -STEP], [0, STEP], [-STEP, -STEP], [STEP, -STEP], [-STEP, STEP], [STEP, STEP]];

  for (const start of map.values()) {
    const sk = key(start.x, start.z);
    if (visited.has(sk)) continue;

    const cluster = [];
    const stack = [start];
    visited.add(sk);
    while (stack.length) {
      const c = stack.pop();
      cluster.push(c);
      for (const [dx, dz] of DIRS) {
        const n = map.get(key(c.x + dx, c.z + dz));
        if (n && !visited.has(key(n.x, n.z))) {
          visited.add(key(n.x, n.z));
          stack.push(n);
        }
      }
    }
    if (cluster.length >= 4) pools.push(cluster);
  }

  // 3. 取面积最大的几个，计算中心 / 包围盒 / 水面高度
  pools.sort((a, b) => b.length - a.length);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3d7d9e,
    transparent: true,
    opacity: 0.72,
    roughness: 0.18,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const surfaces = [];

  for (const cluster of pools.slice(0, MAX_POOLS)) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minH = Infinity;
    for (const c of cluster) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minZ = Math.min(minZ, c.z);
      maxZ = Math.max(maxZ, c.z);
      minH = Math.min(minH, c.h);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const rx = Math.max(2, (maxX - minX) / 2 + STEP * 0.5);
    const rz = Math.max(2, (maxZ - minZ) / 2 + STEP * 0.5);
    const waterY = minH + FILL;

    const geo = new THREE.CircleGeometry(1, 28);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, waterMat);
    mesh.position.set(cx, waterY, cz);
    mesh.scale.set(rx, 1, rz);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    group.add(mesh);

    surfaces.push({ mesh, baseY: waterY, phase: Math.random() * Math.PI * 2 });
  }

  // 轻微起伏 + 明暗脉动，模拟水面波纹反光
  function update(time) {
    for (const s of surfaces) {
      s.mesh.position.y = s.baseY + Math.sin(time * 1.3 + s.phase) * 0.015;
    }
    waterMat.opacity = 0.7 + Math.sin(time * 1.1) * 0.03;
  }

  return { group, update };
}
