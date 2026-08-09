export type Direction = "up" | "down" | "left" | "right";

const OPPOSITE = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
} as const satisfies Record<Direction, Direction>;

export const isReverse = (from: Direction, to: Direction): boolean => OPPOSITE[from] === to;
