import { describe, expect, test } from "bun:test";

import * as Assert from "../../core/assert";
import * as Board from "../../core/board";
import * as Event from "../../core/event";
import * as Game from "../../core/game";
import * as Option from "../../core/option";
import * as Rng from "../../core/rng";
import * as Layout from "../layout";
import * as Palette from "../palette";
import * as Units from "../units";
import * as Effects from "./index";

const BORN = Units.millis(0);

const onEvent = (make: <B>(at: Board.Cell<B>) => Event.Type<B>): readonly Effects.Effect[] => {
  const result = Board.parse(Board.size(12, 12), <B>(board: Board.Grid<B>) => {
    const layout = Layout.fit(board, Layout.desk(Units.viewport(400, 400)));

    return Effects.spawn(Palette.EARTHENWARE, make(board.start), layout, BORN);
  });

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const undoing = (make: <B>(at: Board.Cell<B>) => Event.Type<B>): readonly Effects.Effect[] => {
  const result = Board.parse(Board.size(12, 12), <B>(board: Board.Grid<B>) => {
    const layout = Layout.fit(board, Layout.desk(Units.viewport(400, 400)));

    return Effects.unspawn(Palette.EARTHENWARE, make(board.start), layout, BORN);
  });

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const onEat = (): readonly Effects.Effect[] => onEvent((at) => Event.scored(at));

const onDeath = (): readonly Effects.Effect[] => onEvent((at) => Event.ended("collision", at));

const kindsOf = (effects: readonly Effects.Effect[]): Set<string> =>
  new Set(effects.map((effect) => effect.kind));

describe("effects", () => {
  test("eating bursts the fruit: splat, pulp and a punch on one beat", () => {
    const kinds = kindsOf(onEat());

    expect(kinds).toContain("swallow");
    expect(kinds).toContain("crumbs");
    expect(kinds).toContain("shake");
  });

  test("eating does not borrow the death vocabulary", () => {
    const kinds = kindsOf(onEat());

    expect(kinds).not.toContain("shards");
    expect(kinds).not.toContain("scuff");
    expect(kinds).not.toContain("dim");
  });

  test("dying spills blood, not fruit", () => {
    const dead = onDeath();

    expect(kindsOf(dead)).toContain("scuff");
    expect(kindsOf(dead)).toContain("shards");

    for (const effect of dead) {
      if (effect.kind === "shards" || effect.kind === "scuff") {
        expect(effect.colour).not.toEqual(Palette.EARTHENWARE.foodDeep);
        expect(effect.colour).not.toEqual(Palette.EARTHENWARE.food);
      }
    }
  });

  test("the death mark outlasts the debris that made it", () => {
    const dead = onDeath();
    const late = Effects.alive(dead, Units.millis(700));

    expect(kindsOf(late)).toContain("scuff");
    expect(Effects.alive(dead, Units.millis(10_000))).toEqual([]);
  });

  test("the swallow outlasts the freeze so the food is seen going in", () => {
    const swallow = onEat().find((effect) => effect.kind === "swallow");

    if (swallow === undefined) Assert.unreachable("eating must spawn a swallow");

    expect(Effects.alive([swallow], Units.millis(60)).length).toBe(1);
    expect(Effects.alive([swallow], Units.millis(400))).toEqual([]);
  });

  test("the fruit vanishes before its pulp settles", () => {
    const eaten = onEat();
    const gone = (kind: string): boolean =>
      eaten
        .filter((effect) => effect.kind === kind)
        .every((effect) => Effects.alive([effect], Units.millis(200)).length === 0);

    expect(gone("swallow")).toBe(true);
    expect(gone("crumbs")).toBe(false);
  });

  test("dying shakes harder and longer than eating", () => {
    const punch = onEat().find((effect) => effect.kind === "shake");
    const quake = onDeath().find((effect) => effect.kind === "shake");

    if (punch?.kind !== "shake" || quake?.kind !== "shake") {
      Assert.unreachable("both events must shake");
    }

    expect(quake.strength).toBeGreaterThan(punch.strength);
    expect(quake.span).toBeGreaterThan(punch.span);
  });

  test("every effect expires once its lifespan elapses", () => {
    expect(Effects.alive(onEat(), Units.millis(50)).length).toBeGreaterThan(0);
    expect(Effects.alive(onEat(), Units.millis(10_000))).toEqual([]);
    expect(Effects.alive(onDeath(), Units.millis(10_000))).toEqual([]);
  });

  test("the screen only shakes while a shake is alive", () => {
    const eaten = onEat();
    const during = Effects.shakeOffset(eaten, Units.millis(10));

    expect(Math.abs(during.dx) + Math.abs(during.dy)).toBeGreaterThan(0);
    expect(
      Effects.shakeOffset(Effects.alive(eaten, Units.millis(10_000)), Units.millis(10_000)),
    ).toEqual(Units.NO_OFFSET);
  });

  test("nothing shakes when no shake was spawned", () => {
    const quiet = onEat().filter((effect) => effect.kind !== "shake");

    expect(Effects.shakeOffset(quiet, Units.millis(5))).toEqual(Units.NO_OFFSET);
  });

  test("undoing a bite puts the fruit back together", () => {
    const reversed = undoing((at) => Event.scored(at));

    expect(kindsOf(reversed)).toContain("swallow");
    expect(kindsOf(reversed)).toContain("crumbs");

    for (const effect of reversed) {
      if (effect.kind === "crumbs" || effect.kind === "swallow") {
        expect(effect.flow).toBe("inward");
      }
    }
  });

  test("eating throws the pulp out, undoing it draws it back", () => {
    const eaten = onEat().filter((effect) => effect.kind === "crumbs");

    expect(eaten.length).toBeGreaterThan(0);

    for (const effect of eaten) {
      if (effect.kind === "crumbs") expect(effect.flow).toBe("outward");
    }
  });

  test("every event the game can log has a decided reverse", () => {
    const result = Board.parse(Board.size(14, 12), <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));
      const seen = new Set<string>();

      const play = (from: Game.State<B>, command: Game.Command): Game.State<B> => {
        const stepped = Game.step(api, from, command);

        for (const event of stepped.events) {
          seen.add(event.kind);
          expect(Array.isArray(Effects.unspawn(Palette.EARTHENWARE, event, layout, BORN))).toBe(
            true,
          );
        }

        return stepped.state;
      };

      let state: Game.State<B> = Game.start(board, Rng.fromSeed(9));

      for (let i = 0; i < 300 && state.kind === "playing"; i++) {
        const { snake, food } = state.world;
        const dc = food.col - snake.head.col;
        const dr = food.row - snake.head.row;

        state = play(state, {
          kind: "turn",
          direction: dc !== 0 ? (dc > 0 ? "right" : "left") : dr > 0 ? "down" : "up",
        });
        state = play(state, Game.tick);
      }

      return seen;
    });

    if (!result.ok) Assert.unreachable("fixture board must parse");

    expect(result.value.size).toBeGreaterThanOrEqual(6);
  });

  test("only a bite has anything to give back", () => {
    expect(undoing((at) => Event.ended("collision", at))).toEqual([]);
    expect(undoing(() => Event.grew)).toEqual([]);
    expect(undoing((at) => Event.moved(at, Option.none))).toEqual([]);
  });

  test("winning is celebrated by the score, not by a death explosion", () => {
    expect(onEvent((at) => Event.ended("filled", at))).toEqual([]);
  });
});
