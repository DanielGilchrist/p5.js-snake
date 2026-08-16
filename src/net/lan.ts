import { joinRoom, selfId } from "trystero";
import type { Room } from "@trystero-p2p/core";

import type * as Code from "./code";

const APP_ID = "danielgilchrist-p5js-snake";

const LAN_ONLY: RTCConfiguration = { iceServers: [] };

const REDUNDANCY = 3;

export const JOIN = "join";
export const RELAY = "relay";

export type Fault =
  | { readonly kind: typeof JOIN; readonly why: string }
  | { readonly kind: typeof RELAY; readonly why: string };

export type Link = {
  readonly room: Room;
  readonly me: string;
  readonly leave: () => Promise<void>;
};

const relaysIn = (href: string): readonly string[] => {
  const asked = new URL(href).searchParams.get("relay");

  if (asked === null) return [];

  return asked
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
};

export const enter = (code: Code.Type, href: string, hurt: (fault: Fault) => void): Link => {
  const urls = relaysIn(href);
  const room = joinRoom(
    {
      appId: APP_ID,
      password: code,
      rtcConfig: LAN_ONLY,
      relayConfig: {
        redundancy: REDUNDANCY,
        warnOnRelayFailure: false,
        ...(urls.length > 0 ? { urls: [...urls] } : {}),
      },
    },
    code,
    { onJoinError: (details) => hurt({ kind: JOIN, why: details.error }) },
  );

  return { room, me: selfId, leave: () => room.leave() };
};
