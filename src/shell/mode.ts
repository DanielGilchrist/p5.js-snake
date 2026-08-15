import * as Game from "../core/game";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Players from "../core/players";
import * as Palette from "../render/palette";
import * as Code from "../net/code";
import * as Invite from "../net/invite";

export type Kind = "alone" | "against-the-computer" | "with-a-friend" | "over-the-network";

export type Mode = {
  readonly kind: Kind;
  readonly rules: Game.Mode;
  readonly room: Code.Type;
  readonly hosting: boolean;
  readonly joining: boolean;
  readonly showing: boolean;
  readonly automatic: boolean;
};

const PLAYERS_TOGETHER = 2;

export const read = (href: string): Mode => {
  const invited = Invite.read(href);
  const hosting = Invite.flagged(href, "host");
  const networked = invited.some || hosting;
  const computer = !networked && Invite.flagged(href, "cpu");
  const friend = !networked && !computer && Invite.flagged(href, "friend");
  const together = networked || computer || friend;

  const kind: Kind = networked
    ? "over-the-network"
    : computer
      ? "against-the-computer"
      : friend
        ? "with-a-friend"
        : "alone";

  return {
    kind,
    rules: Game.forPlayers(together ? PLAYERS_TOGETHER : 1),
    room: invited.some ? invited.value : Code.fresh(),
    hosting,
    joining: invited.some,
    showing: Invite.flagged(href, "probe"),
    automatic: Invite.flagged(href, "bot"),
  };
};

export const networked = (mode: Mode): boolean => mode.kind === "over-the-network";

export const runItself = (mode: Mode): boolean => mode.kind === "against-the-computer";

export const localRules = (mode: Mode): Input.Rules =>
  mode.kind === "with-a-friend" ? Input.sharing(PLAYERS_TOGETHER) : Input.ALONE;

const machinesIn = (mode: Mode): readonly Players.Id[] =>
  mode.kind === "against-the-computer"
    ? Array.from({ length: mode.rules.players - 1 }, (_, seat) => Players.id(seat + 1))
    : [];

export const nameFor = (mode: Mode, who: Players.Id, mine: Players.Id): string => {
  if (mode.kind !== "with-a-friend" && who === mine) return "YOU";

  const machines = machinesIn(mode);

  return machines.length === 1 && machines[0] === who ? "CPU" : Palette.nameOf(who);
};

export const cheerFor = (mode: Mode, won: Option.Type<Players.Id>, mine: Players.Id): string => {
  if (!won.some) return "A DRAW";

  const name = nameFor(mode, won.value, mine);

  return name === "YOU" ? "YOU WIN" : `${name} WINS`;
};

export const rival = (mode: Mode): Option.Type<Players.Id> =>
  mode.kind === "against-the-computer" ? Option.some(Players.id(1)) : Option.none;
