import type p5 from "p5";

import * as Assert from "../../core/assert";
import type * as Layout from "../layout";
import type * as Units from "../units";
import * as Debris from "./debris";
import * as Effect from "./effect";
import * as Puff from "./puff";
import * as Swallow from "./swallow";
import * as Veil from "./veil";

export const draw = (
  p: p5,
  effects: readonly Effect.Effect[],
  layout: Layout.Metrics,
  now: Units.Millis,
): void => {
  const block = layout.blockWidth;

  for (const effect of effects) {
    const t = Effect.progress(effect, now);

    switch (effect.kind) {
      case "puff":
        Puff.puff(p, effect.at, t, block, effect.born);
        break;
      case "dust":
        Puff.dust(p, effect.at, t, block);
        break;
      case "wisps":
        Puff.wisps(p, effect.at, t, block, effect.born);
        break;
      case "swallow":
        Swallow.draw(p, effect.at, t, block);
        break;
      case "crumbs":
        Debris.crumbs(p, effect.at, t, block, effect.colour);
        break;
      case "shards":
        Debris.shards(p, effect.at, t, block);
        break;
      case "ring":
        Veil.ring(p, effect.at, effect.colour, t, block);
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
