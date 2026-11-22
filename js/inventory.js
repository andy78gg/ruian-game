// 资源背包：木材、石头计数；按 E 开合面板，含「背包」与「制作」两个标签。
// 制作页消耗木材/石头合成工具，产出计入对应热栏物品。
export function createInventory({ hotbar } = {}) {
  const state = { wood: 0, stone: 0 };
  const elWood = document.getElementById('wood-count');
  const elStone = document.getElementById('stone-count');
  const panel = document.getElementById('inventory-panel');
  const resGrid = document.getElementById('inv-resources');
  const itemGrid = document.getElementById('inv-items');
  const recipeList = document.getElementById('inv-recipes');
  let open = false;

  // 配方：out 对应热栏物品 id，cost 为消耗原料。
  const RECIPES = [
    { out: 'spear',       cost: { wood: 2 } },
    { out: 'axe',         cost: { wood: 1, stone: 2 } },
    { out: 'pickaxe',     cost: { wood: 1, stone: 2 } },
    { out: 'shield',      cost: { wood: 3, stone: 1 } },
    { out: 'stoneSpear',  cost: { wood: 1, stone: 3 } },
  ];

  function itemById(id) {
    return hotbar ? hotbar.state.items.find((i) => i.id === id) : null;
  }

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

  function renderItems() {
    if (!hotbar) return;
    itemGrid.innerHTML = hotbar.state.items.map((it) => `
      <div class="inv-cell${it.count <= 0 ? ' empty' : ''}">
        <span class="inv-icon">${it.icon}</span>
        <span class="inv-name">${it.name}</span>
        <span class="inv-count">${it.count > 1 ? '×' + it.count : ''}</span>
      </div>`).join('');
  }

  function costText(cost) {
    return Object.entries(cost)
      .map(([k, v]) => `${k === 'wood' ? '🪵' : '🪨'}×${v}`)
      .join(' ');
  }

  function canCraft(recipe) {
    return Object.entries(recipe.cost).every(([k, v]) => state[k] >= v);
  }

  function renderRecipes() {
    if (!recipeList) return;
    recipeList.innerHTML = RECIPES.map((r) => {
      const it = itemById(r.out);
      const icon = it ? it.icon : '❔';
      const name = it ? it.name : r.out;
      const ok = canCraft(r);
      return `
      <div class="craft-row${ok ? '' : ' locked'}">
        <span class="craft-icon">${icon}</span>
        <div class="craft-meta">
          <div class="craft-name">${name}</div>
          <div class="craft-cost">${costText(r.cost)}</div>
        </div>
        <button class="craft-btn" data-out="${r.out}" ${ok ? '' : 'disabled'}>制作</button>
      </div>`;
    }).join('');

    recipeList.querySelectorAll('.craft-btn').forEach((btn) => {
      btn.addEventListener('click', () => craft(btn.dataset.out));
    });
  }

  function craft(outId) {
    const recipe = RECIPES.find((r) => r.out === outId);
    if (!recipe || !canCraft(recipe)) return;
    for (const [k, v] of Object.entries(recipe.cost)) state[k] -= v;
    const it = itemById(outId);
    if (it) {
      it.count += 1;
      hotbar.refresh();
    }
    elWood.textContent = state.wood;
    elStone.textContent = state.stone;
    renderResources();
    renderItems();
    renderRecipes();
  }

  function render() {
    renderResources();
    renderItems();
    renderRecipes();
  }

  function add(key, n) {
    state[key] += n;
    elWood.textContent = state.wood;
    elStone.textContent = state.stone;
    renderResources();
  }

  // 标签切换：背包 / 制作
  panel.querySelectorAll('.inv-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.inv-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const pane = tab.dataset.pane;
      document.getElementById('pane-bag').classList.toggle('active', pane === 'bag');
      document.getElementById('pane-craft').classList.toggle('active', pane === 'craft');
    });
  });

  function toggle() {
    open = !open;
    panel.classList.toggle('show', open);
    if (open) {
      render();
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
