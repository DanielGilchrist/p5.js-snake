import * as Option from "../core/option";

export type Named = "settings";

export type Slot<T> = {
  readonly name: Named;
  readonly fallback: T;
  readonly encode: (value: T) => string;
  readonly parse: (raw: string) => Option.Type<T>;
};

export const slot = <T>(fields: Slot<T>): Slot<T> => ({ ...fields });

export type Store = {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
};

export type Vault = {
  readonly read: <T>(of: Slot<T>) => T;
  readonly write: <T>(of: Slot<T>, value: T) => void;
};

const NAMESPACE = "snake";

const keyOf = (name: Named): string => `${NAMESPACE}.${name}`;

const SEALED: Vault = {
  read: (of) => of.fallback,
  write: () => undefined,
};

export const open = (store: Store): Vault => ({
  read: (of) => {
    try {
      const raw = store.getItem(keyOf(of.name));

      return raw === null ? of.fallback : Option.getOrElse(of.parse(raw), of.fallback);
    } catch {
      return of.fallback;
    }
  },
  write: (of, value) => {
    try {
      store.setItem(keyOf(of.name), of.encode(value));
    } catch {
      return;
    }
  },
});

export const sealed = (): Vault => SEALED;

export const browser = (): Vault => {
  try {
    const probe = keyOf("settings");

    window.localStorage.setItem(probe, window.localStorage.getItem(probe) ?? "");

    return open(window.localStorage);
  } catch {
    return SEALED;
  }
};
