declare const DEBUG_BUILD: boolean | undefined;

export const debugging = (): boolean => (typeof DEBUG_BUILD === "boolean" ? DEBUG_BUILD : true);
