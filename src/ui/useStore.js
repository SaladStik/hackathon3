import { useEffect, useState } from 'react';
import { getState, subscribe } from '../store.js';

// Re-render a component whenever the shared store changes.
export function useStore() {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return getState();
}
