import type * as Brand from "../core/brand";
import type * as World from "../core/world";

export type Rgb = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
};

export type Tint = Brand.Of<number, "Tint">;

const tint = (n: number): Tint => n as Tint;

const rgb = (red: number, green: number, blue: number): Rgb => ({ red, green, blue });

export type Body = {
  readonly skin: Rgb;
  readonly deep: Rgb;
};

export type Scheme = {
  readonly background: Rgb;
  readonly body: Rgb;
  readonly wall: Rgb;
  readonly floor: Rgb;
  readonly shadow: Rgb;
  readonly paper: Rgb;
  readonly dust: Rgb;
  readonly text: Rgb;
  readonly mark: Rgb;
  readonly markEdge: Rgb;
  readonly relief: number;
  readonly eye: Rgb;
  readonly clays: Clays;
  readonly blood: Rgb;
  readonly bloodDeep: Rgb;
  readonly food: Rgb;
  readonly foodDeep: Rgb;
  readonly plum: Rgb;
  readonly plumDeep: Rgb;
  readonly berry: Rgb;
  readonly berryDeep: Rgb;
  readonly ochre: Rgb;
  readonly ochreDeep: Rgb;
  readonly leaf: Rgb;
  readonly stem: Rgb;
};

type Tone = { readonly skin: Rgb; readonly deep: Rgb };

const tone = (skin: Rgb, deep: Rgb): Tone => ({ skin, deep });

type Clays = readonly [Tone, Tone, Tone, Tone, Tone, Tone, Tone, Tone];

const scheme = (fields: Scheme): Scheme => ({ ...fields });

export const EARTHENWARE: Scheme = scheme({
  background: rgb(168, 157, 143),
  body: rgb(205, 192, 174),
  wall: rgb(190, 174, 154),
  floor: rgb(233, 225, 210),
  shadow: rgb(104, 84, 66),
  paper: rgb(251, 246, 238),
  dust: rgb(224, 210, 190),
  text: rgb(84, 68, 55),
  mark: rgb(72, 58, 46),
  markEdge: rgb(251, 246, 238),
  relief: 165,
  eye: rgb(72, 58, 46),
  clays: [
    tone(rgb(122, 150, 116), rgb(96, 122, 92)),
    tone(rgb(150, 126, 154), rgb(120, 98, 126)),
    tone(rgb(112, 140, 166), rgb(86, 112, 136)),
    tone(rgb(198, 154, 88), rgb(166, 124, 62)),
    tone(rgb(196, 126, 128), rgb(164, 96, 100)),
    tone(rgb(104, 156, 148), rgb(78, 126, 120)),
    tone(rgb(206, 184, 138), rgb(174, 152, 108)),
    tone(rgb(126, 128, 148), rgb(98, 100, 120)),
  ],
  blood: rgb(146, 40, 34),
  bloodDeep: rgb(104, 24, 20),
  food: rgb(203, 104, 82),
  foodDeep: rgb(170, 80, 62),
  plum: rgb(141, 95, 116),
  plumDeep: rgb(112, 72, 92),
  berry: rgb(172, 84, 78),
  berryDeep: rgb(140, 63, 59),
  ochre: rgb(198, 154, 84),
  ochreDeep: rgb(166, 124, 62),
  leaf: rgb(143, 160, 106),
  stem: rgb(112, 89, 66),
});

export const STONEWARE: Scheme = scheme({
  background: rgb(42, 38, 34),
  body: rgb(86, 78, 68),
  wall: rgb(74, 66, 58),
  floor: rgb(100, 90, 79),
  shadow: rgb(16, 13, 11),
  paper: rgb(236, 228, 214),
  dust: rgb(150, 138, 122),
  text: rgb(232, 223, 208),
  mark: rgb(232, 223, 208),
  markEdge: rgb(18, 15, 12),
  relief: 42,
  eye: rgb(24, 20, 17),
  clays: [
    tone(rgb(148, 178, 136), rgb(112, 140, 102)),
    tone(rgb(176, 148, 182), rgb(132, 108, 138)),
    tone(rgb(134, 168, 200), rgb(98, 128, 158)),
    tone(rgb(222, 178, 104), rgb(180, 138, 72)),
    tone(rgb(218, 144, 146), rgb(176, 108, 112)),
    tone(rgb(122, 182, 172), rgb(88, 142, 136)),
    tone(rgb(224, 202, 152), rgb(184, 162, 116)),
    tone(rgb(148, 152, 176), rgb(112, 116, 140)),
  ],
  blood: rgb(158, 36, 30),
  bloodDeep: rgb(112, 22, 18),
  food: rgb(232, 138, 108),
  foodDeep: rgb(196, 108, 82),
  plum: rgb(190, 132, 162),
  plumDeep: rgb(156, 100, 130),
  berry: rgb(224, 124, 114),
  berryDeep: rgb(186, 92, 84),
  ochre: rgb(224, 180, 110),
  ochreDeep: rgb(190, 146, 82),
  leaf: rgb(168, 190, 126),
  stem: rgb(146, 120, 92),
});

const TINT_RANGE = 6;

export const shift = (colour: Rgb, by: Tint): Rgb =>
  rgb(colour.red + by, colour.green + by, colour.blue + by);

export const floorTint = (variant: World.Variant): Tint =>
  tint((variant % (TINT_RANGE * 2)) - TINT_RANGE);

export const bodies = (of: Scheme): number => of.clays.length;

export const bodyFor = (of: Scheme, seat: number): Body =>
  of.clays[seat % of.clays.length] ?? of.clays[0];
