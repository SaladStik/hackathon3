// Shared route data used by both the UI and the 3D scene.

export const STATION_NAMES = [
  'City Hall',
  'Sunalta',
  '7 Street SW',
  'Marlborough',
  'Chinook',
  'Brentwood',
];

// Direction is chosen by terminus, the way the real CTrain signs read.
export const DIRECTIONS = [
  { term: 'Tuscany', line: 'Red Line NW', dir: 1 },
  { term: 'Somerset / Bridlewood', line: 'Red Line S', dir: -1 },
  { term: '69 Street', line: 'Blue Line W', dir: 1 },
  { term: 'Saddletowne', line: 'Blue Line NE', dir: -1 },
];
