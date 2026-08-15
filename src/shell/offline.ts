import * as Invite from "../net/invite";

const WORKER = "./sw.js";

const NEARBY =
  /^(?:localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

const athome = (): boolean => NEARBY.test(window.location.hostname);

const enrol = (): void => {
  void navigator.serviceWorker.register(WORKER).catch(() => undefined);
};

const forget = async (): Promise<void> => {
  const held = await navigator.serviceWorker.getRegistrations();

  await Promise.all(held.map((one) => one.unregister()));

  if (!("caches" in window)) return;

  const names = await caches.keys();

  await Promise.all(names.map((name) => caches.delete(name)));
};

export const keep = (): void => {
  if (!("serviceWorker" in navigator)) return;

  if (athome() && !Invite.flagged(window.location.href, "pwa")) {
    void forget();

    return;
  }

  if (document.readyState === "complete") {
    enrol();

    return;
  }

  window.addEventListener("load", enrol, { once: true });
};
