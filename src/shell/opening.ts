import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Geometry from "../core/geometry";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Render from "../render";
import * as Keys from "../render/keys";
import * as Pad from "../render/pad";
import type * as Palette from "../render/palette";
import type * as Settings from "../render/settings";
import * as TitleView from "../render/title";
import * as Units from "../render/units";
import * as Aside from "./aside";
import * as Demo from "./demo";
import * as Frame from "./frame";
import * as Phase from "./phase";
import * as Title from "./title";

export type Deps = {
  readonly here: string;
  readonly frame: () => Frame.Frame;
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
  readonly forget: () => void;
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
  const companyNow = (): Title.Company => (deps.handheld() ? Title.OWN_DEVICE : Title.SHARED);

  let company = companyNow();
  let place = Title.opening(company);
  let demo = deps.handheld()
    ? Option.none
    : Demo.start(p, deps.stage(), deps.scheme(), deps.seed());

  const aside = Aside.mount(p, deps);

  const view = (): TitleView.Screen =>
    TitleView.of(
      deps.stage(),
      cardFor(place, deps.prompt()),
      deps.handheld() ? TitleView.FILL : TitleView.INSET,
    );

  const steered = (by: number, along: boolean): void => {
    place = along ? Title.moved(place, by) : Title.nudged(place, by);
  };

  const padded = (control: Pad.Control): void => {
    switch (control) {
      case Pad.MENU:
        aside.show(Phase.settings(0));

        return;

      case Pad.PAUSE:
        settled(Title.chosen(deps.here, place));

        return;

      case Geometry.UP:
        steered(-1, true);

        return;

      case Geometry.DOWN:
        steered(1, true);

        return;

      case Geometry.LEFT:
        steered(-1, false);

        return;

      case Geometry.RIGHT:
        steered(1, false);

        return;

      default:
        return Assert.never(control);
    }
  };

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

  const dropDemo = (): void => {
    if (demo.some) demo.value.forget();

    demo = Option.none;
  };

  const backdrop = (now: Units.Millis, scheme: Palette.Scheme): void => {
    const frame = deps.frame();

    if (frame.kind === Frame.HANDHELD) {
      p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
      Keys.shell(p, scheme, frame.device, frame.stage);

      return;
    }

    if (demo.some) {
      demo.value.frame(now, scheme);

      return;
    }

    p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  };

  const buttons = (scheme: Palette.Scheme): void => {
    const frame = deps.frame();

    if (frame.kind !== Frame.HANDHELD) return;

    Keys.draw(p, scheme, frame.pad, Option.none, true, Keys.CHOOSING);
  };

  return {
    frame: () => {
      const now = Units.millis(p.millis());
      const scheme = deps.scheme();
      const screen = view();

      backdrop(now, scheme);
      TitleView.draw(p, scheme, screen, place.cursor);
      buttons(scheme);
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

      const frame = deps.frame();

      if (frame.kind === Frame.HANDHELD) {
        const control = Pad.hit(frame.pad, at);

        if (control.some) {
          padded(control.value);

          return;
        }
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

      const slot = Title.slotsAt(place)[picked.value];

      if (slot?.kind === Title.COUNTED) return;

      settled(Title.chosen(deps.here, place));
    },

    resize: () => {
      if (companyNow() !== company) {
        company = companyNow();
        place = Title.opening(company);
      }

      dropDemo();

      demo = deps.handheld()
        ? Option.none
        : Demo.start(p, deps.stage(), deps.scheme(), deps.seed());
    },

    forget: dropDemo,

    showing: () => place.where.kind,

    playing: () => (demo.some ? demo.value.showing() : OFF),
  };
};
