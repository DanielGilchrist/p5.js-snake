import { joinRoom, selfId } from "trystero";
import type { Room } from "@trystero-p2p/core";

import type * as Code from "./code";

const APP_ID = "danielgilchrist-p5js-snake";

const LAN_ONLY: RTCConfiguration = { iceServers: [] };

export type Table = {
  readonly room: Room;
  readonly me: string;
  readonly leave: () => Promise<void>;
};

export const sit = (code: Code.Type): Table => {
  const room = joinRoom({ appId: APP_ID, password: code, rtcConfig: LAN_ONLY }, code);

  return { room, me: selfId, leave: () => room.leave() };
};
