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
import * as Units from "./render/units";

const BLOCK_WIDTH = Units.px(35);
const MIN_TICKS_PER_SECOND = 10;
const SPEED_UP_MS = 2;
const FASTEST_FRACTION = 0.55;
const HITSTOP_MS = 90;

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(60);

    const viewport: Units.Viewport = {
      width: Units.px(p.windowWidth),
      height: Units.px(p.windowHeight),
    };

    const started = Board.parse(
      { cols: viewport.width / BLOCK_WIDTH, rows: viewport.height / BLOCK_WIDTH },
      <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        type Phase =
          | { readonly kind: "live" }
          | { readonly kind: "rewinding"; readonly playback: Rewind.Playback<B> };

        const layout = Layout.fit(board, viewport, BLOCK_WIDTH);

        let state = Game.start(board, Rng.fromSeed(Date.now()));
        let timeline = Timeline.start(state);
        let previous = state.world.snake;
        let effects: readonly Effects.Effect[] = [];
        let phase: Phase = { kind: "live" };
        let lastTick = 0;
        let hitstop = 0;

        const baseInterval =
          1000 /
          Math.max(MIN_TICKS_PER_SECOND, Math.floor((viewport.width + viewport.height) / 150));

        const fastestInterval = baseInterval * FASTEST_FRACTION;

        const tickInterval = (): number =>
          Math.max(fastestInterval, baseInterval - state.world.score * SPEED_UP_MS);

        const apply = (command: Game.Command): void => {
          const now = Units.millis(p.millis());
          const stepped = Game.step(api, state, command);

          state = stepped.state;

          if (command.kind === "restart") {
            timeline = Timeline.start(state);
          } else {
            Timeline.record(timeline, stepped.events);
          }

          if (stepped.events.some((event) => event.kind === "scored")) hitstop = HITSTOP_MS;

          effects = [
            ...effects,
            ...stepped.events.flatMap((event) => Effects.spawn(event, layout, now)),
          ];
        };

        const restart = (now: Units.Millis): void => {
          phase = { kind: "live" };
          lastTick = now;
          apply({ kind: "restart" });
          previous = state.world.snake;
        };

        const drawRewind = (playback: Rewind.Playback<B>, now: Units.Millis): void => {
          const frame = Rewind.frame(playback, timeline, now);

          if (frame.kind === "finished") {
            restart(now);

            return;
          }

          phase = { kind: "rewinding", playback: frame.playback };

          Render.draw(p, frame.scene, layout);
          Render.drawSkipHint(p);
        };

        const drawLive = (now: Units.Millis): void => {
          if (now - lastTick >= tickInterval() + hitstop) {
            previous = state.world.snake;
            lastTick = now;
            hitstop = 0;
            apply({ kind: "tick" });
          }

          effects = Effects.alive(effects, now);

          const alpha = Math.min(1, (now - lastTick) / tickInterval());
          const shake = Effects.shakeOffset(effects, now);

          p.push();
          p.translate(shake.dx, shake.dy);

          Render.draw(p, { current: state, previous, alpha }, layout);

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

        p.keyPressed = () => {
          const now = Units.millis(p.millis());
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
              phase = { kind: "rewinding", playback };

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
