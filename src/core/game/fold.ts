import * as Event from "../event";
import * as World from "../world";
import * as State from "./state";

export const apply = <B>(state: State.Type<B>, event: Event.Type<B>): State.Type<B> => {
  switch (event.kind) {
    case "paused":
      return State.paused({ world: state.world });
    case "resumed":
      return State.playing({ world: state.world });
    case "ended":
      return State.over({
        world: state.world,
        outcome: World.outcome(event.ending),
      });
    default:
      return State.withWorld(state, Event.forward(state.world, event));
  }
};

export const revert = <B>(state: State.Type<B>, event: Event.Type<B>): State.Type<B> => {
  switch (event.kind) {
    case "paused":
      return State.playing({ world: state.world });
    case "resumed":
      return State.paused({ world: state.world });
    case "ended":
      return State.playing({ world: state.world });
    default:
      return State.withWorld(state, Event.backward(state.world, event));
  }
};
