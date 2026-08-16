import type p5 from "p5";

import type * as Option from "../core/option";
import * as Hud from "./hud";
import type * as Layout from "./layout";
import type * as Palette from "./palette";
import * as Scene from "./scene";
import type * as Units from "./units";

export type Standing = {
  readonly here: boolean;
  readonly there: boolean;
  readonly verdict: Option.Type<Hud.Line>;
};

const nudgeFor = (prompt: Scene.Prompt): string => (prompt === Scene.TOUCH ? "Tap" : "Press ENTER");

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  standing: Standing,
  layout: Layout.Metrics,
  stage: Units.Region,
  prompt: Scene.Prompt,
): void => {
  const mine = standing.here ? "You are ready" : `${nudgeFor(prompt)} when you are ready`;
  const theirs = standing.there ? "They are ready" : "They are not ready yet";
  const crown = standing.verdict.some
    ? [standing.verdict.value, Hud.line("Again?", 0.4)]
    : [Hud.line("READY?", 0.85)];

  Hud.tablet(p, scheme, [...crown, Hud.line(mine, 0.36), Hud.line(theirs, 0.3)], layout, stage);
};
