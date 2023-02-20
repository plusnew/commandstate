import type { ReadonlySignal, Signal } from "@preact/signals-core";
import { effect } from "@preact/signals-core";
import { batch } from "@preact/signals-core";
import { computed } from "@preact/signals-core";
import { signal } from "@preact/signals-core";

type EntityHandlerFactory<T, U> = () => EntityHandler<T, U>;

type EntityHandler<T, U> = {
  mount: (context: { parameter: U; state: T | null }) => Signal<T>;
  reduce: (context: { command: unknown; parameter: U; state: T }) => T;
};

export type DataProvider = {
  getState: <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
  }) => ReadonlySignal<T>;
  refreshCache: <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
  }) => void;
  getEntityHandler: <T, U>(
    EntityHandlerFactory: EntityHandlerFactory<T, U>
  ) => EntityHandler<T, U>;
  commands: ReadonlySignal<unknown[]>;
  commit: (command: unknown[]) => void;
  merge: (command: unknown[]) => void;
};

export function createRepository(): DataProvider {
  const dataProviderState = new Map<
    EntityHandler<any, any>,
    { [request: string]: { signal: Signal<Signal<any>>; index: number } }
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
          })
        ),
        index: commands.peek().length,
      });

      effect(() =>
        batch(() => {
          while (dataProviderStateValueRequest.index < commands.value.length) {
            dataProviderStateValueRequest.signal.value.value =
              request.entityHandler.reduce({
                command: commands.value[dataProviderStateValueRequest.index],
                parameter: request.parameter,
                state: dataProviderStateValueRequest.signal.value.value,
              });

            dataProviderStateValueRequest.index++;
          }
        })
      );
    }

    return dataProviderStateValue[serializedParameter].signal.value;
  };

  const refreshCache = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
  }) => {
    const dataProviderStateValue = dataProviderState.get(request.entityHandler);

    if (dataProviderStateValue !== undefined) {
      const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

      if (serializedParameter in dataProviderStateValue) {
        dataProviderStateValue[serializedParameter].index =
          commands.peek().length;

        dataProviderStateValue[serializedParameter].signal.value =
          request.entityHandler.mount({
            parameter: request.parameter,
            state:
              dataProviderStateValue[serializedParameter].signal.value.value,
          });
      }
    }
  };

  return {
    commands: commands,
    getEntityHandler,
    commit,
    merge,
    getState,
    refreshCache,
  };
}

export function createBranch(dataProvider: DataProvider): DataProvider {
  const commands = signal([] as unknown[]);

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
      dataProvider.commit(mergedCommands);
    });
  };

  const getState = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
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
          dataProvider.getState(request).value
        );
      });
    }
    return dataProviderStateValue[serializedParameter];
  };

  return {
    commands: commands,
    commit,
    merge,
    getState,
    getEntityHandler: dataProvider.getEntityHandler,
    refreshCache: dataProvider.refreshCache,
  };
}

export function createCacheBreaker(dataProvider: DataProvider): DataProvider {
  const cache = new Map<EntityHandler<any, any>, string[]>();

  const getState = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
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
      dataProvider.refreshCache(request);
    }
    return dataProvider.getState(request);
  };

  return {
    refreshCache: dataProvider.refreshCache,
    commands: dataProvider.commands,
    getEntityHandler: dataProvider.getEntityHandler,
    commit: dataProvider.commit,
    merge: dataProvider.merge,
    getState,
  };
}

export function createEntity<T, U>(
  entityHandlerFactory: () => EntityHandler<T, U>
) {
  return function (this: any, dataProvider: DataProvider, parameter: U) {
    const entityHandler = dataProvider.getEntityHandler(entityHandlerFactory);

    return computed(() => {
      return dataProvider.getState<T, U>({
        parameter,
        entityHandler,
      }).value;
    });
  };
}
