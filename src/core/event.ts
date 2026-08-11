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

type Change<B> =
  | {
      readonly kind: "turned";
      readonly player: Players.Id;
      readonly from: Geometry.Direction;
      readonly to: Geometry.Direction;
    }
  | {
      readonly kind: "queued";
      readonly player: Players.Id;
      readonly from: Turns.Queue;
      readonly to: Turns.Queue;
    }
  | {
      readonly kind: "moved";
      readonly player: Players.Id;
      readonly to: Board.Cell<B>;
      readonly dropped: Option.Type<Board.Cell<B>>;
    }
  | { readonly kind: "grew"; readonly player: Players.Id }
  | { readonly kind: "scored"; readonly player: Players.Id; readonly at: Board.Cell<B> }
  | { readonly kind: "died"; readonly player: Players.Id; readonly at: Board.Cell<B> }
  | { readonly kind: "fed"; readonly from: Board.Cell<B>; readonly to: Board.Cell<B> }
  | { readonly kind: "rolled"; readonly from: Rng.State; readonly to: Rng.State };

type Lifecycle =
  | { readonly kind: "paused" }
  | { readonly kind: "resumed" }
  | { readonly kind: "ended"; readonly ending: World.Ending };

export type Type<B> = Change<B> | Lifecycle;

export const turned = <B>(
  player: Players.Id,
  of: Player.Type<B>,
  to: Geometry.Direction,
): Type<B> => ({ kind: "turned", player, from: of.snake.facing, to });

export const queued = <B>(player: Players.Id, of: Player.Type<B>, to: Turns.Queue): Type<B> => ({
  kind: "queued",
  player,
  from: of.turns,
  to,
});

export const moved = <B>(
  player: Players.Id,
  to: Board.Cell<B>,
  dropped: Option.Type<Board.Cell<B>>,
): Type<B> => ({ kind: "moved", player, to, dropped });

export const grew = (player: Players.Id) => ({ kind: "grew", player }) as const;

export const scored = <B>(player: Players.Id, at: Board.Cell<B>): Type<B> => ({
  kind: "scored",
  player,
  at,
});

export const died = <B>(player: Players.Id, at: Board.Cell<B>): Type<B> => ({
  kind: "died",
  player,
  at,
});

export const fed = <B>(world: World.Type<B>, to: Board.Cell<B>): Type<B> => ({
  kind: "fed",
  from: world.food,
  to,
});

export const rolled = <B>(world: World.Type<B>, to: Rng.State): Type<B> => ({
  kind: "rolled",
  from: world.rng,
  to,
});

export const ended = (ending: World.Ending) => ({ kind: "ended", ending }) as const;

export const paused = { kind: "paused" } as const;

export const resumed = { kind: "resumed" } as const;

const shifting = <B>(
  world: World.Type<B>,
  who: Players.Id,
  next: (player: Player.Type<B>) => Player.Type<B>,
): World.Type<B> => World.withPlayers(world, Players.change(world.players, who, next));

export const forward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case "turned":
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.turnTo(player.snake, change.to)),
      );
    case "queued":
      return shifting(world, change.player, (player) => Player.withTurns(player, change.to));
    case "moved":
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.moveTo(player.snake, change.to, change.dropped)),
      );
    case "grew":
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.grow(player.snake)),
      );
    case "scored":
      return shifting(world, change.player, (player) => Player.withScore(player, player.score + 1));
    case "died":
      return shifting(world, change.player, (player) => Player.withLife(player, false));
    case "fed":
      return World.withFood(world, change.to);
    case "rolled":
      return World.withRng(world, change.to);
    default:
      return Assert.never(change);
  }
};

export const backward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case "turned":
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.turnTo(player.snake, change.from)),
      );
    case "queued":
      return shifting(world, change.player, (player) => Player.withTurns(player, change.from));
    case "moved":
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.moveBack(player.snake, change.dropped)),
      );
    case "grew":
      return shifting(world, change.player, (player) =>
        Player.withSnake(player, Snake.shrink(player.snake)),
      );
    case "scored":
      return shifting(world, change.player, (player) => Player.withScore(player, player.score - 1));
    case "died":
      return shifting(world, change.player, (player) => Player.withLife(player, true));
    case "fed":
      return World.withFood(world, change.from);
    case "rolled":
      return World.withRng(world, change.from);
    default:
      return Assert.never(change);
  }
};
