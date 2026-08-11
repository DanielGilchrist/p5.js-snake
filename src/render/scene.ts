import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Option from "../core/option";
import * as Clay from "./clay";
import * as Palette from "./palette";
import * as Keys from "./keys";
import type * as Game from "../core/game";
import * as Players from "../core/players";
import * as Turns from "../core/turns";
import type * as World from "../core/world";
import * as FoodView from "./food";
import * as GridView from "./grid";
import * as Hud from "./hud";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Surface from "./surface";
import * as SnakeView from "./snake";
import * as Units from "./units";

export type Prompt = "keys" | "touch";

export type Chrome = {
  readonly scheme: Palette.Scheme;
  readonly stage: Units.Region;
  readonly device: Option.Type<Units.Region>;
  readonly prompt: Prompt;
};

export const chrome = (
  scheme: Palette.Scheme,
  stage: Units.Region,
  device: Option.Type<Units.Region>,
  prompt: Prompt,
): Chrome => ({ scheme, stage, device, prompt });

const restartWith = (prompt: Prompt): string => {
  switch (prompt) {
    case "keys":
      return "Press any key to restart";
    case "touch":
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

type Outcome = {
  readonly title: string;
  readonly vitality: SnakeView.Vitality;
};

const outcome = (title: string, vitality: SnakeView.Vitality): Outcome => ({ title, vitality });

const SURROUND_WASH = 0.24;

const PAUSE_SCRIM = Paint.alpha(96);
const OVER_SCRIM = Paint.alpha(140);

const describe = (ending: World.Ending): Outcome => {
  switch (ending) {
    case "collision":
      return outcome("GAME OVER", "dead");
    case "filled":
      return outcome("YOU WIN", "alive");
    default:
      return Assert.never(ending);
  }
};

const world = <B>(
  p: p5,
  scheme: Palette.Scheme,
  current: World.Type<B>,
  layout: Layout.Metrics,
  vitality: SnakeView.Vitality,
  scene: Scene<B>,
  surface: Surface.Surface,
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
      vitality,
      scene.bite,
      Turns.next(player.turns),
      Palette.bodyFor(scheme, who),
    );
  }

  Hud.score(p, scheme, current, layout, Players.scored(current.players), Units.millis(p.millis()));
};

const lifeIn = <B>(state: Game.State<B>): SnakeView.Vitality =>
  state.kind === "over" ? describe(state.outcome.ending).vitality : "alive";

export const board = <B>(
  p: p5,
  scene: Scene<B>,
  layout: Layout.Metrics,
  surface: Surface.Surface,
  frame: Chrome,
): void => {
  const { scheme } = frame;

  p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  Surface.table(p, surface);
  Clay.surround(p, scheme.shadow, SURROUND_WASH);

  if (frame.device.some) Keys.shell(p, scheme, frame.device.value, frame.stage);

  world(p, scheme, scene.current.world, layout, lifeIn(scene.current), scene, surface);
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
    case "playing":
      return;

    case "paused":
      Hud.tablet(p, scheme, [Hud.line("PAUSED", 0.8)], layout, frame.stage, PAUSE_SCRIM);
      return;

    case "over": {
      const ending = describe(state.outcome.ending);

      Hud.tablet(
        p,
        scheme,
        [
          Hud.line(ending.title, 0.9),
          Hud.line(`Score: ${Players.scored(state.world.players)}`, 0.45),
          Hud.line(restartWith(frame.prompt), 0.32),
        ],
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
