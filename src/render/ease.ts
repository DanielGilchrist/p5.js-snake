export const fadeOut = (t: number, sharpness: number): number => (1 - t) ** sharpness;

export const inQuad = (t: number): number => t * t;

const BACK = 1.70158;

export const outBack = (t: number): number => 1 + (BACK + 1) * (t - 1) ** 3 + BACK * (t - 1) ** 2;
