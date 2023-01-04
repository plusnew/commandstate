import type { Props } from "@plusnew/core";
import plusnew, { component } from "@plusnew/core";
import type {
  DataContextAction,
  EntityHandler,
  EntityHandlerFactory,
} from "../context/dataContext";
import dataContext from "../context/dataContext";

type props = { children: any };
type EntityHandlerRepositoryValue<T, U> = {
  originalParameter: U;
  index: number;
  value: T;
};
type EntityHandlerRepository<T, U> = {
  [parameter: string]: EntityHandlerRepositoryValue<T, U> | undefined;
};

export default component("Repository", (Props: Props<props>) => {
  const state = new Map<
    EntityHandler<any, any>,
    EntityHandlerRepository<any, any>
  >();
  const entityHandlers = new Map<
    EntityHandlerFactory<any, any>,
    EntityHandler<any, any>
  >();
  const events: any[] = [];
  let onchangeCallbacks: (() => void)[] = [];
  const dispatch: (events: DataContextAction) => void = ([type, newEvents]) => {
    if (type === "commit") {
      events.push(...newEvents);
      onchangeCallbacks.forEach((onchangeCallback) => onchangeCallback());
    } else {
      throw new Error("The repository cant " + type);
    }
  };
  return (
    <dataContext.Provider
      state={{
        events: events,
        getState: (request) => {
          let entityHandlerCache = state.get(request.entityHandler);
          if (entityHandlerCache === undefined) {
            entityHandlerCache = {};
            state.set(request.entityHandler, entityHandlerCache);
          }
          const serializedParameter = JSON.stringify(request.parameter);
          if (
            serializedParameter in entityHandlerCache === false ||
            request.forceCacheRefresh
          ) {
            const originalParameter =
              entityHandlerCache[serializedParameter]?.originalParameter ??
              request.parameter;
            entityHandlerCache[serializedParameter] = {
              originalParameter,
              index: events.length,
              value: request.entityHandler.mount({
                parameter: originalParameter,
                state: entityHandlerCache[serializedParameter]?.value ?? null,
                dispatch,
              }),
            };
          }

          while (
            (
              entityHandlerCache[
                serializedParameter
              ] as EntityHandlerRepositoryValue<any, any>
            ).index < events.length
          ) {
            entityHandlerCache[serializedParameter] = {
              originalParameter: (
                entityHandlerCache[
                  serializedParameter
                ] as EntityHandlerRepositoryValue<any, any>
              ).originalParameter,
              index:
                (
                  entityHandlerCache[
                    serializedParameter
                  ] as EntityHandlerRepositoryValue<any, any>
                ).index + 1,
              value: request.entityHandler.reduce({
                parameter:
                  entityHandlerCache[serializedParameter]?.originalParameter,
                state: entityHandlerCache[serializedParameter]?.value ?? null,
                event:
                  events[
                    (
                      entityHandlerCache[
                        serializedParameter
                      ] as EntityHandlerRepositoryValue<any, any>
                    ).index
                  ],
              }),
            };
          }
          return {
            state: entityHandlerCache[serializedParameter]?.value,
            originalParameter:
              entityHandlerCache[serializedParameter]?.originalParameter,
          };
        },
        getEntityHandler: (entityHandlerFactory) => {
          let entityHandler = entityHandlers.get(entityHandlerFactory);
          if (entityHandler === undefined) {
            entityHandler = entityHandlerFactory();
            entityHandlers.set(entityHandlerFactory, entityHandler);
          }

          return entityHandler;
        },
        addOnchangeListener: (cb) => {
          onchangeCallbacks.push(cb);
        },
        removeOnchangeListener: (cb) => {
          onchangeCallbacks = onchangeCallbacks.filter(
            (onchangeCallback) => onchangeCallback !== cb
          );
        },
      }}
      dispatch={dispatch}
    >
      <Props>{(props) => props.children}</Props>
    </dataContext.Provider>
  );
});
