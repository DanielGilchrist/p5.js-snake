import type * as Geometry from "./geometry";
import * as NonEmpty from "./non-empty";
import * as Option from "./option";

export type Signal = { readonly kind: "key"; readonly code: string };

export const key = (code: string): Signal => ({ kind: "key", code });

export type Scheme = {
  readonly name: string;
  readonly reads: (signal: Signal) => Option.Type<Geometry.Direction>;
};

const keyboard = (name: string, keys: Readonly<Record<string, Geometry.Direction>>): Scheme => {
  const bound = new Map(Object.entries(keys));

  return {
    name,
    reads: (signal) => {
      const direction = bound.get(signal.code);

      return direction === undefined ? Option.none : Option.some(direction);
    },
  };
};

export const ARROWS = keyboard("ARROWS", {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
});

export const WASD = keyboard("W A S D", { w: "up", s: "down", a: "left", d: "right" });

export const VIM = keyboard("H J K L", { k: "up", j: "down", h: "left", l: "right" });

export const EVERY: NonEmpty.List<Scheme> = [ARROWS, WASD, VIM];

export type Assignment = NonEmpty.List<NonEmpty.List<Scheme>>;

export const shared: Assignment = [EVERY];

export const between = (schemes: NonEmpty.List<Scheme>): Assignment =>
  NonEmpty.prepend(
    [NonEmpty.head(schemes)] as NonEmpty.List<Scheme>,
    schemes.slice(1).map((scheme): NonEmpty.List<Scheme> => [scheme]),
  );

export const heldBy = (assignment: Assignment, seat: number): NonEmpty.List<Scheme> =>
  NonEmpty.at(assignment, seat % assignment.length);

export const nameOf = (assignment: Assignment, seat: number): string =>
  heldBy(assignment, seat)
    .map((scheme) => scheme.name)
    .join(" / ");

export type Turn = {
  readonly seat: number;
  readonly direction: Geometry.Direction;
};

export const turnFrom = (assignment: Assignment, signal: Signal): Option.Type<Turn> => {
  for (const [seat, schemes] of assignment.entries()) {
    for (const scheme of schemes) {
      const direction = scheme.reads(signal);

      if (direction.some) return Option.some({ seat, direction: direction.value });
    }
  }

  return Option.none;
};
