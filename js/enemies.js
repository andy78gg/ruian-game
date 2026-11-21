import * as THREE from 'three';

const BODY_COLOR = 0x3c4238;
const HEAD_COLOR = 0x4a5145;
const EYE_COLOR = 0xff3020;

const CHASE_RANGE = 16;      // 进入追击的距离
const ATTACK_RANGE = 1.4;    // 近身攻击距离
const ATTACK_DAMAGE = 10;    // 每次攻击掉血
const ATTACK_COOLDOWN = 1.0; // 攻击间隔（秒）
const ENEMY_HP = 5;
const CHASE_SPEED = 2.8;
const WANDER_SPEED = 0.7;
const REACH = 3.2;

// 敌人 AI：黄昏/夜晚追击玩家并近身攻击，白天缓慢游荡；左键可击打，击败掉落资源。
export function createEnemies({
  scene,
  heightAt,
  player,
  survival,
  dayNight,
  onTip,
  trees,
  rocks,
  building,
  inventory,
}) {
  const group = new THREE.Group();
  scene.add(group);
  const enemies = [];

  const ray = new THREE.Raycaster();
  const box = new THREE.Box3();
  const center = new THREE.Vector2(0, 0);

  function buildMesh() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: BODY_COLOR,
      roughness: 0.9,
      flatShading: false,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: HEAD_COLOR,
      roughness: 0.9,
      flatShading: false,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: EYE_COLOR });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.0, 6), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), headMat);
    head.position.y = 1.18;
    head.castShadow = true;
    g.add(head);

    // 发红的双眼，夜间也能看清
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
      eye.position.set(0.11 * side, 1.2, 0.26);
      g.add(eye);
    }

    // 双臂垂在两侧
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 5), bodyMat);
      arm.position.set(0.42 * side, 0.65, 0);
      arm.rotation.z = -0.2 * side;
      g.add(arm);
    }
    return g;
  }

  function spawnPosition() {
    for (let i = 0; i < 20; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 10;
      const x = THREE.MathUtils.clamp(player.x + Math.cos(ang) * dist, -52, 52);
      const z = THREE.MathUtils.clamp(player.z + Math.sin(ang) * dist, -52, 52);
      if (Math.hypot(x - player.x, z - player.z) > 14) return { x, z };
    }
    return { x: 20, z: 20 };
  }

  function spawnEnemy() {
    const mesh = buildMesh();
    const p = spawnPosition();
    mesh.position.set(p.x, heightAt(p.x, p.z), p.z);
    group.add(mesh);
    return {
      mesh,
      x: p.x,
      z: p.z,
      hp: ENEMY_HP,
      alive: true,
      radius: 0.45,
      attackCd: 0,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: 0,
    };
  }

  for (let i = 0; i < 2; i++) enemies.push(spawnEnemy());

  // 避障：树 / 岩石圆形推挤，墙板 AABB 推挤
  function resolveObstacles(e) {
    for (const t of trees.trees) {
      if (!t.alive) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      const d = Math.hypot(dx, dz);
      const min = e.radius + t.radius;
      if (d < min && d > 1e-4) {
        e.x = t.x + (dx / d) * min;
        e.z = t.z + (dz / d) * min;
      }
    }

    for (const r of rocks.rocks) {
      if (!r.alive) continue;
      const dx = e.x - r.x;
      const dz = e.z - r.z;
      const d = Math.hypot(dx, dz);
      const min = e.radius + r.radius;
      if (d < min && d > 1e-4) {
        e.x = r.x + (dx / d) * min;
        e.z = r.z + (dz / d) * min;
      }
    }

    for (const c of building.getColliders()) {
      const [w, , th] = c.size;
      const rotated = Math.abs(Math.sin(c.rot)) > 0.5;
      const hw = (rotated ? th : w) / 2;
      const hd = (rotated ? w : th) / 2;
      const dx = e.x - c.x;
      const dz = e.z - c.z;
      const cx = THREE.MathUtils.clamp(dx, -hw, hw);
      const cz = THREE.MathUtils.clamp(dz, -hd, hd);
      const px = dx - cx;
      const pz = dz - cz;
      const d = Math.hypot(px, pz);
      if (d >= e.radius) continue;

      if (d > 1e-4) {
        e.x = c.x + cx + (px / d) * e.radius;
        e.z = c.z + cz + (pz / d) * e.radius;
      } else {
        const pushLeft = dx + hw;
        const pushRight = hw - dx;
        const pushDown = dz + hd;
        const pushUp = hd - dz;
        const m = Math.min(pushLeft, pushRight, pushDown, pushUp);
        if (m === pushLeft) e.x = c.x - hw - e.radius;
        else if (m === pushRight) e.x = c.x + hw + e.radius;
        else if (m === pushDown) e.z = c.z - hd - e.radius;
        else e.z = c.z + hd + e.radius;
      }
    }
  }

  function update(dt) {
    // 玩家已死亡：敌人停手
    if (survival.state.health <= 0) return;

    const phase = dayNight.getPhase().key;
    const hostile = phase === 'night' || phase === 'dusk';

    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);

      if (hostile && dist < CHASE_RANGE) {
        // 追击玩家
        const dirX = dx / (dist || 1);
        const dirZ = dz / (dist || 1);
        if (dist > ATTACK_RANGE) {
          e.x += dirX * CHASE_SPEED * dt;
          e.z += dirZ * CHASE_SPEED * dt;
        }
        e.mesh.rotation.y = Math.atan2(dirX, dirZ);

        e.attackCd -= dt;
        if (dist <= ATTACK_RANGE && e.attackCd <= 0) {
          e.attackCd = ATTACK_COOLDOWN;
          survival.damage(ATTACK_DAMAGE);
          onTip('被敌人攻击！');
        }
      } else {
        // 白天缓慢游荡
        e.wanderTimer -= dt;
        if (e.wanderTimer <= 0) {
          e.wanderTimer = 2 + Math.random() * 3;
          e.wanderAngle = Math.random() * Math.PI * 2;
        }
        e.x += Math.sin(e.wanderAngle) * WANDER_SPEED * dt;
        e.z += Math.cos(e.wanderAngle) * WANDER_SPEED * dt;
        e.mesh.rotation.y = e.wanderAngle;
        e.attackCd = Math.max(0, e.attackCd - dt);
      }

      e.x = THREE.MathUtils.clamp(e.x, -52, 52);
      e.z = THREE.MathUtils.clamp(e.z, -52, 52);
      resolveObstacles(e);
      e.mesh.position.set(e.x, heightAt(e.x, e.z), e.z);
    }
  }

  function tryHit(camera) {
    ray.setFromCamera(center, camera);
    ray.far = REACH;
    for (const e of enemies) {
      if (!e.alive) continue;
      box.setFromObject(e.mesh);
      if (ray.ray.intersectsBox(box)) {
        e.hp -= 1;
        if (e.hp <= 0) {
          e.alive = false;
          group.remove(e.mesh);
          inventory.add('wood', 1);
          inventory.add('stone', 1);
          onTip('击败了敌人：木材 +1，石头 +1');
        } else {
          onTip(`敌人受击，剩余 ${e.hp}`);
        }
        return true;
      }
    }
    return false;
  }

  // 重生时把敌人全部重置到远处、回满血量
  function reset() {
    for (const e of enemies) {
      const p = spawnPosition();
      e.x = p.x;
      e.z = p.z;
      e.hp = ENEMY_HP;
      e.alive = true;
      e.attackCd = 0;
      if (!e.mesh.parent) group.add(e.mesh);
      e.mesh.position.set(e.x, heightAt(e.x, e.z), e.z);
    }
  }

  return { update, tryHit, reset, enemies };
}
