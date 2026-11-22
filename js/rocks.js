import * as THREE from 'three';

const ROCK_COLORS = [0x7c766b, 0x8a8375, 0x6e6a61, 0x8a7a66, 0x756f68, 0x93887a];
// 岩石形态：round 圆润卧石 / spire 高瘦立石 / flat 扁平垫石 / cluster 多块团簇
const KINDS = ['round', 'round', 'spire', 'flat', 'cluster'];

function mainGeometry(kind, s) {
  switch (kind) {
    case 'spire': return new THREE.OctahedronGeometry(s, 0);
    case 'flat': return new THREE.DodecahedronGeometry(s, 1);
    case 'cluster': return new THREE.IcosahedronGeometry(s, 1);
    default: return new THREE.DodecahedronGeometry(s, 1);
  }
}

// 散布可挖掘的岩石：多种几何形态与高矮比例，主石配 1~3 块附属碎石
export function buildRocks(heightAt, count = 40) {
  const group = new THREE.Group();
  const rocks = [];
  const mats = ROCK_COLORS.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: false })
  );

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 6) continue;

    const y = heightAt(x, z);
    const s = 0.45 + Math.random() * 0.55;
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    const mat = mats[Math.floor(Math.random() * mats.length)];

    const rockGroup = new THREE.Group();

    const main = new THREE.Mesh(mainGeometry(kind, s), mat);
    main.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());

    // 不同形态的比例：立石高瘦、垫石扁平、团簇略宽
    if (kind === 'spire') {
      main.scale.set(0.7, 1.6 + Math.random() * 0.5, 0.7);
      main.position.y = s * 0.7;
    } else if (kind === 'flat') {
      main.scale.set(1.25, 0.45, 1.1);
      main.position.y = s * 0.25;
    } else if (kind === 'cluster') {
      main.scale.set(1, 0.8, 1);
      main.position.y = s * 0.35;
    } else {
      main.scale.y = 0.75;
      main.position.y = s * 0.3;
    }
    main.castShadow = true;
    main.receiveShadow = true;
    rockGroup.add(main);

    // 附属碎石：团簇更多，其余 1~2 块
    const debris = kind === 'cluster'
      ? 2 + Math.floor(Math.random() * 2)
      : 1 + Math.floor(Math.random() * 2);
    for (let d = 0; d < debris; d++) {
      const ds = s * (0.22 + Math.random() * 0.25);
      const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(ds, 0), mat);
      const ang = Math.random() * Math.PI * 2;
      chip.position.set(
        Math.cos(ang) * s * (kind === 'cluster' ? 0.7 : 0.9),
        ds * 0.3,
        Math.sin(ang) * s * (kind === 'cluster' ? 0.7 : 0.9)
      );
      chip.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      chip.castShadow = true;
      chip.receiveShadow = true;
      rockGroup.add(chip);
    }

    rockGroup.position.set(x, y, z);
    group.add(rockGroup);

    const radius = kind === 'spire' ? s * 0.7 : s * 0.85;
    rocks.push({ group: rockGroup, hp: 4, alive: true, kind: 'rock', x, z, radius });
    placed++;
  }

  return { group, rocks };
}
