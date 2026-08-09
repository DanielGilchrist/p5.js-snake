import type * as Board from "../board";
import type * as Event from "../event";
import * as Fold from "./fold";
import * as Rules from "./rules";
import * as State from "./state";

type Step<B> = {
  readonly state: State.Type<B>;
  readonly events: readonly Event.Type<B>[];
};

export const step = <B>(
  api: Board.Api<B>,
  state: State.Type<B>,
  command: Rules.Command,
): Step<B> => {
  if (command.kind === "restart") {
    return { state: Rules.start(state.world.board, state.world.rng), events: [] };
  }

  const events = Rules.decide(api, state, command);

  return { state: events.reduce<State.Type<B>>(Fold.apply, state), events };
};
