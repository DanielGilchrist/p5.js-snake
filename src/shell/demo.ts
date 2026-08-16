import type p5 from "p5";

import * as Autopilot from "../core/autopilot";
import * as Board from "../core/board";
import * as Game from "../core/game";
import * as Option from "../core/option";
import * as Players from "../core/players";
import * as Rng from "../core/rng";
import * as Timeline from "../core/timeline";
import * as Render from "../render";
import * as Effects from "../render/effects";
import * as Layout from "../render/layout";
import type * as Palette from "../render/palette";
import * as Rewind from "../render/rewind";
import * as Surface from "../render/surface";
import * as Units from "../render/units";
import * as Pace from "./pace";

export const PLAYING = "playing";
export const REWINDING = "rewinding";

export type Showing = typeof PLAYING | typeof REWINDING;

export type Type = {
  readonly frame: (now: Units.Millis, scheme: Palette.Scheme) => void;
  readonly showing: () => Showing;
  readonly forget: () => void;
};

const PLAYERS = 3;
const HEAD_START = 10;
const LINGER_MS = 900;

export const start = (
  p: p5,
  stage: Units.Region,
  scheme: Palette.Scheme,
  seed: number,
): Option.Type<Type> => {
  const grown = Board.parse(
    Layout.cellsFor(stage, Layout.TARGET_BLOCK),
    <B>(board: Board.Grid<B>, api: Board.Api<B>): Type => {
      type Stage =
        | { readonly kind: typeof PLAYING }
        | { readonly kind: typeof REWINDING; readonly playback: Rewind.Playback<B> };

      const layout = Layout.fit(board, stage);
      const pace = Pace.of(board);
      const rules = Game.forPlayers(PLAYERS, HEAD_START);

      let painted = scheme;
      let surface = Surface.of(p, painted, board, layout);
      let state = Game.start(board, Rng.fromSeed(seed), rules);
      let timeline = Timeline.start(state);
      let previous = state.world.players;
      let effects: readonly Effects.Effect[] = [];
      let showing: Stage = { kind: PLAYING };
      let lastTick = 0;
      let ended = 0;

      const apply = (command: Game.Command, now: Units.Millis): void => {
        const stepped = Game.step(api, state, command);

        state = stepped.state;

        if (command.kind === Game.RESTART) timeline = Timeline.start(state);
        else Timeline.record(timeline, stepped.events);

        effects = [
          ...effects,
          ...stepped.events.flatMap((event) => Effects.spawn(painted, event, layout, now)),
        ];
      };

      const steer = (now: Units.Millis): void => {
        for (const [who] of Players.everyone(state.world.players)) {
          const picked = Autopilot.choose(api, state.world, who);

          if (picked.some) apply(Game.turn(who, picked.value), now);
        }
      };

      const again = (now: Units.Millis): void => {
        apply(Game.restart, now);
        previous = state.world.players;
        showing = { kind: PLAYING };
        lastTick = now;
        ended = 0;
      };

      const finish = (now: Units.Millis): void => {
        if (ended === 0) ended = now;
        if (now - ended < LINGER_MS) return;

        const playback = Rewind.begin(timeline, state, now);

        if (!Rewind.worthWatching(playback)) {
          again(now);

          return;
        }

        effects = [];
        showing = { kind: REWINDING, playback };
      };

      const step = (now: Units.Millis): void => {
        if (state.kind === Game.OVER) {
          finish(now);

          return;
        }

        if (!Pace.due(pace, Units.millis(now - lastTick), Players.scored(state.world.players), 0)) {
          return;
        }

        steer(now);
        previous = state.world.players;
        lastTick = now;
        apply(Game.tick, now);
      };

      const repaint = (wanted: Palette.Scheme): void => {
        if (wanted === painted) return;

        painted = wanted;
        surface = Surface.of(p, painted, board, layout);
        effects = [];
      };

      const paint = (scene: Render.Scene<B>, now: Units.Millis): void => {
        const shake = Effects.shakeOffset(effects, now);

        p.push();
        p.translate(shake.dx, shake.dy);
        Render.drawBoard(
          p,
          scene,
          layout,
          surface,
          Render.chrome(
            painted,
            stage,
            Option.none,
            Render.KEYS,
            Option.none,
            Option.none,
            [],
            Render.TALLY_HIDDEN,
          ),
        );
        p.pop();

        Effects.draw(p, painted, effects, layout, now);
      };

      const rewinding = (playback: Rewind.Playback<B>, now: Units.Millis): void => {
        const shot = Rewind.frame(playback, timeline, now);

        if (shot.kind === Rewind.FINISHED) {
          again(now);
          paint(Render.scene(state, previous, 0, Units.millis(0)), now);

          return;
        }

        showing = { kind: REWINDING, playback: shot.playback };
        effects = [
          ...Effects.alive(effects, now),
          ...shot.undone.flatMap((event) => Effects.unspawn(painted, event, layout, now)),
        ];

        paint(shot.scene, now);
      };

      return {
        frame: (now, wanted) => {
          repaint(wanted);
          effects = Effects.alive(effects, now);

          if (showing.kind === REWINDING) {
            rewinding(showing.playback, now);

            return;
          }

          step(now);

          const alpha = Pace.partway(
            pace,
            Units.millis(now - lastTick),
            Players.scored(state.world.players),
          );

          paint(Render.scene(state, previous, alpha, Units.millis(0)), now);
        },

        showing: () => showing.kind,

        forget: () => {
          Surface.forget(surface);
        },
      };
    },
  );

  return grown.ok ? Option.some(grown.value) : Option.none;
};
