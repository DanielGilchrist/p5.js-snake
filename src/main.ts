import p5 from "p5";

import * as Board from "./core/board";
import * as Game from "./core/game";
import * as Input from "./core/input";
import * as Option from "./core/option";
import * as Rng from "./core/rng";
import * as Timeline from "./core/timeline";
import * as Effects from "./render/effects";
import * as Keys from "./render/keys";
import * as Layout from "./render/layout";
import * as Pad from "./render/pad";
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
const PRESS_FEEDBACK_MS = 130;
const MAX_DENSITY = 2;
const HAND_SETTING = "snake.hand";

const storedHand = (): Pad.Hand => {
  try {
    return window.localStorage.getItem(HAND_SETTING) === "left" ? "left" : "right";
  } catch {
    return "right";
  }
};

const rememberHand = (hand: Pad.Hand): void => {
  try {
    window.localStorage.setItem(HAND_SETTING, hand);
  } catch {
    return;
  }
};

type Shell =
  | { readonly kind: "desk"; readonly stage: Units.Region }
  | {
      readonly kind: "handheld";
      readonly stage: Units.Region;
      readonly device: Units.Region;
      readonly pad: Pad.Pad;
    };

const touchFirst = (): boolean => window.matchMedia("(pointer: coarse)").matches;

const shellFor = (viewport: Units.Viewport, hand: Pad.Hand): Shell => {
  if (!touchFirst()) return { kind: "desk", stage: Layout.desk(viewport) };

  const handheld = Pad.arrange(viewport, hand);

  return {
    kind: "handheld",
    stage: handheld.stage,
    device: handheld.device,
    pad: handheld.pad,
  };
};

type Phase<B> =
  | { readonly kind: "live" }
  | { readonly kind: "rewinding"; readonly playback: Rewind.Playback<B> };

const live = { kind: "live" } as const;

const rewinding = <B>(playback: Rewind.Playback<B>): Phase<B> => ({ kind: "rewinding", playback });

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.pixelDensity(Math.min(MAX_DENSITY, p.displayDensity()));
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(60);

    const viewport = Units.viewport(p.windowWidth, p.windowHeight);
    let hand = storedHand();
    let shell = shellFor(viewport, hand);

    const started = Board.parse(
      Layout.cellsFor(shell.stage, TARGET_BLOCK),
      <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        let layout = Layout.fit(board, shell.stage);
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

        const chrome = (): Render.Chrome =>
          Render.chrome(
            shell.stage,
            shell.kind === "handheld" ? Option.some(shell.device) : Option.none,
            shell.kind === "handheld" ? "touch" : "keys",
          );
        let held: Option.Type<Pad.Control> = Option.none;
        let heldUntil = 0;

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

          Render.draw(p, frame.scene, layout, surface, chrome());
          Render.drawSkipHint(p, shell.kind === "handheld" ? "touch" : "keys");

          if (shell.kind === "handheld") Keys.draw(p, shell.pad, Option.none);
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

          Render.draw(p, Render.scene(state, previous, alpha, bite), layout, surface, chrome());

          p.pop();

          Effects.draw(p, effects, layout, now);

          if (shell.kind === "handheld") {
            if (now > heldUntil) held = Option.none;

            Keys.draw(p, shell.pad, held);
          }
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
          shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), hand);
          layout = Layout.fit(board, shell.stage);
          surface = Surface.of(p, board, layout);
          effects = [];
        };

        const press = (key: Input.Key, now: Units.Millis): void => {
          if (now < inputLockedUntil) return;

          if (phase.kind === "rewinding") {
            restart(now);

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

        const tapped = (at: Units.Point): void => {
          if (shell.kind !== "handheld") return;

          const now = Units.millis(p.millis());
          const control = Pad.hit(shell.pad, at);

          if (control.some) {
            held = control;
            heldUntil = now + PRESS_FEEDBACK_MS;
          }

          if (control.some && control.value === "flip") {
            hand = Pad.other(hand);
            rememberHand(hand);
            shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), hand);

            return;
          }

          const key = control.some ? Pad.keyOf(control.value) : Option.some(Input.other);

          if (key.some) press(key.value, now);
        };

        window.addEventListener(
          "pointerdown",
          (event: PointerEvent) => {
            if (shell.kind !== "handheld") return;

            event.preventDefault();
            tapped(Units.point(event.clientX, event.clientY));
          },
          { passive: false },
        );

        p.keyPressed = () => {
          const now = Units.millis(p.millis());
          const key = Input.parseKey(p.key);

          if (phase.kind === "rewinding") {
            if (key.kind === "skip" && now >= inputLockedUntil) restart(now);

            return;
          }

          press(key, now);
        };
      },
    );

    if (!started.ok) {
      const { error } = started;
      p.draw = () => Render.drawError(p, error);
    }
  };
});
