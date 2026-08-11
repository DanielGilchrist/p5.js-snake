import * as Board from "../board";
import * as Assert from "../assert";
import type * as Command from "./command";
import * as Event from "../event";
import * as Food from "../food";
import type * as Geometry from "../geometry";
import * as Option from "../option";
import * as Player from "../player";
import * as Players from "../players";
import * as Rng from "../rng";
import * as Snake from "../snake";
import * as Turns from "../turns";
import * as World from "../world";
import * as State from "./state";

const VARIANTS = 20;

export type Mode = { readonly players: number };

export const SOLO: Mode = { players: 1 };

export const PAIR: Mode = { players: 2 };

export const forPlayers = (players: number): Mode => ({ players: Math.max(1, players) });

const facingFrom = <B>(board: Board.Grid<B>, at: Board.Cell<B>): Geometry.Direction =>
  at.col * 2 < board.cols ? "right" : "left";

const seatedFor = <B>(board: Board.Grid<B>, mode: Mode): Players.Type<B> => {
  const places = Board.spawns(board, mode.players);
  const [first, ...rest] = places.map((at) => Player.spawn(at, facingFrom(board, at)));

  return Players.of(first ?? Player.spawn(board.start, "right"), rest);
};

export const start = <B>(board: Board.Grid<B>, rng: Rng.State, mode: Mode): State.Type<B> => {
  const players = seatedFor(board, mode);
  const [drawn, seeded] = Rng.nextInt(rng, VARIANTS);
  const [food, next] = Food.place(board, players, seeded);

  return State.playing({
    world: World.create({
      board,
      players,
      food: Option.getOrElse(food, board.start),
      rng: next,
      variant: World.variant(drawn),
    }),
  });
};

const steer = <B>(
  world: World.Type<B>,
  who: Players.Id,
  direction: Geometry.Direction,
): readonly Event.Type<B>[] => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some || !sitting.value.alive) return [];

  const player = sitting.value;
  const asked = Turns.accept(player.turns, player.snake.facing, direction);

  return asked.some ? [Event.queued(who, player, asked.value)] : [];
};

type Attempt<B> = {
  readonly who: Players.Id;
  readonly turning: readonly Event.Type<B>[];
  readonly before: Snake.State<B>;
  readonly moved: Snake.Advance<B>;
  readonly after: Option.Type<Snake.State<B>>;
};

const attempt = <B>(api: Board.Api<B>, seated: Players.Seated<B>): Attempt<B> => {
  const [who, player] = seated;
  const taken = Turns.next(player.turns);
  const turning = taken.some
    ? [
        Event.turned(who, player, taken.value),
        Event.queued(who, player, Turns.afterFirst(player.turns)),
      ]
    : [];
  const before = taken.some ? Snake.turnTo(player.snake, taken.value) : player.snake;
  const moved = Snake.tryMove(api, before);

  return {
    who,
    turning,
    before,
    moved,
    after:
      moved.kind === "hitWall"
        ? Option.none
        : Option.some(Snake.moveTo(before, moved.to, moved.dropped)),
  };
};

const crashed = <B>(mover: Snake.State<B>, others: readonly Snake.State<B>[]): boolean =>
  Snake.hitsItself(mover) || others.some((body) => Snake.occupies(body, mover.head));

const deathsAmong = <B>(attempts: readonly Attempt<B>[]): readonly Event.Type<B>[] =>
  attempts.flatMap((each) => {
    if (!each.after.some) return [Event.died(each.who, each.before.head)];

    const others = attempts.flatMap((other) =>
      other.who === each.who || !other.after.some ? [] : [other.after.value],
    );

    return crashed(each.after.value, others) ? [Event.died(each.who, each.after.value.head)] : [];
  });

const settled = <B>(players: Players.Type<B>, attempts: readonly Attempt<B>[]): Players.Type<B> =>
  attempts.reduce((carried, each) => {
    const { after } = each;

    if (!after.some) return carried;

    return Players.change(carried, each.who, (player) => Player.withSnake(player, after.value));
  }, players);

const feed = <B>(
  world: World.Type<B>,
  players: Players.Type<B>,
  who: Players.Id,
  at: Board.Cell<B>,
): readonly Event.Type<B>[] => {
  const [next, rng] = Food.place(world.board, players, world.rng);
  const rolled = Event.rolled(world, rng);

  if (next.some) {
    return [Event.grew(who), Event.scored(who, at), Event.fed(world, next.value), rolled];
  }

  return [Event.grew(who), Event.scored(who, at), rolled, Event.ended("filled")];
};

const lastAlone = <B>(world: World.Type<B>, deaths: readonly Event.Type<B>[]): boolean => {
  const dying = new Set(deaths.flatMap((event) => (event.kind === "died" ? [event.player] : [])));
  const left = Players.living(world.players).filter((who) => !dying.has(who));

  return left.length <= 1;
};

const tick = <B>(api: Board.Api<B>, world: World.Type<B>): readonly Event.Type<B>[] => {
  const playing = Players.everyone(world.players).filter(([, player]) => player.alive);
  const attempts = playing.map((seated) => attempt(api, seated));
  const turning = attempts.flatMap((each) => each.turning);
  const motion = attempts.flatMap((each) =>
    each.moved.kind === "moved" ? [Event.moved(each.who, each.moved.to, each.moved.dropped)] : [],
  );
  const deaths = deathsAmong(attempts);

  if (deaths.length > 0) {
    const closing = lastAlone(world, deaths) ? [Event.ended("collision")] : [];

    return [...turning, ...motion, ...deaths, ...closing];
  }

  const eating = attempts.find(
    (each) => each.after.some && Board.equals(each.after.value.head, world.food),
  );

  if (eating === undefined || !eating.after.some) return [...turning, ...motion];

  return [
    ...turning,
    ...motion,
    ...feed(world, settled(world.players, attempts), eating.who, eating.after.value.head),
  ];
};

export const decide = <B>(
  api: Board.Api<B>,
  state: State.Type<B>,
  command: Command.Type,
): readonly Event.Type<B>[] => {
  switch (command.kind) {
    case "tick":
      return state.kind === "playing" ? tick(api, state.world) : [];

    case "turn":
      return state.kind === "playing" ? steer(state.world, command.player, command.direction) : [];

    case "togglePause":
      switch (state.kind) {
        case "playing":
          return [Event.paused];
        case "paused":
          return [Event.resumed];
        case "over":
          return [];
        default:
          return Assert.never(state);
      }

    case "restart":
      return [];

    default:
      return Assert.never(command);
  }
};
