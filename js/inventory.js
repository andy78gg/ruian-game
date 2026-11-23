// 资源背包：木材、石头计数；按 E 开合面板，含「背包」与「制作」两个标签。
// 物品栏为独立背包库存（4 排 × 9 格），与底部快捷栏分离，互不重复。
// 配方分两级：随身合成（hand）与工作台合成（workbench，需先拥有工作台）。
import { ICONS } from './icons.js?v=19';

export function createInventory({ hotbar } = {}) {
  const state = { wood: 0, stone: 0 };
  const elWood = document.getElementById('wood-count');
  const elStone = document.getElementById('stone-count');
  const panel = document.getElementById('inventory-panel');
  const itemGrid = document.getElementById('inv-items');
  const hotGrid = document.getElementById('inv-hotbar');
  const recipeList = document.getElementById('inv-recipes');
  let open = false;

  // 背包库存：独立于快捷栏，元素 { id, icon, name, count }。
  // 目前存放采集到的可堆叠资源（木材 / 石头）；工具与食物在快捷栏。
  const STASH_META = {
    wood:  { icon: '🪵', name: '木材' },
    stone: { icon: '🪨', name: '石头' },
  };
  let stash = [];

  const STASH_COLS = 9;
  const STASH_ROWS = 4;
  const STASH_TOTAL = STASH_COLS * STASH_ROWS; // 36 格

  // 配方：out 对应热栏物品 id，cost 为消耗原料，station 为制作台要求。
  // station: 'hand' 随身可做；'workbench' 必须先拥有工作台。
  const RECIPES = [
    // —— 随身合成 ——
    { out: 'spear',      station: 'hand',      cost: { wood: 2 } },
    { out: 'axe',        station: 'hand',      cost: { wood: 1, stone: 2 } },
    { out: 'pickaxe',    station: 'hand',      cost: { wood: 1, stone: 2 } },
    { out: 'shield',     station: 'hand',      cost: { wood: 3, stone: 1 } },
    { out: 'stoneSpear', station: 'hand',      cost: { wood: 1, stone: 3 } },
    { out: 'torch',      station: 'hand',      cost: { wood: 2, stone: 1 } },
    { out: 'workbench',  station: 'hand',      cost: { wood: 4 } },
    // —— 工作台合成 ——
    { out: 'sword',      station: 'workbench',  cost: { wood: 2, stone: 4 } },
    { out: 'steelAxe',   station: 'workbench',  cost: { wood: 2, stone: 4 } },
    { out: 'steelPick',  station: 'workbench',  cost: { wood: 2, stone: 4 } },
    { out: 'bed',        station: 'workbench',  cost: { wood: 3, stone: 2 } },
    { out: 'chest',       station: 'workbench',  cost: { wood: 5 } },
  ];

  function itemById(id) {
    return hotbar ? hotbar.state.items.find((i) => i.id === id) : null;
  }

  // 是否拥有工作台（工作台在快捷栏持有且数量 > 0）
  function hasWorkbench() {
    const w = itemById('workbench');
    return !!w && w.count > 0;
  }

  // 单个 MC 风格槽位；id 对应图标字典，取不到时回退为文本
  function slot(id, name, count, opts = {}) {
    const cls = ['mc-slot'];
    if (opts.small) cls.push('sm');
    if (opts.active) cls.push('active');
    if (opts.empty) cls.push('empty');
    if (opts.disabled) cls.push('disabled');
    const art = ICONS[id] || id;
    const countHtml = count != null ? `<span class="mc-count">${count}</span>` : '';
    return `<div class="${cls.join(' ')}" title="${name}">
      <span class="mc-icon">${art}</span>${countHtml}
    </div>`;
  }

  function emptySlot() {
    return '<div class="mc-slot empty"></div>';
  }

  // 把已填槽位补空到 total 格
  function padTo(html, filled, total) {
    for (let i = filled; i < total; i++) html += emptySlot();
    return html;
  }

  // 同步背包堆叠：n>0 增加，n<0 扣减（归零移除该格）
  function syncStash(key, n) {
    const meta = STASH_META[key];
    if (!meta) return;
    const it = stash.find((i) => i.id === key);
    if (n > 0) {
      if (!it) {
        stash.push({ id: key, icon: meta.icon, name: meta.name, count: 0 });
        stash[stash.length - 1].count += n;
      } else {
        it.count += n;
      }
    } else if (it) {
      it.count += n;
      if (it.count <= 0) stash = stash.filter((i) => i !== it);
    }
  }

  // 物品栏：背包库存 4 排
  function renderItems() {
    const html = stash
      .map((it) => slot(it.id, it.name, it.count))
      .join('');
    itemGrid.innerHTML = padTo(html, stash.length, STASH_TOTAL);
  }

  // 快捷栏：当前手持/快速使用的工具与食物，与物品栏分开
  function renderHotbar() {
    if (!hotbar) return;
    const sel = hotbar.state.selected;
    let html = hotbar.state.items.map((it, i) =>
      slot(it.id, it.name, it.count, { active: i === sel })
    ).join('');
    hotGrid.innerHTML = padTo(html, hotbar.state.items.length, STASH_COLS);
  }

  function costSlots(cost) {
    return Object.entries(cost).map(([k, v]) => {
      const enough = state[k] >= v;
      return slot(k, k === 'wood' ? '木材' : '石头', v, { small: true, disabled: !enough });
    }).join('');
  }

  function canCraft(recipe) {
    // 工作台配方需要先拥有工作台
    if (recipe.station === 'workbench' && !hasWorkbench()) return false;
    return Object.entries(recipe.cost).every(([k, v]) => state[k] >= v);
  }

  function recipeRow(r) {
    const it = itemById(r.out);
    const name = it ? it.name : r.out;
    const ok = canCraft(r);
    const lockedStation = r.station === 'workbench' && !hasWorkbench();
    return `
      <div class="mc-recipe${ok ? '' : ' locked'}">
        <div class="mc-mats">${costSlots(r.cost)}</div>
        <div class="mc-arrow">→</div>
        ${slot(it ? it.id : r.out, name, 1, { small: true, disabled: !ok })}
        <button class="mc-craft" data-out="${r.out}" ${ok ? '' : 'disabled'}>
          ${lockedStation ? '需工作台' : '合成'}
        </button>
      </div>`;
  }

  function renderRecipes() {
    if (!recipeList) return;
    const unlocked = hasWorkbench();
    const hand = RECIPES.filter((r) => r.station !== 'workbench');
    const bench = RECIPES.filter((r) => r.station === 'workbench');

    recipeList.innerHTML = `
      <div class="mc-group">随身合成</div>
      ${hand.map(recipeRow).join('')}
      <div class="mc-group${unlocked ? '' : ' locked'}">工作台合成${unlocked ? '' : ' · 需先制作工作台 🛠'}</div>
      ${bench.map(recipeRow).join('')}
    `;

    recipeList.querySelectorAll('.mc-craft').forEach((btn) => {
      btn.addEventListener('click', () => craft(btn.dataset.out));
    });
  }

  function craft(outId) {
    const recipe = RECIPES.find((r) => r.out === outId);
    if (!recipe || !canCraft(recipe)) return;
    for (const [k, v] of Object.entries(recipe.cost)) {
      state[k] -= v;
      syncStash(k, -v);
    }
    const it = itemById(outId);
    if (it) {
      it.count += 1;
      hotbar.refresh();
    }
    elWood.textContent = state.wood;
    elStone.textContent = state.stone;
    renderItems();
    renderHotbar();
    renderRecipes();
  }

  function render() {
    renderItems();
    renderHotbar();
    renderRecipes();
  }

  // 统一资源入口：采集增加、建造扣费、拆除返还都走这里，物品格随之同步。
  function add(key, n) {
    state[key] += n;
    syncStash(key, n);
    elWood.textContent = state.wood;
    elStone.textContent = state.stone;
    renderItems();
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
