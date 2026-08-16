import * as Geometry from "../core/geometry";
import * as Input from "../core/input";
import * as Phase from "./phase";

export const NOTHING = "nothing";
export const READY_UP = "readyUp";
export const OPEN_SETTINGS = "openSettings";
export const OPEN_HELP = "openHelp";
export const RESUME = "resume";
export const FREEZE = "freeze";
export const MOVE_CURSOR = "moveCursor";
export const CYCLE_SETTING = "cycleSetting";
export const PICK_ROW = "pickRow";
export const PRESS = "press";

export type Intent =
  | { readonly kind: typeof NOTHING }
  | { readonly kind: typeof READY_UP }
  | { readonly kind: typeof OPEN_SETTINGS }
  | { readonly kind: typeof OPEN_HELP }
  | { readonly kind: typeof RESUME }
  | { readonly kind: typeof FREEZE }
  | { readonly kind: typeof MOVE_CURSOR; readonly by: number }
  | { readonly kind: typeof CYCLE_SETTING; readonly by: number }
  | { readonly kind: typeof PICK_ROW }
  | { readonly kind: typeof PRESS; readonly key: Input.Key };

const nothing = { kind: NOTHING } as const;
const readyUp = { kind: READY_UP } as const;
const openSettings = { kind: OPEN_SETTINGS } as const;
const openHelp = { kind: OPEN_HELP } as const;
const resume = { kind: RESUME } as const;
const freeze = { kind: FREEZE } as const;
const pickRow = { kind: PICK_ROW } as const;

const suspends = (key: Input.Key): boolean =>
  key.kind === Input.FREEZE ||
  key.kind === Input.MENU ||
  key.kind === Input.BACK ||
  key.kind === Input.HELP;

const inSettings = (key: Input.Key): Intent => {
  if (key.kind === Input.HELP) return openHelp;
  if (key.kind === Input.MENU || key.kind === Input.BACK) return resume;
  if (key.kind === Input.SKIP) return pickRow;
  if (key.kind !== Input.TURN) return nothing;
  if (key.direction === Geometry.UP) return { kind: MOVE_CURSOR, by: -1 };
  if (key.direction === Geometry.DOWN) return { kind: MOVE_CURSOR, by: 1 };

  return { kind: CYCLE_SETTING, by: key.direction === Geometry.RIGHT ? 1 : -1 };
};

export const forKey = <B>(phase: Phase.Phase<B>, key: Input.Key, suspendable: boolean): Intent => {
  if (phase === Phase.READY) {
    if (key.kind === Input.MENU) return openSettings;
    if (key.kind === Input.HELP) return openHelp;
    if (key.kind === Input.BACK) return nothing;

    return readyUp;
  }

  if (!suspendable && suspends(key)) return nothing;

  if (key.kind === Input.FREEZE) return phase === Phase.FROZEN ? resume : freeze;

  if (phase === Phase.FROZEN) return nothing;

  if (phase === Phase.HELP) return key.kind === Input.MENU ? openSettings : resume;

  if (Phase.isSettings(phase)) return inSettings(key);

  if (key.kind === Input.MENU || key.kind === Input.BACK) return openSettings;
  if (key.kind === Input.HELP) return openHelp;

  return { kind: PRESS, key };
};
