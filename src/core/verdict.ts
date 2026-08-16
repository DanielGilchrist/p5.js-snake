import * as Option from "./option";
import * as Players from "./players";
import * as World from "./world";

const outlived = <B>(outcome: World.Outcome, players: Players.Type<B>): Option.Type<Players.Id> => {
  const standing = Players.living(players);

  if (outcome.ending !== World.COLLISION || standing.length !== 1 || standing[0] === undefined) {
    return Option.none;
  }

  return Option.some(standing[0]);
};

export const onScore = <B>(outcome: World.Outcome, players: Players.Type<B>): boolean =>
  outcome.ending !== World.TRADED && !outlived(outcome, players).some;

export const winner = <B>(
  outcome: World.Outcome,
  players: Players.Type<B>,
): Option.Type<Players.Id> => {
  if (outcome.ending === World.TRADED) return Option.none;

  const survivor = outlived(outcome, players);

  if (survivor.some) return survivor;

  return Players.drawn(players) ? Option.none : Option.some(Players.leader(players));
};

const HEADS_UP = 2;

export const rewarded = <B>(
  outcome: World.Outcome,
  players: Players.Type<B>,
  fallen: readonly Players.Id[],
): readonly Players.Id[] => {
  const won = winner(outcome, players);

  if (won.some) return [won.value];

  if (Players.count(players) <= HEADS_UP) return [];

  return [...Players.living(players), ...fallen];
};
