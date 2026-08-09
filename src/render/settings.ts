import * as Assert from "../core/assert";
import * as Option from "../core/option";
import type * as Pad from "./pad";
import * as Palette from "./palette";

export type Theme = "auto" | "earthenware" | "stoneware";

export type Type = {
  readonly theme: Theme;
  readonly hand: Pad.Hand;
};

export const DEFAULT: Type = { theme: "auto", hand: "right" };

export type Choice =
  | { readonly kind: "theme"; readonly value: Theme }
  | { readonly kind: "hand"; readonly value: Pad.Hand };

export const THEMES: readonly Theme[] = ["auto", "earthenware", "stoneware"];

export const HANDS: readonly Pad.Hand[] = ["left", "right"];

export const themeLabel = (theme: Theme): string => {
  switch (theme) {
    case "auto":
      return "Auto";
    case "earthenware":
      return "Light";
    case "stoneware":
      return "Dark";
    default:
      return Assert.never(theme);
  }
};

export const handLabel = (hand: Pad.Hand): string => {
  switch (hand) {
    case "right":
      return "Right";
    case "left":
      return "Left";
    default:
      return Assert.never(hand);
  }
};

export const chosen = (settings: Type, choice: Choice): Type => {
  switch (choice.kind) {
    case "theme":
      return { ...settings, theme: choice.value };
    case "hand":
      return { ...settings, hand: choice.value };
    default:
      return Assert.never(choice);
  }
};

export const schemeFor = (settings: Type, nightly: boolean): Palette.Scheme => {
  switch (settings.theme) {
    case "auto":
      return nightly ? Palette.STONEWARE : Palette.EARTHENWARE;
    case "earthenware":
      return Palette.EARTHENWARE;
    case "stoneware":
      return Palette.STONEWARE;
    default:
      return Assert.never(settings.theme);
  }
};

const themeAt = (index: number): Theme => THEMES[index] ?? "auto";

const handAt = (index: number): Pad.Hand => HANDS[index] ?? "right";

export const cycleTheme = (settings: Type, step: number): Type => {
  const at = THEMES.indexOf(settings.theme);
  const next = (at + step + THEMES.length) % THEMES.length;

  return { ...settings, theme: themeAt(next) };
};

export const cycleHand = (settings: Type, step: number): Type => {
  const at = HANDS.indexOf(settings.hand);
  const next = (at + step + HANDS.length) % HANDS.length;

  return { ...settings, hand: handAt(next) };
};

export const encode = (settings: Type): string => `${settings.theme}:${settings.hand}`;

export const parse = (raw: string): Option.Type<Type> => {
  const parts = raw.split(":");

  if (parts.length !== 2) return Option.none;

  const [theme, hand] = parts;

  return Option.some({
    theme: THEMES.find((it) => it === theme) ?? DEFAULT.theme,
    hand: HANDS.find((it) => it === hand) ?? DEFAULT.hand,
  });
};

export const decode = (raw: string): Type => Option.getOrElse(parse(raw), DEFAULT);
