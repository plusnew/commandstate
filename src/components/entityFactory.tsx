import type { ApplicationElement, Props } from "@plusnew/core";
import plusnew, { Component, store } from "@plusnew/core";
import type ComponentInstance from "@plusnew/core/src/instances/types/Component/Instance";
import type {
  DataContextAction,
  DataContextState,
  EntityHandler,
  EntityHandlerFactory,
} from "../context/dataContext";
import dataContext from "../context/dataContext";

export default function entity<T, U, V>(
  entityHandlerFactory: EntityHandlerFactory<T, U, V>
) {
  type props = {
    parameters: U[];
    children: (result: {
      views: T[];
      dispatch: (events: V[]) => void;
      invalidateCache: () => void;
    }) => ApplicationElement;
  };

  return class Entity extends Component<props> {
    displayName = "Entity";

    private entityHandler: EntityHandler<T, U, V>;
    private componentInstance: ComponentInstance<props, any, any>;
    private dataContextInstanceState: DataContextState;
    private dataContextInstanceDispatch: (action: DataContextAction) => void;
    private refresh = store(0);
    private views: any[];
    private onchangeCallback = () => {
      let somethingChanged = false;
      this.views = this.componentInstance.props.parameters.map(
        (parameter, index) => {
          const { state: view } = this.dataContextInstanceState.getState({
            entityHandler: this.entityHandler,
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
      this.entityHandler =
        this.dataContextInstanceState.getEntityHandler(entityHandlerFactory);
      this.views = props.parameters.map(
        (parameter) =>
          this.dataContextInstanceState.getState({
            entityHandler: this.entityHandler,
            parameter,
            forceCacheRefresh: false,
          }).state
      );
      this.dataContextInstanceState.addOnchangeListener(
        this.onchangeCallback.bind(this)
      );
    }

    componentWillUnmount() {
      this.dataContextInstanceState.removeOnchangeListener(
        this.onchangeCallback
      );
    }

    render(Props: Props<props>) {
      return (
        <Props>
          {(props) => (
            <this.refresh.Observer>
              {() =>
                ((props.children as any)[0] as props["children"])({
                  views: this.views,
                  dispatch: (events) =>
                    this.dataContextInstanceDispatch(["commit", events]),
                  invalidateCache: () =>
                    props.parameters.map((parameter) =>
                      this.dataContextInstanceState.getState({
                        entityHandler: this.entityHandler,
                        parameter,
                        forceCacheRefresh: true,
                      })
                    ),
                })
              }
            </this.refresh.Observer>
          )}
        </Props>
      );
    }
  };
}
