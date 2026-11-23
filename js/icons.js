// 物品图标：内联 SVG 扁平写实风，按物品 id 取用。
// 配色：木柄 #8a5a33 / 深木 #6b4426，金属 #b8c0c8 / 暗 #7a828a，石 #8d8d8d。
const wrap = (inner) =>
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  wood: wrap(`
    <rect x="3" y="9" width="15" height="7" rx="1.5" fill="#8a5a33"/>
    <ellipse cx="18" cy="12.5" rx="3" ry="3.5" fill="#c98d5a"/>
    <ellipse cx="18" cy="12.5" rx="1.6" ry="2" stroke="#8a5a33" stroke-width="0.8"/>
    <line x1="6" y1="11" x2="14" y2="11" stroke="#6b4426" stroke-width="0.7"/>
    <line x1="6" y1="14" x2="14" y2="14" stroke="#6b4426" stroke-width="0.7"/>`),

  stone: wrap(`
    <path d="M5 16 L7 9 L12 6 L17 9 L19 15 L15 18 L8 18 Z" fill="#8d8d8d"/>
    <path d="M7 9 L12 6 L17 9 L12 11.5 Z" fill="#a9a9a9"/>
    <path d="M8 16 L12 12 L16 16 L15 18 L8 18 Z" fill="#767676"/>`),

  pickaxe: wrap(`
    <rect x="11" y="6" width="2.2" height="15" rx="1" fill="#8a5a33"/>
    <path d="M4 7 Q12 3 20 7 L18.5 9.5 Q12 6.5 5.5 9.5 Z" fill="#b8c0c8"/>
    <path d="M4 7 L3 10 L5.5 9.5 Z" fill="#7a828a"/>
    <path d="M20 7 L21 10 L18.5 9.5 Z" fill="#7a828a"/>
    <rect x="10.4" y="5.4" width="3.4" height="1.6" rx="0.6" fill="#7a828a"/>`),

  axe: wrap(`
    <rect x="10.5" y="5" width="2.2" height="16" rx="1" fill="#8a5a33"/>
    <path d="M12 6 L18 7 L18 13 L12 12 Z" fill="#b8c0c8"/>
    <path d="M18 7 L20.2 10 L18 13 Z" fill="#8a929a"/>
    <path d="M12 6 L13.5 6.5 L13.5 12.5 L12 12 Z" fill="#d4dbe2"/>`),

  spear: wrap(`
    <rect x="11.2" y="6" width="1.8" height="15" rx="0.8" fill="#8a5a33"/>
    <path d="M12 2 L14.5 6.5 L12 8 L9.5 6.5 Z" fill="#8d8d8d"/>
    <path d="M12 2 L13.2 6 L12 7 L10.8 6 Z" fill="#a9a9a9"/>`),

  corn: wrap(`
    <ellipse cx="12" cy="12" rx="3.2" ry="6" fill="#e8b339"/>
    <path d="M9 15 L7 19.5 L10 18.5 Z" fill="#4c8a3a"/>
    <path d="M15 15 L17 19.5 L14 18.5 Z" fill="#4c8a3a"/>
    <line x1="12" y1="7" x2="12" y2="17" stroke="#c98f2a" stroke-width="0.6"/>
    <line x1="10.4" y1="8" x2="10.4" y2="16" stroke="#c98f2a" stroke-width="0.5"/>
    <line x1="13.6" y1="8" x2="13.6" y2="16" stroke="#c98f2a" stroke-width="0.5"/>`),

  berry: wrap(`
    <circle cx="9" cy="14.5" r="3" fill="#c23b3e"/>
    <circle cx="15" cy="14.5" r="3" fill="#c23b3e"/>
    <circle cx="12" cy="10.5" r="3.2" fill="#d44a4d"/>
    <circle cx="11" cy="9.5" r="0.8" fill="#e88a8c"/>
    <path d="M12 5 L14.5 7 L11 8 Z" fill="#4c8a3a"/>`),

  shield: wrap(`
    <circle cx="12" cy="12" r="8" fill="#8a5a33"/>
    <circle cx="12" cy="12" r="8" stroke="#b8c0c8" stroke-width="2"/>
    <line x1="12" y1="5" x2="12" y2="19" stroke="#6b4426" stroke-width="1"/>
    <line x1="5" y1="12" x2="19" y2="12" stroke="#6b4426" stroke-width="1"/>
    <circle cx="12" cy="12" r="2.4" fill="#b8c0c8"/>
    <circle cx="12" cy="12" r="1" fill="#7a828a"/>`),

  stoneSpear: wrap(`
    <rect x="11.2" y="6" width="1.8" height="15" rx="0.8" fill="#6b4426"/>
    <path d="M12 2 L14.8 6.5 L12 8.5 L9.2 6.5 Z" fill="#6e6e6e"/>
    <path d="M12 2 L13.4 6 L12 7.2 L10.6 6 Z" fill="#8d8d8d"/>`),

  torch: wrap(`
    <rect x="10.8" y="11" width="2.4" height="9" rx="1" fill="#8a5a33"/>
    <rect x="10.4" y="10" width="3.2" height="2" rx="0.6" fill="#6b4426"/>
    <path d="M12 2 Q15.2 6 12 9.5 Q8.8 6 12 2 Z" fill="#ff7a2a"/>
    <path d="M12 4.2 Q13.6 6.6 12 8.4 Q10.4 6.6 12 4.2 Z" fill="#ffd34d"/>`),

  workbench: wrap(`
    <rect x="4" y="8" width="16" height="3.5" rx="0.8" fill="#8a5a33"/>
    <rect x="6" y="11.5" width="2.2" height="8" fill="#6b4426"/>
    <rect x="15.8" y="11.5" width="2.2" height="8" fill="#6b4426"/>
    <rect x="7" y="5.5" width="7" height="1.8" rx="0.6" fill="#b8c0c8"/>
    <rect x="13.5" y="4.6" width="2.2" height="3.6" rx="0.5" fill="#8a5a33"/>`),

  sword: wrap(`
    <path d="M12 2 L13.6 4 L13.6 14 L12 15.5 L10.4 14 L10.4 4 Z" fill="#d4dbe2"/>
    <path d="M12 2 L12.9 4 L12.9 14 L12 15.5 Z" fill="#eef2f5"/>
    <rect x="7.5" y="15" width="9" height="2" rx="1" fill="#8a5a33"/>
    <rect x="11" y="17" width="2" height="3" fill="#6b4426"/>`),

  steelAxe: wrap(`
    <rect x="10.5" y="5" width="2.2" height="16" rx="1" fill="#6b4426"/>
    <path d="M12 5.5 L18.5 6.5 L18.5 13.5 L12 12.5 Z" fill="#d4dbe2"/>
    <path d="M18.5 6.5 L20.5 10 L18.5 13.5 Z" fill="#a9b2ba"/>
    <path d="M12 5.5 L13.6 6 L13.6 13 L12 12.5 Z" fill="#ffffff"/>`),

  steelPick: wrap(`
    <rect x="11" y="6" width="2.2" height="15" rx="1" fill="#6b4426"/>
    <path d="M3.5 6.5 Q12 2.5 20.5 6.5 L18.8 9.5 Q12 6.3 5.2 9.5 Z" fill="#d4dbe2"/>
    <path d="M3.5 6.5 L2.5 10 L5.2 9.5 Z" fill="#a9b2ba"/>
    <path d="M20.5 6.5 L21.5 10 L18.8 9.5 Z" fill="#a9b2ba"/>`),

  bed: wrap(`
    <rect x="3" y="13" width="18" height="3" rx="1" fill="#8a5a33"/>
    <rect x="3" y="10" width="18" height="3" fill="#e8dcc4"/>
    <rect x="4" y="8.8" width="5" height="3" rx="1" fill="#f4eee0"/>
    <rect x="4" y="16" width="1.8" height="4" fill="#6b4426"/>
    <rect x="18.2" y="16" width="1.8" height="4" fill="#6b4426"/>`),

  chest: wrap(`
    <rect x="4" y="8" width="16" height="11" rx="1" fill="#8a5a33"/>
    <rect x="4" y="8" width="16" height="3.5" rx="1" fill="#6b4426"/>
    <line x1="4" y1="13" x2="20" y2="13" stroke="#6b4426" stroke-width="0.8"/>
    <rect x="11" y="10" width="2" height="4" rx="0.4" fill="#b8c0c8"/>
    <circle cx="12" cy="12" r="0.6" fill="#5a6068"/>`),
};
