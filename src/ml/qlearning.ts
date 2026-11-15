import { createRng } from './random';

export type Cell = 'empty' | 'wall' | 'goal' | 'trap' | 'start';
export const ACTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const; // up, right, down, left (dx, dy)

export const REWARD = { step: -0.04, goal: 1, trap: -1, bump: -0.1 };

export interface GridWorld {
  width: number;
  height: number;
  cells: Cell[]; // row-major
  start: number;
}

/** A small hand-made maze: walls, two traps and one goal. */
export function defaultWorld(): GridWorld {
  const map = [
    'S...#....',
    '.##.#.##.',
    '.#.....#.',
    '.#.##X.#.',
    '...#...#.',
    '.X.#.###.',
    '.....X..G',
  ];
  const cells: Cell[] = [];
  let start = 0;
  map.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'S') start = y * row.length + x;
      cells.push(ch === '#' ? 'wall' : ch === 'G' ? 'goal' : ch === 'X' ? 'trap' : ch === 'S' ? 'start' : 'empty');
    }),
  );
  return { width: map[0].length, height: map.length, cells, start };
}

export interface Agent {
  Q: Float64Array; // cells × 4
  pos: number;
  episode: number;
  stepInEpisode: number;
  episodeReturn: number;
  returns: number[]; // total reward per finished episode
  rng: () => number;
}

export function createAgent(world: GridWorld, seed: number): Agent {
  return {
    Q: new Float64Array(world.cells.length * 4),
    pos: world.start,
    episode: 0,
    stepInEpisode: 0,
    episodeReturn: 0,
    returns: [],
    rng: createRng(seed),
  };
}

export function bestAction(Q: Float64Array, s: number): number {
  let b = 0;
  for (let a = 1; a < 4; a++) if (Q[s * 4 + a] > Q[s * 4 + b]) b = a;
  return b;
}

export const maxQ = (Q: Float64Array, s: number) => Q[s * 4 + bestAction(Q, s)];

export interface Params {
  alpha: number;
  gamma: number;
  epsilon: number;
  maxSteps: number;
}

/** One environment step with the Q-learning update. Mutates and returns the agent. */
export function qStep(world: GridWorld, ag: Agent, p: Params): Agent {
  const s = ag.pos;
  const a = ag.rng() < p.epsilon ? Math.floor(ag.rng() * 4) : bestAction(ag.Q, s);
  const x = s % world.width;
  const y = Math.floor(s / world.width);
  const nx = x + ACTIONS[a][0];
  const ny = y + ACTIONS[a][1];
  let s2 = s;
  let r = REWARD.step;
  if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height || world.cells[ny * world.width + nx] === 'wall') {
    r = REWARD.bump;
  } else {
    s2 = ny * world.width + nx;
  }
  const cell = world.cells[s2];
  const terminal = cell === 'goal' || cell === 'trap';
  if (cell === 'goal') r = REWARD.goal;
  if (cell === 'trap') r = REWARD.trap;

  const target = terminal ? r : r + p.gamma * maxQ(ag.Q, s2);
  ag.Q[s * 4 + a] += p.alpha * (target - ag.Q[s * 4 + a]);
  ag.episodeReturn += r;
  ag.stepInEpisode++;
  ag.pos = s2;

  if (terminal || ag.stepInEpisode >= p.maxSteps) {
    ag.returns.push(ag.episodeReturn);
    if (ag.returns.length > 500) ag.returns.shift();
    ag.episode++;
    ag.episodeReturn = 0;
    ag.stepInEpisode = 0;
    ag.pos = world.start;
  }
  return ag;
}

/** Follow the greedy policy from the start; returns visited cells (stops on loops). */
export function greedyPath(world: GridWorld, Q: Float64Array, limit = 100): number[] {
  const path = [world.start];
  const seen = new Set(path);
  let s = world.start;
  for (let i = 0; i < limit; i++) {
    const a = bestAction(Q, s);
    const nx = (s % world.width) + ACTIONS[a][0];
    const ny = Math.floor(s / world.width) + ACTIONS[a][1];
    if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) break;
    const s2 = ny * world.width + nx;
    if (world.cells[s2] === 'wall' || seen.has(s2)) break;
    path.push(s2);
    seen.add(s2);
    s = s2;
    if (world.cells[s2] === 'goal' || world.cells[s2] === 'trap') break;
  }
  return path;
}
