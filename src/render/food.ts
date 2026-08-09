import type p5 from "p5";

import type * as World from "../core/world";
import * as Ease from "./ease";
import * as Layout from "./layout";
import * as Morsel from "./morsel";
import * as Paint from "./paint";
import * as Palette from "./palette";
import type * as Units from "./units";

const SPROUT_MS = 320;

const CONTACT_WIDTH = 0.86;
const CONTACT_HEIGHT = 0.2;
const CONTACT_DROP = 0.34;
const CONTACT_ALPHA = 70;

export const draw = <B>(
  p: p5,
  scheme: Palette.Scheme,
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
  const { breath, lean } = Morsel.stir(world, now);
  const swell = Ease.outBack(arrival);

  const width = block * crop.width * swell * breath;
  const height = block * crop.height * swell * (2 - breath);

  p.noStroke();
  Paint.fillWith(p, scheme.shadow, Paint.alpha(CONTACT_ALPHA * arrival));
  p.ellipse(
    centre.x,
    centre.y + block * CONTACT_DROP,
    width * CONTACT_WIDTH,
    block * CONTACT_HEIGHT,
  );

  p.push();
  p.translate(centre.x, centre.y);
  p.rotate(lean);

  Morsel.draw(p, scheme, crop, seed, width, height);

  p.pop();
};
