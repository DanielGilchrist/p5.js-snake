import * as Game from "../core/game";
import * as Controls from "../core/controls";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Players from "../core/players";
import * as Palette from "../render/palette";
import * as Code from "../net/code";
import * as Invite from "../net/invite";

export const ALONE = "alone";
export const AGAINST_THE_COMPUTER = "against-the-computer";
export const WITH_A_FRIEND = "with-a-friend";
export const OVER_THE_NETWORK = "over-the-network";

export type Kind =
  | typeof ALONE
  | typeof AGAINST_THE_COMPUTER
  | typeof WITH_A_FRIEND
  | typeof OVER_THE_NETWORK;

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
    ? OVER_THE_NETWORK
    : computer
      ? AGAINST_THE_COMPUTER
      : friend
        ? WITH_A_FRIEND
        : ALONE;

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

export const networked = (mode: Mode): boolean => mode.kind === OVER_THE_NETWORK;

export const runItself = (mode: Mode): boolean => mode.kind === AGAINST_THE_COMPUTER;

export const localRules = (mode: Mode): Input.Rules =>
  mode.kind === WITH_A_FRIEND ? Input.sharing(PLAYERS_TOGETHER) : Input.ALONE;

export const controlsFor = (mode: Mode): Controls.Assignment =>
  mode.kind === WITH_A_FRIEND
    ? Controls.between([Controls.ARROWS, Controls.WASD])
    : Controls.shared;

const machinesIn = (mode: Mode): readonly Players.Id[] =>
  mode.kind === AGAINST_THE_COMPUTER
    ? Array.from({ length: mode.rules.players - 1 }, (_, seat) => Players.id(seat + 1))
    : [];

export const nameFor = (mode: Mode, who: Players.Id, mine: Players.Id): string => {
  if (mode.kind !== WITH_A_FRIEND && who === mine) return "YOU";

  const machines = machinesIn(mode);

  return machines.length === 1 && machines[0] === who ? "CPU" : Palette.nameOf(who);
};

export const ringed = (mode: Mode): boolean => mode.kind !== WITH_A_FRIEND;

export const tagFor = (mode: Mode, who: Players.Id, mine: Players.Id): Option.Type<string> => {
  if (mode.rules.players < 2) return Option.none;

  if (mode.kind === WITH_A_FRIEND) return Option.some(Controls.nameOf(controlsFor(mode), who));

  return who === mine ? Option.some(nameFor(mode, who, mine)) : Option.none;
};

export const cheerFor = (mode: Mode, won: Option.Type<Players.Id>, mine: Players.Id): string => {
  if (!won.some) return "DRAW";

  if (mode.kind !== WITH_A_FRIEND && won.value === mine) return "YOU WIN";

  return `${nameFor(mode, won.value, mine)} WINS`;
};

export const rival = (mode: Mode): Option.Type<Players.Id> =>
  mode.kind === AGAINST_THE_COMPUTER ? Option.some(Players.id(1)) : Option.none;
