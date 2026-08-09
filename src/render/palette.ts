import type { Brand } from "../core/brand";
import type { Variant } from "../core/game";

export type Rgb = readonly [number, number, number];

export type Tint = Brand<number, "Tint">;

export const tint = (n: number): Tint => n as Tint;

export const BACKGROUND: Rgb = [30, 35, 45];
export const WALL: Rgb = [30, 35, 45];
export const FLOOR: Rgb = [45, 55, 75];
export const SNAKE: Rgb = [76, 175, 80];
export const FOOD: Rgb = [244, 67, 54];

const TINT_RANGE = 10;

export const shift = (colour: Rgb, by: Tint): Rgb => [
  colour[0] + by,
  colour[1] + by,
  colour[2] + by,
];

export const floorTint = (variant: Variant): Tint =>
  tint((variant % (TINT_RANGE * 2)) - TINT_RANGE);
