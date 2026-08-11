import type * as Brand from "../core/brand";
import * as Option from "../core/option";

const ALPHABET = "023456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 6;

export type Type = Brand.Of<string, "RoomCode">;

export const parse = (raw: string): Option.Type<Type> => {
  const upper = raw.trim().toUpperCase();
  const bound = upper.length === LENGTH && [...upper].every((letter) => ALPHABET.includes(letter));

  return bound ? Option.some(upper as Type) : Option.none;
};

export const fresh = (): Type => {
  const drawn = new Uint8Array(LENGTH);

  crypto.getRandomValues(drawn);

  return [...drawn].map((byte) => ALPHABET[byte % ALPHABET.length] ?? "").join("") as Type;
};
