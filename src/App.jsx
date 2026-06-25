import React, { useEffect, useRef } from 'react';
import { createScene } from './scene/createScene.js';
import { getState, setState } from './store.js';
import RouteMenu from './ui/RouteMenu.jsx';
import Hud from './ui/Hud.jsx';
import LockButton from './ui/LockButton.jsx';

export default function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = createScene(mountRef.current, {
      onHud: (now, next) => setState({ hud: { now, next } }),
    });

    const onKey = (e) => {
      if (e.key === 'l' || e.key === 'L') setState({ locked: !getState().locked });
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      scene.dispose();
    };
  }, []);

  return (
    <>
      <div ref={mountRef} className="canvas-host" />
      <Hud />
      <LockButton />
      <RouteMenu />
    </>
  );
}
