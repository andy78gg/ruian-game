// 物品定义：icon 用于热栏显示，model 对应手持模型类型。
export const ITEMS = [
  { id: 'pickaxe', name: '镐', icon: '⛏', count: 1, model: 'pickaxe' },
  { id: 'axe', name: '斧', icon: '🪓', count: 1, model: 'axe' },
  { id: 'spear', name: '矛', icon: '🗡', count: 1, model: 'spear' },
  { id: 'corn', name: '玉米', icon: '🌽', count: 4, model: 'food' },
  { id: 'berry', name: '浆果', icon: '🍓', count: 3, model: 'berry' },
  { id: 'shield', name: '盾', icon: '🛡', count: 16, model: 'shield' },
  { id: 'stoneSpear', name: '石矛', icon: '🔱', count: 6, model: 'spear' },
  // —— 以下为合成产物 ——
  { id: 'torch', name: '火把', icon: '🔥', count: 0, model: 'torch' },
  { id: 'workbench', name: '工作台', icon: '🛠', count: 0, model: 'workbench' },
  { id: 'sword', name: '铁剑', icon: '⚔', count: 0, model: 'spear' },
  { id: 'steelAxe', name: '钢斧', icon: '⚒', count: 0, model: 'axe' },
  { id: 'steelPick', name: '钢镐', icon: '🔨', count: 0, model: 'pickaxe' },
  { id: 'bed', name: '木床', icon: '🛏', count: 0, model: 'shield' },
  { id: 'chest', name: '储物箱', icon: '📦', count: 0, model: 'shield' },
];
