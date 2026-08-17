import * as Assert from "../../core/assert";
import * as Event from "../../core/event";
import * as Layout from "../layout";
import * as Morsel from "../morsel";
import type * as Palette from "../palette";
import type * as Units from "../units";
import * as Effect from "./effect";

export const unspawn = <B>(
  scheme: Palette.Scheme,
  event: Event.Type<B>,
  layout: Layout.Metrics,
  now: Units.Millis,
): readonly Effect.Effect[] => {
  switch (event.kind) {
    case Event.SCORED: {
      const at = Layout.centreOf(layout, event.at);

      const pulp = Morsel.skinAt(scheme, event.at);

      return [
        Effect.swallow(at, pulp, "inward", now),
        Effect.crumbs(at, pulp, "inward", now),
        Effect.punch(now),
      ];
    }

    case Event.ENDED:
    case Event.DIED:
    case Event.TURNED:
    case Event.QUEUED:
    case Event.MOVED:
    case Event.GREW:
    case Event.FED:
    case Event.ROLLED:
    case Event.PAUSED:
    case Event.RESUMED:
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
    case Event.SCORED: {
      const at = Layout.centreOf(layout, event.at);

      const pulp = Morsel.skinAt(scheme, event.at);

      return [
        Effect.swallow(at, pulp, "outward", now),
        Effect.crumbs(at, pulp, "outward", now),
        Effect.punch(now),
      ];
    }

    case Event.DIED: {
      const at = Layout.centreOf(layout, event.at);

      return [
        Effect.scuff(at, scheme.bloodDeep, now),
        Effect.shards(at, scheme.blood, now),
        Effect.quake(now),
        Effect.dim(scheme.shadow, now),
      ];
    }

    case Event.ENDED:
    case Event.TURNED:
    case Event.QUEUED:
    case Event.MOVED:
    case Event.GREW:
    case Event.FED:
    case Event.ROLLED:
    case Event.PAUSED:
    case Event.RESUMED:
      return [];

    default:
      return Assert.never(event);
  }
};
