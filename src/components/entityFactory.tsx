import type { ApplicationElement, Props } from "@plusnew/core";
import plusnew, { Component, store } from "@plusnew/core";
import type ComponentInstance from "@plusnew/core/src/instances/types/Component/Instance";
import type {
  DataContextAction,
  DataContextState,
  EntityHandler,
} from "../context/dataContext";
import dataContext from "../context/dataContext";

export default function entity<T, U, V>(cb: () => EntityHandler<T, U>) {
  type props = {
    parameters: U[];
    children: (result: {
      views: T[];
      dispatch: (events: V[]) => void;
    }) => ApplicationElement;
  };

  const entityHandler = cb();

  return class Entity extends Component<props> {
    displayName = "Entity";

    private componentInstance: ComponentInstance<props, any, any>;
    private dataContextInstanceState: DataContextState;
    private dataContextInstanceDispatch: (action: DataContextAction) => void;
    private refresh = store(0);
    private views: any[] = [];
    private onchangeCallback = () => {
      let somethingChanged = false;
      this.views = this.componentInstance.props.parameters.map(
        (parameter, index) => {
          const view = this.dataContextInstanceState.getState({
            entityHandler,
            parameter,
            forceCacheRefresh: false,
          });
          somethingChanged = somethingChanged || this.views[index] !== view;

          return view;
        }
      );

      if (somethingChanged) {
        this.refresh.dispatch(this.refresh.getState() + 1);
      }
    };

    constructor(
      props: props,
      componentInstance: ComponentInstance<props, any, any>
    ) {
      super(props, componentInstance);
      const dataContextInstance = dataContext.findProvider(
        componentInstance as any
      );
      this.dataContextInstanceState = dataContextInstance.getState();
      this.dataContextInstanceDispatch = dataContextInstance.dispatch;
      this.componentInstance = componentInstance;
      this.dataContextInstanceState.onchange(this.onchangeCallback.bind(this));
    }

    render(Props: Props<props>) {
      return (
        <Props>
          {(props) => (
            <this.refresh.Observer>
              {() => {
                this.views = props.parameters.map((parameter) =>
                  this.dataContextInstanceState.getState({
                    entityHandler,
                    parameter,
                    forceCacheRefresh: false,
                  })
                );

                return ((props.children as any)[0] as props["children"])({
                  views: this.views,
                  dispatch: (events) =>
                    this.dataContextInstanceDispatch(["commit", events]),
                });
              }}
            </this.refresh.Observer>
          )}
        </Props>
      );
    }
  };
}
