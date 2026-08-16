import * as Board from "./board";
import * as Geometry from "./geometry";
import * as Option from "./option";
import type * as Player from "./player";
import * as Players from "./players";
import * as Snake from "./snake";
import * as Turns from "./turns";
import type * as World from "./world";

export const HUNGRY = "hungry";
export const PATIENT = "patient";
export const PUSHY = "pushy";

export type Stance = typeof HUNGRY | typeof PATIENT | typeof PUSHY;

type Weights = {
  readonly food: number;
  readonly room: number;
  readonly deny: number;
  readonly keepOff: number;
  readonly hold: number;
};

const WEIGHING: Readonly<Record<Stance, Weights>> = {
  [HUNGRY]: { food: 10, room: 4, deny: 0, keepOff: 2, hold: 1.6 },
  [PATIENT]: { food: 2, room: 10, deny: 0, keepOff: 6, hold: 2.4 },
  [PUSHY]: { food: 3, room: 5, deny: 8, keepOff: 3, hold: 1.2 },
};

const RESTLESS = 0.86;
const SPREAD = 1000;

const restless = <B>(world: World.Type<B>, who: Players.Id, length: number): boolean => {
  const mixed =
    Math.imul(Number(who) + 1, 0x9e3779b1) ^
    Math.imul(world.food.col + 1, 0x85ebca6b) ^
    Math.imul(world.food.row + 1, 0xc2b2ae35) ^
    Math.imul(length, 0x27d4eb2f);

  return ((mixed >>> 8) % SPREAD) / SPREAD > RESTLESS;
};

const ROOM_BUDGET = 3;
const TIGHT = 1.25;
const NEAR = 3;

const spotOf = <B>(board: Board.Grid<B>, cell: Board.Cell<B>): number =>
  cell.row * board.cols + cell.col;

const taken = <B>(world: World.Type<B>, board: Board.Grid<B>): Uint8Array => {
  const held = new Uint8Array(board.cols * board.rows);

  for (const [, player] of Players.everyone(world.players)) {
    for (const cell of Snake.segments(player.snake)) held[spotOf(board, cell)] = 1;
  }

  return held;
};

const roomAt = <B>(
  api: Board.Api<B>,
  board: Board.Grid<B>,
  held: Uint8Array,
  from: Board.Cell<B>,
  budget: number,
): number => {
  const seen = new Uint8Array(board.cols * board.rows);
  const queue: Board.Cell<B>[] = [from];

  seen[spotOf(board, from)] = 1;

  let counted = 0;

  while (queue.length > 0 && counted < budget) {
    const cell = queue.pop();

    if (cell === undefined) break;

    counted += 1;

    for (const heading of Geometry.DIRECTIONS) {
      const step = api.move(cell, heading);

      if (step.kind === Snake.HIT_WALL) continue;

      const spot = spotOf(board, step.cell);

      if (seen[spot] === 1 || held[spot] === 1) continue;

      seen[spot] = 1;
      queue.push(step.cell);
    }
  }

  return counted;
};

const gap = <B>(a: Board.Cell<B>, b: Board.Cell<B>): number =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row);

type Rival<B> = {
  readonly head: Board.Cell<B>;
  readonly reach: number;
  readonly length: number;
  readonly steps: readonly Board.Cell<B>[];
};

const stepsFor = <B>(
  api: Board.Api<B>,
  board: Board.Grid<B>,
  held: Uint8Array,
  player: Player.Type<B>,
): readonly Board.Cell<B>[] =>
  Geometry.DIRECTIONS.flatMap((heading) => {
    if (!Turns.accept(player.turns, player.snake.facing, heading).some) return [];

    const step = api.move(player.snake.head, heading);

    if (step.kind === Snake.HIT_WALL) return [];
    if (held[spotOf(board, step.cell)] === 1) return [];

    return [step.cell];
  });

const rivalsOf = <B>(
  api: Board.Api<B>,
  board: Board.Grid<B>,
  held: Uint8Array,
  world: World.Type<B>,
  who: Players.Id,
): readonly Rival<B>[] =>
  Players.everyone(world.players).flatMap(([other, player]) =>
    other === who || !player.alive
      ? []
      : [
          {
            head: player.snake.head,
            reach: gap(player.snake.head, world.food),
            length: Snake.length(player.snake),
            steps: stepsFor(api, board, held, player),
          },
        ],
  );

const shared = <B>(rivals: readonly Rival<B>[], cell: Board.Cell<B>): boolean =>
  rivals.some((rival) => rival.steps.some((step) => Board.equals(step, cell)));

const REACH = 2;

const escapesFrom = <B>(
  api: Board.Api<B>,
  board: Board.Grid<B>,
  held: Uint8Array,
  rivals: readonly Rival<B>[],
  from: Board.Cell<B>,
  facing: Geometry.Direction,
): number =>
  Geometry.DIRECTIONS.reduce((count, heading) => {
    if (Geometry.isReverse(facing, heading)) return count;

    const step = api.move(from, heading);

    if (step.kind === Snake.HIT_WALL) return count;
    if (held[spotOf(board, step.cell)] === 1) return count;

    const hunted = rivals.some((rival) => gap(rival.head, step.cell) <= REACH);

    return hunted ? count : count + 1;
  }, 0);

