import * as THREE from 'three';

// 轻量命中粒子：在命中点喷出若干小方块，受重力下坠、随寿命缩小淡出，用完即回收。
export function createParticles(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const pool = [];

  // pos：世界坐标起点；opts 控制颜色/数量/大小/初速/重力/寿命/横向扩散。
  function burst(pos, opts = {}) {
    const {
      color = 0x9c6b3f,
      count = 8,
      size = 0.05,
      speed = 1.6,
      gravity = 7,
      life = 0.55,
      spread = 1,
    } = opts;

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        flatShading: false,
        transparent: true,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
      m.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed * spread,
        Math.random() * speed * 0.8,
        (Math.random() - 0.5) * speed * spread
      );
      group.add(m);
      pool.push({ mesh: m, vel, life, maxLife: life, gravity });
    }
  }

  function update(dt) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        group.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        pool.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(Math.max(t, 0.01));
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.y += dt * 3;
    }
  }

  return { burst, update };
}
