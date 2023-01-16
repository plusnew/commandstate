import type { Props } from "@plusnew/core";
import plusnew, { component } from "@plusnew/core";
import type { EntityHandler } from "../context/dataContext";
import dataContext from "../context/dataContext";

type props = { children: any };

type EntityHandlerBranchValue<T> = { index: number; value: T; parentValue: T };
type EntityHandlerBranch<T> = {
  [parameter: string]: EntityHandlerBranchValue<T> | undefined;
};

export default component("Branch", (Props: Props<props>, componentInstance) => {
  const dataContextProviderInstance =
    dataContext.findProvider(componentInstance);
  const dataContextProviderInstanceState =
    dataContextProviderInstance.getState();
  const state = new Map<
    EntityHandler<any, any, any>,
    EntityHandlerBranch<any>
  >();
  const events: unknown[] = [];
  let onchangeCallbacks: (() => void)[] = [];
  const onchangeCallback = () => {
    onchangeCallbacks.forEach((onchangeCallback) => onchangeCallback());
  };
  dataContextProviderInstanceState.addOnchangeListener(onchangeCallback);

  componentInstance.registerLifecycleHook("componentWillUnmount", () =>
    dataContextProviderInstanceState.removeOnchangeListener(onchangeCallback)
  );

  return (
    <dataContext.Provider
      state={{
        events: events,
        getState: (request) => {
          const parentState =
            dataContextProviderInstanceState.getState(request);
          let entityHandlerCache = state.get(request.entityHandler);
          if (entityHandlerCache === undefined) {
            entityHandlerCache = {};
            state.set(request.entityHandler, entityHandlerCache);
          }
          const serializedParameter = JSON.stringify(request.parameter);
          if (
            entityHandlerCache[serializedParameter] === undefined ||
            entityHandlerCache[serializedParameter]?.value !== parentState.state
          ) {
            entityHandlerCache[serializedParameter] = {
              index:
                entityHandlerCache[serializedParameter] === undefined
                  ? events.length
                  : 0,
              value: parentState.state,
              parentValue: parentState.state,
            };
          }

          while (
            (
              entityHandlerCache[
                serializedParameter
              ] as EntityHandlerBranchValue<any>
            ).index < events.length
          ) {
            entityHandlerCache[serializedParameter] = {
              index:
                (
                  entityHandlerCache[
                    serializedParameter
                  ] as EntityHandlerBranchValue<any>
                ).index + 1,
              value: request.entityHandler.reduce({
                parameter: parentState.originalParameter,
                state: entityHandlerCache[serializedParameter]?.value ?? null,
                event:
                  events[
                    (
                      entityHandlerCache[
                        serializedParameter
                      ] as EntityHandlerBranchValue<any>
                    ).index
                  ],
              }),
              parentValue: parentState.state,
            };
          }
          return {
            state: entityHandlerCache[serializedParameter]?.value,
            originalParameter: parentState.originalParameter,
          };
        },
        getEntityHandler: dataContextProviderInstanceState.getEntityHandler,
        addOnchangeListener: (cb) => {
          onchangeCallbacks.push(cb);
        },
        removeOnchangeListener: (cb) => {
          onchangeCallbacks = onchangeCallbacks.filter(
            (onchangeCallback) => onchangeCallback !== cb
          );
        },
      }}
      dispatch={([type, newEvents]) => {
        if (type === "commit") {
          events.push(...newEvents);
          onchangeCallbacks.forEach((onchangeCallback) => onchangeCallback());
        } else if (type === "merge") {
          for (let i = 0; i < events.length; i++) {
            if (newEvents.includes(events[i])) {
              events.splice(i, 1);
            }
          }

          dataContextProviderInstance.dispatch(["commit", newEvents]);
        } else {
          throw new UnreachableError(type);
        }
      }}
    >
      <Props>{(props) => props.children}</Props>
    </dataContext.Provider>
  );
});

class UnreachableError extends Error {
  constructor(_value: never) {
    super();
  }
}
