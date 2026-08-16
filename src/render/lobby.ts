import type p5 from "p5";

import * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Roster from "../net/roster";
import * as Session from "../net/session";
import * as Clay from "./clay";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Scene from "./scene";
import * as SnakeView from "./snake";
import * as Units from "./units";

export const SMALLER = "smaller";
export const BIGGER = "bigger";
export const START = "start";
export const LEAVE = "leave";
export const SETTINGS = "settings";

export type Control =
  | typeof SMALLER
  | typeof BIGGER
  | typeof START
  | typeof LEAVE
  | typeof SETTINGS;

export type Button = {
  readonly control: Control;
  readonly at: Units.Region;
  readonly label: string;
  readonly ready: boolean;
};

export type Screen = {
  readonly short: number;
  readonly middle: number;
  readonly buttons: readonly Button[];
};

export type Waiting = {
  readonly code: string;
  readonly role: Session.Role;
  readonly prompt: Scene.Prompt;
  readonly size: number;
  readonly here: number;
};

const TITLE = 0.055;
const CODE = 0.13;
const NOTE = 0.032;
const ASIDE = 0.026;

const SEAT = 0.05;
const SEAT_GAP = 0.03;
const EMPTY_ALPHA = 44;
const ASIDE_ALPHA = 150;
const RESTING_ALPHA = 110;

const TITLE_Y = 0.1;
const CODE_Y = 0.2;
const SEATS_Y = 0.3;
const COUNT_Y = 0.385;
const CALL_Y = 0.45;
const START_Y = 0.535;
const ASIDE_Y = 0.605;
const FOOT_Y = 0.675;

const STEP_SIZE = 0.07;
const STEP_CLEAR = 0.028;
const WIDE = 0.34;
const TALL = 0.085;
const FOOT_WIDE = 0.26;
const FOOT_TALL = 0.07;
const FOOT_GAP = 0.02;

const RADIUS = 0.22;
const LABEL = 0.03;

const hosting = (waiting: Waiting): boolean => waiting.role === Session.HOST;

const boxAt = (middle: number, y: number, width: number, height: number): Units.Region =>
  Units.region({ left: middle - width / 2, top: y - height / 2, width, height });

const sizeLabel = (waiting: Waiting): string => `Room size  ${waiting.size}`;

const steps = (
  p: p5,
  short: number,
  middle: number,
  height: number,
  waiting: Waiting,
): Button[] => {
  if (!hosting(waiting)) return [];

  const size = short * STEP_SIZE;

  p.textSize(short * NOTE);

  const reach = p.textWidth(sizeLabel(waiting)) / 2 + short * STEP_CLEAR + size / 2;

  return [
    {
      control: SMALLER,
      at: boxAt(middle - reach, height * COUNT_Y, size, size),
      label: "←",
      ready: waiting.size > Roster.FEWEST,
    },
    {
      control: BIGGER,
      at: boxAt(middle + reach, height * COUNT_Y, size, size),
      label: "→",
      ready: waiting.size < Roster.MOST,
    },
  ];
};

const foot = (short: number, middle: number, height: number): Button[] => {
  const width = short * FOOT_WIDE;
  const gap = short * FOOT_GAP;
  const tall = short * FOOT_TALL;
  const shift = width / 2 + gap / 2;

  return [
    {
      control: LEAVE,
      at: boxAt(middle - shift, height * FOOT_Y, width, tall),
      label: "Leave",
      ready: true,
    },
    {
      control: SETTINGS,
      at: boxAt(middle + shift, height * FOOT_Y, width, tall),
      label: "Settings",
      ready: true,
    },
  ];
};

export const of = (p: p5, waiting: Waiting): Screen => {
  const short = Math.min(p.width, p.height);
  const middle = p.width / 2;

  const starting: Button[] = hosting(waiting)
    ? [
        {
          control: START,
          at: boxAt(middle, p.height * START_Y, short * WIDE, short * TALL),
          label: "Start now",
          ready: waiting.here >= Roster.FEWEST,
        },
      ]
    : [];

  return {
    short,
    middle,
    buttons: [
      ...steps(p, short, middle, p.height, waiting),
      ...starting,
      ...foot(short, middle, p.height),
    ],
  };
};

