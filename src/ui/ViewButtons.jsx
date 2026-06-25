import React from 'react';
import { getState, setState } from '../store.js';
import { useStore } from './useStore.js';

export default function ViewButtons() {
  const { inside, locked } = useStore();
  return (
    <>
      <button
        className={`pill pill-left ${inside ? 'pill-active' : ''}`}
        onClick={() => setState({ inside: !getState().inside })}
        aria-pressed={inside}
      >
        {inside ? 'Outside view' : 'Inside train'}
      </button>
      <button
        className={`pill pill-right ${locked ? 'pill-active' : ''}`}
        onClick={() => setState({ locked: !getState().locked })}
        aria-pressed={locked}
      >
        {locked ? 'View locked' : 'Lock view'}
      </button>
    </>
  );
}
