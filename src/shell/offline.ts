const WORKER = "./sw.js";

const enrol = (): void => {
  void navigator.serviceWorker.register(WORKER).catch(() => undefined);
};

export const keep = (): void => {
  if (!("serviceWorker" in navigator)) return;

  if (document.readyState === "complete") {
    enrol();

    return;
  }

  window.addEventListener("load", enrol, { once: true });
};
