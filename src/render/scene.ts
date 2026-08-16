import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Option from "../core/option";
import * as Clay from "./clay";
import * as Palette from "./palette";
import * as Keys from "./keys";
import * as Game from "../core/game";
import * as Players from "../core/players";
import * as Turns from "../core/turns";
import * as World from "../core/world";
import * as FoodView from "./food";
import * as GridView from "./grid";
import * as Hud from "./hud";
import * as Geometry from "../core/geometry";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Surface from "./surface";
import * as SnakeView from "./snake";
import * as StandingsView from "./standings";
import type * as Standings from "../core/standings";
import type * as Tag from "./tag";
import * as Units from "./units";

export const KEYS = "keys";
export const TOUCH = "touch";

export type Prompt = typeof KEYS | typeof TOUCH;

export type Tally = {
  readonly seat: number;
  readonly score: number;
};

export const tally = (seat: number, score: number): Tally => ({ seat, score });

export type Ending = {
  readonly who: readonly number[];
  readonly title: string;
  readonly tally: readonly Tally[];
};

export const ending = (
  who: readonly number[],
  title: string,
  counted: readonly Tally[] = [],
): Ending => ({ who, title, tally: counted });

export type Naming = {
  readonly tags: readonly Option.Type<string>[];
  readonly mine: Option.Type<number>;
};

export const naming = (
  tags: readonly Option.Type<string>[],
  mine: Option.Type<number>,
): Naming => ({ tags, mine });

export const TALLY_SHOWN = "tallyShown";
export const TALLY_HIDDEN = "tallyHidden";

export type Tallying = typeof TALLY_SHOWN | typeof TALLY_HIDDEN;

export type Chrome = {
  readonly scheme: Palette.Scheme;
  readonly tallying: Tallying;
  readonly standings: Standings.Type;
  readonly stage: Units.Region;
  readonly device: Option.Type<Units.Region>;
  readonly prompt: Prompt;
  readonly ending: Option.Type<Ending>;
  readonly naming: Option.Type<Naming>;
};

export const chrome = (
  scheme: Palette.Scheme,
  stage: Units.Region,
  device: Option.Type<Units.Region>,
  prompt: Prompt,
  told: Option.Type<Ending> = Option.none,
  named: Option.Type<Naming> = Option.none,
  standings: Standings.Type = [],
  tallying: Tallying = TALLY_SHOWN,
): Chrome => ({ scheme, tallying, standings, stage, device, prompt, ending: told, naming: named });

const restartWith = (prompt: Prompt): string => {
  switch (prompt) {
    case KEYS:
      return "Press any key to restart";
    case TOUCH:
      return "Tap to restart";
    default:
      return Assert.never(prompt);
  }
};

export type Scene<B> = {
  readonly current: Game.State<B>;
  readonly previous: Players.Type<B>;
  readonly alpha: number;
  readonly bite: Units.Millis;
};

export const of = <B>(
  current: Game.State<B>,
  previous: Players.Type<B>,
  alpha: number,
  bite: Units.Millis,
): Scene<B> => ({ current, previous, alpha, bite });

type Outcome = { readonly title: string };

const outcome = (title: string): Outcome => ({ title });

const SURROUND_WASH = 0.24;

const PAUSE_SCRIM = Paint.alpha(96);
const OVER_SCRIM = Paint.alpha(140);

const describe = (closing: World.Ending): Outcome => {
  switch (closing) {
    case World.COLLISION:
    case World.TRADED:
      return outcome("GAME OVER");
    case World.FILLED:
      return outcome("YOU WIN");
    default:
      return Assert.never(closing);
  }
};

const TALLY_SIT = 0.62;

const tallyAt = <B>(current: World.Type<B>, layout: Layout.Metrics, frame: Chrome): Units.Point => {
  const block = layout.blockWidth;

  if (!frame.device.some) {
    return Units.point(
      layout.origin.x + (current.board.cols * block) / 2,
      layout.origin.y + block / 2,
    );
  }

  return Units.point(
    frame.stage.left + frame.stage.width / 2,
    frame.stage.top + Hud.plateHeight(block) * TALLY_SIT,
  );
};

export const onScreen = (p: p5, stage: Units.Region, body: () => void): void => {
  const surface = p.drawingContext;

  if (!(surface instanceof CanvasRenderingContext2D)) {
    body();

    return;
  }

  surface.save();
  surface.beginPath();
  surface.roundRect(stage.left, stage.top, stage.width, stage.height, Keys.screenRadius(stage));
  surface.clip();

  body();

  surface.restore();
};

