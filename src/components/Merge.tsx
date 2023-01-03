import type { ApplicationElement, Props } from "@plusnew/core";
import plusnew, { Component, store } from "@plusnew/core";
import type ComponentInstance from "@plusnew/core/src/instances/types/Component/Instance";
import type {
  DataContextAction,
  DataContextState,
} from "../context/dataContext";
import dataContext from "../context/dataContext";

type props = {
  children: (context: {
    events: unknown[];
    merge: (events: unknown[]) => void;
  }) => ApplicationElement;
};

export default class Merge extends Component<props> {
  displayName = "merge";

  private componentInstance: ComponentInstance<props, any, any>;
  private dataContextInstanceState: DataContextState;
  private dataContextInstanceDispatch: (action: DataContextAction) => void;
  private events = store<unknown[]>([]);

  constructor(
    props: props,
    componentInstance: ComponentInstance<props, any, any>
  ) {
    super(props, componentInstance);

    this.componentInstance = componentInstance;
    const dataContextInstance = dataContext.findProvider(
      componentInstance as any
    );
    this.dataContextInstanceDispatch = dataContextInstance.dispatch;
    this.dataContextInstanceState = dataContextInstance.getState();
    this.dataContextInstanceState.addOnchangeListener(this.onchangeCallback.bind(this));
  }

  private onchangeCallback = () => {
    this.events.dispatch(this.dataContextInstanceState.events);
  };

  render(Props: Props<props>) {
    return (
      <this.events.Observer>
        {(eventsState) => (
          <Props>
            {(props) =>
              ((props.children as any)[0] as props["children"])({
                events: eventsState,
                merge: (events) =>
                  this.dataContextInstanceDispatch(["merge", events]),
              })
            }
          </Props>
        )}
      </this.events.Observer>
    );
  }
}
