import type * as Brand from "./brand";
import * as NonEmpty from "./non-empty";
import * as Option from "./option";
import type * as Player from "./player";

export type Id = Brand.Of<number, "PlayerId">;

export const id = (index: number): Id => index as Id;

export const FIRST = id(0);

export type Type<B> = NonEmpty.List<Player.Type<B>>;

export type Seated<B> = readonly [Id, Player.Type<B>];

export const of = <B>(first: Player.Type<B>, rest: readonly Player.Type<B>[]): Type<B> =>
  NonEmpty.prepend(first, rest);

export const count = <B>(players: Type<B>): number => players.length;

export const at = <B>(players: Type<B>, who: Id): Option.Type<Player.Type<B>> => {
  const found = players[who];

  return found === undefined ? Option.none : Option.some(found);
};

export const change = <B>(
  players: Type<B>,
  who: Id,
  next: (player: Player.Type<B>) => Player.Type<B>,
): Type<B> => {
  const changed = players.map((player, index) => (index === who ? next(player) : player));

  return NonEmpty.prepend(changed[0] ?? NonEmpty.head(players), changed.slice(1));
};

export const everyone = <B>(players: Type<B>): NonEmpty.List<Seated<B>> => {
  const seated = players.map((player, index): Seated<B> => [id(index), player]);
  const [first, ...rest] = seated;

  return NonEmpty.prepend(first ?? [FIRST, NonEmpty.head(players)], rest);
};

export const living = <B>(players: Type<B>): readonly Id[] =>
  everyone(players)
    .filter(([, player]) => player.alive)
    .map(([who]) => who);

export const scored = <B>(players: Type<B>): number =>
  players.reduce((total, player) => total + player.score, 0);

export const leader = <B>(players: Type<B>): Id => {
  let best = FIRST;

  for (const [who, player] of everyone(players)) {
    const rival = at(players, best);

    if (rival.some && player.score > rival.value.score) best = who;
  }

  return best;
};

export const drawn = <B>(players: Type<B>): boolean => {
  const top = at(players, leader(players));

  if (!top.some) return false;

  return players.filter((player) => player.score === top.value.score).length > 1;
};
