import type { ApplicationElement, Props } from "@plusnew/core";
import plusnew, { Component, store } from "@plusnew/core";
import type ComponentInstance from "@plusnew/core/src/instances/types/Component/Instance";
import type { DataContextAction } from "../context/dataContext";
import dataContext from "../context/dataContext";

type props = {
  children: (context: {
    events: unknown[];
    merge: (events: unknown[]) => void;
  }) => ApplicationElement;
};

export default class Merge extends Component<props> {
  displayName = "merge";

  private dataContextInstanceDispatch: (action: DataContextAction) => void;
  private events = store<unknown[]>([]);

  constructor(
    props: props,
    componentInstance: ComponentInstance<props, any, any>
  ) {
    super(props, componentInstance);

    const dataContextInstance = dataContext.findProvider(
      componentInstance as any
    );
    this.dataContextInstanceDispatch = dataContextInstance.dispatch;
    const dataContextProviderInstanceState = dataContextInstance.getState();

    const onchangeCallback = () => {
      this.events.dispatch(dataContextProviderInstanceState.events);
    };
    dataContextProviderInstanceState.addOnchangeListener(onchangeCallback);
    componentInstance.registerLifecycleHook("componentWillUnmount", () =>
      dataContextProviderInstanceState.removeOnchangeListener(onchangeCallback)
    );
  }

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
