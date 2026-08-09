import type * as Brand from "../core/brand";

export type Px = Brand.Of<number, "Px">;

export const px = (n: number): Px => n as Px;

export type Point = { readonly x: Px; readonly y: Px };

export type Offset = { readonly dx: Px; readonly dy: Px };

export type Viewport = { readonly width: Px; readonly height: Px };

export type Millis = Brand.Of<number, "Millis">;

export const millis = (n: number): Millis => n as Millis;

export const shiftBy = (point: Point, offset: Offset): Point => ({
  x: px(point.x + offset.dx),
  y: px(point.y + offset.dy),
});
