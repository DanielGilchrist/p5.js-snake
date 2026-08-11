import type p5 from "p5";

import * as Hud from "./hud";
import type * as Layout from "./layout";
import type * as Palette from "./palette";
import type * as Units from "./units";

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  layout: Layout.Metrics,
  stage: Units.Region,
): void => {
  Hud.tablet(
    p,
    scheme,
    [Hud.line("HOLD ON", 0.6), Hud.line("Waiting for the other player", 0.3)],
    layout,
    stage,
  );
};

export const drawSplit = (
  p: p5,
  scheme: Palette.Scheme,
  layout: Layout.Metrics,
  stage: Units.Region,
): void => {
  Hud.tablet(
    p,
    scheme,
    [
      Hud.line("OUT OF STEP", 0.6),
      Hud.line("The two boards drifted apart", 0.3),
      Hud.line("Reload both to start again", 0.26),
    ],
    layout,
    stage,
  );
};
