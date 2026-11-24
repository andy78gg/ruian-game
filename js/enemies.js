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
const REACH = 2.2;
const REACH2 = REACH * REACH;
const KNOCKBACK = 0.6;       // 受击后退距离
const FLASH_TIME = 0.15;     // 受击闪红时长
const WAVE_TARGET = 3;       // 夜晚同时存活上限
const WAVE_INTERVAL = 8;     // 补怪间隔（秒）
const STRUCTURE_RANGE = 1.3; // 敌人可拆墙/门的距离
const STRUCTURE_DAMAGE = 1;  // 每次拆构件的耐久伤害
// 武器伤害区分：斧 / 长矛 / 石矛 两下破甲，其余一下
const DAMAGE_BY_TOOL = { axe: 2, spear: 2, stoneSpear: 2, pickaxe: 1, sword: 3, steelAxe: 3, steelPick: 2 };

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
  particles,
  onSound,
}) {
  const group = new THREE.Group();
  scene.add(group);
  const enemies = [];
  let spawnTimer = 0;

  const ray = new THREE.Raycaster();
  const box = new THREE.Box3();
  const center = new THREE.Vector2(0, 0);
  const hitPt = new THREE.Vector3();

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
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x220000,
      emissive: 0xff2010,
      emissiveIntensity: 2.0,
      roughness: 0.5,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.0, 6), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), headMat);
    head.position.y = 1.18;
    head.castShadow = true;
    head.receiveShadow = true;
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
      arm.castShadow = true;
      arm.receiveShadow = true;
      g.add(arm);
    }
    return { group: g, bodyMat, headMat };
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
    const { group: mesh, bodyMat, headMat } = buildMesh();
    const p = spawnPosition();
    mesh.position.set(p.x, heightAt(p.x, p.z), p.z);
    group.add(mesh);
    return {
      mesh,
      mats: { body: bodyMat, head: headMat },
      x: p.x,
      z: p.z,
      hp: ENEMY_HP,
      alive: true,
      radius: 0.45,
      attackCd: 0,
      flash: 0,
      trapCd: 0,
      dying: false,
      dieTimer: 0,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: 0,
    };
  }

  for (let i = 0; i < 2; i++) enemies.push(spawnEnemy());

  // 补一只敌人：优先复用尸体槽位，否则新增（不超上限）
  function replenish() {
    const corpse = enemies.find((e) => !e.alive && !e.dying);
    if (corpse) {
      const p = spawnPosition();
      corpse.x = p.x;
      corpse.z = p.z;
      corpse.hp = ENEMY_HP;
      corpse.alive = true;
      corpse.dying = false;
      corpse.dieTimer = 0;
      corpse.attackCd = 0;
      corpse.flash = 0;
      corpse.mats.body.color.setHex(BODY_COLOR);
      corpse.mats.head.color.setHex(HEAD_COLOR);
      corpse.mesh.rotation.set(0, 0, 0);
      if (!corpse.mesh.parent) group.add(corpse.mesh);
      corpse.mesh.position.set(corpse.x, heightAt(corpse.x, corpse.z), corpse.z);
    } else if (enemies.length < WAVE_TARGET) {
      enemies.push(spawnEnemy());
    }
  }

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

  // 击败敌人：进入倒地动画，短暂延迟后移除模型并掉落资源
  function killEnemy(e) {
    e.alive = false;
    e.dying = true;
    e.dieTimer = 0;
    const p = e.mesh.position.clone();
    p.y += 0.8;
    particles.burst(p, { color: 0xb02a2a, count: 14, size: 0.05, speed: 2.0, gravity: 8, life: 0.6 });
    inventory.add('wood', 1);
    inventory.add('stone', 1);
    if (onSound) onSound('pickup');
    onTip('击败了敌人：木材 +1，石头 +1');
  }

  // 尖刺陷阱：踏入范围按周期掉血
  function checkTraps(e, dt) {
    e.trapCd = Math.max(0, e.trapCd - dt);
    for (const t of building.getTraps()) {
      const [w, , d] = t.size;
      if (Math.abs(e.x - t.x) <= w / 2 && Math.abs(e.z - t.z) <= d / 2) {
        if (e.trapCd <= 0) {
          e.trapCd = 0.5;
          e.hp -= 1;
          e.flash = FLASH_TIME;
          if (e.hp <= 0) killEnemy(e);
        }
        return;
      }
    }
  }

  function update(dt) {
    // 玩家已死亡：敌人停手
    if (survival.state.health <= 0) return;

    const phase = dayNight.getPhase().key;
    const hostile = phase === 'night' || phase === 'dusk';

    for (const e of enemies) {
      // 倒地动画：侧身倒下并轻微下沉，结束后移除模型等待复用
      if (e.dying) {
        e.dieTimer += dt;
        const t = Math.min(e.dieTimer / 0.6, 1);
        e.mesh.rotation.z = t * 1.3;
        e.mesh.position.y = heightAt(e.x, e.z) - t * 0.15;
        if (e.dieTimer >= 0.6) {
          group.remove(e.mesh);
          e.dying = false;
        }
        continue;
      }
      if (!e.alive) continue;

      // 受击闪红倒计时，结束后恢复原色
      if (e.flash > 0) {
        e.flash -= dt;
        const on = e.flash > 0;
        e.mats.body.color.setHex(on ? 0x8a2a2a : BODY_COLOR);
        e.mats.head.color.setHex(on ? 0x9a3a3a : HEAD_COLOR);
      }

      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);

      if (hostile && dist < CHASE_RANGE) {
        // 追击玩家
        const dirX = dx / (dist || 1);
        const dirZ = dz / (dist || 1);
        e.mesh.rotation.y = Math.atan2(dirX, dirZ);

        e.attackCd -= dt;
        if (dist <= ATTACK_RANGE) {
          // 近身攻击玩家
          if (e.attackCd <= 0) {
            e.attackCd = ATTACK_COOLDOWN;
            survival.damage(ATTACK_DAMAGE);
            onTip('被敌人攻击！');
          }
        } else {
          // 贴在墙/门上：停下拆构件，冷却到点砸一下
          const blocked = building.damageNearby(e.x, e.z, STRUCTURE_RANGE, 0);
          if (blocked) {
            if (e.attackCd <= 0) {
              e.attackCd = ATTACK_COOLDOWN;
              building.damageNearby(e.x, e.z, STRUCTURE_RANGE, STRUCTURE_DAMAGE);
            }
          } else {
            e.x += dirX * CHASE_SPEED * dt;
            e.z += dirZ * CHASE_SPEED * dt;
          }
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
      checkTraps(e, dt);
    }

    // 波次补充：敌对阶段存活不足上限，按间隔补一只；白天不刷
    const aliveCount = enemies.filter((e) => e.alive).length;
    if (hostile && aliveCount < WAVE_TARGET) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = WAVE_INTERVAL;
        replenish();
      }
    } else {
      spawnTimer = 0;
    }
  }

  function tryHit(camera, item) {
    ray.setFromCamera(center, camera);
    ray.far = REACH;
    const dmg = DAMAGE_BY_TOOL[item?.id] ?? 1;
    for (const e of enemies) {
      if (!e.alive) continue;
      box.setFromObject(e.mesh);
      // 几何求交不读取 ray.far，取交点后显式校验近身距离
      if (!ray.ray.intersectBox(box, hitPt)) continue;
      if (hitPt.distanceToSquared(ray.ray.origin) > REACH2) continue;
      e.hp -= dmg;
      e.flash = FLASH_TIME;
      const p = e.mesh.position.clone();
      p.y += 0.8;
      particles.burst(p, { color: 0xb02a2a, count: 6, size: 0.04, speed: 1.6, gravity: 8, life: 0.45 });
      // 受击后退半步（沿敌人→玩家反方向）
      const kx = e.x - player.x;
      const kz = e.z - player.z;
      const kd = Math.hypot(kx, kz) || 1;
      e.x += (kx / kd) * KNOCKBACK;
      e.z += (kz / kd) * KNOCKBACK;
      if (e.hp <= 0) killEnemy(e);
      else {
        if (onSound) onSound('chop');
        onTip(`敌人受击（-${dmg}），剩余 ${e.hp}`);
      }
      return true;
    }
    return false;
  }

  // 重生时把敌人全部重置到远处、回满血量
  function reset() {
    spawnTimer = 0;
    for (const e of enemies) {
      const p = spawnPosition();
      e.x = p.x;
      e.z = p.z;
      e.hp = ENEMY_HP;
      e.alive = true;
      e.attackCd = 0;
      e.flash = 0;
      e.trapCd = 0;
      e.dying = false;
      e.dieTimer = 0;
      e.mats.body.color.setHex(BODY_COLOR);
      e.mats.head.color.setHex(HEAD_COLOR);
      e.mesh.rotation.set(0, 0, 0);
      if (!e.mesh.parent) group.add(e.mesh);
      e.mesh.position.set(e.x, heightAt(e.x, e.z), e.z);
    }
  }

  return { update, tryHit, reset, enemies };
}
