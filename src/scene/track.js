import * as THREE from 'three';

export const GAUGE = 1.6;

// Twisty closed alignment that reads like a sprawling CTrain line.
export function buildTrack() {
  const loopPts = [
    [-185, -45], [-120, -115], [-35, -92], [18, -150], [105, -128], [162, -58],
    [118, -8], [172, 62], [118, 132], [28, 108], [-22, 152], [-112, 128], [-162, 58], [-122, 8],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));

  const curve = new THREE.CatmullRomCurve3(loopPts, true, 'catmullrom', 0.5);
  const length = curve.getLength();

  const samples = [];
  for (let i = 0; i < 360; i++) samples.push(curve.getPointAt(i / 360));

  function distToTrack(x, z) {
    let min = Infinity;
    for (const p of samples) {
      const dx = p.x - x, dz = p.z - z, d = dx * dx + dz * dz;
      if (d < min) min = d;
    }
    return Math.sqrt(min);
  }

  return { curve, length, samples, distToTrack };
}

// Rails, ballast sleepers laid along the curve.
export function addRails(scene, track) {
  const { curve, length } = track;
  const up = new THREE.Vector3(0, 1, 0);
  const N = 700, left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(GAUGE);
    left.push(p.clone().add(side).setY(0.28));
    right.push(p.clone().sub(side).setY(0.28));
  }
  const railMat = new THREE.MeshStandardMaterial({ color: 0x32363b, metalness: 0.6, roughness: 0.5 });
  for (const pts of [left, right]) {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 800, 0.16, 6, true);
    const m = new THREE.Mesh(geo, railMat);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }

  const slGeo = new THREE.BoxGeometry(GAUGE * 2.6, 0.18, 0.9);
  const slMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
  const n = Math.floor(length / 3.0);
  const sleepers = new THREE.InstancedMesh(slGeo, slMat, n);
  sleepers.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), fz = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    const t = i / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    q.setFromUnitVectors(fz, tan.clone().setY(0).normalize());
    m4.compose(p.clone().setY(0.16), q, new THREE.Vector3(1, 1, 1));
    sleepers.setMatrixAt(i, m4);
  }
  scene.add(sleepers);
}
