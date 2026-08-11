import type * as Board from "../core/board";
import * as Game from "../core/game";
import * as Players from "../core/players";
import * as Rng from "../core/rng";
import * as Timeline from "../core/timeline";
import type * as World from "../core/world";
import * as Effects from "../render/effects";
import * as Palette from "../render/palette";
import * as Render from "../render";
import type * as Layout from "../render/layout";
import type * as Units from "../render/units";

export type Match<B> = {
  state: Game.State<B>;
  timeline: Timeline.Timeline<B>;
  before: Players.Type<B>;
  effects: readonly Effects.Effect[];
  bite: Units.Millis;
};

export type Told<B> = {
  readonly state: Game.State<B>;
  readonly events: readonly Game.Event<B>[];
};

export const begin = <B>(
  board: Board.Grid<B>,
  seed: number,
  mode: Game.Mode,
  now: Units.Millis,
): Match<B> => {
  const state = Game.start(board, Rng.fromSeed(seed), mode);

  return {
    state,
    timeline: Timeline.start(state),
    before: state.world.players,
    effects: [],
    bite: now,
  };
};

export const scored = <B>(match: Match<B>): number => Players.scored(match.state.world.players);

export const worldOf = <B>(match: Match<B>): World.Type<B> => match.state.world;

export const apply = <B>(
  match: Match<B>,
  api: Board.Api<B>,
  command: Game.Command,
  scheme: Palette.Scheme,
  layout: Layout.Metrics,
  now: Units.Millis,
): Told<B> => {
  const stepped = Game.step(api, match.state, command);

  match.state = stepped.state;
  Timeline.record(match.timeline, stepped.events);

  if (stepped.events.some((event) => event.kind === "scored")) match.bite = now;

  match.effects = [
    ...match.effects,
    ...stepped.events.flatMap((event) => Effects.spawn(scheme, event, layout, now)),
  ];

  return stepped;
};

export const remember = <B>(match: Match<B>): void => {
  match.before = match.state.world.players;
};

export const paint = <B>(
  match: Match<B>,
  p: Parameters<typeof Render.draw>[0],
  scheme: Palette.Scheme,
  layout: Layout.Metrics,
  surface: Parameters<typeof Render.draw>[3],
  chrome: Parameters<typeof Render.draw>[4],
  partway: number,
  now: Units.Millis,
): void => {
  match.effects = Effects.alive(match.effects, now);

  const shake = Effects.shakeOffset(match.effects, now);

  p.push();
  p.translate(shake.dx, shake.dy);
  Render.draw(
    p,
    Render.scene(match.state, match.before, partway, match.bite),
    layout,
    surface,
    chrome,
  );
  p.pop();

  Effects.draw(p, scheme, match.effects, layout, now);
};
