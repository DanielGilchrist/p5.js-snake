export type Type<T> = { readonly some: true; readonly value: T } | { readonly some: false };

export const some = <T>(value: T): Type<T> => ({ some: true, value });

export const none: Type<never> = { some: false };

export const getOrElse = <T>(option: Type<T>, fallback: T): T =>
  option.some ? option.value : fallback;
