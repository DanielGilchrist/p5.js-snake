import type p5 from "p5";
import type * as Palette from "../palette";

import * as Assert from "../../core/assert";
import type * as Layout from "../layout";
import type * as Units from "../units";
import * as Debris from "./debris";
import * as Effect from "./effect";
import * as Scuff from "./scuff";
import * as Swallow from "./swallow";
import * as Veil from "./veil";

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  effects: readonly Effect.Effect[],
  layout: Layout.Metrics,
  now: Units.Millis,
): void => {
  const block = layout.blockWidth;

  for (const effect of effects) {
    const t = Effect.progress(effect, now);
    const seconds = Effect.spanOf(effect) / 1000;

    switch (effect.kind) {
      case "swallow":
        Swallow.draw(p, effect.at, effect.colour, effect.flow, t, block);
        break;
      case "crumbs":
        Debris.crumbs(p, scheme, effect.at, t, block, effect.colour, effect.flow, seconds);
        break;
      case "shards":
        Debris.shards(p, scheme, effect.at, t, block, effect.colour, seconds);
        break;
      case "scuff":
        Scuff.draw(p, scheme, effect.at, effect.colour, t, block, effect.born);
        break;
      case "dim":
        Veil.dim(p, effect.colour, t);
        break;
      case "shake":
        break;
      default:
        Assert.never(effect);
    }
  }
};
