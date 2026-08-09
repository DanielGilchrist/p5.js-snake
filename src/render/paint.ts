import type p5 from "p5";

import type * as Brand from "../core/brand";
import type * as Palette from "./palette";

export type Alpha = Brand.Of<number, "Alpha">;

export const alpha = (n: number): Alpha => n as Alpha;

export const OPAQUE = alpha(255);

export const fill = (p: p5, colour: Palette.Rgb): void => {
  p.fill(colour.red, colour.green, colour.blue);
};

export const fillWith = (p: p5, colour: Palette.Rgb, opacity: Alpha): void => {
  p.fill(colour.red, colour.green, colour.blue, opacity);
};

export const stroke = (p: p5, colour: Palette.Rgb): void => {
  p.stroke(colour.red, colour.green, colour.blue);
};
