import * as Option from "./option";
import * as Players from "./players";
import type * as World from "./world";

export const winner = <B>(
  outcome: World.Outcome,
  players: Players.Type<B>,
): Option.Type<Players.Id> => {
  const standing = Players.living(players);

  if (outcome.ending === "collision" && standing.length === 1 && standing[0] !== undefined) {
    return Option.some(standing[0]);
  }

  return Players.drawn(players) ? Option.none : Option.some(Players.leader(players));
};

export const mineToLose = <B>(
  outcome: World.Outcome,
  mine: Players.Id,
  players: Players.Type<B>,
): string => {
  const won = winner(outcome, players);

  if (!won.some) return "A DRAW";

  return won.value === mine ? "YOU WIN" : "THEY WIN";
};
