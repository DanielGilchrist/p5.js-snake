import * as Assert from "./assert";
import * as Controls from "./controls";
import * as Game from "./game";
import type * as Geometry from "./geometry";
import * as Option from "./option";
import * as Players from "./players";

const PAUSE = "p";
const SKIP = "Enter";
const MENU = "S";
const HELP = "?";
const FREEZE = "P";

export type Key =
  | { readonly kind: "turn"; readonly seat: number; readonly direction: Geometry.Direction }
  | { readonly kind: "pause" }
  | { readonly kind: "skip" }
  | { readonly kind: "menu" }
  | { readonly kind: "help" }
  | { readonly kind: "freeze" }
  | { readonly kind: "other" };

export const turn = (seat: number, direction: Geometry.Direction): Key => ({
  kind: "turn",
  seat,
  direction,
});

export const pause = { kind: "pause" } as const;

const skip = { kind: "skip" } as const;

const menu = { kind: "menu" } as const;

const help = { kind: "help" } as const;

const freeze = { kind: "freeze" } as const;

export const other = { kind: "other" } as const;

export const parseKey = (raw: string, assignment: Controls.Assignment = Controls.shared): Key => {
  const turning = Controls.turnFrom(assignment, Controls.key(raw));

  if (turning.some) return turn(turning.value.seat, turning.value.direction);
  if (raw === PAUSE) return pause;
  if (raw === SKIP) return skip;
  if (raw === MENU) return menu;
  if (raw === HELP) return help;
  if (raw === FREEZE) return freeze;

  return other;
};

export type Rules = {
  readonly driving: readonly Players.Id[];
  readonly suspendable: boolean;
};

export const ALONE: Rules = { driving: [Players.FIRST], suspendable: true };

export const sharing = (players: number): Rules => ({
  driving: Array.from({ length: players }, (_, seat) => Players.id(seat)),
  suspendable: true,
});

export const away = (mine: Players.Id): Rules => ({ driving: [mine], suspendable: false });

export const waiting = (mine: Players.Id): Rules => ({ driving: [mine], suspendable: true });

const drivenBy = (rules: Rules, seat: number): Option.Type<Players.Id> => {
  const who = rules.driving[seat];

  return who === undefined ? Option.none : Option.some(who);
};

export const commandFor = <B>(
  state: Game.State<B>,
  key: Key,
  rules: Rules = ALONE,
): Option.Type<Game.Command> => {
  if (state.kind === "over") return Option.some(Game.restart);

  switch (key.kind) {
    case "turn": {
      const who = drivenBy(rules, key.seat);

      return who.some ? Option.some(Game.turn(who.value, key.direction)) : Option.none;
    }
    case "pause":
      return rules.suspendable ? Option.some(Game.togglePause) : Option.none;
    case "skip":
    case "menu":
    case "help":
    case "freeze":
    case "other":
      return Option.none;
    default:
      return Assert.never(key);
  }
};
