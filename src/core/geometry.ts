export const UP = "up";
export const DOWN = "down";
export const LEFT = "left";
export const RIGHT = "right";

export type Direction = typeof UP | typeof DOWN | typeof LEFT | typeof RIGHT;

export const DIRECTIONS: readonly Direction[] = [UP, DOWN, LEFT, RIGHT];

const OPPOSITE = {
  [UP]: DOWN,
  [DOWN]: UP,
  [LEFT]: RIGHT,
  [RIGHT]: LEFT,
} as const satisfies Record<Direction, Direction>;

export const isReverse = (from: Direction, to: Direction): boolean => OPPOSITE[from] === to;
