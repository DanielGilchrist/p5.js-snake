import type * as Option from "./option";
import * as Players from "./players";

export type Type = readonly number[];

export const blank = (players: number): Type => Array.from({ length: players }, () => 0);

export const wonBy = (standings: Type, who: Players.Id): number => standings[who] ?? 0;

export const award = (standings: Type, who: Option.Type<Players.Id>): Type =>
  who.some ? standings.map((won, seat) => (seat === who.value ? won + 1 : won)) : standings;

export const rounds = (standings: Type): number =>
  standings.reduce((played, won) => played + won, 0);

export const ahead = (standings: Type): readonly Players.Id[] => {
  const best = Math.max(...standings, 0);

  if (best === 0) return [];

  return standings.flatMap((won, seat) => (won === best ? [Players.id(seat)] : []));
};
