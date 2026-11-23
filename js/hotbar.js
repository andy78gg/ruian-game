// 底部快捷栏：固定 9 格定长槽位（元素可为空），渲染高亮选中项、数量角标，
// 支持点击 / 按键切换，并暴露槽位读写、堆叠合并与交换接口供背包拖拽调用。
import { ICONS } from './icons.js?v=20';
import { ITEMS, STACKABLE_IDS } from './items.js?v=20';

export const HOTBAR_SIZE = 9;

// 由模板克隆一个槽位物品（带 count）
function makeItem(tpl) {
  return {
    id: tpl.id,
    name: tpl.name,
    icon: tpl.icon,
    model: tpl.model,
    count: tpl.count ?? 1,
    stackable: tpl.stackable || STACKABLE_IDS.includes(tpl.id),
  };
}

export function createHotbar() {
  // slots 即对外的 items 数组：每格为物品对象或 null
  const slots = new Array(HOTBAR_SIZE).fill(null);
  const state = { items: slots, selected: 0 };
  let onChange = null;

  // 初始持有：模板中 count>0 的物品依次填入前几格
  for (const tpl of ITEMS) {
    if (tpl.count > 0) {
      const empty = slots.indexOf(null);
      if (empty === -1) break;
      slots[empty] = makeItem(tpl);
    }
  }

  const root = document.getElementById('hotbar');
  const slotsEl = [];

  slots.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.addEventListener('click', () => select(i));
    root.appendChild(slot);
    slotsEl.push(slot);
  });

  function render() {
    slotsEl.forEach((slot, i) => {
      const item = slots[i];
      slot.classList.toggle('active', i === state.selected);
      slot.classList.toggle('empty', !item);
      slot.innerHTML = `
        <span class="key">${i + 1}</span>
        <span class="icon">${item ? ICONS[item.id] || item.icon : ''}</span>
        <span class="count">${item && item.count > 1 ? item.count : ''}</span>`;
    });
  }

  function select(i) {
    if (i < 0 || i >= HOTBAR_SIZE) return;
    state.selected = i;
    render();
    if (onChange) onChange(slots[i]);
  }

  // 按条件查找槽位物品
  function findSlot(pred) {
    return slots.find((it) => it && pred(it)) || null;
  }

  function countById(id) {
    const it = slots.find((s) => s && s.id === id);
    return it ? it.count : 0;
  }

  function firstEmpty() {
    return slots.indexOf(null);
  }

  // 放入一件物品：优先并入同类可堆叠槽，否则找空槽；满了返回 false
  function addItem(item) {
    if (item.stackable) {
      const same = slots.find((s) => s && s.id === item.id);
      if (same) {
        same.count += item.count;
        return true;
      }
    }
    const empty = firstEmpty();
    if (empty === -1) return false;
    slots[empty] = item;
    return true;
  }

  function getItem(i) { return slots[i]; }
  function setItem(i, item) { slots[i] = item; }
  function clearSlot(i) { slots[i] = null; }

  // 两槽交换
  function swap(a, b) {
    if (a === b) return;
    const tmp = slots[a];
    slots[a] = slots[b];
    slots[b] = tmp;
  }

  // 把物品从 from 移到 to：空槽直接放；同类可堆叠合并；否则交换
  function moveSlot(from, to) {
    if (from === to) return;
    const src = slots[from];
    const dst = slots[to];
    if (!src) return;
    if (!dst) {
      slots[to] = src;
      slots[from] = null;
    } else if (dst.id === src.id && src.stackable) {
      dst.count += src.count;
      slots[from] = null;
    } else {
      swap(from, to);
    }
  }

  render();

  return {
    state,
    select,
    render,
    refresh: render,
    findSlot,
    countById,
    addItem,
    getItem,
    setItem,
    clearSlot,
    swap,
    moveSlot,
    get size() { return HOTBAR_SIZE; },
    set onChange(fn) { onChange = fn; },
  };
}
