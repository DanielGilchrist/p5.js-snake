import type * as Brand from "../core/brand";
import type * as Game from "../core/game";

export type Rgb = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
};

export type Tint = Brand.Of<number, "Tint">;

export const tint = (n: number): Tint => n as Tint;

const rgb = (red: number, green: number, blue: number): Rgb => ({ red, green, blue });

export const BACKGROUND: Rgb = rgb(30, 35, 45);
export const WALL: Rgb = rgb(30, 35, 45);
export const FLOOR: Rgb = rgb(45, 55, 75);
export const SNAKE: Rgb = rgb(76, 175, 80);
export const FOOD: Rgb = rgb(244, 67, 54);
export const TEXT: Rgb = rgb(220, 220, 220);
export const INK: Rgb = rgb(0, 0, 0);
export const PAPER: Rgb = rgb(255, 255, 255);

const TINT_RANGE = 10;

export const shift = (colour: Rgb, by: Tint): Rgb =>
  rgb(colour.red + by, colour.green + by, colour.blue + by);

export const floorTint = (variant: Game.Variant): Tint =>
  tint((variant % (TINT_RANGE * 2)) - TINT_RANGE);
