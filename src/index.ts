import type { ReadonlySignal, Signal } from "@preact/signals-core";
import { effect } from "@preact/signals-core";
import { batch } from "@preact/signals-core";
import { computed } from "@preact/signals-core";
import { signal } from "@preact/signals-core";

type EntityHandlerFactory<T, U> = () => EntityHandler<T, U>;

type EntityHandler<T, U> = {
  mount: (context: {
    parameter: U;
    state: T | null;
    merge: (events: unknown[]) => void;
  }) => T;
  reduce: (context: { command: unknown; parameter: U; state: T }) => T;
};

export type DataProvider = {
  getState: <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    forceCacheRefresh: boolean;
  }) => Signal<T>;
  getEntityHandler: <T, U>(
    EntityHandlerFactory: EntityHandlerFactory<T, U>
  ) => EntityHandler<T, U>;
  commands: unknown[];
  commit: (command: unknown[]) => void;
  merge: (command: unknown[]) => void;
};

export function createRepository(): Signal<DataProvider> {
  const dataProviderState = new Map<
    EntityHandler<any, any>,
    { [request: string]: { signal: Signal<any>; index: number } }
  >();
  const commands = signal([] as unknown[]);

  const entityHandlers = new Map<
    EntityHandlerFactory<any, any>,
    EntityHandler<any, any>
  >();

  const commit = (newCommands: unknown[]) => {
    commands.value = [...commands.value, ...newCommands];
  };

  const merge = (_commands: unknown[]) => {
    throw new Error("not yet implemtend");
  };

  const getEntityHandler = function (
    entityHandlerFactory: EntityHandlerFactory<any, any>
  ) {
    let entityHandler = entityHandlers.get(entityHandlerFactory);
    if (entityHandler === undefined) {
      entityHandler = entityHandlerFactory();
      entityHandlers.set(entityHandlerFactory, entityHandler);
    }
    return entityHandler;
  };

  const getState = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    forceCacheRefresh: boolean;
  }): ReadonlySignal<T> => {
    let dataProviderStateValue = dataProviderState.get(request.entityHandler);

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState.set(request.entityHandler, dataProviderStateValue);
    }

    const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

    if (serializedParameter in dataProviderStateValue === false) {
      const dataProviderStateValueRequest = (dataProviderStateValue[
        serializedParameter
      ] = {
        signal: signal(
          request.entityHandler.mount({
            parameter: request.parameter,
            state: null,
            merge: commit,
          })
        ),
        index: commands.peek().length,
      });

      effect(() =>
        batch(() => {
          while (dataProviderStateValueRequest.index < commands.value.length) {
            dataProviderStateValueRequest.signal.value =
              request.entityHandler.reduce({
                command: commands.value[dataProviderStateValueRequest.index],
                parameter: request.parameter,
                state: dataProviderStateValueRequest.signal.value,
              });

            dataProviderStateValueRequest.index++;
          }
        })
      );
    } else if (request.forceCacheRefresh === true) {
      dataProviderStateValue[serializedParameter].index =
        commands.peek().length;

      dataProviderStateValue[serializedParameter].signal.value =
        request.entityHandler.mount({
          parameter: request.parameter,
          state: dataProviderStateValue[serializedParameter].signal.value,
          merge: commit,
        });
    }

    return dataProviderStateValue[serializedParameter].signal;
  };

  return computed(() => ({
    commands: commands.value,
    getEntityHandler,
    commit,
    merge,
    getState,
  }));
}

export function createBranch(
  dataProvider: Signal<DataProvider>
): Signal<DataProvider> {
  const commands = signal([] as unknown[]);
  const getEntityHandler = dataProvider.value.getEntityHandler;

  const dataProviderState = new Map<
    EntityHandler<any, any>,
    { [request: string]: Signal<any> }
  >();

  const commit = (newCommands: unknown[]) => {
    commands.value = [...commands.value, ...newCommands];
  };

  const merge = (mergedCommands: unknown[]) => {
    batch(() => {
      commands.value = commands.value.filter(
        (command) => mergedCommands.includes(command) === false
      );
      dataProvider.value.commit(mergedCommands);
    });
  };

  const getState = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    forceCacheRefresh: boolean;
  }): ReadonlySignal<T> => {
    let dataProviderStateValue = dataProviderState.get(request.entityHandler);

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState.set(request.entityHandler, dataProviderStateValue);
    }

    const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

    if (serializedParameter in dataProviderStateValue === false) {
      dataProviderStateValue[serializedParameter] = computed(() => {
        return commands.value.reduce<T>(
          (accumulator, command) =>
            request.entityHandler.reduce({
              command,
              parameter: request.parameter,
              state: accumulator,
            }),
          dataProvider.value.getState(request).value
        );
      });
    }
    return dataProviderStateValue[serializedParameter];
  };

  return computed(() => ({
    commands: commands.value,
    getEntityHandler,
    commit,
    merge,
    getState,
  }));
}

export function createCacheBreaker(
  dataProvider: Signal<DataProvider>
): Signal<DataProvider> {
  const cache = new Map<EntityHandler<any, any>, string[]>();

  const getState = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    forceCacheRefresh: boolean;
  }): ReadonlySignal<T> => {
    const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders
    let cacheValue = cache.get(request.entityHandler);

    if (cacheValue === undefined) {
      cacheValue = [];
      cache.set(request.entityHandler, cacheValue);
    }

    const hasSeenRequest = cacheValue.includes(serializedParameter);
    if (hasSeenRequest === false) {
      cacheValue.push(serializedParameter);
    }
    return dataProvider.value.getState({
      ...request,
      forceCacheRefresh: hasSeenRequest === false,
    });
  };

  return computed(() => ({
    commands: dataProvider.value.commands,
    getEntityHandler: dataProvider.value.getEntityHandler,
    commit: dataProvider.value.commit,
    merge: dataProvider.value.merge,
    getState,
  }));
}

export function createEntity<T, U>(
  entityHandlerFactory: () => EntityHandler<T, U>
) {
  return function (
    this: any,
    dataProvider: Signal<DataProvider>,
    parameter: U
  ) {
    const entityHandler =
      dataProvider.value.getEntityHandler(entityHandlerFactory);

    return computed(() => {
      return dataProvider.value.getState<T, U>({
        parameter,
        entityHandler,
        forceCacheRefresh: false,
      }).value;
    });
  };
}
