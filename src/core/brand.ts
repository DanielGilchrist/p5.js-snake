declare const brand: unique symbol;

export type Of<T, B extends string> = T & { readonly [brand]: B };