const within = (box: Units.Region, at: Units.Point): boolean =>
  at.x >= box.left &&
  at.x <= box.left + box.width &&
  at.y >= box.top &&
  at.y <= box.top + box.height;

export const hit = (screen: Screen, at: Units.Point): Option.Type<Control> => {
  for (const button of screen.buttons) {
    if (button.ready && within(button.at, at)) return Option.some(button.control);
  }

  return Option.none;
};

const centred = (p: p5, text: string, size: number, y: number): void => {
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(size);
  p.text(text, p.width / 2, y);
};

const seats = (p: p5, scheme: Palette.Scheme, waiting: Waiting, y: number): void => {
  const short = Math.min(p.width, p.height);
  const crown = short * SEAT;
  const step = crown + short * SEAT_GAP;
  const left = p.width / 2 - (step * (waiting.size - 1)) / 2;

  for (let seat = 0; seat < waiting.size; seat++) {
    const at = Units.point(left + seat * step, y);

    if (seat < waiting.here) {
      SnakeView.head(
        p,
        scheme,
        at,
        crown,
        Palette.bodyFor(scheme, seat),
        Geometry.RIGHT,
        SnakeView.ALIVE,
      );

      continue;
    }

    p.noFill();
    Paint.strokeWith(p, scheme.text, Paint.alpha(EMPTY_ALPHA));
    p.strokeWeight(Math.max(1.5, crown * 0.06));
    p.circle(at.x, at.y, crown);
    p.noStroke();
  }
};

const callFor = (waiting: Waiting): string => {
  if (!hosting(waiting)) return "Waiting for the host";

  return `${waiting.here} of ${waiting.size} here`;
};

const asideFor = (waiting: Waiting): string => {
  if (!hosting(waiting)) return "The game starts once the room is full";
  if (waiting.here < Roster.FEWEST) return "Waiting for someone to join";
  if (waiting.prompt === Scene.TOUCH) return "Starts on its own once the room is full";

  return "ENTER starts now, ESC leaves";
};

const button = (p: p5, scheme: Palette.Scheme, screen: Screen, shown: Button): void => {
  const { at } = shown;
  const radius = screen.short * RADIUS * (at.height / (screen.short * TALL));

  if (shown.ready) {
    Clay.cast(p, Clay.RAISED, scheme.shadow, () => {
      Paint.fill(p, scheme.wall);
      p.rect(at.left, at.top, at.width, at.height, radius);
    });
  } else {
    Paint.fillWith(p, scheme.shadow, Paint.alpha(40));
    p.rect(at.left, at.top, at.width, at.height, radius);
  }

  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(screen.short * LABEL);
  Paint.fillWith(p, scheme.text, shown.ready ? Paint.OPAQUE : Paint.alpha(RESTING_ALPHA));
  p.text(shown.label, at.left + at.width / 2, at.top + at.height / 2);
};

export const draw = (p: p5, scheme: Palette.Scheme, screen: Screen, waiting: Waiting): void => {
  const { short } = screen;

  p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  p.noStroke();

  Paint.fill(p, scheme.text);
  centred(p, hosting(waiting) ? "YOUR ROOM" : "JOINING", short * TITLE, p.height * TITLE_Y);

  Paint.fill(p, Palette.bodyFor(scheme, 0).skin);
  centred(p, waiting.code, short * CODE, p.height * CODE_Y);

  seats(p, scheme, waiting, p.height * SEATS_Y);

  Paint.fill(p, scheme.text);
  centred(p, sizeLabel(waiting), short * NOTE, p.height * COUNT_Y);
  centred(p, callFor(waiting), short * NOTE, p.height * CALL_Y);

  for (const shown of screen.buttons) button(p, scheme, screen, shown);

  Paint.fillWith(p, scheme.text, Paint.alpha(ASIDE_ALPHA));
  centred(p, asideFor(waiting), short * ASIDE, p.height * ASIDE_Y);
};
