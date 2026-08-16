import type p5 from "p5";

import type * as Option from "../core/option";
import * as Hud from "./hud";
import type * as Layout from "./layout";
import type * as Palette from "./palette";
import * as Scene from "./scene";
import type * as Units from "./units";

export type Standing = {
  readonly here: boolean;
  readonly missing: readonly Hud.Badge[];
  readonly verdict: Option.Type<Hud.Line>;
};

const nudgeFor = (prompt: Scene.Prompt): string =>
  prompt === Scene.TOUCH ? "Tap" : "Press any key or click";

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  standing: Standing,
  layout: Layout.Metrics,
  stage: Units.Region,
  prompt: Scene.Prompt,
): void => {
  const mine = standing.here ? "You are ready" : `${nudgeFor(prompt)} when you are ready`;
  const theirs =
    standing.missing.length === 0
      ? Hud.line("Everyone is ready", 0.3)
      : Hud.badged(standing.missing, "still to ready up", 0.3);
  const crown = standing.verdict.some
    ? [standing.verdict.value, Hud.line("Again?", 0.4)]
    : [Hud.line("READY?", 0.85)];

  Hud.tablet(p, scheme, [...crown, Hud.line(mine, 0.36), theirs], layout, stage);
};
