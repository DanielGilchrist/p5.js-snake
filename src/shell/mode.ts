import * as Game from "../core/game";
import * as Controls from "../core/controls";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Players from "../core/players";
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

export const MOST_PLAYERS = 8;

const clamp = (n: number, low: number, high: number): number => Math.min(high, Math.max(low, n));

export const read = (href: string): Mode => {
  const invited = Invite.read(href);
  const hosting = Invite.flagged(href, "host");
  const networked = invited.some || hosting;
  const asked = networked ? Option.none : Invite.counted(href, "cpu");
  const computer = asked.some;
  const friend = !networked && !computer && Invite.flagged(href, "friend");
  const playing = asked.some
    ? clamp(asked.value + 1, PLAYERS_TOGETHER, MOST_PLAYERS)
    : networked || friend
      ? PLAYERS_TOGETHER
      : 1;

  const kind: Kind = networked
    ? OVER_THE_NETWORK
    : computer
      ? AGAINST_THE_COMPUTER
      : friend
        ? WITH_A_FRIEND
        : ALONE;

  return {
    kind,
    rules: Game.forPlayers(playing),
    room: invited.some ? invited.value : Code.fresh(),
    hosting,
    joining: invited.some,
    showing: Invite.flagged(href, "probe"),
    automatic: Invite.flagged(href, "bot"),
  };
};

export const networked = (mode: Mode): boolean => mode.kind === OVER_THE_NETWORK;

export const localRules = (mode: Mode): Input.Rules =>
  mode.kind === WITH_A_FRIEND ? Input.sharing(PLAYERS_TOGETHER) : Input.ALONE;

export const controlsFor = (mode: Mode): Controls.Assignment =>
  mode.kind === WITH_A_FRIEND
    ? Controls.between([Controls.ARROWS, Controls.WASD])
    : Controls.shared;

export const machines = (mode: Mode): readonly Players.Id[] =>
  mode.kind === AGAINST_THE_COMPUTER
    ? Array.from({ length: mode.rules.players - 1 }, (_, seat) => Players.id(seat + 1))
    : [];

export const ringed = (mode: Mode): boolean => mode.kind !== WITH_A_FRIEND;

export const tagFor = (mode: Mode, who: Players.Id, mine: Players.Id): Option.Type<string> => {
  if (mode.rules.players < 2) return Option.none;

  if (mode.kind === WITH_A_FRIEND) return Option.some(Controls.nameOf(controlsFor(mode), who));

  return who === mine ? Option.some("YOU") : Option.none;
};

export type Cheer = {
  readonly who: readonly Players.Id[];
  readonly title: string;
};

export const cheerFor = (
  mode: Mode,
  won: Option.Type<Players.Id>,
  mine: Players.Id,
  shared: readonly Players.Id[] = [],
): Cheer => {
  if (!won.some) return { who: shared, title: "DRAW" };

  if (mode.kind !== WITH_A_FRIEND && won.value === mine) {
    return { who: [won.value], title: "YOU WIN" };
  }

  const driven = machines(mode);
  const alone = driven.length === 1 && driven[0] === won.value;

  return { who: [won.value], title: alone ? "CPU WINS" : "WINS" };
};
