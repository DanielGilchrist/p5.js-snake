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

export const link = (base: string, code: Code.Type): string => {
  const url = new URL(base);

  url.hash = "";
  url.search = new URLSearchParams({ [KEY]: code }).toString();

  return url.toString();
};
