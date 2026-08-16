import type p5 from "p5";

import * as Geometry from "../core/geometry";
import * as Roster from "../net/roster";
import * as Session from "../net/session";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Scene from "./scene";
import * as SnakeView from "./snake";
import * as Units from "./units";

const TITLE = 0.055;
const CODE = 0.13;
const NOTE = 0.032;
const ASIDE = 0.026;

const SEAT = 0.05;
const SEAT_GAP = 0.03;
const EMPTY_ALPHA = 44;
const ASIDE_ALPHA = 150;

const TITLE_Y = 0.13;
const CODE_Y = 0.26;
const SEATS_Y = 0.4;
const COUNT_Y = 0.475;
const CALL_Y = 0.53;
const ASIDE_Y = 0.58;

export type Waiting = {
  readonly code: string;
  readonly role: Session.Role;
  readonly prompt: Scene.Prompt;
  readonly size: number;
  readonly here: number;
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

const startWith = (prompt: Scene.Prompt): string =>
  prompt === Scene.TOUCH ? "Tap to start now" : "ENTER to start now";

const callFor = (waiting: Waiting): string => {
  if (waiting.role !== Session.HOST) return "Waiting for the host";

  return `${waiting.here} of ${waiting.size} here`;
};

const sizerFor = (waiting: Waiting): string => {
  if (waiting.role !== Session.HOST || waiting.prompt === Scene.TOUCH) {
    return `Room size  ${waiting.size}`;
  }

  return `\u2190  Room size  ${waiting.size}  \u2192`;
};

const asideFor = (waiting: Waiting): string => {
  if (waiting.role !== Session.HOST) return "";
  if (waiting.here < Roster.FEWEST) return "Waiting for someone to join";
  if (waiting.prompt === Scene.TOUCH) return "Starts on its own once the room is full";

  return startWith(waiting.prompt);
};

export const draw = (p: p5, scheme: Palette.Scheme, waiting: Waiting): void => {
  const short = Math.min(p.width, p.height);

  p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  p.noStroke();

  Paint.fill(p, scheme.text);
  centred(
    p,
    waiting.role === Session.HOST ? "YOUR ROOM" : "JOINING",
    short * TITLE,
    p.height * TITLE_Y,
  );

  Paint.fill(p, Palette.bodyFor(scheme, 0).skin);
  centred(p, waiting.code, short * CODE, p.height * CODE_Y);

  seats(p, scheme, waiting, p.height * SEATS_Y);

  Paint.fill(p, scheme.text);
  centred(p, sizerFor(waiting), short * NOTE, p.height * COUNT_Y);
  centred(p, callFor(waiting), short * NOTE, p.height * CALL_Y);

  Paint.fillWith(p, scheme.text, Paint.alpha(ASIDE_ALPHA));
  centred(p, asideFor(waiting), short * ASIDE, p.height * ASIDE_Y);
};
