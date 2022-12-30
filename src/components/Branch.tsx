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
  const state = new Map<EntityHandler<any, any>, EntityHandlerBranch<any>>();
  let events: unknown[] = [];
  const onchangeCallbacks: (() => void)[] = [];
  dataContextProviderInstanceState.onchange(() => {
    onchangeCallbacks.forEach((onchangeCallback) => onchangeCallback());
  });

  return (
    <dataContext.Provider
      state={{
        events: events,
        getState: (request) => {
          const parentValue =
            dataContextProviderInstanceState.getState(request);
          let entityHandlerCache = state.get(request.entityHandler);
          if (entityHandlerCache === undefined) {
            entityHandlerCache = {};
            state.set(request.entityHandler, entityHandlerCache);
          }
          const serializedParameter = JSON.stringify(request.parameter);
          if (
            entityHandlerCache[serializedParameter] === undefined ||
            request.forceCacheRefresh
          ) {
            entityHandlerCache[serializedParameter] = {
              index: events.length,
              value: request.entityHandler.mount({
                parameter: request.parameter,
                state: entityHandlerCache[serializedParameter]?.value ?? null,
              }),
              parentValue,
            };
          }

          if (
            entityHandlerCache[serializedParameter]?.parentValue !== parentValue
          ) {
            (
              entityHandlerCache[
                serializedParameter
              ] as EntityHandlerBranchValue<any>
            ).index = 0;
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
                parameter: request.parameter,
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
              parentValue,
            };
          }
          return entityHandlerCache[serializedParameter]?.value;
        },
        onchange: (cb) => {
          onchangeCallbacks.push(cb);
        },
      }}
      dispatch={([type, newEvents]) => {
        if (type === "commit") {
          events.push(...newEvents);
          onchangeCallbacks.forEach((onchangeCallback) => onchangeCallback());
        } else if (type === "merge") {
          events = events.filter(
            (event) => newEvents.includes(event) === false
          );
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
