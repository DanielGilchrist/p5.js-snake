import p5 from "p5";

import * as Board from "./core/board";
import * as Game from "./core/game";
import * as Input from "./core/input";
import * as Rng from "./core/rng";
import * as Timeline from "./core/timeline";
import * as Effects from "./render/effects";
import * as Layout from "./render/layout";
import * as Render from "./render";
import * as Rewind from "./render/rewind";
import * as Surface from "./render/surface";
import * as Units from "./render/units";

const TARGET_BLOCK = 34;
const MIN_TICKS_PER_SECOND = 10;
const SPEED_UP_MS = 2;
const FASTEST_FRACTION = 0.55;
const HITSTOP_MS = 115;
const ENDING_GRACE_MS = 600;

type Phase<B> =
  | { readonly kind: "live" }
  | { readonly kind: "rewinding"; readonly playback: Rewind.Playback<B> };

const live = { kind: "live" } as const;

const rewinding = <B>(playback: Rewind.Playback<B>): Phase<B> => ({ kind: "rewinding", playback });

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(60);

    const viewport = Units.viewport(p.windowWidth, p.windowHeight);

    const started = Board.parse(
      Layout.cellsFor(viewport, TARGET_BLOCK),
      <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        let layout = Layout.fit(board, viewport);
        let surface = Surface.of(p, board, layout);

        let state = Game.start(board, Rng.fromSeed(Date.now()));
        let timeline = Timeline.start(state);
        let previous = state.world.snake;
        let effects: readonly Effects.Effect[] = [];
        let phase: Phase<B> = live;
        let bite = Units.millis(0);
        let lastTick = 0;
        let hitstop = 0;
        let inputLockedUntil = 0;

        const baseInterval =
          1000 / Math.max(MIN_TICKS_PER_SECOND, Math.floor((board.cols + board.rows) / 4.3));

        const fastestInterval = baseInterval * FASTEST_FRACTION;

        const tickInterval = (): number =>
          Math.max(fastestInterval, baseInterval - state.world.score * SPEED_UP_MS);

        const apply = (command: Game.Command): void => {
          const now = Units.millis(p.millis());
          const stepped = Game.step(api, state, command);

          state = stepped.state;

          if (command.kind === "restart") {
            timeline = Timeline.start(state);
            bite = now;
          } else {
            Timeline.record(timeline, stepped.events);
          }

          if (stepped.events.some((event) => event.kind === "scored")) bite = now;

          if (stepped.events.some((event) => event.kind === "scored")) hitstop = HITSTOP_MS;

          if (stepped.events.some((event) => event.kind === "ended")) {
            inputLockedUntil = now + ENDING_GRACE_MS;
          }

          effects = [
            ...effects,
            ...stepped.events.flatMap((event) => Effects.spawn(event, layout, now)),
          ];
        };

        const restart = (now: Units.Millis): void => {
          phase = live;
          lastTick = now;
          apply(Game.restart);
          previous = state.world.snake;
        };

        const drawRewind = (playback: Rewind.Playback<B>, now: Units.Millis): void => {
          const frame = Rewind.frame(playback, timeline, now);

          if (frame.kind === "finished") {
            restart(now);

            return;
          }

          phase = rewinding(frame.playback);

          Render.draw(p, frame.scene, layout, surface);
          Render.drawSkipHint(p);
        };

        const drawLive = (now: Units.Millis): void => {
          if (now - lastTick >= tickInterval() + hitstop) {
            previous = state.world.snake;
            lastTick = now;
            hitstop = 0;
            apply(Game.tick);
          }

          effects = Effects.alive(effects, now);

          const alpha = Math.min(1, (now - lastTick) / tickInterval());
          const shake = Effects.shakeOffset(effects, now);

          p.push();
          p.translate(shake.dx, shake.dy);

          Render.draw(p, Render.scene(state, previous, alpha, bite), layout, surface);

          p.pop();

          Effects.draw(p, effects, layout, now);
        };

        p.draw = () => {
          const now = Units.millis(p.millis());

          if (phase.kind === "rewinding") {
            drawRewind(phase.playback, now);

            return;
          }

          drawLive(now);
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          layout = Layout.fit(board, Units.viewport(p.windowWidth, p.windowHeight));
          surface = Surface.of(p, board, layout);
          effects = [];
        };

        p.keyPressed = () => {
          const now = Units.millis(p.millis());

          if (now < inputLockedUntil) return;

          const key = Input.parseKey(p.key);

          if (phase.kind === "rewinding") {
            if (key.kind === "skip") restart(now);

            return;
          }

          const command = Input.commandFor(state, key);
          if (!command.some) return;

          if (command.value.kind === "restart") {
            const playback = Rewind.begin(timeline, state, now);

            if (Rewind.worthWatching(playback)) {
              effects = [];
              phase = rewinding(playback);

              return;
            }
          }

          apply(command.value);
        };
      },
    );

    if (!started.ok) {
      const { error } = started;
      p.draw = () => Render.drawError(p, error);
    }
  };
});
