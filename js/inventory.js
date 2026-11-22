// 资源背包：木材、石头计数；按 E 开合面板，含「背包」与「制作」两个标签。
// 槽位采用 Minecraft 风格方格：立体边框、数量角标、物品栏 / 快捷栏分区。
export function createInventory({ hotbar } = {}) {
  const state = { wood: 0, stone: 0 };
  const elWood = document.getElementById('wood-count');
  const elStone = document.getElementById('stone-count');
  const panel = document.getElementById('inventory-panel');
  const resGrid = document.getElementById('inv-resources');
  const itemGrid = document.getElementById('inv-items');
  const hotGrid = document.getElementById('inv-hotbar');
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

  // 单个 MC 风格槽位
  function slot(icon, name, count, opts = {}) {
    const cls = ['mc-slot'];
    if (opts.small) cls.push('sm');
    if (opts.active) cls.push('active');
    if (opts.empty) cls.push('empty');
    if (opts.disabled) cls.push('disabled');
    const countHtml = count != null ? `<span class="mc-count">${count}</span>` : '';
    return `<div class="${cls.join(' ')}" title="${name}">
      <span class="mc-icon">${icon}</span>${countHtml}
    </div>`;
  }

  function emptySlot() {
    return '<div class="mc-slot empty"></div>';
  }

  // 凑满一行 9 格空位
  function padToNine(html, n) {
    for (let i = n; i < 9; i++) html += emptySlot();
    return html;
  }

  function renderResources() {
    resGrid.innerHTML =
      slot('🪵', '木材', state.wood) +
      slot('🪨', '石头', state.stone);
  }

  function renderItems() {
    if (!hotbar) return;
    let html = hotbar.state.items.map((it) =>
      slot(it.icon, it.name, it.count, { disabled: it.count <= 0 })
    ).join('');
    itemGrid.innerHTML = padToNine(html, hotbar.state.items.length);
  }

  function renderHotbar() {
    if (!hotbar) return;
    const sel = hotbar.state.selected;
    let html = hotbar.state.items.map((it, i) =>
      slot(it.icon, it.name, it.count, { active: i === sel })
    ).join('');
    hotGrid.innerHTML = padToNine(html, hotbar.state.items.length);
  }

  function costSlots(cost) {
    return Object.entries(cost).map(([k, v]) => {
      const icon = k === 'wood' ? '🪵' : '🪨';
      const enough = state[k] >= v;
      return slot(icon, k === 'wood' ? '木材' : '石头', v, { small: true, disabled: !enough });
    }).join('');
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
      <div class="mc-recipe${ok ? '' : ' locked'}">
        <div class="mc-mats">${costSlots(r.cost)}</div>
        <div class="mc-arrow">→</div>
        ${slot(icon, name, 1, { small: true, disabled: !ok })}
        <button class="mc-craft" data-out="${r.out}" ${ok ? '' : 'disabled'}>合成</button>
      </div>`;
    }).join('');

    recipeList.querySelectorAll('.mc-craft').forEach((btn) => {
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
    renderHotbar();
    renderRecipes();
  }

  function render() {
    renderResources();
    renderItems();
    renderHotbar();
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
