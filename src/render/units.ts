import type * as Brand from "../core/brand";

export type Px = Brand.Of<number, "Px">;

export const px = (n: number): Px => n as Px;

export type Millis = Brand.Of<number, "Millis">;

export const millis = (n: number): Millis => n as Millis;

export type Point = { readonly x: Px; readonly y: Px };

export const point = (x: number, y: number): Point => ({ x: px(x), y: px(y) });

export type Offset = { readonly dx: Px; readonly dy: Px };

export const offset = (dx: number, dy: number): Offset => ({ dx: px(dx), dy: px(dy) });

export const NO_OFFSET = offset(0, 0);

export type Viewport = { readonly width: Px; readonly height: Px };

export type Region = {
  readonly left: Px;
  readonly top: Px;
  readonly width: Px;
  readonly height: Px;
};

export const region = (fields: {
  left: number;
  top: number;
  width: number;
  height: number;
}): Region => ({
  left: px(fields.left),
  top: px(fields.top),
  width: px(fields.width),
  height: px(fields.height),
});

export const sizeOf = (of: Region): Viewport => viewport(of.width, of.height);

export const viewport = (width: number, height: number): Viewport => ({
  width: px(width),
  height: px(height),
});

export const shiftBy = (from: Point, by: Offset): Point => point(from.x + by.dx, from.y + by.dy);
