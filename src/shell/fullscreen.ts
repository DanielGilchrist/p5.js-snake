const LIFT = "pointerup";

export const filling = (): boolean => document.fullscreenElement !== null;

export const offered = (): boolean =>
  typeof document.documentElement.requestFullscreen === "function";

const swap = (): void => {
  if (filling()) {
    void document.exitFullscreen?.().catch(() => undefined);

    return;
  }

  void document.documentElement
    .requestFullscreen?.({ navigationUI: "hide" })
    .catch(() => undefined);
};

let wanted = false;

// a touch only counts as a gesture once the finger lifts, so the swap waits for it
const lifted = (): void => {
  if (!wanted) return;

  wanted = false;
  swap();
};

window.addEventListener(LIFT, lifted);

export const ask = (): void => {
  wanted = true;
};
