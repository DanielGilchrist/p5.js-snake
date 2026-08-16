export type Type = {
  readonly players: number;
  readonly growth: number;
};

export const SOLO: Type = { players: 1, growth: 0 };

export const PAIR: Type = { players: 2, growth: 0 };

export const forPlayers = (players: number, growth = 0): Type => ({
  players: Math.max(1, players),
  growth: Math.max(0, growth),
});
