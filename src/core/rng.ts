import type { Brand } from "./brand";
import { at, type NonEmpty } from "./non-empty";

export type Rng = Brand<number, "Rng">;

export const rng = (seed: number): Rng => (seed | 0) as Rng;

export const nextFloat = (state: Rng): readonly [number, Rng] => {
  const advanced = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(advanced ^ (advanced >>> 15), 1 | advanced);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  return [value, advanced as Rng];
};

export const nextInt = (state: Rng, boundExclusive: number): readonly [number, Rng] => {
  const [value, next] = nextFloat(state);

  return [Math.floor(value * boundExclusive), next];
};

export const choose = <T>(state: Rng, xs: NonEmpty<T>): readonly [T, Rng] => {
  const [index, next] = nextInt(state, xs.length);

  return [at(xs, index), next];
};
