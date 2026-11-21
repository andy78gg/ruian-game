import * as THREE from 'three';

const ROCK_COLORS = [0x7c766b, 0x8a8375, 0x6e6a61];

// 散布可挖掘的岩石：圆润主石 + 1~2 块附属碎石
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
    const s = 0.5 + Math.random() * 0.6;
    const mat = mats[Math.floor(Math.random() * mats.length)];

    const rockGroup = new THREE.Group();

    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), mat);
    main.position.y = s * 0.3;
    main.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    main.scale.y = 0.75;
    main.castShadow = true;
    main.receiveShadow = true;
    rockGroup.add(main);

    // 附属碎石
    const debris = 1 + Math.floor(Math.random() * 2);
    for (let d = 0; d < debris; d++) {
      const ds = s * (0.25 + Math.random() * 0.25);
      const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(ds, 0), mat);
      const ang = Math.random() * Math.PI * 2;
      chip.position.set(
        Math.cos(ang) * s * 0.9,
        ds * 0.3,
        Math.sin(ang) * s * 0.9
      );
      chip.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      chip.castShadow = true;
      rockGroup.add(chip);
    }

    rockGroup.position.set(x, y, z);
    group.add(rockGroup);

    rocks.push({ group: rockGroup, hp: 4, alive: true, kind: 'rock', x, z, radius: s * 0.85 });
    placed++;
  }

  return { group, rocks };
}
