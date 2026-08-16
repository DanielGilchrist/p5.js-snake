import * as Option from "../core/option";
import * as Code from "./code";

const KEY = "room";

const fragment = (hash: string): URLSearchParams => new URLSearchParams(hash.replace(/^#/, ""));

export const NOBODY = "nobody";
export const ROOM = "room";
export const MALFORMED = "malformed";

export type Asked =
  | { readonly kind: typeof NOBODY }
  | { readonly kind: typeof ROOM; readonly code: Code.Type }
  | { readonly kind: typeof MALFORMED; readonly raw: string };

export const asked = (href: string): Asked => {
  const url = new URL(href);
  const raw = url.searchParams.get(KEY) ?? fragment(url.hash).get(KEY);

  if (raw === null) return { kind: NOBODY };

  const code = Code.parse(raw);

  return code.some ? { kind: ROOM, code: code.value } : { kind: MALFORMED, raw };
};

export const flagged = (href: string, name: string): boolean => {
  const url = new URL(href);

  return url.searchParams.has(name) || fragment(url.hash).has(name);
};

export const valued = (href: string, name: string): Option.Type<string> => {
  const url = new URL(href);
  const held = url.searchParams.get(name) ?? fragment(url.hash).get(name);

  return held === null ? Option.none : Option.some(held);
};

export const counted = (href: string, name: string): Option.Type<number> => {
  const raw = valued(href, name);

  if (!raw.some) return Option.none;

  const count = Number.parseInt(raw.value, 10);

  return Option.some(Number.isFinite(count) && count > 0 ? count : 1);
};

export const link = (base: string, code: Code.Type): string => {
  const url = new URL(base);

  url.hash = "";
  url.search = new URLSearchParams({ [KEY]: code }).toString();

  return url.toString();
};
