import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Controls from "../core/controls";
import type * as Input from "../core/input";
import * as Option from "../core/option";
import * as Players from "../core/players";
import * as Render from "../render";
import * as Layout from "../render/layout";
import * as Menu from "../render/menu";
import type * as Palette from "../render/palette";
import * as Panel from "../render/panel";
import * as Settings from "../render/settings";
import * as Units from "../render/units";
import * as Fullscreen from "./fullscreen";
import * as Intent from "./intent";
import * as Phase from "./phase";

export type Deps = {
  readonly stage: () => Units.Region;
  readonly handheld: () => boolean;
  readonly settings: () => Settings.Type;
  readonly scheme: () => Palette.Scheme;
  readonly keep: (settings: Settings.Type) => void;
};

export type Aside = {
  readonly busy: () => boolean;
  readonly show: (phase: Phase.Phase<never>) => void;
  readonly key: (key: Input.Key) => void;
  readonly tap: (at: Units.Point) => void;
  readonly draw: () => void;
};

const HEADING = "SETTINGS";

const HOW_LINES: readonly (readonly [string, string])[] = [
  ["Move", Controls.nameOf(Controls.shared, Players.FIRST)],
  ["Pause", "P"],
  ["Menu", "Shift+S"],
  ["This screen", "?"],
];

export const howLines = (): readonly Render.Line[] => [
  Render.line("HOW TO PLAY", 0.62),
  ...HOW_LINES.map(([what, how]) => Render.line(`${what}: ${how}`, 0.3)),
];

export const mount = (p: p5, deps: Deps): Aside => {
  let over: Option.Type<Phase.Phase<never>> = Option.none;

  const blockNow = (): Units.Px => Layout.panelBlock(deps.stage());

  const menuNow = (): Menu.Menu =>
    Menu.of(
      deps.stage(),
      blockNow(),
      deps.settings(),
      Menu.rowsFor(deps.handheld(), Menu.ON_TITLE),
    );

  const pressed = (phase: Phase.Phase<never>, key: Input.Key): void => {
    const wanted = Intent.forKey(phase, key, true);

    switch (wanted.kind) {
      case Intent.MOVE_CURSOR:
        if (Phase.isSettings(phase)) {
          over = Option.some(Phase.settings(Menu.nextCursor(menuNow(), phase.cursor, wanted.by)));
        }

        return;

      case Intent.CYCLE_SETTING:
        if (Phase.isSettings(phase)) {
          deps.keep(Menu.cycle(deps.settings(), Menu.rowAt(menuNow(), phase.cursor), wanted.by));
        }

        return;

      case Intent.PICK_ROW:
        if (Phase.isSettings(phase) && Menu.rowAt(menuNow(), phase.cursor) === Menu.FULL) {
          Fullscreen.ask();

          return;
        }

        over = Option.none;

        return;

      case Intent.RESUME:
        over = Option.none;

        return;

      case Intent.OPEN_SETTINGS:
        over = Option.some(Phase.settings(0));

        return;

      case Intent.OPEN_HELP:
        over = Option.some(Phase.HELP);

        return;

      case Intent.NOTHING:
      case Intent.READY_UP:
      case Intent.FREEZE:
      case Intent.PRESS:
        return;

      default:
        return Assert.never(wanted);
    }
  };

  const tapped = (phase: Phase.Phase<never>, at: Units.Point): void => {
    if (!Phase.isSettings(phase)) {
      over = Option.none;

      return;
    }

    const menu = menuNow();
    const picked = Menu.hit(menu, at);

    if (!picked.some) {
      if (!Menu.covers(menu, at)) over = Option.none;

      return;
    }

    switch (picked.value.kind) {
      case Menu.CHOSEN:
        deps.keep(Settings.chosen(deps.settings(), picked.value.choice));

        return;

      case Menu.ACTED:
        if (picked.value.row === Menu.FULL) Fullscreen.ask();

        return;

      default:
        return Assert.never(picked.value);
    }
  };

  return {
    busy: () => over.some,

    show: (phase) => {
      over = Option.some(phase);
    },

    key: (key) => {
      if (!over.some) return;

      pressed(over.value, key);
    },

    tap: (at) => {
      if (!over.some) return;

      tapped(over.value, at);
    },

    draw: () => {
      if (!over.some) return;

      const scheme = deps.scheme();
      const block = blockNow();

      if (Phase.isSettings(over.value)) {
        Panel.draw(p, scheme, menuNow(), block, over.value.cursor, HEADING);

        return;
      }

      if (over.value === Phase.HELP) {
        Render.drawTablet(
          p,
          scheme,
          howLines(),
          Layout.metrics(block, Units.point(0, 0)),
          deps.stage(),
        );
      }
    },
  };
};
