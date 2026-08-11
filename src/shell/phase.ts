import type * as Rewind from "../render/rewind";

export type Phase<B> =
  | { readonly kind: "ready" }
  | { readonly kind: "live" }
  | { readonly kind: "rewinding"; readonly playback: Rewind.Playback<B> }
  | { readonly kind: "settings"; readonly cursor: number }
  | { readonly kind: "help" }
  | { readonly kind: "frozen" };

export const READY = { kind: "ready" } as const;

export const LIVE = { kind: "live" } as const;

export const HELP = { kind: "help" } as const;

export const FROZEN = { kind: "frozen" } as const;

export const rewinding = <B>(playback: Rewind.Playback<B>): Phase<B> => ({
  kind: "rewinding",
  playback,
});

export const settings = <B>(cursor: number): Phase<B> => ({ kind: "settings", cursor });
