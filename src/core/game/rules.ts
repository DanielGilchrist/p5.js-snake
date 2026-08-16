import * as Board from "../board";
import * as Assert from "../assert";
import * as Command from "./command";
import * as Event from "../event";
import * as ModeOf from "./mode";
import * as Food from "../food";
import * as Geometry from "../geometry";
import * as Option from "../option";
import * as Player from "../player";
import * as Players from "../players";
import * as Rng from "../rng";
import * as Snake from "../snake";
import * as Turns from "../turns";
import * as World from "../world";
import * as State from "./state";

const VARIANTS = 20;

export type Mode = ModeOf.Type;

export const { SOLO, PAIR, forPlayers } = ModeOf;

const facingFrom = <B>(board: Board.Grid<B>, at: Board.Cell<B>): Geometry.Direction =>
  at.col * 2 < board.cols ? Geometry.RIGHT : Geometry.LEFT;

const placed = <B>(board: Board.Grid<B>, at: Board.Cell<B>, growth: number): Player.Type<B> => {
  const player = Player.spawn(at, facingFrom(board, at));

  return growth === 0 ? player : Player.withSnake(player, Snake.growBy(player.snake, growth));
};

const seatedFor = <B>(board: Board.Grid<B>, mode: Mode): Players.Type<B> => {
  const places = Board.spawns(board, mode.players);
  const [first, ...rest] = places.map((at) => placed(board, at, mode.growth));

  return Players.of(first ?? placed(board, board.start, mode.growth), rest);
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
      mode,
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
      moved.kind === Snake.HIT_WALL
        ? Option.none
        : Option.some(Snake.moveTo(before, moved.to, moved.dropped)),
  };
};

const crashed = <B>(mover: Snake.State<B>, others: readonly Snake.State<B>[]): boolean =>
  Snake.hitsItself(mover) || others.some((body) => Snake.occupies(body, mover.head));

const remains = <B>(players: Players.Type<B>): readonly Snake.State<B>[] =>
  Players.everyone(players).flatMap(([, player]) => (player.alive ? [] : [player.snake]));

const deathsAmong = <B>(
  attempts: readonly Attempt<B>[],
  fallen: readonly Snake.State<B>[],
): readonly Event.Type<B>[] =>
  attempts.flatMap((each) => {
    if (!each.after.some) return [Event.died(each.who, each.before.head)];

    const others = attempts.flatMap((other) =>
      other.who === each.who || !other.after.some ? [] : [other.after.value],
    );

    return crashed(each.after.value, [...others, ...fallen])
      ? [Event.died(each.who, each.after.value.head)]
      : [];
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

  return [Event.grew(who), Event.scored(who, at), rolled, Event.ended(World.FILLED)];
};

const killedBy = <B>(each: Attempt<B>, other: Attempt<B>): boolean =>
  each.after.some && other.after.some && Snake.occupies(other.after.value, each.after.value.head);

const traded = <B>(attempts: readonly Attempt<B>[]): boolean =>
  attempts.some((each) =>
    attempts.some(
      (other) => other.who !== each.who && killedBy(each, other) && killedBy(other, each),
    ),
  );

const standing = <B>(
  world: World.Type<B>,
  deaths: readonly Event.Type<B>[],
): readonly Players.Id[] => {
  const dying = new Set(
    deaths.flatMap((event) => (event.kind === Event.DIED ? [event.player] : [])),
  );

  return Players.living(world.players).filter((who) => !dying.has(who));
};

const closingFor = <B>(
  world: World.Type<B>,
  attempts: readonly Attempt<B>[],
  deaths: readonly Event.Type<B>[],
): readonly Event.Type<B>[] => {
  const left = standing(world, deaths);

  if (left.length > 1) return [];

  return [Event.ended(left.length === 0 && traded(attempts) ? World.TRADED : World.COLLISION)];
};

const tick = <B>(api: Board.Api<B>, world: World.Type<B>): readonly Event.Type<B>[] => {
  const playing = Players.everyone(world.players).filter(([, player]) => player.alive);
  const attempts = playing.map((seated) => attempt(api, seated));
  const turning = attempts.flatMap((each) => each.turning);
  const motion = attempts.flatMap((each) =>
    each.moved.kind === Snake.MOVED
      ? [Event.moved(each.who, each.moved.to, each.moved.dropped)]
      : [],
  );
  const deaths = deathsAmong(attempts, remains(world.players));

  if (deaths.length > 0) {
    return [...turning, ...motion, ...deaths, ...closingFor(world, attempts, deaths)];
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

const dropped = <B>(world: World.Type<B>, who: Players.Id): readonly Event.Type<B>[] => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some || !sitting.value.alive) return [];

  const leaving = [Event.died(who, sitting.value.snake.head)];

  return [...leaving, ...closingFor(world, [], leaving)];
};

export const decide = <B>(
  api: Board.Api<B>,
  state: State.Type<B>,
  command: Command.Type,
): readonly Event.Type<B>[] => {
  switch (command.kind) {
    case Command.TICK:
      return state.kind === State.PLAYING ? tick(api, state.world) : [];

    case Command.DROP:
      return state.kind === State.PLAYING ? dropped(state.world, command.player) : [];

    case Command.TURN:
      return state.kind === State.PLAYING
        ? steer(state.world, command.player, command.direction)
        : [];

    case Command.TOGGLE_PAUSE:
      switch (state.kind) {
        case State.PLAYING:
          return [Event.paused];
        case State.PAUSED:
          return [Event.resumed];
        case State.OVER:
          return [];
        default:
          return Assert.never(state);
      }

    case Command.RESTART:
      return [];

    default:
      return Assert.never(command);
  }
};
