import type p5 from "p5";

import type * as World from "../core/world";
import * as Ease from "./ease";
import * as Layout from "./layout";
import * as Morsel from "./morsel";
import * as Paint from "./paint";
import * as Palette from "./palette";
import type * as Units from "./units";

const SPROUT_MS = 320;

const STOP_MOTION_FPS = 12;

const CALM_BREATH_RATE = 0.0026;
const EAGER_BREATH_RATE = 0.011;
const CALM_BREATH_DEPTH = 0.02;
const EAGER_BREATH_DEPTH = 0.06;
const EAGER_LEAN = 0.09;

const TENSION_RANGE = 6;

const CONTACT_WIDTH = 0.86;
const CONTACT_HEIGHT = 0.2;
const CONTACT_DROP = 0.34;
const CONTACT_ALPHA = 70;

const tensionOf = <B>(world: World.Type<B>): number => {
  const distance = Math.hypot(
    world.food.col - world.snake.head.col,
    world.food.row - world.snake.head.row,
  );

  return Math.min(1, Math.max(0, 1 - distance / TENSION_RANGE));
};

const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

const framed = (now: Units.Millis): number =>
  Math.floor((now * STOP_MOTION_FPS) / 1000) * (1000 / STOP_MOTION_FPS);

export const draw = <B>(
  p: p5,
  world: World.Type<B>,
  layout: Layout.Metrics,
  now: Units.Millis,
  born: Units.Millis,
): void => {
  const arrival = Math.min(1, Math.max(0, (now - born) / SPROUT_MS));

  if (arrival <= 0) return;

  const block = layout.blockWidth;
  const centre = Layout.centreOf(layout, world.food);
  const crop = Morsel.at(world.food);
  const seed = Morsel.seedAt(world.food);
  const tension = tensionOf(world);

  const posed = framed(now);
  const beat = Math.sin(posed * mix(CALM_BREATH_RATE, EAGER_BREATH_RATE, tension));
  const breath = 1 + beat * mix(CALM_BREATH_DEPTH, EAGER_BREATH_DEPTH, tension);
  const lean = beat * EAGER_LEAN * tension;
  const swell = Ease.outBack(arrival);

  const width = block * crop.width * swell * breath;
  const height = block * crop.height * swell * (2 - breath);

  p.noStroke();
  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(CONTACT_ALPHA * arrival));
  p.ellipse(
    centre.x,
    centre.y + block * CONTACT_DROP,
    width * CONTACT_WIDTH,
    block * CONTACT_HEIGHT,
  );

  p.push();
  p.translate(centre.x, centre.y);
  p.rotate(lean);

  Morsel.draw(p, crop, seed, width, height);

  p.pop();
};
