export type NonEmpty<T> = readonly [T, ...(readonly T[])];

export const head = <T>(xs: NonEmpty<T>): T => xs[0];

export const prepend = <T>(x: T, xs: readonly T[]): NonEmpty<T> => [x, ...xs];

export const fromArray = <T>(xs: readonly T[]): NonEmpty<T> | undefined =>
  xs.length === 0 ? undefined : (xs as NonEmpty<T>);

export const at = <T>(xs: NonEmpty<T>, index: number): T => xs[index] ?? head(xs);
