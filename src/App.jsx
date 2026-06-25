import React, { useEffect, useRef } from 'react';
import { createScene } from './scene/createScene.js';
import { getState, setState } from './store.js';
import { fetchFeed } from './realtime.js';
import { DIRECTIONS } from './data.js';
import TripPanel from './ui/TripPanel.jsx';
import Hud from './ui/Hud.jsx';
import ViewButtons from './ui/ViewButtons.jsx';

export default function App() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  // build the background dashboard scene
  useEffect(() => {
    sceneRef.current = createScene(mountRef.current);
    const onKey = (e) => {
      if (e.key === 'l' || e.key === 'L') setState({ locked: !getState().locked });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      sceneRef.current?.dispose();
    };
  }, []);

  // pull the latest dataset on every session start
  useEffect(() => {
    setState({ loading: true, error: null });
    setState({ stopId: DIRECTIONS[0].stations[0].stop_id });
    fetchFeed()
      .then(({ feed, fetchedAt }) => setState({ feed, fetchedAt, loading: false }))
      .catch((err) => setState({ error: String(err.message || err), loading: false }));
  }, []);

  // shake to crash (mobile)
  useEffect(() => {
    let last = null, count = 0, lastSpikeAt = 0, lastCrashAt = 0;
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a || a.x == null) return;
      if (last) {
        const d = Math.hypot(a.x - last.x, a.y - last.y, a.z - last.z);
        const t = performance.now();
        if (d > 18) {
          count = t - lastSpikeAt < 1000 ? count + 1 : 1;
          lastSpikeAt = t;
          if (count >= 3 && t - lastCrashAt > 5000) {
            lastCrashAt = t; count = 0;
            sceneRef.current?.triggerCrash();
          }
        }
      }
      last = { x: a.x, y: a.y, z: a.z };
    };
    const add = () => window.addEventListener('devicemotion', onMotion);
    const enable = () => {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then((s) => { if (s === 'granted') add(); }).catch(() => {});
      } else {
        add();
      }
      window.removeEventListener('pointerdown', enable);
    };
    window.addEventListener('pointerdown', enable);
    return () => {
      window.removeEventListener('pointerdown', enable);
      window.removeEventListener('devicemotion', onMotion);
    };
  }, []);

  // crash on a fast left/right mouse swipe (click and shake the pointer)
  useEffect(() => {
    let down = false, lastX = 0, lastT = 0, lastVx = 0, reversals = 0, windowStart = 0, lastCrashAt = 0;
    const onDown = (e) => { down = true; lastX = e.clientX; lastT = performance.now(); reversals = 0; windowStart = lastT; };
    const onUp = () => { down = false; reversals = 0; };
    const onMove = (e) => {
      if (!down) return;
      const t = performance.now();
      const dt = t - lastT;
      if (dt < 8) return;
      const vx = (e.clientX - lastX) / dt; // px per ms
      lastX = e.clientX; lastT = t;
      if (Math.abs(vx) > 1.6) {
        if (lastVx !== 0 && Math.sign(vx) !== Math.sign(lastVx)) reversals += 1;
        lastVx = vx;
        if (t - windowStart > 900) { windowStart = t; reversals = 0; }
        if (reversals >= 3 && t - lastCrashAt > 5000) {
          lastCrashAt = t; reversals = 0;
          sceneRef.current?.triggerCrash();
        }
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <>
      <div ref={mountRef} className="canvas-host" />
      <Hud />
      <ViewButtons />
      <TripPanel />
    </>
  );
}
