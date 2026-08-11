import type * as Board from "./board";
import type * as Geometry from "./geometry";
import * as Snake from "./snake";
import * as Turns from "./turns";

export type Type<B> = {
  readonly snake: Snake.State<B>;
  readonly score: number;
  readonly turns: Turns.Queue;
  readonly alive: boolean;
};

export const spawn = <B>(at: Board.Cell<B>, facing: Geometry.Direction): Type<B> => ({
  snake: Snake.spawn(at, facing),
  score: 0,
  turns: Turns.EMPTY,
  alive: true,
});

export const withSnake = <B>(player: Type<B>, snake: Snake.State<B>): Type<B> => ({
  ...player,
  snake,
});

export const withScore = <B>(player: Type<B>, score: number): Type<B> => ({ ...player, score });

export const withTurns = <B>(player: Type<B>, turns: Turns.Queue): Type<B> => ({
  ...player,
  turns,
});

export const withLife = <B>(player: Type<B>, alive: boolean): Type<B> => ({ ...player, alive });
