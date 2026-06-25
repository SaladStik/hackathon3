import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getState } from '../store.js';
import { buildTrack, addRails } from './track.js';
import { addEnvironment } from './environment.js';
import { addCity } from './city.js';
import { addStations } from './stations.js';
import { addTunnels } from './tunnels.js';
import { buildTrain, CAR_SPACING, MAX_PEOPLE } from './train.js';
import { createChaseCamera } from './chaseCamera.js';
import { busyness } from '../busyness.js';

const CRUISE = 16, ACCEL = 10, DECEL_WINDOW = 30, DWELL = 2.0;

export function createScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9aa3ab);
  scene.fog = new THREE.Fog(0x9aa3ab, 130, 340);

  // soft image-based reflections so glass and metal read correctly
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 2000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a727a, 0.8));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.0);
  sun.position.set(70, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 360;
  const S = 130;
  sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
  sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0004;
  scene.add(sun); scene.add(sun.target);

  const track = buildTrack();
  addEnvironment(scene);
  addRails(scene, track);
  addCity(scene, track);
  const stations = addStations(scene, track);
  const inTunnel = addTunnels(scene, track);
  const cars = buildTrain(scene, 3);
  const chase = createChaseCamera(camera, renderer.domElement);

  // motion
  let dist = 0, speed = 0, dwell = 0, nextStation = 0, lastDir = 1;
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), fz = new THREE.Vector3(0, 0, 1);

  // riders shown in the lead car, colour + count from busyness
  const people = cars[0].userData.people;
  const pm4 = new THREE.Matrix4(), pq = new THREE.Quaternion(), ps = new THREE.Vector3();
  const cLow = new THREE.Color(0x2e9e4f), cHigh = new THREE.Color(0xd81e2c), cNow = new THREE.Color();
  function updatePeople(occ) {
    const k = Math.round(occ * MAX_PEOPLE);
    cNow.copy(cLow).lerp(cHigh, occ);
    for (let i = 0; i < MAX_PEOPLE; i++) {
      ps.setScalar(i < k ? 1 : 0.0001);
      pm4.compose(people.userData.pos[i], pq, ps);
      people.setMatrixAt(i, pm4);
      people.setColorAt(i, cNow);
    }
    people.instanceMatrix.needsUpdate = true;
    if (people.instanceColor) people.instanceColor.needsUpdate = true;
  }

  const insideEye = new THREE.Vector3(), insideTgt = new THREE.Vector3();

  function placeCar(car, d, dir) {
    d = ((d % track.length) + track.length) % track.length;
    const t = d / track.length;
    track.curve.getPointAt(t, tmpP);
    track.curve.getTangentAt(t, tmpT).normalize();
    car.position.copy(tmpP); car.position.y = 0.55;
    car.quaternion.setFromUnitVectors(fz, tmpT.clone().multiplyScalar(dir));
  }

  function step(dt, dir) {
    const L = track.length, count = stations.count;
    const d = ((dist % L) + L) % L;
    const target = stations.dists[nextStation];
    const gap = (((target - d) * dir) % L + L) % L;
    if (dwell > 0) {
      dwell -= dt; speed = 0;
      if (dwell <= 0) nextStation = ((nextStation + (dir > 0 ? 1 : count - 1)) % count + count) % count;
    } else {
      let desired = CRUISE;
      if (gap < DECEL_WINDOW) desired = Math.max(0, CRUISE * (gap / DECEL_WINDOW));
      if (speed < desired) speed = Math.min(desired, speed + ACCEL * dt);
      else speed = Math.max(desired, speed - ACCEL * 1.4 * dt);
      if (gap < 1.2 && speed < 3) { dwell = DWELL; speed = 0; }
    }
    dist += speed * dt * dir;
  }

  // crash sequence
  let mode = 'run', crashT = 0;
  const crashCenter = new THREE.Vector3();
  const phys = cars.map(() => ({ vel: new THREE.Vector3(), ang: new THREE.Vector3() }));
  const flash = new THREE.PointLight(0xffaa33, 0, 80); scene.add(flash);
  let boom = null;

  function makeBoom(center) {
    const group = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const mats = [0xff7b00, 0xffd000, 0x6e6e6e, 0xff3b00, 0x3a3a3a]
      .map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.7 }));
    const items = [];
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(geo, mats[i % mats.length]);
      m.position.copy(center).add(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4));
      m.scale.setScalar(0.4 + Math.random() * 1.6);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 24, 5 + Math.random() * 18, (Math.random() - 0.5) * 24);
      group.add(m); items.push({ m, vel });
    }
    return { group, items };
  }

  function triggerCrash() {
    if (mode !== 'run') return;
    mode = 'crash'; crashT = 2.8;
    crashCenter.copy(cars[0].position);
    cars.forEach((_, i) => {
      phys[i].vel.set((Math.random() - 0.5) * 18, 9 + Math.random() * 9, (Math.random() - 0.5) * 18);
      phys[i].ang.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    });
    boom = makeBoom(crashCenter); scene.add(boom.group);
    flash.position.copy(crashCenter).setY(crashCenter.y + 3); flash.intensity = 9;
  }

  function crashStep(dt) {
    crashT -= dt;
    cars.forEach((car, i) => {
      const p = phys[i];
      p.vel.y -= 26 * dt;
      car.position.addScaledVector(p.vel, dt);
      car.rotation.x += p.ang.x * dt; car.rotation.y += p.ang.y * dt; car.rotation.z += p.ang.z * dt;
      if (car.position.y < 0.6) { car.position.y = 0.6; p.vel.y *= -0.35; p.vel.x *= 0.7; p.vel.z *= 0.7; p.ang.multiplyScalar(0.7); }
    });
    if (boom) boom.items.forEach((it) => {
      it.vel.y -= 22 * dt;
      it.m.position.addScaledVector(it.vel, dt);
      it.m.scale.multiplyScalar(Math.max(0, 1 - dt * 0.5));
    });
    flash.intensity *= Math.pow(0.015, dt);
    if (crashT <= 0) {
      mode = 'run'; speed = 0;
      if (boom) { scene.remove(boom.group); boom = null; }
      flash.intensity = 0;
      cars.forEach((car) => car.rotation.set(0, 0, 0)); // placeCar restores orientation
    }
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function animate() {
    raf = requestAnimationFrame(animate);
    const st = getState();
    const dir = st.dir || 1;
    const dt = Math.min(clock.getDelta(), 0.05);

    if (mode === 'crash') {
      crashStep(dt);
      camera.lookAt(crashCenter);
    } else {
      step(dt, dir);
      for (let i = 0; i < cars.length; i++) placeCar(cars[i], dist - i * CAR_SPACING * dir, dir);
      updatePeople(busyness());
      const lead = cars[0].position;
      const t = (((dist % track.length) + track.length) % track.length) / track.length;
      track.curve.getTangentAt(t, tmpT).setY(0).normalize().multiplyScalar(dir);

      // hide the lead car's exterior panels while riding inside it
      for (const m of cars[0].userData.shell) m.visible = !st.inside;

      if (st.inside) {
        // ride inside the lead car: see the riders and out the windows
        cars[0].updateMatrixWorld();
        insideEye.set(0, 2.0, -4.8); cars[0].localToWorld(insideEye);
        insideTgt.set(0, 1.65, 5); cars[0].localToWorld(insideTgt);
        camera.position.lerp(insideEye, 0.25);
        camera.lookAt(insideTgt);
      } else {
        chase.update(lead, tmpT, st.locked, inTunnel(t));
      }
      sun.position.set(lead.x + 70, 120, lead.z + 40);
      sun.target.position.copy(lead);
    }
    lastDir = dir;
    renderer.render(scene, camera);
  }
  animate();

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  };
  window.addEventListener('resize', onResize);

  function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    chase.dispose();
    pmrem.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { dispose, triggerCrash };
}
