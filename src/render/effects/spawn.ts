import * as Assert from "../../core/assert";
import type * as Event from "../../core/event";
import * as Layout from "../layout";
import * as Morsel from "../morsel";
import * as Palette from "../palette";
import type * as Units from "../units";
import * as Effect from "./effect";

export const unspawn = <B>(
  scheme: Palette.Scheme,
  event: Event.Type<B>,
  layout: Layout.Metrics,
  now: Units.Millis,
): readonly Effect.Effect[] => {
  switch (event.kind) {
    case "scored": {
      const at = Layout.centreOf(layout, event.at);

      const pulp = Morsel.skinAt(scheme, event.at);

      return [
        Effect.swallow(at, pulp, "inward", now),
        Effect.crumbs(at, pulp, "inward", now),
        Effect.punch(now),
      ];
    }

    case "ended":
    case "faced":
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

export const spawn = <B>(
  scheme: Palette.Scheme,
  event: Event.Type<B>,
  layout: Layout.Metrics,
  now: Units.Millis,
): readonly Effect.Effect[] => {
  switch (event.kind) {
    case "scored": {
      const at = Layout.centreOf(layout, event.at);

      const pulp = Morsel.skinAt(scheme, event.at);

      return [
        Effect.swallow(at, pulp, "outward", now),
        Effect.crumbs(at, pulp, "outward", now),
        Effect.punch(now),
      ];
    }

    case "ended": {
      if (event.ending === "filled") return [];

      const at = Layout.centreOf(layout, event.at);

      return [
        Effect.scuff(at, scheme.bloodDeep, now),
        Effect.quake(now),
        Effect.dim(scheme.shadow, now),
        Effect.shards(at, scheme.blood, now),
      ];
    }

    case "faced":
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
