import * as Settings from "../render/settings";
import * as Storage from "./storage";

export const SETTINGS = Storage.slot<Settings.Type>({
  name: "settings",
  fallback: Settings.DEFAULT,
  encode: Settings.encode,
  parse: Settings.parse,
});
