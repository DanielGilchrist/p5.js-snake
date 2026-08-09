import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Game from "../core/game";
import type * as Snake from "../core/snake";
import type * as World from "../core/world";
import * as FoodView from "./food";
import * as GridView from "./grid";
import * as Hud from "./hud";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as SnakeView from "./snake";
import * as Palette from "./palette";
import * as Units from "./units";

export type Scene<B> = {
  readonly current: Game.State<B>;
  readonly previous: Snake.State<B>;
  readonly alpha: number;
};

type Outcome = {
  readonly title: string;
  readonly vitality: SnakeView.Vitality;
};

const PAUSE_SCRIM = Paint.alpha(80);
const OVER_SCRIM = Paint.alpha(150);

const describe = (ending: World.Ending): Outcome => {
  switch (ending) {
    case "collision":
      return { title: "GAME OVER", vitality: "dead" };
    case "filled":
      return { title: "YOU WIN", vitality: "alive" };
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
): void => {
  GridView.draw(p, current, layout);
  FoodView.draw(p, current.food, layout, Units.millis(p.millis()));
  SnakeView.draw(p, current.snake, scene.previous, scene.alpha, layout, vitality);
  Hud.score(p, current.score, layout);
};

export const draw = <B>(p: p5, scene: Scene<B>, layout: Layout.Metrics): void => {
  const state = scene.current;

  p.background(Palette.BACKGROUND.red, Palette.BACKGROUND.green, Palette.BACKGROUND.blue);

  switch (state.kind) {
    case "playing":
      world(p, state.world, layout, "alive", scene);
      return;

    case "paused":
      world(p, state.world, layout, "alive", scene);
      Hud.banner(p, [{ text: "PAUSED", size: Units.px(50) }], PAUSE_SCRIM);
      return;

    case "over": {
      const outcome = describe(state.ending);

      world(p, state.world, layout, outcome.vitality, scene);
      Hud.banner(
        p,
        [
          { text: outcome.title, size: Units.px(60) },
          { text: `Score: ${state.world.score}`, size: Units.px(30) },
          { text: "Press any key to restart", size: Units.px(20) },
        ],
        OVER_SCRIM,
      );
      return;
    }

    default:
      return Assert.never(state);
  }
};
