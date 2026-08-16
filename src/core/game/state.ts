import * as Assert from "../assert";
import * as World from "../world";

export const PLAYING = "playing";
export const PAUSED = "paused";
export const OVER = "over";

export type Type<B> =
  | { readonly kind: typeof PLAYING; readonly world: World.Type<B> }
  | { readonly kind: typeof PAUSED; readonly world: World.Type<B> }
  | { readonly kind: typeof OVER; readonly world: World.Type<B>; readonly outcome: World.Outcome };

type Kind = Type<never>["kind"];
type Fields<B, K extends Kind> = Omit<Extract<Type<B>, { kind: K }>, "kind">;

export const playing = <B>(fields: Fields<B, typeof PLAYING>): Type<B> => ({
  kind: PLAYING,
  ...fields,
});

export const paused = <B>(fields: Fields<B, typeof PAUSED>): Type<B> => ({
  kind: PAUSED,
  ...fields,
});

export const over = <B>(fields: Fields<B, typeof OVER>): Type<B> => ({ kind: OVER, ...fields });

export const withWorld = <B>(state: Type<B>, world: World.Type<B>): Type<B> => {
  switch (state.kind) {
    case PLAYING:
      return playing({ world });
    case PAUSED:
      return paused({ world });
    case OVER:
      return over({ world, outcome: state.outcome });
    default:
      return Assert.never(state);
  }
};
