import * as Event from "../event";
import * as World from "../world";
import * as State from "./state";

export const apply = <B>(state: State.Type<B>, event: Event.Type<B>): State.Type<B> => {
  switch (event.kind) {
    case Event.PAUSED:
      return State.paused({ world: state.world });
    case Event.RESUMED:
      return State.playing({ world: state.world });
    case Event.ENDED:
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
    case Event.PAUSED:
      return State.playing({ world: state.world });
    case Event.RESUMED:
      return State.paused({ world: state.world });
    case Event.ENDED:
      return State.playing({ world: state.world });
    default:
      return State.withWorld(state, Event.backward(state.world, event));
  }
};
