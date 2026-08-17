import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import type * as Geometry from "./geometry";
import * as NonEmpty from "./non-empty";
import * as Players from "./players";
import * as Rng from "./rng";
import * as Snake from "./snake";
import * as Timeline from "./timeline";
import type * as World from "./world";

type Played<B> = {
  readonly timeline: Timeline.Timeline<B>;
  readonly state: Game.State<B>;
  readonly api: Board.Api<B>;
};

const toward = (dc: number, dr: number): Geometry.Direction => {
  if (dc > 0) return "right";
  if (dc < 0) return "left";

  return dr > 0 ? "down" : "up";
};

const chase = <B>(world: World.Type<B>): Game.Command => {
  const { food } = world;
  const { snake } = NonEmpty.head(world.players);
  const dc = food.col - snake.head.col;
  const dr = food.row - snake.head.row;

  return {
    kind: "turn",
    player: Players.FIRST,
    direction: toward(dc, dr),
  };
};

const played = <R>(seed: number, run: <B>(played: Played<B>) => R): R => {
  const result = Board.parse(
    { cols: 14, rows: 12 },
    <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
      let state = Game.start(board, Rng.fromSeed(seed), Game.SOLO);
      const timeline = Timeline.start(state);
      let noise = Rng.fromSeed(seed * 31 + 7);

      const drive = (command: Game.Command): void => {
        const stepped = Game.step(api, state, command);
        state = stepped.state;
        Timeline.record(timeline, stepped.events);
      };

      for (let i = 0; i < 400 && state.kind === "playing"; i++) {
        const [roll, next] = Rng.nextInt(noise, 10);
        noise = next;

        if (roll === 0) drive({ kind: "togglePause" });
        if (roll === 0) drive({ kind: "togglePause" });
        if (roll === 1) drive(chase(state.world));

        drive(chase(state.world));
        drive({ kind: "tick" });
      }

      return run({ timeline, state, api });
    },
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const logged = <B>(timeline: Timeline.Timeline<B>): readonly Game.Event<B>[] =>
  timeline.entries.flatMap((entry) => entry.events);

describe("timeline", () => {
  test("the fixture reaches a real game over with turns, eats and pauses", () => {
    played(9, ({ timeline, state }) => {
      const kinds = new Set(logged(timeline).map((event) => event.kind));

      expect(state.kind).toBe("over");
      expect(kinds).toContain("moved");
      expect(kinds).toContain("scored");
      expect(kinds).toContain("queued");
      expect(kinds).toContain("paused");
      expect(kinds).toContain("ended");
    });
  });

  test("every event is invertible: revert(apply(s, e), e) === s", () => {
    for (const seed of [1, 4, 9, 23, 57]) {
      played(seed, ({ timeline }) => {
        let state = timeline.initial;

        for (const event of logged(timeline)) {
          const next = Game.apply(state, event);

          expect(Game.revert(next, event)).toEqual(state);

          state = next;
        }
      });
    }
  });

  test("the live state is the fold of the log", () => {
    for (const seed of [1, 4, 9, 23, 57]) {
      played(seed, ({ timeline, state }) => {
        let folded = timeline.initial;

        for (const event of logged(timeline)) folded = Game.apply(folded, event);

        expect(folded).toEqual(state);
      });
    }
  });

  test("rewinding every tick lands exactly on the start", () => {
    for (const seed of [1, 4, 9, 23, 57]) {
      played(seed, ({ timeline, state }) => {
        let position = Timeline.cursor(timeline, state);

        while (position.index > 0) position = Timeline.back(timeline, position).cursor;

        expect(position.tick).toBe(0);
        expect(position.state).toEqual(timeline.initial);
      });
    }
  });

  test("each step back rewinds exactly one tick of snake motion", () => {
    played(4, ({ timeline, state }) => {
      let position = Timeline.cursor(timeline, state);
      const total = position.tick;
      let steps = 0;

      while (position.tick > 0) {
        const before = Snake.segments(NonEmpty.head(position.state.world.players).snake);
        position = Timeline.back(timeline, position).cursor;
        const after = Snake.segments(NonEmpty.head(position.state.world.players).snake);

        expect(Board.equals(before[0], after[0])).toBe(false);
        steps += 1;
      }

      expect(steps).toBe(total);
    });
  });

  test("a rewound state is live: you can keep playing from it", () => {
    played(4, ({ timeline, state, api }) => {
      let position = Timeline.cursor(timeline, state);
      const halfway = Math.floor(position.tick / 2);

      while (position.tick > halfway) position = Timeline.back(timeline, position).cursor;

      const resumed = Game.step(api, position.state, { kind: "tick" }).state;

      expect(NonEmpty.head(resumed.world.players).snake).not.toEqual(
        NonEmpty.head(position.state.world.players).snake,
      );
    });
  });
});
