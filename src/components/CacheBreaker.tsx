import type { Props } from "@plusnew/core";
import plusnew, { component } from "@plusnew/core";
import type { EntityHandler } from "../context/dataContext";
import dataContext from "../context/dataContext";

type props = { children: any };

export default component("Branch", (Props: Props<props>, componentInstance) => {
  const dataContextProviderInstance =
    dataContext.findProvider(componentInstance);
  const dataContextProviderInstanceState =
    dataContextProviderInstance.getState();

  const cacheGuardSeen = new Map<
    EntityHandler<any, any, any>,
    { [serializedParameter: string]: boolean }
  >();
  return (
    <dataContext.Provider
      state={{
        events: dataContextProviderInstanceState.events,
        getState: (request) => {
          const serializedParameter = JSON.stringify(request.parameter);

          const entityHandlerCache =
            cacheGuardSeen.get(request.entityHandler) ?? {};
          const seen = entityHandlerCache[serializedParameter] ?? false;

          if (seen === false) {
            cacheGuardSeen.set(request.entityHandler, {
              ...entityHandlerCache,
              [serializedParameter]: true,
            });
          }

          return dataContextProviderInstanceState.getState({
            ...request,
            forceCacheRefresh: request.forceCacheRefresh || seen === false,
          });
        },
        getEntityHandler: dataContextProviderInstanceState.getEntityHandler,
        addOnchangeListener:
          dataContextProviderInstanceState.addOnchangeListener,
        removeOnchangeListener:
          dataContextProviderInstanceState.removeOnchangeListener,
      }}
      dispatch={dataContextProviderInstance.dispatch}
    >
      <Props>{(props) => props.children}</Props>
    </dataContext.Provider>
  );
});
