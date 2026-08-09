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
import * as Menu from "./render/menu";
import * as Palette from "./render/palette";
import * as Panel from "./render/panel";
import * as Settings from "./render/settings";
import * as Slots from "./shell/slots";
import * as Storage from "./shell/storage";
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

const nightly = (): boolean => window.matchMedia("(prefers-color-scheme: dark)").matches;

const schemeFor = (settings: Settings.Type): Palette.Scheme =>
  Settings.schemeFor(settings, nightly());
const vault = Storage.browser();

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
  | { readonly kind: "rewinding"; readonly playback: Rewind.Playback<B> }
  | { readonly kind: "settings"; readonly cursor: number }
  | { readonly kind: "help" };

const live = { kind: "live" } as const;

const rewinding = <B>(playback: Rewind.Playback<B>): Phase<B> => ({ kind: "rewinding", playback });

const adjusting = <B>(cursor: number): Phase<B> => ({ kind: "settings", cursor });

const helping = { kind: "help" } as const;

const HELP_LINES: readonly (readonly [string, string])[] = [
  ["Move", "Arrows or H J K L"],
  ["Pause", "P"],
  ["Settings", "S"],
  ["Controls", "?"],
];

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.pixelDensity(Math.min(MAX_DENSITY, p.displayDensity()));
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(60);

    const viewport = Units.viewport(p.windowWidth, p.windowHeight);
    let settings = vault.read(Slots.SETTINGS);
    let scheme = schemeFor(settings);
    let shell = shellFor(viewport, settings.hand);

    const started = Board.parse(
      Layout.cellsFor(shell.stage, TARGET_BLOCK),
      <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        let layout = Layout.fit(board, shell.stage);
        let surface = Surface.of(p, scheme, board, layout);

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
            scheme,
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
            ...stepped.events.flatMap((event) => Effects.spawn(scheme, event, layout, now)),
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
          Render.drawSkipHint(p, scheme, shell.kind === "handheld" ? "touch" : "keys");

          if (shell.kind === "handheld") Keys.draw(p, scheme, shell.pad, Option.none);
        };

        const stepWorld = (now: Units.Millis): void => {
          if (now - lastTick < tickInterval() + hitstop) return;

          previous = state.world.snake;
          lastTick = now;
          hitstop = 0;
          apply(Game.tick);
        };

        const paintWorld = (now: Units.Millis): void => {
          effects = Effects.alive(effects, now);

          const alpha = Math.min(1, (now - lastTick) / tickInterval());
          const shake = Effects.shakeOffset(effects, now);

          p.push();
          p.translate(shake.dx, shake.dy);

          Render.draw(p, Render.scene(state, previous, alpha, bite), layout, surface, chrome());

          p.pop();

          Effects.draw(p, scheme, effects, layout, now);

          if (shell.kind === "handheld") {
            if (now > heldUntil) held = Option.none;

            Keys.draw(p, scheme, shell.pad, held);
          }
        };

        const drawLive = (now: Units.Millis): void => {
          stepWorld(now);
          paintWorld(now);
        };

        const resume = (now: Units.Millis): void => {
          phase = live;
          lastTick = now;
        };

        p.draw = () => {
          const now = Units.millis(p.millis());

          if (phase.kind === "rewinding") {
            drawRewind(phase.playback, now);

            return;
          }

          if (phase.kind === "settings") {
            paintWorld(now);
            Panel.draw(p, scheme, menuNow(), layout.blockWidth, phase.cursor);

            return;
          }

          if (phase.kind === "help") {
            paintWorld(now);
            Render.drawTablet(
              p,
              scheme,
              [
                Render.line("CONTROLS", 0.62),
                ...HELP_LINES.map(([what, how]) => Render.line(`${what}: ${how}`, 0.3)),
              ],
              layout,
              shell.stage,
            );

            return;
          }

          drawLive(now);
        };

        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
          scheme = schemeFor(settings);
          surface = Surface.of(p, scheme, board, layout);
          effects = [];
        });

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), settings.hand);
          layout = Layout.fit(board, shell.stage);
          surface = Surface.of(p, scheme, board, layout);
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

        const applySettings = (next: Settings.Type): void => {
          const before = settings;

          settings = next;
          vault.write(Slots.SETTINGS, settings);
          scheme = schemeFor(settings);

          if (before.hand !== settings.hand) {
            shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), settings.hand);
            layout = Layout.fit(board, shell.stage);
          }

          surface = Surface.of(p, scheme, board, layout);
          effects = [];
        };

        const menuNow = (): Menu.Menu =>
          Menu.of(
            shell.stage,
            layout.blockWidth,
            settings,
            Menu.rowsFor(shell.kind === "handheld"),
          );

        const tapped = (at: Units.Point): void => {
          const now = Units.millis(p.millis());

          if (phase.kind === "settings") {
            const menu = menuNow();
            const picked = Menu.hit(menu, at);

            if (picked.some) applySettings(Settings.chosen(settings, picked.value));
            else if (!Menu.covers(menu, at)) resume(now);

            return;
          }

          if (shell.kind !== "handheld") return;

          const control = Pad.hit(shell.pad, at);

          if (control.some) {
            held = control;
            heldUntil = now + PRESS_FEEDBACK_MS;
          }

          if (control.some && control.value === "menu") {
            phase = adjusting(0);

            return;
          }

          const key = control.some ? Pad.keyOf(control.value) : Option.some(Input.other);

          if (key.some) press(key.value, now);
        };

        window.addEventListener(
          "pointerdown",
          (event: PointerEvent) => {
            if (shell.kind !== "handheld" && phase.kind !== "settings") return;

            event.preventDefault();
            tapped(Units.point(event.clientX, event.clientY));
          },
          { passive: false },
        );

        p.keyPressed = () => {
          const now = Units.millis(p.millis());
          const key = Input.parseKey(p.key);

          if (phase.kind === "help") {
            if (key.kind === "menu") phase = adjusting(0);
            else resume(now);

            return;
          }

          if (phase.kind === "settings") {
            const { cursor } = phase;

            if (key.kind === "help") {
              phase = helping;

              return;
            }

            if (key.kind === "menu" || key.kind === "skip") {
              resume(now);

              return;
            }

            if (key.kind !== "turn") return;

            const menu = menuNow();

            if (key.direction === "up") phase = adjusting(cursor - 1 + menu.lines.length);
            else if (key.direction === "down") phase = adjusting(cursor + 1);
            else {
              const row = Menu.rowAt(menu, cursor);

              applySettings(Menu.cycle(settings, row, key.direction === "right" ? 1 : -1));
            }

            return;
          }

          if (key.kind === "menu") {
            phase = adjusting(0);

            return;
          }

          if (key.kind === "help") {
            phase = helping;

            return;
          }

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
      p.draw = () => Render.drawError(p, schemeFor(Settings.DEFAULT), error);
    }
  };
});
