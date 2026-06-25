// Tiny shared store bridging the React UI and the imperative Three.js scene.
// The scene reads route state every frame; React components subscribe for renders.

const state = {
  menuOpen: true,
  riding: false,
  dir: 1, // +1 or -1 around the loop
  terminus: 'Tuscany',
  destIndex: 1,
  locked: false,
  hud: { now: 'Choose your route', next: '' },
};

const subscribers = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  subscribers.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
