import type p5 from "p5";

import * as Option from "../core/option";
import type * as Palette from "./palette";
import * as Units from "./units";

export type Shadow = {
  readonly blur: number;
  readonly drop: Units.Px;
  readonly opacity: number;
};

const shadow = (fields: { blur: number; drop: number; opacity: number }): Shadow => ({
  blur: fields.blur,
  drop: Units.px(fields.drop),
  opacity: fields.opacity,
});

export const RAISED = shadow({ blur: 20, drop: 9, opacity: 0.3 });

const rgba = (colour: Palette.Rgb, opacity: number): string =>
  `rgba(${colour.red}, ${colour.green}, ${colour.blue}, ${opacity})`;

const surfaceOf = (p: p5): Option.Type<CanvasRenderingContext2D> =>
  p.drawingContext instanceof CanvasRenderingContext2D
    ? Option.some(p.drawingContext)
    : Option.none;

const clear = (surface: CanvasRenderingContext2D): void => {
  surface.shadowBlur = 0;
  surface.shadowColor = "transparent";
  surface.shadowOffsetX = 0;
  surface.shadowOffsetY = 0;
};

export const cast = (p: p5, of: Shadow, colour: Palette.Rgb, body: () => void): void => {
  const surface = surfaceOf(p);

  if (!surface.some) {
    body();

    return;
  }

  surface.value.shadowBlur = of.blur;
  surface.value.shadowColor = rgba(colour, of.opacity);
  surface.value.shadowOffsetX = 0;
  surface.value.shadowOffsetY = of.drop;

  body();

  clear(surface.value);
};

export const surround = (p: p5, colour: Palette.Rgb, strength: number): void => {
  const surface = surfaceOf(p);

  if (!surface.some) return;

  const middle = Units.point(p.width / 2, p.height / 2);
  const wash = surface.value.createRadialGradient(
    middle.x,
    middle.y,
    Math.min(p.width, p.height) * 0.28,
    middle.x,
    middle.y,
    Math.max(p.width, p.height) * 0.72,
  );

  wash.addColorStop(0, rgba(colour, 0));
  wash.addColorStop(1, rgba(colour, strength));

  surface.value.fillStyle = wash;
  surface.value.fillRect(0, 0, p.width, p.height);
};
