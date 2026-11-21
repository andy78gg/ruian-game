// 底部快捷栏：渲染槽位、高亮选中项、显示数量，支持点击与按键切换。
export function createHotbar(items) {
  const state = { items, selected: 0 };
  let onChange = null;

  const root = document.getElementById('hotbar');
  const slots = [];

  items.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = `
      <span class="key">${i + 1}</span>
      <span class="icon">${item.icon}</span>
      <span class="count"></span>`;
    slot.addEventListener('click', () => select(i));
    root.appendChild(slot);
    slots.push(slot);
  });

  function render() {
    slots.forEach((slot, i) => {
      slot.classList.toggle('active', i === state.selected);
      const count = state.items[i].count;
      slot.querySelector('.count').textContent = count > 1 ? count : '';
    });
  }

  function select(i) {
    if (i < 0 || i >= state.items.length) return;
    state.selected = i;
    render();
    if (onChange) onChange(state.items[i]);
  }

  render();

  return {
    state,
    select,
    refresh: render,
    set onChange(fn) {
      onChange = fn;
    },
  };
}
