import lines from './lines.json';

// Friendly display for each direction (terminus + line), keyed by route_direction.
const META = {
  '201_0': { terminus: 'Tuscany', line: 'Red Line', dir: 1 },
  '201_1': { terminus: 'Somerset / Bridlewood', line: 'Red Line', dir: -1 },
  '202_0': { terminus: 'Saddletowne', line: 'Blue Line', dir: 1 },
  '202_1': { terminus: '69 Street', line: 'Blue Line', dir: -1 },
};

// One entry per direction the rider can choose to head toward.
// `boarding` is where you can get on: every stop on that line EXCEPT the
// terminus you are heading to (you can't board at your destination). Because
// each direction's stop list is a single line, a Red Line trip can never
// offer Blue Line stops and vice versa.
export const DIRECTIONS = lines.directions.map((d) => ({
  key: d.key,
  route: d.route,
  stations: d.stations,
  boarding: d.stations.slice(0, -1),
  ...(META[d.key] || { terminus: title(d.terminus), line: 'CTrain', dir: 1 }),
}));

function title(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
