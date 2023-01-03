import type { Props } from "@plusnew/core";
import plusnew, { component } from "@plusnew/core";
import type {
  EntityHandler,
  EntityHandlerFactory,
} from "../context/dataContext";
import dataContext from "../context/dataContext";

type props = { children: any };
type EntityHandlerRepositoryValue<T> = { index: number; value: T };
type EntityHandlerRepository<T> = {
  [parameter: string]: EntityHandlerRepositoryValue<T> | undefined;
};

export default component("Repository", (Props: Props<props>) => {
  const state = new Map<
    EntityHandler<any, any>,
    EntityHandlerRepository<any>
  >();
  const entityHandlers = new Map<
    EntityHandlerFactory<any, any>,
    EntityHandler<any, any>
  >();
  const events: any[] = [];
  let onchangeCallbacks: (() => void)[] = [];

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
            entityHandlerCache[serializedParameter] = {
              index: events.length,
              value: request.entityHandler.mount({
                parameter: request.parameter,
                state: entityHandlerCache[serializedParameter]?.value ?? null,
              }),
            };
          }

          while (
            (
              entityHandlerCache[
                serializedParameter
              ] as EntityHandlerRepositoryValue<any>
            ).index < events.length
          ) {
            entityHandlerCache[serializedParameter] = {
              index:
                (
                  entityHandlerCache[
                    serializedParameter
                  ] as EntityHandlerRepositoryValue<any>
                ).index + 1,
              value: request.entityHandler.reduce({
                parameter: request.parameter,
                state: entityHandlerCache[serializedParameter]?.value ?? null,
                event:
                  events[
                    (
                      entityHandlerCache[
                        serializedParameter
                      ] as EntityHandlerRepositoryValue<any>
                    ).index
                  ],
              }),
            };
          }
          return entityHandlerCache[serializedParameter]?.value;
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
      dispatch={([type, newEvents]) => {
        if (type === "commit") {
          events.push(...newEvents);
          onchangeCallbacks.forEach((onchangeCallback) => onchangeCallback());
        } else {
          throw new Error("The repository cant " + type);
        }
      }}
    >
      <Props>{(props) => props.children}</Props>
    </dataContext.Provider>
  );
});
