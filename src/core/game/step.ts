import type * as Board from "../board";
import type * as Event from "../event";
import type * as Command from "./command";
import * as Fold from "./fold";
import * as Rules from "./rules";
import * as State from "./state";

type Step<B> = {
  readonly state: State.Type<B>;
  readonly events: readonly Event.Type<B>[];
};

const stepped = <B>(state: State.Type<B>, events: readonly Event.Type<B>[]): Step<B> => ({
  state,
  events,
});

export const step = <B>(
  api: Board.Api<B>,
  state: State.Type<B>,
  command: Command.Type,
): Step<B> => {
  if (command.kind === "restart") {
    return stepped(Rules.start(state.world.board, state.world.rng), []);
  }

  const events = Rules.decide(api, state, command);

  return stepped(events.reduce<State.Type<B>>(Fold.apply, state), events);
};
