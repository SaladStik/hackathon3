import * as THREE from 'three';
import { getState } from '../store.js';
import { buildTrack, addRails } from './track.js';
import { addEnvironment } from './environment.js';
import { addCity } from './city.js';
import { addStations } from './stations.js';
import { addTunnels } from './tunnels.js';
import { buildTrain, CAR_SPACING } from './train.js';
import { createChaseCamera } from './chaseCamera.js';

const CRUISE = 26, ACCEL = 14, DECEL_WINDOW = 34, DWELL = 2.2;

export function createScene(host, { onHud }) {
  // renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9aa3ab);
  scene.fog = new THREE.Fog(0x9aa3ab, 130, 340);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 2000);

  // lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a727a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.1);
  sun.position.set(70, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 360;
  const S = 130;
  sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
  sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0004;
  scene.add(sun); scene.add(sun.target);

  // world
  const track = buildTrack();
  addEnvironment(scene);
  addRails(scene, track);
  addCity(scene, track);
  const stations = addStations(scene, track);
  const inTunnel = addTunnels(scene, track);
  const cars = buildTrain(scene, 3);
  const chase = createChaseCamera(camera, renderer.domElement);

  // motion state
  let dist = 0, speed = 0, dwell = 0, nextStation = 0, arrived = false;
  let wasRiding = false;
  let hudNow = '', hudNext = '';

  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), fz = new THREE.Vector3(0, 0, 1);

  function placeCar(car, d, dir) {
    d = ((d % track.length) + track.length) % track.length;
    const t = d / track.length;
    track.curve.getPointAt(t, tmpP);
    track.curve.getTangentAt(t, tmpT).normalize();
    car.position.copy(tmpP); car.position.y = 0.55;
    car.quaternion.setFromUnitVectors(fz, tmpT.clone().multiplyScalar(dir));
  }

  function pushHud(now, next) {
    if (now !== hudNow || next !== hudNext) {
      hudNow = now; hudNext = next;
      onHud(now, next);
    }
  }

  function updateMotion(dt, st) {
    const L = track.length, dir = st.dir, count = stations.count;

    // when a new route starts, aim at the chosen destination
    if (st.riding && !wasRiding) { nextStation = st.destIndex; dwell = 0; arrived = false; }
    wasRiding = st.riding;

    if (!st.riding) {
      speed = Math.max(0, speed - ACCEL * dt);
      dist += speed * dt * dir;
      pushHud('Choose your route', '');
      return;
    }

    const d = ((dist % L) + L) % L;
    const target = stations.dists[nextStation];
    const gap = (((target - d) * dir) % L + L) % L;

    if (dwell > 0) {
      dwell -= dt; speed = 0;
      if (dwell <= 0) {
        nextStation = ((nextStation + (dir > 0 ? 1 : count - 1)) % count + count) % count;
        arrived = false;
      }
    } else {
      let desired = CRUISE;
      if (gap < DECEL_WINDOW) desired = Math.max(0, CRUISE * (gap / DECEL_WINDOW));
      if (speed < desired) speed = Math.min(desired, speed + ACCEL * dt);
      else speed = Math.max(desired, speed - ACCEL * 1.4 * dt);
      if (gap < 1.2 && speed < 3) {
        dwell = DWELL; speed = 0;
        arrived = nextStation === st.destIndex;
      }
    }
    dist += speed * dt * dir;

    const name = stations.names[nextStation];
    if (dwell > 0) {
      pushHud(arrived ? `Arrived: ${name}` : `Stopping: ${name}`, 'Doors open');
    } else {
      pushHud(`Next stop: ${name}`, `${(speed * 3.6) | 0} km per hour, to ${stations.names[st.destIndex]}`);
    }
  }

  // loop
  const clock = new THREE.Clock();
  let raf = 0;
  function animate() {
    raf = requestAnimationFrame(animate);
    const st = getState();
    const dt = Math.min(clock.getDelta(), 0.05);
    updateMotion(dt, st);

    for (let i = 0; i < cars.length; i++) placeCar(cars[i], dist - i * CAR_SPACING * st.dir, st.dir);

    const lead = cars[0].position;
    const t = (((dist % track.length) + track.length) % track.length) / track.length;
    track.curve.getTangentAt(t, tmpT).setY(0).normalize().multiplyScalar(st.dir);
    chase.update(lead, tmpT, st.locked, inTunnel(t));

    sun.position.set(lead.x + 70, 120, lead.z + 40);
    sun.target.position.copy(lead);
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
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { dispose };
}
