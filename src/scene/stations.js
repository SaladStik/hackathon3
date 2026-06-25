import * as THREE from 'three';
import { GAUGE } from './track.js';
import { STATION_NAMES } from '../data.js';

// Platforms with red canopies at evenly spaced points around the loop.
export function addStations(scene, track) {
  const { curve, length } = track;
  const fracs = STATION_NAMES.map((_, i) => i / STATION_NAMES.length);
  const dists = fracs.map((f) => f * length);

  const concrete = new THREE.MeshStandardMaterial({ color: 0xc4c7cb, roughness: 0.95 });
  const canopy = new THREE.MeshStandardMaterial({ color: 0xcc1f33, roughness: 0.6 });
  const post = new THREE.MeshStandardMaterial({ color: 0x6a6f74, metalness: 0.5, roughness: 0.5 });
  const up = new THREE.Vector3(0, 1, 0), fz = new THREE.Vector3(0, 0, 1);

  fracs.forEach((f) => {
    const p = curve.getPointAt(f), tan = curve.getTangentAt(f).setY(0).normalize();
    const side = new THREE.Vector3().crossVectors(tan, up).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(fz, tan);
    for (const sgn of [1, -1]) {
      const g = new THREE.Group();
      g.position.copy(p).addScaledVector(side, sgn * (GAUGE + 2.6));
      g.quaternion.copy(q);
      const plat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 22), concrete);
      plat.position.y = 0.45; plat.castShadow = plat.receiveShadow = true; g.add(plat);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 14), canopy);
      roof.position.set(0, 3.4, 0); roof.castShadow = true; g.add(roof);
      for (const pz of [-5.5, 5.5]) for (const px of [-1.2, 1.2]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), post);
        pole.position.set(px, 1.8, pz); g.add(pole);
      }
      scene.add(g);
    }
  });

  return { names: STATION_NAMES, fracs, dists, count: STATION_NAMES.length };
}
