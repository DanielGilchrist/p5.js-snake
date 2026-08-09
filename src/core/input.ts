import * as Assert from "./assert";
import * as Game from "./game";
import type * as Geometry from "./geometry";
import * as Option from "./option";

const BINDINGS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  k: "up",
  j: "down",
  h: "left",
  l: "right",
} as const satisfies Record<string, Geometry.Direction>;

const PAUSE = "p";
const SKIP = "Enter";
const MENU = "s";
const HELP = "?";

type Bound = keyof typeof BINDINGS;

const isBound = (raw: string): raw is Bound => Object.hasOwn(BINDINGS, raw);

export type Key =
  | { readonly kind: "turn"; readonly direction: Geometry.Direction }
  | { readonly kind: "pause" }
  | { readonly kind: "skip" }
  | { readonly kind: "menu" }
  | { readonly kind: "help" }
  | { readonly kind: "other" };

export const turn = (direction: Geometry.Direction): Key => ({ kind: "turn", direction });

export const pause = { kind: "pause" } as const;

const skip = { kind: "skip" } as const;

const menu = { kind: "menu" } as const;

const help = { kind: "help" } as const;

export const other = { kind: "other" } as const;

export const parseKey = (raw: string): Key => {
  if (isBound(raw)) return turn(BINDINGS[raw]);
  if (raw === PAUSE) return pause;
  if (raw === SKIP) return skip;
  if (raw === MENU) return menu;
  if (raw === HELP) return help;

  return other;
};

export const commandFor = <B>(state: Game.State<B>, key: Key): Option.Type<Game.Command> => {
  if (state.kind === "over") return Option.some(Game.restart);

  switch (key.kind) {
    case "turn":
      return Option.some(Game.turn(key.direction));
    case "pause":
      return Option.some(Game.togglePause);
    case "skip":
    case "menu":
    case "help":
    case "other":
      return Option.none;
    default:
      return Assert.never(key);
  }
};