const crowding = <B>(rivals: readonly Rival<B>[], cell: Board.Cell<B>): number =>
  rivals.reduce((most, rival) => Math.max(most, Math.max(0, NEAR - gap(rival.head, cell))), 0);

const nearest = <B>(rivals: readonly Rival<B>[]): Option.Type<Rival<B>> =>
  rivals.reduce<Option.Type<Rival<B>>>(
    (best, rival) => (best.some && best.value.reach <= rival.reach ? best : Option.some(rival)),
    Option.none,
  );

export const stanceFor = <B>(
  world: World.Type<B>,
  who: Players.Id,
  rivals: readonly Rival<B>[],
  room: number,
  length: number,
): Stance => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some) return PATIENT;

  if (room < length * TIGHT) return PATIENT;

  const closest = nearest(rivals);

  if (!closest.some) return HUNGRY;

  const mine = gap(sitting.value.snake.head, world.food);

  if (mine < closest.value.reach) return HUNGRY;
  if (mine > closest.value.reach) return PUSHY;

  return length > closest.value.length ? PUSHY : PATIENT;
};

export type Look<B> = {
  readonly heading: Geometry.Direction;
  readonly cell: Board.Cell<B>;
  readonly room: number;
  readonly contested: boolean;
  readonly escapes: number;
  readonly holds: boolean;
};

type Reading<B> = {
  readonly board: Board.Grid<B>;
  readonly held: Uint8Array;
  readonly rivals: readonly Rival<B>[];
  readonly looks: readonly Look<B>[];
  readonly length: number;
  readonly budget: number;
};

const readBoard = <B>(
  api: Board.Api<B>,
  world: World.Type<B>,
  player: Player.Type<B>,
  who: Players.Id,
): Reading<B> => {
  const board = world.board;
  const held = taken(world, board);
  const rivals = rivalsOf(api, board, held, world, who);
  const length = Snake.length(player.snake);
  const budget = Math.max(length * ROOM_BUDGET, board.cols + board.rows);

  const facing = Turns.facingAfter(player.turns, player.snake.facing);

  const looks = Geometry.DIRECTIONS.flatMap((heading): readonly Look<B>[] => {
    const holds = heading === facing;

    if (!holds && !Turns.accept(player.turns, player.snake.facing, heading).some) return [];

    const step = api.move(player.snake.head, heading);

    if (step.kind === Snake.HIT_WALL) return [];
    if (held[spotOf(board, step.cell)] === 1) return [];

    return [
      {
        heading,
        cell: step.cell,
        room: roomAt(api, board, held, step.cell, budget),
        contested: shared(rivals, step.cell),
        escapes: escapesFrom(api, board, held, rivals, step.cell, heading),
        holds,
      },
    ];
  });

  return { board, held, rivals, looks, length, budget };
};

export const looksFor = <B>(
  api: Board.Api<B>,
  world: World.Type<B>,
  who: Players.Id,
): readonly Look<B>[] => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some || !sitting.value.alive) return [];

  return readBoard(api, world, sitting.value, who).looks;
};

export const choose = <B>(
  api: Board.Api<B>,
  world: World.Type<B>,
  who: Players.Id,
): Option.Type<Geometry.Direction> => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some || !sitting.value.alive) return Option.none;

  const player = sitting.value;
  const read = readBoard(api, world, player, who);
  const { board, rivals, looks, length, budget } = read;

  if (looks.length === 0) return Option.none;

  const widest = looks.reduce((most, look) => Math.max(most, look.room), 0);
  const stance = stanceFor(world, who, rivals, widest, length);
  const weights = WEIGHING[stance];
  const rival = nearest(rivals);
  const span = board.cols + board.rows;
  const weaving = restless(world, who, length);

  const roomy = looks.filter((look) => !look.contested && look.room >= length);
  const safe = roomy.filter((look) => look.escapes > 0);
  const open = safe.length > 0 ? safe : roomy;
  const loose = open.length > 0 ? open : looks.filter((look) => !look.contested);
  const wanted = loose.length > 0 ? loose : looks;

  let picked: Option.Type<Geometry.Direction> = Option.none;
  let best = Number.NEGATIVE_INFINITY;

  const standing = gap(player.snake.head, world.food);

  for (const look of wanted) {
    const room = look.room;
    const reach = Math.sign(standing - gap(look.cell, world.food));
    const spare = Math.min(1, room / Math.max(1, budget));
    const cutting = rival.some
      ? 1 - (gap(look.cell, world.food) + gap(look.cell, rival.value.head)) / (span * 2)
      : 0;

    const worth =
      reach * weights.food +
      spare * weights.room +
      cutting * weights.deny -
      (crowding(rivals, look.cell) / NEAR) * weights.keepOff +
      (look.holds && !weaving ? weights.hold : 0);

    if (worth > best) {
      best = worth;
      picked = look.holds ? Option.none : Option.some(look.heading);
    }
  }

  return picked;
};
