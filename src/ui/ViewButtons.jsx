import React from 'react';
import { getState, setState } from '../store.js';
import { useStore } from './useStore.js';

export default function ViewButtons() {
  const { inside, locked } = useStore();
  return (
    <div className="controls">
      <button
        className={`ctrl ${inside ? 'ctrl-on' : ''}`}
        onClick={() => setState({ inside: !getState().inside })}
        aria-pressed={inside}
      >
        {inside ? 'Outside view' : 'Inside train'}
      </button>
      <button
        className={`ctrl ${locked ? 'ctrl-on' : ''}`}
        onClick={() => setState({ locked: !getState().locked })}
        aria-pressed={locked}
      >
        {locked ? 'View locked' : 'Lock view'}
      </button>
    </div>
  );
}
