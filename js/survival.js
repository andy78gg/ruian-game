// 基础生存数值：食物随时间缓慢消耗，空腹时持续掉血。
export function createSurvival() {
  const state = { health: 100, food: 100 };
  let foodTimer = 0;
  let starveTimer = 0;

  function update(dt) {
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
  }

  function eat() {
    state.food = Math.min(100, state.food + 25);
    state.health = Math.min(100, state.health + 10);
  }

  function damage(n) {
    state.health = Math.max(0, state.health - n);
  }

  return { state, update, eat, damage };
}
