import * as Assert from "./assert";
import * as Controls from "./controls";
import * as Game from "./game";
import type * as Geometry from "./geometry";
import * as Option from "./option";
import * as Players from "./players";

export const TURN = "turn";
export const PAUSE = "pause";
export const SKIP = "skip";
export const MENU = "menu";
export const BACK = "back";
export const HELP = "help";
export const FREEZE = "freeze";
export const OTHER = "other";

export type Key =
  | { readonly kind: typeof TURN; readonly seat: number; readonly direction: Geometry.Direction }
  | { readonly kind: typeof PAUSE }
  | { readonly kind: typeof SKIP }
  | { readonly kind: typeof MENU }
  | { readonly kind: typeof BACK }
  | { readonly kind: typeof HELP }
  | { readonly kind: typeof FREEZE }
  | { readonly kind: typeof OTHER };

export const turn = (seat: number, direction: Geometry.Direction): Key => ({
  kind: TURN,
  seat,
  direction,
});

export const pause = { kind: PAUSE } as const;

const skip = { kind: SKIP } as const;

const menu = { kind: MENU } as const;

const back = { kind: BACK } as const;

const help = { kind: HELP } as const;

const freeze = { kind: FREEZE } as const;

export const other = { kind: OTHER } as const;

const SPECIALS = new Map<string, Key>([
  ["p", pause],
  ["Enter", skip],
  ["S", menu],
  ["Escape", back],
  ["Backspace", back],
  ["?", help],
  ["P", freeze],
]);

export const parseKey = (raw: string, assignment: Controls.Assignment = Controls.shared): Key => {
  const turning = Controls.turnFrom(assignment, Controls.key(raw));

  if (turning.some) return turn(turning.value.seat, turning.value.direction);

  return SPECIALS.get(raw) ?? other;
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
  if (state.kind === Game.OVER) return Option.some(Game.restart);

  switch (key.kind) {
    case TURN: {
      const who = drivenBy(rules, key.seat);

      return who.some ? Option.some(Game.turn(who.value, key.direction)) : Option.none;
    }
    case PAUSE:
      return rules.suspendable ? Option.some(Game.togglePause) : Option.none;
    case SKIP:
    case MENU:
    case BACK:
    case HELP:
    case FREEZE:
    case OTHER:
      return Option.none;
    default:
      return Assert.never(key);
  }
};
