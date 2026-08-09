export type Type<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Type<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Type<never, E> => ({ ok: false, error });
