import * as THREE from 'three';
import { DOWNTOWN } from './environment.js';

const PERIOD = 34, BLOCK = 24, CORRIDOR = 15;

// Dense grid city: sidewalk blocks with buildings, taller toward downtown.
export function addCity(scene, track) {
  const buildings = [], sidewalks = [], trees = [];

  for (let gx = -7; gx <= 7; gx++) for (let gz = -7; gz <= 7; gz++) {
    const cx = gx * PERIOD, cz = gz * PERIOD;
    if (track.distToTrack(cx, cz) < CORRIDOR) continue;
    sidewalks.push({ x: cx, z: cz, s: BLOCK });

    const dd = Math.hypot(cx - DOWNTOWN.x, cz - DOWNTOWN.y);
    const tall = Math.max(0, 1 - dd / 150);
    const lots = 1 + (Math.random() * 3 | 0);
    for (let k = 0; k < lots; k++) {
      const w = 4 + Math.random() * 7, d = 4 + Math.random() * 7;
      const bx = cx + (Math.random() - 0.5) * (BLOCK - w - 2);
      const bz = cz + (Math.random() - 0.5) * (BLOCK - d - 2);
      if (track.distToTrack(bx, bz) < CORRIDOR - 2) continue;
      const h = 6 + Math.random() * 14 + tall * (40 + Math.random() * 70);
      buildings.push({ x: bx, z: bz, w, d, h, shade: 0.55 + Math.random() * 0.45 });
    }
    if (Math.random() < 0.6) {
      const tx = cx + (Math.random() - 0.5) * BLOCK, tz = cz + (Math.random() - 0.5) * BLOCK;
      if (track.distToTrack(tx, tz) > 7) trees.push({ x: tx, z: tz, s: 0.8 + Math.random() * 0.8 });
    }
  }

  addSidewalks(scene, sidewalks);
  addBuildings(scene, buildings);
  addTrees(scene, trees);
}

function addSidewalks(scene, items) {
  const im = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.3, 1),
    new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 1 }),
    items.length
  );
  im.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  items.forEach((s, i) => {
    m4.compose(new THREE.Vector3(s.x, 0.15, s.z), q, new THREE.Vector3(s.s, 1, s.s));
    im.setMatrixAt(i, m4);
  });
  scene.add(im);
}

// colourful, slightly glassy skyline; towers lean toward blue/teal glass
const PALETTE = [0x6fa8c7, 0x5fa39a, 0x79a86a, 0xc9a96a, 0x8893a0, 0xaac4d2, 0xb9b2a6, 0x4f7da6];
const GLASS = [0x6fa8c7, 0x4f7da6, 0x5fa39a, 0xaac4d2];

function addBuildings(scene, items) {
  const im = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.45 }),
    items.length
  );
  im.castShadow = im.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  items.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, 0.3 + b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
    im.setMatrixAt(i, m4);
    const pool = b.h > 40 ? GLASS : PALETTE;
    c.setHex(pool[(Math.random() * pool.length) | 0]);
    im.setColorAt(i, c);
  });
  scene.add(im);
}

function addTrees(scene, items) {
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.3, 2, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4f33, roughness: 1 }),
    items.length
  );
  const leaves = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.5, 4.5, 7),
    new THREE.MeshStandardMaterial({ color: 0x4e7a43, roughness: 1 }),
    items.length
  );
  leaves.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  items.forEach((t, i) => {
    m4.compose(new THREE.Vector3(t.x, t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
    trunks.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(t.x, 3.6 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
    leaves.setMatrixAt(i, m4);
  });
  scene.add(trunks);
  scene.add(leaves);
}