const world = <B>(
  p: p5,
  scheme: Palette.Scheme,
  current: World.Type<B>,
  layout: Layout.Metrics,
  scene: Scene<B>,
  surface: Surface.Surface,
  frame: Chrome,
): void => {
  GridView.draw(p, scheme, current, layout, surface);
  FoodView.draw(p, scheme, current, layout, Units.millis(p.millis()), scene.bite);
  for (const [who, player] of Players.everyone(current.players)) {
    const before = Players.at(scene.previous, who);

    SnakeView.draw(
      p,
      scheme,
      player.snake,
      before.some ? before.value.snake : player.snake,
      scene.alpha,
      layout,
      player.alive ? SnakeView.ALIVE : SnakeView.DEAD,
      scene.bite,
      Turns.next(player.turns),
      Palette.bodyFor(scheme, who),
      taggedAs(frame, who, player.alive),
    );
  }

  if (frame.tallying === TALLY_HIDDEN) return;

  const at = tallyAt(current, layout, frame);

  if (Players.count(current.players) > 1) {
    const room = Math.min(frame.stage.width, current.board.cols * layout.blockWidth);

    StandingsView.draw(
      p,
      scheme,
      layout,
      current,
      frame.standings,
      at,
      room,
      Units.millis(p.millis()),
    );

    return;
  }

  Hud.score(
    p,
    scheme,
    current,
    layout,
    at,
    Players.scored(current.players),
    Units.millis(p.millis()),
  );
};

const taggedAs = (frame: Chrome, who: number, alive: boolean): Option.Type<Tag.Tag> => {
  if (!frame.naming.some || !alive) return Option.none;

  const { tags, mine } = frame.naming.value;
  const name = tags[who] ?? Option.none;
  const ours = mine.some && mine.value === who;

  if (!name.some && !ours) return Option.none;

  return Option.some({ name, mine: ours, above: true });
};

const badgeOf = <B>(current: World.Type<B>, seat: number): Hud.Badge => {
  const sitting = Players.at(current.players, Players.id(seat));

  if (!sitting.some) return Hud.badge(seat, Geometry.RIGHT, SnakeView.ALIVE);

  const player = sitting.value;

  return Hud.badge(seat, player.snake.facing, player.alive ? SnakeView.ALIVE : SnakeView.DEAD);
};

export const crowned = <B>(current: World.Type<B>, told: Ending): Hud.Line =>
  Hud.badged(
    told.who.map((seat) => badgeOf(current, seat)),
    told.title,
    0.9,
  );

const tallied = <B>(current: World.Type<B>, told: Ending): readonly Hud.Line[] =>
  told.tally
    .toSorted((one, other) => other.score - one.score)
    .map((counted) => Hud.badged([badgeOf(current, counted.seat)], `${counted.score}`, 0.38));

export const board = <B>(
  p: p5,
  scene: Scene<B>,
  layout: Layout.Metrics,
  surface: Surface.Surface,
  frame: Chrome,
): void => {
  const { scheme } = frame;

  p.background(scheme.background.red, scheme.background.green, scheme.background.blue);

  if (!frame.device.some) {
    Surface.table(p, surface);
    Clay.surround(p, scheme.shadow, SURROUND_WASH);
    world(p, scheme, scene.current.world, layout, scene, surface, frame);

    return;
  }

  Keys.shell(p, scheme, frame.device.value, frame.stage);
  onScreen(p, frame.stage, () => {
    world(p, scheme, scene.current.world, layout, scene, surface, frame);
  });
};

export const draw = <B>(
  p: p5,
  scene: Scene<B>,
  layout: Layout.Metrics,
  surface: Surface.Surface,
  frame: Chrome,
): void => {
  board(p, scene, layout, surface, frame);

  const state = scene.current;
  const scheme = frame.scheme;

  switch (state.kind) {
    case Game.PLAYING:
      return;

    case Game.PAUSED:
      Hud.tablet(p, scheme, [Hud.line("PAUSED", 0.8)], layout, frame.stage, PAUSE_SCRIM);
      return;

    case Game.OVER: {
      const closing = frame.ending.some
        ? [crowned(state.world, frame.ending.value), ...tallied(state.world, frame.ending.value)]
        : [
            Hud.badged(
              [badgeOf(state.world, Players.FIRST)],
              describe(state.outcome.ending).title,
              0.9,
            ),
            Hud.line(`Score: ${Players.scored(state.world.players)}`, 0.45),
          ];

      Hud.tablet(
        p,
        scheme,
        [...closing, Hud.line(restartWith(frame.prompt), 0.32)],
        layout,
        frame.stage,
        OVER_SCRIM,
      );
      return;
    }

    default:
      return Assert.never(state);
  }
};
