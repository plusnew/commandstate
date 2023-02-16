import type { EntityHandler, DataProvider } from "../context/dataContext";

export default function createEntity<T, U, V>(
  entityHandlerFactory: () => EntityHandler<T, U, V>
) {
  return (dataContext: DataProvider, parameter: U) => {
    const { state, originalParameter } = dataContext.getState({
      entityHandlerFactory,
      parameter,
      forceCacheRefresh: false,
    });

    return {
      state,
      dispatch: (command: V) => dataContext.dispatch("commit", command),
      invalidateCache: () => {
        dataContext.getState({
          entityHandlerFactory,
          parameter: originalParameter,
          forceCacheRefresh: true,
        });
      },
    };
  };
}
