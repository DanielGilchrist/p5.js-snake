import type * as Board from "./board";
import * as Assert from "./assert";
import type * as Geometry from "./geometry";
import type * as Option from "./option";
import * as Player from "./player";
import * as Players from "./players";
import type * as Rng from "./rng";
import * as Snake from "./snake";
import type * as Turns from "./turns";
import * as World from "./world";

export const TURNED = "turned";
export const QUEUED = "queued";
export const MOVED = "moved";
export const GREW = "grew";
export const SCORED = "scored";
export const DIED = "died";
export const FED = "fed";
export const ROLLED = "rolled";
export const PAUSED = "paused";
export const RESUMED = "resumed";
export const ENDED = "ended";

type Change<B> =
  | {
      readonly kind: typeof TURNED;
      readonly player: Players.Id;
      readonly from: Geometry.Direction;
      readonly to: Geometry.Direction;
    }
  | {
      readonly kind: typeof QUEUED;
      readonly player: Players.Id;
      readonly from: Turns.Queue;
      readonly to: Turns.Queue;
    }
  | {
      readonly kind: typeof MOVED;
      readonly player: Players.Id;
      readonly to: Board.Cell<B>;
      readonly dropped: Option.Type<Board.Cell<B>>;
    }
  | { readonly kind: typeof GREW; readonly player: Players.Id }
  | { readonly kind: typeof SCORED; readonly player: Players.Id; readonly at: Board.Cell<B> }
  | { readonly kind: typeof DIED; readonly player: Players.Id; readonly at: Board.Cell<B> }
  | { readonly kind: typeof FED; readonly from: Board.Cell<B>; readonly to: Board.Cell<B> }
  | { readonly kind: typeof ROLLED; readonly from: Rng.State; readonly to: Rng.State };

type Lifecycle =
  | { readonly kind: typeof PAUSED }
  | { readonly kind: typeof RESUMED }
  | { readonly kind: typeof ENDED; readonly ending: World.Ending };

export type Type<B> = Change<B> | Lifecycle;

export const turned = <B>(
  player: Players.Id,
  of: Player.Type<B>,
  to: Geometry.Direction,
): Type<B> => ({ kind: TURNED, player, from: of.snake.facing, to });

export const queued = <B>(player: Players.Id, of: Player.Type<B>, to: Turns.Queue): Type<B> => ({
  kind: QUEUED,
  player,
  from: of.turns,
  to,
});

export const moved = <B>(
  player: Players.Id,
  to: Board.Cell<B>,
  dropped: Option.Type<Board.Cell<B>>,
): Type<B> => ({ kind: MOVED, player, to, dropped });

export const grew = (player: Players.Id) => ({ kind: GREW, player }) as const;

export const scored = <B>(player: Players.Id, at: Board.Cell<B>): Type<B> => ({
  kind: SCORED,
  player,
  at,
});

export const died = <B>(player: Players.Id, at: Board.Cell<B>): Type<B> => ({
  kind: DIED,
  player,
  at,
});

export const fed = <B>(world: World.Type<B>, to: Board.Cell<B>): Type<B> => ({
  kind: FED,
  from: world.food,
  to,
});

export const rolled = <B>(world: World.Type<B>, to: Rng.State): Type<B> => ({
  kind: ROLLED,
  from: world.rng,
  to,
});

export const ended = (ending: World.Ending) => ({ kind: ENDED, ending }) as const;

export const paused = { kind: PAUSED } as const;

export const resumed = { kind: RESUMED } as const;

const shifting = <B>(
  world: World.Type<B>,
  who: Players.Id,
  next: (player: Player.Type<B>) => Player.Type<B>,
): World.Type<B> => World.withPlayers(world, Players.change(world.players, who, next));

export const forward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case TURNED:
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.turnTo(player.snake, change.to)),
      );
    case QUEUED:
      return shifting(world, change.player, (player) => Player.withTurns(player, change.to));
    case MOVED:
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.moveTo(player.snake, change.to, change.dropped)),
      );
    case GREW:
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.grow(player.snake)),
      );
    case SCORED:
      return shifting(world, change.player, (player) => Player.withScore(player, player.score + 1));
    case DIED:
      return shifting(world, change.player, (player) => Player.withLife(player, false));
    case FED:
      return World.withFood(world, change.to);
    case ROLLED:
      return World.withRng(world, change.to);
    default:
      return Assert.never(change);
  }
};

export const backward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case TURNED:
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.turnTo(player.snake, change.from)),
      );
    case QUEUED:
      return shifting(world, change.player, (player) => Player.withTurns(player, change.from));
    case MOVED:
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.moveBack(player.snake, change.dropped)),
      );
    case GREW:
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.shrink(player.snake)),
      );
    case SCORED:
      return shifting(world, change.player, (player) => Player.withScore(player, player.score - 1));
    case DIED:
      return shifting(world, change.player, (player) => Player.withLife(player, true));
    case FED:
      return World.withFood(world, change.from);
    case ROLLED:
      return World.withRng(world, change.from);
    default:
      return Assert.never(change);
  }
};
