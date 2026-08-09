export const unreachable: (reason: string) => never = (reason) => {
  throw new Error(`unreachable: ${reason}`);
};

export const never: (x: never) => never = (x) => unreachable(JSON.stringify(x));
