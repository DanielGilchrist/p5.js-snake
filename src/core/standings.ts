import * as Players from "./players";

export type Type = readonly number[];

export const blank = (players: number): Type => Array.from({ length: players }, () => 0);

export const wonBy = (standings: Type, who: Players.Id): number => standings[who] ?? 0;

export const award = (standings: Type, who: readonly Players.Id[]): Type =>
  standings.map((won, seat) => (who.includes(Players.id(seat)) ? won + 1 : won));

export const points = (standings: Type): number => standings.reduce((total, won) => total + won, 0);

export const ahead = (standings: Type): readonly Players.Id[] => {
  const best = Math.max(...standings, 0);

  if (best === 0) return [];

  return standings.flatMap((won, seat) => (won === best ? [Players.id(seat)] : []));
};
