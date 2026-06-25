import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WHITE = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: 0.45, metalness: 0.1 });
const RED = new THREE.MeshStandardMaterial({ color: 0xcc1f33, roughness: 0.5, metalness: 0.1 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.4 });
const GREY = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.7 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x26292c, roughness: 0.8 });
const WHEEL = new THREE.MeshStandardMaterial({ color: 0x1d2023, metalness: 0.5, roughness: 0.6 });

function buildCar() {
  const car = new THREE.Group();
  const L = 14, W = 2.7, H = 2.6, floor = 1.05;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), WHITE);
  body.position.y = floor + H / 2; body.castShadow = body.receiveShadow = true; car.add(body);

  const shell = []; // exterior cosmetic parts, hidden when viewing from inside
  const band = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.7, L * 1.001), RED);
  band.position.y = floor + 0.55; car.add(band); shell.push(band);
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.3, L * 0.999), RED);
  shoulder.position.y = floor + H - 0.25; car.add(shoulder); shell.push(shoulder);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.45, L * 0.96), GREY);
  roof.position.y = floor + H + 0.18; roof.castShadow = true; car.add(roof);

  for (const s of [1, -1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, L * 0.9), GLASS);
    win.position.set(s * (W / 2 + 0.001), floor + H * 0.63, 0); car.add(win);
  }
  for (const z of [L / 2, -L / 2]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(W, 1.1, 0.18), RED);
    cap.position.set(0, floor + 0.85, z + Math.sign(z) * 0.04); car.add(cap); shell.push(cap);
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

  car.userData.body = body;
  car.userData.shell = shell;
  return car;
}

export const CAR_SPACING = 15.2;
export const MAX_PEOPLE = 24;

function personGeometry() {
  const torso = new THREE.CylinderGeometry(0.16, 0.21, 0.62, 10); torso.translate(0, 0.66, 0);
  const hips = new THREE.SphereGeometry(0.2, 10, 8); hips.scale(1, 0.7, 0.8); hips.translate(0, 0.42, 0);
  const legL = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8); legL.translate(-0.08, 0.2, 0);
  const legR = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8); legR.translate(0.08, 0.2, 0);
  const head = new THREE.SphereGeometry(0.15, 12, 10); head.translate(0, 1.12, 0);
  const armL = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6); armL.translate(-0.24, 0.7, 0);
  const armR = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6); armR.translate(0.24, 0.7, 0);
  return mergeGeometries([legL, legR, hips, torso, armL, armR, head]);
}

// Riders live at scene level (not parented to the car) so they can be flung
// independently when the train crashes.
export function buildRiders(scene) {
  const mesh = new THREE.InstancedMesh(
    personGeometry(),
    new THREE.MeshStandardMaterial({ roughness: 0.7 }),
    MAX_PEOPLE
  );
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  scene.add(mesh);

  // local standing positions inside the lead car (origin at the car centre)
  const pos = [];
  const rows = 8, cols = 3;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    pos.push(new THREE.Vector3((c - 1) * 0.62, 0.55, (r - 3.5) * 1.5));
  }
  return { mesh, pos };
}

function addInterior(car) {
  const L = 14, W = 2.7, floorY = 1.08, ceilY = 3.3;
  const panel = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.85 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.95 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2f5d9e, roughness: 0.6 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xb8bdc2, metalness: 0.7, roughness: 0.35 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffe9b0, emissiveIntensity: 1.2 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.08, L * 0.96), floorMat);
  floor.position.y = floorY; car.add(floor);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.08, L * 0.96), panel);
  ceil.position.y = ceilY; car.add(ceil);
  for (const x of [-0.5, 0.5]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, L * 0.9), lightMat);
    strip.position.set(x, ceilY - 0.08, 0); car.add(strip);
  }

  for (const s of [1, -1]) {
    // upper wall above the windows, and seats + lower wall below them
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, L * 0.96), panel);
    upper.position.set(s * W * 0.49, 2.85, 0); car.add(upper);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, L * 0.85), seatMat);
    base.position.set(s * W * 0.34, 1.5, 0); car.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, L * 0.85), seatMat);
    back.position.set(s * W * 0.46, 1.78, 0); car.add(back);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, L * 0.96), panel);
    lower.position.set(s * W * 0.49, 1.32, 0); car.add(lower);
    // window pillars
    for (let z = -L / 2 + 1.5; z <= L / 2 - 1.5; z += 2.4) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.12), panel);
      pil.position.set(s * W * 0.5, 1.95, z); car.add(pil);
    }
  }

  // vertical grab poles + a ceiling handrail down the aisle
  for (const z of [-4.5, -1.5, 1.5, 4.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 8), poleMat);
    pole.position.set(0, 2.1, z); car.add(pole);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L * 0.85, 8), poleMat);
  rail.rotation.x = Math.PI / 2; rail.position.set(0, 3.0, 0); car.add(rail);

  // front cab partition
  const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 1.4, 0.1), panel);
  cab.position.set(0, 1.78, L / 2 - 0.6); car.add(cab);
}

export function buildTrain(scene, count = 3) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const c = buildCar();
    scene.add(c);
    cars.push(c);
  }
  addInterior(cars[0]);
  return cars;
}
