import * as Assert from "../assert";
import * as World from "../world";

export type Type<B> =
  | { readonly kind: "playing"; readonly world: World.Type<B> }
  | { readonly kind: "paused"; readonly world: World.Type<B> }
  | { readonly kind: "over"; readonly world: World.Type<B>; readonly outcome: World.Outcome };

type Kind = Type<never>["kind"];
type Fields<B, K extends Kind> = Omit<Extract<Type<B>, { kind: K }>, "kind">;

export const playing = <B>(fields: Fields<B, "playing">): Type<B> => ({
  kind: "playing",
  ...fields,
});

export const paused = <B>(fields: Fields<B, "paused">): Type<B> => ({ kind: "paused", ...fields });

export const over = <B>(fields: Fields<B, "over">): Type<B> => ({ kind: "over", ...fields });

export const withWorld = <B>(state: Type<B>, world: World.Type<B>): Type<B> => {
  switch (state.kind) {
    case "playing":
      return playing({ world });
    case "paused":
      return paused({ world });
    case "over":
      return over({ world, outcome: state.outcome });
    default:
      return Assert.never(state);
  }
};
