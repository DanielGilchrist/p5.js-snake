import type p5 from "p5";

import * as Assert from "../../core/assert";
import type * as Layout from "../layout";
import type * as Palette from "../palette";
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
      case Effect.SWALLOW:
        Swallow.draw(p, effect.at, effect.colour, effect.flow, t, block);
        break;
      case Effect.CRUMBS:
        Debris.crumbs(p, scheme, effect.at, t, block, effect.colour, effect.flow, seconds);
        break;
      case Effect.SHARDS:
        Debris.shards(p, scheme, effect.at, t, block, effect.colour, seconds);
        break;
      case Effect.SCUFF:
        Scuff.draw(p, scheme, effect.at, effect.colour, t, block, effect.born);
        break;
      case Effect.DIM:
        Veil.dim(p, effect.colour, t);
        break;
      case Effect.SHAKE:
        break;
      default:
        Assert.never(effect);
    }
  }
};
