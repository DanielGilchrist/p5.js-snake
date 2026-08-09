export type Rgb = readonly [number, number, number];

export interface Point {
  x: number;
  y: number;
}

export interface Drawable {
  draw(): void;
}

export const pointKey = (point: Point): string => `${point.x},${point.y}`;
