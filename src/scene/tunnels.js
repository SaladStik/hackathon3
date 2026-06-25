import * as THREE from 'three';
import { GAUGE } from './track.js';

// Two covered sections; the chase camera ducks inside so the train stays in view.
export function addTunnels(scene, track) {
  const { curve, length } = track;
  const spans = [];
  const wall = new THREE.MeshStandardMaterial({ color: 0x6e7378, roughness: 1 });
  const berm = new THREE.MeshStandardMaterial({ color: 0x5d7a4e, roughness: 1 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffe9b0, emissiveIntensity: 1.1 });
  const up = new THREE.Vector3(0, 1, 0), fz = new THREE.Vector3(0, 0, 1);

  function build(f0, f1) {
    spans.push([f0, f1]);
    const Wt = GAUGE * 2 + 2.4, Ht = 5.2;
    const span = (f1 - f0) * length;
    const steps = Math.max(8, Math.floor(span / 2.2));
    const seg = span / steps + 0.25;
    for (let i = 0; i <= steps; i++) {
      const f = f0 + (f1 - f0) * i / steps;
      const p = curve.getPointAt(f), tan = curve.getTangentAt(f).setY(0).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(fz, tan);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(Wt, 0.6, seg), wall);
      roof.position.copy(p).setY(Ht); roof.quaternion.copy(q);
      roof.castShadow = roof.receiveShadow = true; scene.add(roof);

      for (const sgn of [1, -1]) {
        const side = new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(sgn * Wt / 2);
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, Ht, seg), wall);
        w.position.copy(p).add(side).setY(Ht / 2); w.quaternion.copy(q);
        w.castShadow = true; scene.add(w);
      }

      const mound = new THREE.Mesh(new THREE.BoxGeometry(Wt + 7, 2.4, seg), berm);
      mound.position.copy(p).setY(Ht + 1.4); mound.quaternion.copy(q);
      mound.castShadow = mound.receiveShadow = true; scene.add(mound);

      if (i % 2 === 0) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), lamp);
        l.position.copy(p).setY(Ht - 0.5); scene.add(l);
      }
    }
  }

  build(0.205, 0.278);
  build(0.71, 0.79);

  return (t) => spans.some(([a, b]) => t > a - 0.012 && t < b + 0.012);
}
