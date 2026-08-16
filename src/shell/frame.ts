import * as Layout from "../render/layout";
import * as Pad from "../render/pad";
import * as Render from "../render";
import type * as Units from "../render/units";

export const DESK = "desk";
export const HANDHELD = "handheld";

export type Frame =
  | { readonly kind: typeof DESK; readonly stage: Units.Region }
  | {
      readonly kind: typeof HANDHELD;
      readonly stage: Units.Region;
      readonly device: Units.Region;
      readonly pad: Pad.Pad;
    };

export const touchFirst = (): boolean => window.matchMedia("(pointer: coarse)").matches;

export const of = (viewport: Units.Viewport, hand: Pad.Hand): Frame => {
  if (!touchFirst()) return { kind: DESK, stage: Layout.desk(viewport) };

  const handheld = Pad.arrange(viewport, hand);

  return {
    kind: HANDHELD,
    stage: handheld.stage,
    device: handheld.device,
    pad: handheld.pad,
  };
};

export const handheld = (frame: Frame): boolean => frame.kind === HANDHELD;

export const promptFor = (frame: Frame): Render.Prompt =>
  frame.kind === HANDHELD ? Render.TOUCH : Render.KEYS;
