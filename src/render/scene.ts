import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Clay from "./clay";
import type * as Game from "../core/game";
import type * as Snake from "../core/snake";
import type * as World from "../core/world";
import * as FoodView from "./food";
import * as GridView from "./grid";
import * as Hud from "./hud";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Surface from "./surface";
import * as SnakeView from "./snake";
import * as Palette from "./palette";
import * as Units from "./units";

export type Scene<B> = {
  readonly current: Game.State<B>;
  readonly previous: Snake.State<B>;
  readonly alpha: number;
  readonly bite: Units.Millis;
};

export const of = <B>(
  current: Game.State<B>,
  previous: Snake.State<B>,
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
  current: World.Type<B>,
  layout: Layout.Metrics,
  vitality: SnakeView.Vitality,
  scene: Scene<B>,
  surface: Surface.Surface,
): void => {
  GridView.draw(p, current, layout, surface);
  FoodView.draw(p, current, layout, Units.millis(p.millis()), scene.bite);
  SnakeView.draw(p, current.snake, scene.previous, scene.alpha, layout, vitality, scene.bite);
  Hud.score(p, current, layout, current.score);
};

export const draw = <B>(
  p: p5,
  scene: Scene<B>,
  layout: Layout.Metrics,
  surface: Surface.Surface,
): void => {
  const state = scene.current;

  p.background(Palette.BACKGROUND.red, Palette.BACKGROUND.green, Palette.BACKGROUND.blue);
  Surface.table(p, surface);
  Clay.surround(p, Palette.SHADOW, SURROUND_WASH);

  switch (state.kind) {
    case "playing":
      world(p, state.world, layout, "alive", scene, surface);
      return;

    case "paused":
      world(p, state.world, layout, "alive", scene, surface);
      Hud.tablet(p, [Hud.line("PAUSED", 0.8)], layout, PAUSE_SCRIM);
      return;

    case "over": {
      const ending = describe(state.ending);

      world(p, state.world, layout, ending.vitality, scene, surface);
      Hud.tablet(
        p,
        [
          Hud.line(ending.title, 0.9),
          Hud.line(`Score: ${state.world.score}`, 0.45),
          Hud.line("Press any key to restart", 0.32),
        ],
        layout,
        OVER_SCRIM,
      );
      return;
    }

    default:
      return Assert.never(state);
  }
};
