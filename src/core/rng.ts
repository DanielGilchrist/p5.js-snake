import type * as Brand from "./brand";
import * as NonEmpty from "./non-empty";

export type State = Brand.Of<number, "Rng">;

export const fromSeed = (seed: number): State => (seed | 0) as State;

const nextFloat = (state: State): readonly [number, State] => {
  const advanced = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(advanced ^ (advanced >>> 15), 1 | advanced);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  return [value, advanced as State];
};

export const nextInt = (state: State, boundExclusive: number): readonly [number, State] => {
  const [value, next] = nextFloat(state);

  return [Math.floor(value * boundExclusive), next];
};

export const choose = <T>(state: State, xs: NonEmpty.List<T>): readonly [T, State] => {
  const [index, next] = nextInt(state, xs.length);

  return [NonEmpty.at(xs, index), next];
};
