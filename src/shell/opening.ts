import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Geometry from "../core/geometry";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Render from "../render";
import type * as Palette from "../render/palette";
import type * as Settings from "../render/settings";
import * as TitleView from "../render/title";
import * as Units from "../render/units";
import * as Aside from "./aside";
import * as Demo from "./demo";
import * as Phase from "./phase";
import * as Title from "./title";

export type Deps = {
  readonly here: string;
  readonly stage: () => Units.Region;
  readonly handheld: () => boolean;
  readonly prompt: () => Render.Prompt;
  readonly settings: () => Settings.Type;
  readonly scheme: () => Palette.Scheme;
  readonly keep: (settings: Settings.Type) => void;
  readonly go: (href: string) => void;
  readonly seed: () => number;
};

export type Screen = {
  readonly frame: () => void;
  readonly key: (key: Input.Key) => void;
  readonly tap: (at: Units.Point) => void;
  readonly resize: () => void;
  readonly showing: () => Title.Where["kind"];
  readonly playing: () => string;
};

export const NAME = "title";
export const OFF = "off";

const rowFor = (slot: Title.Slot): TitleView.Row => {
  switch (slot.kind) {
    case Title.PLAIN:
      return { label: slot.label, heads: Option.none, mark: TitleView.FLAT };
    case Title.OPENS:
      return { label: slot.label, heads: Option.none, mark: TitleView.LEADS };
    case Title.RETURNS:
      return { label: slot.label, heads: Option.none, mark: TitleView.RETURNS };
    case Title.COUNTED:
      return { label: slot.label, heads: Option.some(slot.seats), mark: TitleView.FLAT };
    default:
      return Assert.never(slot);
  }
};

const cardFor = (place: Title.Place, prompt: Render.Prompt): TitleView.Card => {
  const named = Title.headingOf(place);

  return {
    heading: named.some ? { kind: TitleView.WORDS, text: named.value } : { kind: TitleView.CREST },
    rows: Title.slotsAt(place).map((slot) => rowFor(slot)),
    hint: Title.hintFor(place, prompt),
  };
};

export const open = (p: p5, deps: Deps): Screen => {
  let place = Title.OPENING;
  let demo = Demo.start(p, deps.stage(), deps.scheme(), deps.seed());

  const aside = Aside.mount(p, deps);

  const view = (): TitleView.Screen => TitleView.of(deps.stage(), cardFor(place, deps.prompt()));

  const settled = (outcome: Title.Outcome): void => {
    switch (outcome.kind) {
      case Title.GO:
        deps.go(outcome.href);

        return;

      case Title.AT:
        place = outcome.place;

        return;

      case Title.SHOW_HOW:
        aside.show(Phase.HELP);

        return;

      case Title.SHOW_SETTINGS:
        aside.show(Phase.settings(0));

        return;

      default:
        return Assert.never(outcome);
    }
  };

  const browse = (key: Input.Key): void => {
    switch (key.kind) {
      case Input.TURN: {
        if (key.direction === Geometry.UP) place = Title.moved(place, -1);
        else if (key.direction === Geometry.DOWN) place = Title.moved(place, 1);
        else place = Title.nudged(place, key.direction === Geometry.RIGHT ? 1 : -1);

        return;
      }

      case Input.SKIP:
        settled(Title.chosen(deps.here, place));

        return;

      case Input.MENU:
        aside.show(Phase.settings(0));

        return;

      case Input.BACK:
        place = Title.backed(place);

        return;

      case Input.HELP:
        aside.show(Phase.HELP);

        return;

      case Input.PAUSE:
      case Input.FREEZE:
      case Input.OTHER:
        return;

      default:
        return Assert.never(key);
    }
  };

  const backdrop = (now: Units.Millis, scheme: Palette.Scheme): void => {
    if (demo.some) {
      demo.value.frame(now, scheme);

      return;
    }

    p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  };

  return {
    frame: () => {
      const now = Units.millis(p.millis());
      const scheme = deps.scheme();
      const screen = view();

      backdrop(now, scheme);
      TitleView.draw(p, scheme, screen, place.cursor);
      aside.draw();
    },

    key: (key) => {
      if (aside.busy()) {
        aside.key(key);

        return;
      }

      browse(key);
    },

    tap: (at) => {
      if (aside.busy()) {
        aside.tap(at);

        return;
      }

      const screen = view();
      const nudge = TitleView.nudged(screen, at);

      if (nudge.some) {
        place = Title.nudged({ ...place, cursor: nudge.value.row }, nudge.value.by);

        return;
      }

      const picked = TitleView.hit(screen, at);

      if (!picked.some) {
        if (!TitleView.covers(screen, at)) place = Title.backed(place);

        return;
      }

      place = { ...place, cursor: picked.value };
      settled(Title.chosen(deps.here, place));
    },

    resize: () => {
      demo = Demo.start(p, deps.stage(), deps.scheme(), deps.seed());
    },

    showing: () => place.where.kind,

    playing: () => (demo.some ? demo.value.showing() : OFF),
  };
};
