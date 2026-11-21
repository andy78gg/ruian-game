import * as THREE from 'three';

const REACH = 3.5; // 采集距离
const YIELD = { wood: 2, stone: 2 };

// 采集判定：从相机中心射线命中树/石头/浆果灌木，校验工具，累计伤害，破坏后掉落资源。
export function createGather({ camera, trees, rocks, berries, inventory, hotbar, onTip }) {
  const ray = new THREE.Raycaster();
  const box = new THREE.Box3();
  const center = new THREE.Vector2(0, 0);

  function damage(target, resource) {
    target.hp -= 1;
    if (target.hp <= 0) {
      target.alive = false;
      target.group.removeFromParent();
      inventory.add(resource, YIELD[resource]);
      onTip(resource === 'wood' ? `获得木材 +${YIELD.wood}` : `获得石头 +${YIELD.stone}`);
    }
  }

  function tryHit() {
    const item = hotbar.state.items[hotbar.state.selected];
    ray.setFromCamera(center, camera);
    ray.far = REACH;

    for (const tree of trees) {
      if (!tree.alive) continue;
      box.setFromObject(tree.group);
      if (ray.ray.intersectsBox(box)) {
        if (item.id !== 'axe') {
          onTip('砍树需要斧头');
          return;
        }
        damage(tree, 'wood');
        return;
      }
    }

    for (const rock of rocks) {
      if (!rock.alive) continue;
      box.setFromObject(rock.group);
      if (ray.ray.intersectsBox(box)) {
        if (item.id !== 'pickaxe') {
          onTip('挖矿需要镐');
          return;
        }
        damage(rock, 'stone');
        return;
      }
    }

    for (const bush of berries.bushes) {
      if (!bush.alive) continue;
      box.setFromObject(bush.group);
      if (ray.ray.intersectsBox(box)) {
        if (bush.berries <= 0) {
          onTip('浆果还没长出来');
          return;
        }
        berries.pick(bush);
        const food = hotbar.state.items.find((i) => i.model === 'food' || i.model === 'berry');
        if (food) {
          food.count += 1;
          hotbar.refresh();
        }
        onTip('采到浆果 +1');
        return;
      }
    }
  }

  return { tryHit };
}
