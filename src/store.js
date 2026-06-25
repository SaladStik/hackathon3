// Tiny shared store bridging the React UI and the imperative Three.js scene.

const state = {
  // realtime data
  loading: true,
  error: null,
  feed: null,
  fetchedAt: null,
  // trip selection
  dirIndex: 0,
  stopId: null,
  result: null, // { nextEtaMin, avgWaitMin, avgDelayMin, upcoming, delaySamples }
  // scene
  dir: 1, // background train travel direction
  locked: false,
  inside: false,
  crashing: false,
};

const subscribers = new Set();
export function getState() { return state; }
export function setState(patch) {
  Object.assign(state, patch);
  subscribers.forEach((fn) => fn(state));
}
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
