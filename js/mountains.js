import * as THREE from 'three';

// 远景群山剪影：沿世界边缘圆环布置的低多边形山体，受雾笼罩形成纵深；不参与碰撞与阴影。
export function buildMountains(heightAt, count = 16) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x66788a,
    roughness: 1,
    metalness: 0,
    flatShading: false,
  });

  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 78 + Math.random() * 18;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    const h = 12 + Math.random() * 14;
    const r = 9 + Math.random() * 8;

    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
    // 底部埋入地表，避免山脚悬空
    m.position.set(x, heightAt(x, z) + h / 2 - 2, z);
    m.rotation.y = Math.random() * Math.PI;
    group.add(m);
  }

  return group;
}
