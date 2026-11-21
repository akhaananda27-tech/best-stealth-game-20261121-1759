// NIGHTSHIFT — museum floor plans.
// Each level is a grid of tiles (40px each, 24 x 16 tiles = 960 x 640).
// Legend:
//   #  wall (blocks movement and sight)
//   C  display case (cover: blocks movement and sight)
//   P  pillar (cover: blocks movement and sight)
//   S  the Star Sapphire pedestal (objective)
//   E  green exit door (leave unseen, sapphire in hand)
//   T  Shade's starting spot
//   .  open marble floor
// Guards are defined separately with patrol waypoints in tile coords.

export const TILE = 40;

export const LEVELS = [
  {
    name: 'Level 1 — The Marble Hall',
    hint: 'Slip past the patrols, take the Star Sapphire, reach the green exit. Hold SHIFT to sneak.',
    par: 150,
    map: [
      '########################',
      '#..........##..........#',
      '#..C....C..##..C....C..#',
      '#......................#',
      '#..P..........P........#',
      '#...................S..#',
      '#..C....C.......C......#',
      '#......................#',
      '#......P........P......#',
      '#..C....C.......C......#',
      '#......................#',
      '#..P..........P........#',
      '#......................#',
      '#..C....C..##..C....C..#',
      '#..E.......##.......T..#',
      '########################',
    ],
    guards: [
      { waypoints: [[4, 3], [10, 3], [10, 7], [4, 7]], speed: 52, range: 175 },
      { waypoints: [[15, 3], [20, 3], [20, 7], [15, 7]], speed: 48, range: 170 },
      { waypoints: [[4, 10], [7, 10], [7, 12], [4, 12]], speed: 50, range: 170 },
      { waypoints: [[17, 10], [21, 10], [21, 12], [17, 12]], speed: 46, range: 165 },
    ],
  },
  {
    name: 'Level 2 — The Gallery of Kings',
    hint: 'More guards, longer sightlines. Running makes noise — guards hear it and come looking.',
    par: 210,
    map: [
      '########################',
      '#....C......C......S...#',
      '#......................#',
      '#..P...##....##...P....#',
      '#......................#',
      '#..C......C......C.....#',
      '#......................#',
      '#.....P........P.......#',
      '#......................#',
      '#..C......C......C.....#',
      '#......................#',
      '#..P...##....##...P....#',
      '#......................#',
      '#....C......C.........E#',
      '#.........T............#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 2], [10, 2], [10, 4], [2, 4]], speed: 58, range: 185 },
      { waypoints: [[15, 2], [21, 2], [21, 4], [15, 4]], speed: 56, range: 185 },
      { waypoints: [[3, 6], [10, 6], [10, 8], [3, 8]], speed: 55, range: 180 },
      { waypoints: [[13, 6], [20, 6], [20, 8], [13, 8]], speed: 57, range: 180 },
      { waypoints: [[4, 12], [19, 12]], speed: 52, range: 175 },
    ],
  },
  {
    name: 'Level 3 — The Vault of the Star Sapphire',
    hint: 'The vault is crawling. Watch the cones, time the patrols, and do not get greedy.',
    par: 280,
    map: [
      '########################',
      '#..C....C..##...C...S..#',
      '#......................#',
      '#..P.......P......P....#',
      '#......................#',
      '#..C...##......##...C..#',
      '#......................#',
      '#....P.....P......P....#',
      '#......................#',
      '#..C...##......##...C..#',
      '#......................#',
      '#..P.......P......P....#',
      '#......................#',
      '#..C....C...##...C.....#',
      '#..E................T..#',
      '########################',
    ],
    guards: [
      { waypoints: [[4, 2], [9, 2], [9, 4], [4, 4]], speed: 64, range: 195 },
      { waypoints: [[14, 2], [20, 2], [20, 4], [14, 4]], speed: 62, range: 195 },
      { waypoints: [[3, 6], [9, 6], [9, 8], [3, 8]], speed: 60, range: 190 },
      { waypoints: [[14, 6], [20, 6], [20, 8], [14, 8]], speed: 63, range: 190 },
      { waypoints: [[4, 10], [9, 10], [9, 12], [4, 12]], speed: 58, range: 185 },
      { waypoints: [[14, 10], [20, 10], [20, 12], [14, 12]], speed: 58, range: 185 },
    ],
  },
];

// Parse one level map into solids (walls/cases/pillars), the sapphire,
// the exit and the player start, all in pixel coordinates.
export function parseLevel(def) {
  const solids = [];
  let sapphire = null;
  let exit = null;
  let start = null;
  def.map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const px = x * TILE;
      const py = y * TILE;
      if (ch === '#' || ch === 'C' || ch === 'P') {
        solids.push({ x: px, y: py, w: TILE, h: TILE, kind: ch === '#' ? 'wall' : ch === 'C' ? 'case' : 'pillar' });
      } else if (ch === 'S') {
        sapphire = { x: px + TILE / 2, y: py + TILE / 2 };
      } else if (ch === 'E') {
        exit = { x: px + TILE / 2, y: py + TILE / 2 };
      } else if (ch === 'T') {
        start = { x: px + TILE / 2, y: py + TILE / 2 };
      }
    });
  });
  return { solids, sapphire, exit, start };
}
