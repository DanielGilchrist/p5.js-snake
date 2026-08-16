import * as Option from "../core/option";
import * as Players from "../core/players";

export type Type = readonly string[];

export const MOST = 8;
export const FEWEST = 2;

export const clamp = (size: number): number => Math.min(MOST, Math.max(FEWEST, size));

export const seated = (roster: Type, size: number): Type => roster.slice(0, clamp(size));

export const seatOf = (roster: Type, who: string): Option.Type<Players.Id> => {
  const found = roster.indexOf(who);

  return found < 0 ? Option.none : Option.some(Players.id(found));
};

export const holds = (roster: Type, who: string): boolean => roster.includes(who);

export const joined = (roster: Type, who: string): Type =>
  roster.includes(who) ? roster : [...roster, who];

export const left = (roster: Type, who: string): Type => roster.filter((other) => other !== who);

export const full = (roster: Type, size: number): boolean => roster.length >= clamp(size);
