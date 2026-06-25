import React from 'react';
import { getState, setState } from '../store.js';
import { useStore } from './useStore.js';

export default function LockButton() {
  const { locked } = useStore();
  return (
    <button
      className={`pill pill-right ${locked ? 'pill-active' : ''}`}
      onClick={() => setState({ locked: !getState().locked })}
      aria-pressed={locked}
    >
      {locked ? 'View locked' : 'Lock view'}
    </button>
  );
}
