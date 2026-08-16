import * as Option from "../core/option";
import * as Code from "./code";

const KEY = "room";

const fragment = (hash: string): URLSearchParams => new URLSearchParams(hash.replace(/^#/, ""));

export const read = (href: string): Option.Type<Code.Type> => {
  const url = new URL(href);
  const asked = url.searchParams.get(KEY) ?? fragment(url.hash).get(KEY);

  return asked === null ? Option.none : Code.parse(asked);
};

export const flagged = (href: string, name: string): boolean => {
  const url = new URL(href);

  return url.searchParams.has(name) || fragment(url.hash).has(name);
};

const valueOf = (href: string, name: string): Option.Type<string> => {
  const url = new URL(href);
  const asked = url.searchParams.get(name) ?? fragment(url.hash).get(name);

  return asked === null ? Option.none : Option.some(asked);
};

export const counted = (href: string, name: string): Option.Type<number> => {
  const raw = valueOf(href, name);

  if (!raw.some) return Option.none;

  const asked = Number.parseInt(raw.value, 10);

  return Option.some(Number.isFinite(asked) && asked > 0 ? asked : 1);
};

export const link = (base: string, code: Code.Type): string => {
  const url = new URL(base);

  url.hash = "";
  url.search = new URLSearchParams({ [KEY]: code }).toString();

  return url.toString();
};
