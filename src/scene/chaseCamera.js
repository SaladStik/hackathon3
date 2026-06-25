import * as THREE from 'three';

// Camera sits above and behind the train and looks where it is heading.
// All movement is damped so curves and station stops feel smooth, not janky.
export function createChaseCamera(camera, dom) {
  let camDist = 19, camHeight = 14;
  const lookAhead = 34;
  let yawOffset = 0, pitchAdj = 0;
  let effH = camHeight, effD = camDist;

  const smoothFwd = new THREE.Vector3(0, 0, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const camGoal = new THREE.Vector3();
  const lookGoal = new THREE.Vector3();

  let dragging = false, lx = 0, ly = 0, pinch = 0;
  const onDown = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; };
  const onUp = () => { dragging = false; };
  const onMove = (e) => {
    if (!dragging) return;
    yawOffset += (e.clientX - lx) * 0.004;
    pitchAdj = Math.max(-8, Math.min(20, pitchAdj + (e.clientY - ly) * 0.05));
    lx = e.clientX; ly = e.clientY;
  };
  const onWheel = (e) => { camDist = clamp(camDist + e.deltaY * 0.04, 10, 60); };
  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      if (pinch) camDist = clamp(camDist + (pinch - d) * 0.12, 10, 60);
      pinch = d;
    }
  };
  const onTouchEnd = () => { pinch = 0; };

  dom.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointermove', onMove);
  dom.addEventListener('wheel', onWheel, { passive: true });
  dom.addEventListener('touchmove', onTouchMove, { passive: true });
  dom.addEventListener('touchend', onTouchEnd);

  function update(lead, fwd, locked, inTunnel) {
    if (!locked) smoothFwd.lerp(fwd, 0.08).normalize();
    yawOffset *= 0.94;
    const dir = smoothFwd.clone().applyAxisAngle(up, yawOffset);

    if (inTunnel) {
      // sit in front of the train, low, looking back as it bears down
      camGoal.copy(lead).addScaledVector(dir, 12).addScaledVector(up, 3.6);
      lookGoal.copy(lead).addScaledVector(up, 1.6);
      camera.position.lerp(camGoal, 0.16);
    } else {
      effH += (camHeight + pitchAdj - effH) * 0.08;
      effD += (camDist - effD) * 0.08;
      camGoal.copy(lead).addScaledVector(dir, -effD).addScaledVector(up, effH);
      lookGoal.copy(lead).addScaledVector(dir, lookAhead).addScaledVector(up, 2);
      camera.position.lerp(camGoal, 0.12);
    }
    camera.lookAt(lookGoal);
  }

  function dispose() {
    dom.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointermove', onMove);
    dom.removeEventListener('wheel', onWheel);
    dom.removeEventListener('touchmove', onTouchMove);
    dom.removeEventListener('touchend', onTouchEnd);
  }

  return { update, dispose };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
