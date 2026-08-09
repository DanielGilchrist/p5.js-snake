import * as Option from "./option";

export type List<T> = readonly [T, ...(readonly T[])];

export const head = <T>(xs: List<T>): T => xs[0];

export const prepend = <T>(x: T, xs: readonly T[]): List<T> => [x, ...xs];

export const fromArray = <T>(xs: readonly T[]): Option.Type<List<T>> =>
  xs.length === 0 ? Option.none : Option.some(xs as List<T>);

export const at = <T>(xs: List<T>, index: number): T => xs[index] ?? head(xs);
