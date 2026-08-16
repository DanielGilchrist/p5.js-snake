import type * as Palette from "../render/palette";

const THEME = 'meta[name="theme-color"]';

const inked = (colour: Palette.Rgb): string =>
  `rgb(${colour.red}, ${colour.green}, ${colour.blue})`;

export const paint = (colour: Palette.Rgb): void => {
  const shade = inked(colour);

  document.body.style.backgroundColor = shade;
  document.documentElement.style.backgroundColor = shade;

  const tag = document.head.querySelector(THEME);

  if (tag instanceof HTMLMetaElement) tag.content = shade;
};
