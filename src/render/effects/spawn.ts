import * as Assert from "../../core/assert";
import type * as Event from "../../core/event";
import * as Layout from "../layout";
import * as Morsel from "../morsel";
import * as Palette from "../palette";
import type * as Units from "../units";
import * as Effect from "./effect";

export const spawn = <B>(
  event: Event.Type<B>,
  layout: Layout.Metrics,
  now: Units.Millis,
): readonly Effect.Effect[] => {
  switch (event.kind) {
    case "scored": {
      const at = Layout.centreOf(layout, event.at);

      return [
        Effect.dust(at, now),
        Effect.crumbs(at, Morsel.skinAt(event.at), now),
        Effect.wisps(at, now),
        Effect.swallow(at, now),
        Effect.puff(at, now),
        Effect.punch(now),
      ];
    }

    case "ended": {
      if (event.ending === "filled") return [];

      const at = Layout.centreOf(layout, event.at);

      return [
        Effect.quake(now),
        Effect.dim(Palette.SHADOW, now),
        Effect.ring(at, Palette.FOOD_DEEP, now),
        Effect.shards(at, now),
      ];
    }

    case "faced":
    case "queued":
    case "steered":
    case "moved":
    case "grew":
    case "fed":
    case "rolled":
    case "paused":
    case "resumed":
      return [];

    default:
      return Assert.never(event);
  }
};
