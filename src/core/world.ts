import type * as Board from "./board";
import type * as Brand from "./brand";
import * as Players from "./players";
import type * as Rng from "./rng";

export type Variant = Brand.Of<number, "Variant">;

export const variant = (n: number): Variant => n as Variant;

export type Ending = "collision" | "filled";

export type Outcome = { readonly ending: Ending };

export const outcome = (ending: Ending): Outcome => ({ ending });

export type Type<B> = {
  readonly board: Board.Grid<B>;
  readonly players: Players.Type<B>;
  readonly food: Board.Cell<B>;
  readonly rng: Rng.State;
  readonly variant: Variant;
};

export const create = <B>(fields: Type<B>): Type<B> => ({ ...fields });

const FACINGS = ["up", "down", "left", "right"] as const;

export const fingerprint = <B>(world: Type<B>): number => {
  let mark = 17;

  const mix = (n: number): void => {
    mark = Math.imul(mark, 31) + n;
    mark |= 0;
  };

  mix(world.food.col);
  mix(world.food.row);

  for (const [, player] of Players.everyone(world.players)) {
    mix(player.score);
    mix(player.alive ? 1 : 0);
    mix(player.snake.head.col);
    mix(player.snake.head.row);
    mix(player.snake.tail.length);
    mix(player.snake.growth);
    mix(FACINGS.indexOf(player.snake.facing));
  }

  return mark;
};

export const withPlayers = <B>(world: Type<B>, players: Players.Type<B>): Type<B> => ({
  ...world,
  players,
});

export const withFood = <B>(world: Type<B>, food: Board.Cell<B>): Type<B> => ({ ...world, food });

export const withRng = <B>(world: Type<B>, rng: Rng.State): Type<B> => ({ ...world, rng });
