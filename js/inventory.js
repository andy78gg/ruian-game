// 资源背包：木材、石头计数，并同步到 HUD。
export function createInventory() {
  const state = { wood: 0, stone: 0 };
  const elWood = document.getElementById('wood-count');
  const elStone = document.getElementById('stone-count');

  function render() {
    elWood.textContent = state.wood;
    elStone.textContent = state.stone;
  }

  function add(key, n) {
    state[key] += n;
    render();
  }

  render();
  return { state, add };
}
