import * as Assert from "../core/assert";
import * as Option from "../core/option";
import * as Pad from "./pad";
import * as Palette from "./palette";

export const AUTO = "auto";
export const EARTHENWARE = "earthenware";
export const STONEWARE = "stoneware";

export type Theme = typeof AUTO | typeof EARTHENWARE | typeof STONEWARE;

export type Type = {
  readonly theme: Theme;
  readonly hand: Pad.Hand;
};

export const DEFAULT: Type = { theme: AUTO, hand: Pad.RIGHT_HAND };

export const THEME = "theme";
export const HAND = "hand";

export type Choice =
  | { readonly kind: typeof THEME; readonly value: Theme }
  | { readonly kind: typeof HAND; readonly value: Pad.Hand };

export const THEMES: readonly Theme[] = [AUTO, EARTHENWARE, STONEWARE];

export const HANDS: readonly Pad.Hand[] = [Pad.LEFT_HAND, Pad.RIGHT_HAND];

export const themeLabel = (theme: Theme): string => {
  switch (theme) {
    case AUTO:
      return "Auto";
    case EARTHENWARE:
      return "Light";
    case STONEWARE:
      return "Dark";
    default:
      return Assert.never(theme);
  }
};

export const handLabel = (hand: Pad.Hand): string => {
  switch (hand) {
    case Pad.RIGHT_HAND:
      return "Right";
    case Pad.LEFT_HAND:
      return "Left";
    default:
      return Assert.never(hand);
  }
};

export const chosen = (settings: Type, choice: Choice): Type => {
  switch (choice.kind) {
    case THEME:
      return { ...settings, theme: choice.value };
    case HAND:
      return { ...settings, hand: choice.value };
    default:
      return Assert.never(choice);
  }
};

export const schemeFor = (settings: Type, nightly: boolean): Palette.Scheme => {
  switch (settings.theme) {
    case AUTO:
      return nightly ? Palette.STONEWARE : Palette.EARTHENWARE;
    case EARTHENWARE:
      return Palette.EARTHENWARE;
    case STONEWARE:
      return Palette.STONEWARE;
    default:
      return Assert.never(settings.theme);
  }
};

const themeAt = (index: number): Theme => THEMES[index] ?? AUTO;

const handAt = (index: number): Pad.Hand => HANDS[index] ?? Pad.RIGHT_HAND;

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
