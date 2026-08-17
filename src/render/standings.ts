import type p5 from "p5";

import * as Players from "../core/players";
import * as Standings from "../core/standings";
import type * as World from "../core/world";
import * as Hud from "./hud";
import type * as Layout from "./layout";
import * as Palette from "./palette";
import * as SnakeView from "./snake";
import * as Units from "./units";

const DIGIT_RATIO = 0.42;
const HEAD_RATIO = 0.46;
const HEAD_GAP = 0.26;
const HEAD_SIT = 0.02;
const PLATE_PAD = 0.5;
const BETWEEN = 0.34;

const BOB_PACE = 620;
const BOB_DEPTH = 0.05;
const BOB_STAGGER = 1.7;

const bobbing = (now: Units.Millis, seat: number): number =>
  1 + Math.sin(now / BOB_PACE + seat * BOB_STAGGER) * BOB_DEPTH;

export const draw = <B>(
  p: p5,
  scheme: Palette.Scheme,
  layout: Layout.Metrics,
  world: World.Type<B>,
  standings: Standings.Type,
  middle: Units.Point,
  room: number,
  now: Units.Millis,
): void => {
  const block = layout.blockWidth;
  const height = Hud.plateHeight(block);

  p.push();
  p.noStroke();
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(block * DIGIT_RATIO);

  const seated = Players.everyone(world.players);
  const crown = block * HEAD_RATIO;
  const labels = seated.map(([who]) => `${Standings.wonBy(standings, who)}`);
  const widths = labels.map(
    (label) => crown + block * HEAD_GAP + p.textWidth(label) + block * PLATE_PAD * 2,
  );
  const gap = block * BETWEEN;
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  const squeeze = Math.min(1, room / Math.max(total, 1));

  p.translate(middle.x, middle.y);
  p.scale(squeeze);

  let left = -total / 2;

  for (const [seat, [, player]] of seated.entries()) {
    const label = labels[seat] ?? "";
    const width = widths[seat] ?? 0;
    const group = crown + block * HEAD_GAP + p.textWidth(label);

    p.push();
    p.translate(left + width / 2, 0);

    Hud.plate(p, scheme, width, height, block);

    SnakeView.head(
      p,
      scheme,
      Units.point(-group / 2 + crown / 2, block * HEAD_SIT),
      crown * bobbing(now, seat),
      Palette.bodyFor(scheme, seat),
      player.snake.facing,
      player.alive ? SnakeView.ALIVE : SnakeView.DEAD,
    );

    Hud.engrave(p, scheme, label, group / 2 - p.textWidth(label) / 2, 0, block);

    p.pop();

    left += width + gap;
  }

  p.pop();
};
