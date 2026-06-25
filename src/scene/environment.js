import * as THREE from 'three';

export const DOWNTOWN = new THREE.Vector2(20, -10);

export function addEnvironment(scene) {
  // Asphalt ground; the city grid leaves the gaps that read as streets.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: 0x4d5358, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  addBowRiver(scene);
  addCalgaryTower(scene);
}

function addBowRiver(scene) {
  const pts = [[-320, 55], [-180, 30], [-70, 8], [35, -18], [150, -8], [300, 45]]
    .map(([x, z]) => new THREE.Vector3(x, 0, z));
  const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(c, 160, 7, 10, false);
  const water = new THREE.MeshStandardMaterial({ color: 0x355a73, roughness: 0.25, metalness: 0.5 });
  const river = new THREE.Mesh(geo, water);
  river.scale.y = 0.02;
  river.position.y = 0.1;
  river.receiveShadow = true;
  scene.add(river);
}

function addCalgaryTower(scene) {
  const g = new THREE.Group();
  const grey = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 72, 16), grey(0xd2d5d8));
  shaft.position.y = 36; shaft.castShadow = true; g.add(shaft);
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 4.2, 9, 16), grey(0xbcc0c4));
  pod.position.y = 73; pod.castShadow = true; g.add(pod);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.2, 5, 16), grey(0x9aa0a6));
  top.position.y = 80; g.add(top);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 18, 6),
    new THREE.MeshStandardMaterial({ color: 0xcc2233 }));
  ant.position.y = 92; g.add(ant);
  g.position.set(DOWNTOWN.x - 18, 0, DOWNTOWN.y + 14);
  scene.add(g);
}
