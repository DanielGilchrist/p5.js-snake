import * as Assert from "../core/assert";
import * as Session from "../net/session";
import * as Render from "../render";

export const ofSession = (told: Session.Trouble): Render.Trouble => {
  switch (told.why) {
    case Session.SIGNALLING:
      return Render.trouble(
        "CANNOT REACH THE ROOM",
        "The signalling relays turned us away",
        told.detail,
      );
    case Session.HOST_GONE:
      return Render.trouble("THE HOST LEFT", "Their room closed when they went", told.detail);
    case Session.ALL_GONE:
      return Render.trouble("EVERYONE LEFT", "Nobody else is in the room", told.detail);
    default:
      return Assert.never(told.why);
  }
};

export const ofLink = (raw: string): Render.Trouble =>
  Render.trouble("THAT LINK IS NOT A ROOM", "The room code in the link is not a real code", raw);
