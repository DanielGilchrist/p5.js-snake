import type * as Brand from "../core/brand";
import type * as World from "../core/world";

export type Rgb = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
};

export type Tint = Brand.Of<number, "Tint">;

const tint = (n: number): Tint => n as Tint;

export const rgb = (red: number, green: number, blue: number): Rgb => ({ red, green, blue });

export const BACKGROUND: Rgb = rgb(196, 184, 168);
export const WALL: Rgb = rgb(201, 185, 164);
export const FLOOR: Rgb = rgb(233, 225, 210);
export const SNAKE: Rgb = rgb(122, 150, 116);
export const SNAKE_DEEP: Rgb = rgb(96, 122, 92);
export const FOOD: Rgb = rgb(203, 104, 82);
export const FOOD_DEEP: Rgb = rgb(170, 80, 62);
export const TEXT: Rgb = rgb(84, 68, 55);
export const INK: Rgb = rgb(72, 58, 46);
export const SHADOW: Rgb = rgb(104, 84, 66);
export const PAPER: Rgb = rgb(251, 246, 238);
export const DUST: Rgb = rgb(224, 210, 190);
export const PLUM: Rgb = rgb(141, 95, 116);
export const PLUM_DEEP: Rgb = rgb(112, 72, 92);
export const BERRY: Rgb = rgb(172, 84, 78);
export const BERRY_DEEP: Rgb = rgb(140, 63, 59);
export const OCHRE: Rgb = rgb(198, 154, 84);
export const OCHRE_DEEP: Rgb = rgb(166, 124, 62);
export const LEAF: Rgb = rgb(143, 160, 106);
export const STEM: Rgb = rgb(112, 89, 66);

const TINT_RANGE = 6;

export const shift = (colour: Rgb, by: Tint): Rgb =>
  rgb(colour.red + by, colour.green + by, colour.blue + by);

export const floorTint = (variant: World.Variant): Tint =>
  tint((variant % (TINT_RANGE * 2)) - TINT_RANGE);
