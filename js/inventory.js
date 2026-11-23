// 资源背包：木材、石头计数；按 E 开合面板，含「背包」与「制作」两个标签。
// 物品栏为独立 4 排 × 9 格定长槽位（36 格），与底部快捷栏（9 格）分离，互不重复。
// 两组槽位均支持 MC 式左键拖拽：空位移动、同类堆叠合并、异类交换，跨区亦可。
// 配方分两级：随身合成（hand）与工作台合成（workbench，需先拥有工作台）。
import { ICONS } from './icons.js?v=20';
import { ITEM_META } from './items.js?v=20';

export function createInventory({ hotbar } = {}) {
  const state = { wood: 0, stone: 0 };
  const elWood = document.getElementById('wood-count');
  const elStone = document.getElementById('stone-count');
  const panel = document.getElementById('inventory-panel');
  const itemGrid = document.getElementById('inv-items');
  const hotGrid = document.getElementById('inv-hotbar');
  const recipeList = document.getElementById('inv-recipes');
  let open = false;

  // 背包库存：定长 36 格，每格为物品对象或 null。
  const STASH_COLS = 9;
  const STASH_ROWS = 4;
  const STASH_TOTAL = STASH_COLS * STASH_ROWS;
  const stash = new Array(STASH_TOTAL).fill(null);

  // 采集资源的本地元数据（不在物品定义表内）
  const RESOURCE_META = {
    wood:  { id: 'wood',  name: '木材', icon: '🪵', model: 'resource', stackable: true },
    stone: { id: 'stone', name: '石头', icon: '🪨', model: 'resource', stackable: true },
  };

  function metaOf(id) {
    return RESOURCE_META[id] || ITEM_META[id] || { id, name: id, icon: id, model: 'resource', stackable: true };
  }

  function makeStashItem(id, count) {
    const meta = metaOf(id);
    return {
      id: meta.id,
      name: meta.name,
      icon: meta.icon,
      model: meta.model,
      count,
      stackable: !!meta.stackable,
    };
  }

  // 配方：out 对应物品 id，cost 为消耗原料，station 为制作台要求。
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
    { out: 'chest',      station: 'workbench',  cost: { wood: 5 } },
  ];

  function itemById(id) {
    return hotbar ? hotbar.findSlot((i) => i.id === id) : null;
  }

  // 是否拥有工作台（快捷栏持有且数量 > 0）
  function hasWorkbench() {
    return hotbar ? hotbar.countById('workbench') > 0 : false;
  }

  // ---------- 槽位读写（拖拽用，跨区统一接口） ----------
  function readSlot(area, i) {
    return area === 'hotbar' ? hotbar.getItem(i) : stash[i];
  }

  function writeSlot(area, i, item) {
    if (area === 'hotbar') hotbar.setItem(i, item);
    else stash[i] = item;
  }

  // 单个 MC 风格槽位（面板内可拖拽格带 data-area / data-index）
  function slotHtml(area, index, item, opts = {}) {
    const cls = ['mc-slot'];
    if (opts.small) cls.push('sm');
    if (opts.active) cls.push('active');
    if (opts.disabled) cls.push('disabled');
    if (!item) cls.push('empty');
    const art = item ? ICONS[item.id] || item.icon : '';
    const countHtml = item && item.count != null ? `<span class="mc-count">${item.count}</span>` : '';
    const dataAttr = area ? `data-area="${area}" data-index="${index}"` : '';
    return `<div class="${cls.join(' ')}" ${dataAttr} title="${item ? item.name : ''}">
      <span class="mc-icon">${art}</span>${countHtml}
    </div>`;
  }

  // 配方材料 / 产物格（不可拖拽，纯展示）
  function displaySlot(id, name, count, opts = {}) {
    const cls = ['mc-slot'];
    if (opts.small) cls.push('sm');
    if (opts.disabled) cls.push('disabled');
    const art = ICONS[id] || id;
    const countHtml = count != null ? `<span class="mc-count">${count}</span>` : '';
    return `<div class="${cls.join(' ')}" title="${name}">
      <span class="mc-icon">${art}</span>${countHtml}
    </div>`;
  }

  // 同步背包堆叠：n>0 增加，n<0 扣减（归零移除该格）
  function syncStash(key, n) {
    if (n > 0) {
      const same = stash.find((s) => s && s.id === key);
      if (same) { same.count += n; return; }
      const empty = stash.indexOf(null);
      if (empty >= 0) stash[empty] = makeStashItem(key, n);
    } else {
      const same = stash.find((s) => s && s.id === key);
      if (!same) return;
      same.count += n;
      if (same.count <= 0) stash[stash.indexOf(same)] = null;
    }
  }

  // 物品栏：背包库存 4 排
  function renderItems() {
    let html = '';
    for (let i = 0; i < STASH_TOTAL; i++) html += slotHtml('stash', i, stash[i]);
    itemGrid.innerHTML = html;
  }

  // 面板内快捷栏：当前手持/快速使用的工具与食物
  function renderHotbar() {
    if (!hotbar) return;
    const sel = hotbar.state.selected;
    let html = '';
    for (let i = 0; i < hotbar.size; i++) {
      html += slotHtml('hotbar', i, hotbar.getItem(i), { active: i === sel });
    }
    hotGrid.innerHTML = html;
  }

  function costSlots(cost) {
    return Object.entries(cost).map(([k, v]) => {
      const enough = state[k] >= v;
      return displaySlot(k, k === 'wood' ? '木材' : '石头', v, { small: true, disabled: !enough });
    }).join('');
  }

  function canCraft(recipe) {
    if (recipe.station === 'workbench' && !hasWorkbench()) return false;
    return Object.entries(recipe.cost).every(([k, v]) => state[k] >= v);
  }

  function recipeRow(r) {
    const it = itemById(r.out);
    const name = it ? it.name : (ITEM_META[r.out] ? ITEM_META[r.out].name : r.out);
    const ok = canCraft(r);
    const lockedStation = r.station === 'workbench' && !hasWorkbench();
    return `
      <div class="mc-recipe${ok ? '' : ' locked'}">
        <div class="mc-mats">${costSlots(r.cost)}</div>
        <div class="mc-arrow">→</div>
        ${displaySlot(r.out, name, 1, { small: true, disabled: !ok })}
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
      <div class="mc-group${unlocked ? '' : ' locked'}">工作台合成${unlocked ? '' : ' · 需先制作工作台'}</div>
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
    const meta = ITEM_META[outId];
    if (meta) {
      const item = { ...meta, count: 1 };
      // 优先进快捷栏；满了再放进背包空槽
      if (!hotbar.addItem(item)) {
        const empty = stash.indexOf(null);
        if (empty >= 0) stash[empty] = item;
      }
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

  // ---------- 拖拽：拿起 → 跟随光标 → 放置 ----------
  let drag = null;        // { area, index, item }
  let dragEl = null;
  let dragStart = null;

  function moveDragEl(x, y) {
    if (!dragEl) return;
    dragEl.style.left = `${x}px`;
    dragEl.style.top = `${y}px`;
  }

  function cleanupDrag() {
    if (dragEl) { dragEl.remove(); dragEl = null; }
    drag = null;
    dragStart = null;
  }

  function placeItem(a, ai, b, bi) {
    if (a === b && ai === bi) return;
    const src = readSlot(a, ai);
    if (!src) return;
    const dst = readSlot(b, bi);
    if (!dst) {
      writeSlot(b, bi, src);
      writeSlot(a, ai, null);
    } else if (src.stackable && dst.id === src.id) {
      dst.count += src.count;
      writeSlot(a, ai, null);
    } else {
      writeSlot(b, bi, src);
      writeSlot(a, ai, dst);
    }
    renderItems();
    renderHotbar();
  }

  panel.addEventListener('mousedown', (e) => {
    const slotEl = e.target.closest('.mc-slot[data-area]');
    if (!slotEl) return;
    const area = slotEl.dataset.area;
    const index = Number(slotEl.dataset.index);
    const item = readSlot(area, index);
    if (!item) return;
    drag = { area, index, item };
    dragStart = { x: e.clientX, y: e.clientY };
    dragEl = document.createElement('div');
    dragEl.className = 'drag-icon';
    dragEl.innerHTML = ICONS[item.id] || item.icon;
    document.body.appendChild(dragEl);
    moveDragEl(e.clientX, e.clientY);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (drag) moveDragEl(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', (e) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 4;
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const dstSlot = targetEl && targetEl.closest('.mc-slot[data-area]');
    if (moved && dstSlot) {
      placeItem(drag.area, drag.index, dstSlot.dataset.area, Number(dstSlot.dataset.index));
    } else if (!moved && drag.area === 'hotbar') {
      hotbar.select(drag.index);
    }
    cleanupDrag();
  });

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
