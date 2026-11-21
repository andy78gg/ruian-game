import * as THREE from 'three';

const ROCK_COLORS = [0x8d8d8d, 0x7d7d78, 0x99948a];

// 散布可挖掘的低多边形岩石
export function buildRocks(heightAt, count = 40) {
  const group = new THREE.Group();
  const rocks = [];
  const mats = ROCK_COLORS.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 1 })
  );

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    if (Math.hypot(x, z) < 6) continue;

    const y = heightAt(x, z);
    const s = 0.4 + Math.random() * 0.5;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(s, 0),
      mats[Math.floor(Math.random() * mats.length)]
    );
    rock.position.set(x, y + s * 0.25, z);
    rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    rock.scale.y = 0.7;
    rock.castShadow = true;
    group.add(rock);

    rocks.push({ group: rock, hp: 4, alive: true, kind: 'rock' });
    placed++;
  }

  return { group, rocks };
}
