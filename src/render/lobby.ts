import type p5 from "p5";

import * as Session from "../net/session";
import * as Paint from "./paint";
import type * as Palette from "./palette";

const TITLE = 0.055;
const CODE = 0.13;
const NOTE = 0.032;
export type Waiting = {
  readonly code: string;
  readonly role: Session.Role;
  readonly waiting: boolean;
};

const centred = (p: p5, text: string, size: number, y: number): void => {
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(size);
  p.text(text, p.width / 2, y);
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
    p.height * 0.24,
  );

  Paint.fill(p, scheme.snake);
  centred(p, waiting.code, short * CODE, p.height * 0.4);

  Paint.fill(p, scheme.text);
  centred(
    p,
    waiting.waiting ? "Waiting for the other player" : "Agreeing on the board",
    short * NOTE,
    p.height * 0.56,
  );
};
