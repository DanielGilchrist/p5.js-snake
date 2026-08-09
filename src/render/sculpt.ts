import type p5 from "p5";

const TURN = Math.PI * 2;
const CUBIC = 3;

export const hash = (seed: number, index: number): number => {
  const n = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;

  return n - Math.floor(n);
};

export type Lump = {
  readonly radiusX: number;
  readonly radiusY: number;
  readonly lobes: number;
  readonly roughness: number;
  readonly pinch: number;
  readonly seed: number;
};

export const lump = (fields: Lump): Lump => ({ ...fields });

export const press = (p: p5, of: Lump): void => {
  p.beginShape();

  for (let i = -1; i <= of.lobes + 1; i++) {
    const index = ((i % of.lobes) + of.lobes) % of.lobes;
    const angle = (index / of.lobes) * TURN;
    const wobble = 1 + (hash(of.seed, index) - 0.5) * of.roughness;
    const taper = 1 + of.pinch * Math.sin(angle);

    p.splineVertex(
      Math.cos(angle) * of.radiusX * wobble * taper,
      Math.sin(angle) * of.radiusY * wobble,
    );
  }

  p.endShape();
};

export const stalk = (p: p5, base: number, height: number, thickness: number): void => {
  const lean = thickness * 0.7;

  p.beginShape();
  p.vertex(-thickness, base);
  p.vertex(thickness, base);
  p.vertex(lean + thickness * 0.35, base - height);
  p.vertex(lean - thickness * 0.35, base - height);
  p.endShape(p.CLOSE);
};

export const leaf = (p: p5, length: number, width: number): void => {
  p.beginShape();
  p.bezierOrder(CUBIC);
  p.vertex(0, 0);
  p.bezierVertex(width * 0.9, -width * 0.6);
  p.bezierVertex(length * 0.75, -width * 0.5);
  p.bezierVertex(length, 0);
  p.bezierVertex(length * 0.75, width * 0.5);
  p.bezierVertex(width * 0.9, width * 0.6);
  p.bezierVertex(0, 0);
  p.endShape(p.CLOSE);
};
