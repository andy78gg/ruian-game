// 资源背包：木材、石头计数，并提供按 E 开合的背包面板（资源 + 携带物品）。
export function createInventory() {
  const state = { wood: 0, stone: 0 };
  const elWood = document.getElementById('wood-count');
  const elStone = document.getElementById('stone-count');
  const panel = document.getElementById('inventory-panel');
  const resGrid = document.getElementById('inv-resources');
  const itemGrid = document.getElementById('inv-items');
  let open = false;

  function renderResources() {
    resGrid.innerHTML = `
      <div class="inv-cell">
        <span class="inv-icon">🪵</span>
        <span class="inv-name">木材</span>
        <span class="inv-count">×${state.wood}</span>
      </div>
      <div class="inv-cell">
        <span class="inv-icon">🪨</span>
        <span class="inv-name">石头</span>
        <span class="inv-count">×${state.stone}</span>
      </div>`;
  }

  function renderItems(items) {
    if (!items) return;
    itemGrid.innerHTML = items.map((it) => `
      <div class="inv-cell${it.count <= 0 ? ' empty' : ''}">
        <span class="inv-icon">${it.icon}</span>
        <span class="inv-name">${it.name}</span>
        <span class="inv-count">${it.count > 1 ? '×' + it.count : ''}</span>
      </div>`).join('');
  }

  function render(items) {
    renderResources();
    renderItems(items);
  }

  function add(key, n) {
    state[key] += n;
    elWood.textContent = state.wood;
    elStone.textContent = state.stone;
    renderResources();
  }

  function toggle(items) {
    open = !open;
    panel.classList.toggle('show', open);
    if (open) {
      render(items);
      // 打开背包时释放鼠标，便于查看面板；关闭后点击画面重新锁定。
      document.exitPointerLock();
    }
  }

  render();

  return {
    state,
    add,
    toggle,
    get isOpen() { return open; },
  };
}
