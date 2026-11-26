// 基础生存数值：食物随时间缓慢消耗，空腹时持续掉血；疾跑消耗体力。
export function createSurvival() {
  const state = { health: 100, food: 100, stamina: 100 };

  // 饥饿节奏：每 20 秒掉 2 点饱食度，约合 16 分钟从满到空
  let foodTimer = 0;
  let starveTimer = 0;
  let onHurt = null;

  // 体力：疾跑时按秒消耗，停跑后有一段恢复延迟
  const SPRINT_DRAIN = 13;   // 每秒消耗
  const STAMINA_REGEN = 9;   // 每秒恢复
  const REGEN_DELAY = 1.1;   // 停下后多久才开始回体力
  let staminaDelay = 0;

  function update(dt, { sprinting = false } = {}) {
    foodTimer += dt;
    if (foodTimer >= 20) {
      foodTimer = 0;
      state.food = Math.max(0, state.food - 2);
    }

    if (state.food <= 0) {
      starveTimer += dt;
      if (starveTimer >= 8) {
        starveTimer = 0;
        state.health = Math.max(0, state.health - 3);
      }
    } else {
      starveTimer = 0;
    }

    if (sprinting) {
      state.stamina = Math.max(0, state.stamina - SPRINT_DRAIN * dt);
      staminaDelay = REGEN_DELAY;
    } else if (staminaDelay > 0) {
      staminaDelay -= dt;
    } else {
      // 空腹时恢复速度大打折扣，逼玩家先解决吃饭问题
      const rate = state.food > 0 ? STAMINA_REGEN : STAMINA_REGEN * 0.35;
      state.stamina = Math.min(100, state.stamina + rate * dt);
    }
  }

  function eat() {
    state.food = Math.min(100, state.food + 25);
    state.health = Math.min(100, state.health + 10);
  }

  function spend(n) {
    state.stamina = Math.max(0, state.stamina - n);
  }

  function damage(n) {
    state.health = Math.max(0, state.health - n);
    if (onHurt) onHurt(n);
  }

  function setOnHurt(cb) {
    onHurt = cb;
  }

  function respawn() {
    state.health = 100;
    state.food = 100;
    state.stamina = 100;
    foodTimer = 0;
    starveTimer = 0;
    staminaDelay = 0;
  }

  return { state, update, eat, spend, damage, respawn, setOnHurt };
}
