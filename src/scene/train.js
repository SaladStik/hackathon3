import * as THREE from 'three';

const WHITE = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: 0.45, metalness: 0.1 });
const RED = new THREE.MeshStandardMaterial({ color: 0xcc1f33, roughness: 0.5, metalness: 0.1 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0x222b33, roughness: 0.15, metalness: 0.6 });
const GREY = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.7 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x26292c, roughness: 0.8 });
const WHEEL = new THREE.MeshStandardMaterial({ color: 0x1d2023, metalness: 0.5, roughness: 0.6 });

function buildCar() {
  const car = new THREE.Group();
  const L = 14, W = 2.7, H = 2.6, floor = 1.05;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), WHITE);
  body.position.y = floor + H / 2; body.castShadow = body.receiveShadow = true; car.add(body);

  const band = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.7, L * 1.001), RED);
  band.position.y = floor + 0.55; car.add(band);
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.3, L * 0.999), RED);
  shoulder.position.y = floor + H - 0.25; car.add(shoulder);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.45, L * 0.96), GREY);
  roof.position.y = floor + H + 0.18; roof.castShadow = true; car.add(roof);

  for (const s of [1, -1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, L * 0.9), GLASS);
    win.position.set(s * (W / 2 + 0.001), floor + H * 0.63, 0); car.add(win);
  }
  for (const z of [L / 2, -L / 2]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(W, 1.1, 0.18), RED);
    cap.position.set(0, floor + 0.85, z + Math.sign(z) * 0.04); car.add(cap);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, 1.1, 0.08), GLASS);
    ws.position.set(0, floor + H * 0.62, z + Math.sign(z) * 0.05); car.add(ws);
  }
  for (const hx of [W * 0.32, -W * 0.32]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffe6a0, emissiveIntensity: 0.9 }));
    hl.position.set(hx, floor + 0.95, L / 2 + 0.06); car.add(hl);
  }
  for (const bz of [L * 0.32, -L * 0.32]) {
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.5, 2.6), DARK);
    bogie.position.set(0, 0.55, bz); bogie.castShadow = true; car.add(bogie);
    for (const wx of [W * 0.42, -W * 0.42]) for (const wz of [bz + 0.9, bz - 0.9]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 14), WHEEL);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.45, wz); car.add(wheel);
    }
  }
  const pivot = floor + H + 0.4;
  const pa = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), DARK); pa.position.set(0, pivot + 0.5, 1.5); pa.rotation.x = 0.5; car.add(pa);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), DARK); pb.position.set(0, pivot + 0.5, 0.2); pb.rotation.x = -0.5; car.add(pb);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.06, 0.06), DARK); bar.position.set(0, pivot + 1.0, 0.85); car.add(bar);

  return car;
}

export const CAR_SPACING = 15.2;

export function buildTrain(scene, count = 3) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const c = buildCar();
    scene.add(c);
    cars.push(c);
  }
  return cars;
}
