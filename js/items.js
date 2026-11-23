// 物品定义：icon 为回退文本，model 对应手持模型类型，stackable 可堆叠。
// count 仅作为初始数量模板；实际持有数量分布在快捷栏槽位 / 背包槽位中。
export const ITEMS = [
  { id: 'pickaxe',    name: '镐',     icon: '⛏', model: 'pickaxe',  count: 1 },
  { id: 'axe',       name: '斧',     icon: '🪓', model: 'axe',      count: 1 },
  { id: 'spear',     name: '矛',     icon: '🗡', model: 'spear',    count: 1 },
  { id: 'corn',      name: '玉米',   icon: '🌽', model: 'food',     count: 4, stackable: true },
  { id: 'berry',     name: '浆果',   icon: '🍓', model: 'berry',    count: 3, stackable: true },
  { id: 'shield',    name: '盾',     icon: '🛡', model: 'shield',   count: 16 },
  { id: 'stoneSpear',name: '石矛',   icon: '🔱', model: 'spear',    count: 6 },
  // —— 以下为合成产物（初始不持有，合成后入栏） ——
  { id: 'torch',     name: '火把',   icon: '🔥', model: 'torch',    count: 0 },
  { id: 'workbench', name: '工作台', icon: '🛠', model: 'workbench', count: 0 },
  { id: 'sword',     name: '铁剑',   icon: '⚔', model: 'spear',    count: 0 },
  { id: 'steelAxe',  name: '钢斧',   icon: '⚒', model: 'axe',       count: 0 },
  { id: 'steelPick', name: '钢镐',   icon: '🔨', model: 'pickaxe',  count: 0 },
  { id: 'bed',       name: '木床',   icon: '🛏', model: 'shield',   count: 0 },
  { id: 'chest',     name: '储物箱', icon: '📦', model: 'shield',   count: 0 },
];

// 元数据速查：id → { name, icon, model, stackable }（不含 count）
export const ITEM_META = Object.fromEntries(
  ITEMS.map(({ id, name, icon, model, stackable }) => [id, { id, name, icon, model, stackable: !!stackable }])
);

// 可堆叠 id 集合（采集资源 + 食物）
export const STACKABLE_IDS = ['wood', 'stone', 'corn', 'berry'];
