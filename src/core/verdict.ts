import * as Players from "./players";
import type * as World from "./world";

const WON = "YOU WIN";
const LOST = "THEY WIN";
const DRAWN = "A DRAW";

export const of = <B>(
  outcome: World.Outcome,
  mine: Players.Id,
  players: Players.Type<B>,
): string => {
  const standing = Players.living(players);

  if (outcome.ending === "collision" && standing.length === 1) {
    return standing[0] === mine ? WON : LOST;
  }

  if (Players.drawn(players)) return DRAWN;

  return Players.leader(players) === mine ? WON : LOST;
};
