export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type Option<T> = { readonly some: true; readonly value: T } | { readonly some: false };

export const some = <T>(value: T): Option<T> => ({ some: true, value });

export const none: Option<never> = { some: false };

export const getOrElse = <T>(option: Option<T>, fallback: T): T =>
  option.some ? option.value : fallback;

export const assertNever = (x: never): never => {
  throw new Error(`unreachable: ${JSON.stringify(x)}`);
};
