export type Signals = {
  readonly here: boolean;
  readonly there: boolean;
  readonly playing: boolean;
};

export const signals = (here: boolean, there: boolean, playing: boolean): Signals => ({
  here,
  there,
  playing,
});

export const settled = (of: Signals): boolean => of.here && (of.there || of.playing);
