export const unreachable: (reason: string) => never = (reason) => {
  throw new Error(`Should be unreachable: ${reason}`);
};

export const never: (x: never) => never = (x) => unreachable(JSON.stringify(x));
