import type { ReadonlySignal, Signal } from "@preact/signals-core";
import { untracked } from "@preact/signals-core";
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
  getState: <T, U>(
    entityHandler: EntityHandler<T, U>,
    parameter: U
  ) => ReadonlySignal<T>;
  invalidateCache: <T, U>(
    invalidate: boolean,
    entityHandler: EntityHandler<T, U>,
    parameter?: U
  ) => void;
  getEntityHandler: <T, U>(
    EntityHandlerFactory: EntityHandlerFactory<T, U>
  ) => EntityHandler<T, U>;
};

export function createRepository(
  commands: ReadonlySignal<unknown[]>
): DataProvider {
  const dataProviderState = new Map<
    EntityHandler<any, any>,
    {
      [request: string]: {
        signal: Signal<Signal<any>>;
        cacheValid: Signal<boolean>;
        index: number;
      };
    }
  >();

  const entityHandlers = new Map<
    EntityHandlerFactory<any, any>,
    EntityHandler<any, any>
  >();

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

  const getState = <T, U>(
    entityHandler: EntityHandler<T, U>,
    parameter: U
  ): ReadonlySignal<T> => {
    let dataProviderStateValue = dataProviderState.get(entityHandler);

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState.set(entityHandler, dataProviderStateValue);
    }

    const serializedParameter = JSON.stringify(parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

    if (serializedParameter in dataProviderStateValue === false) {
      const dataProviderStateValueRequest = (dataProviderStateValue[
        serializedParameter
      ] = {
        signal: signal(
          entityHandler.mount({
            parameter: parameter,
            state: null,
          })
        ),
        cacheValid: signal(true),
        index: commands.peek().length,
      });

      effect(() =>
        batch(() => {
          while (dataProviderStateValueRequest.index < commands.value.length) {
            dataProviderStateValueRequest.signal.value.value =
              entityHandler.reduce({
                command: commands.value[dataProviderStateValueRequest.index],
                parameter: parameter,
                state: dataProviderStateValueRequest.signal.peek().peek(),
              });

            dataProviderStateValueRequest.index++;
          }
        })
      );
    } else if (
      dataProviderStateValue[serializedParameter].cacheValid.value === false
    ) {
      untracked(() => {
        if (dataProviderStateValue !== undefined) {
          dataProviderStateValue[serializedParameter].cacheValid.value = true;
        }
      });
      dataProviderStateValue[serializedParameter].index =
        commands.peek().length;
      dataProviderStateValue[serializedParameter].signal.value =
        entityHandler.mount({
          parameter: parameter,
          state: dataProviderStateValue[serializedParameter].signal
            .peek()
            .peek(),
        });
    }

    dataProviderStateValue[serializedParameter].cacheValid.value;
    return dataProviderStateValue[serializedParameter].signal.value;
  };

  function invalidateCache<T, U>(
    invalidate: boolean,
    entityHandler: EntityHandler<T, U>,
    parameter?: U
  ) {
    if (invalidate) {
      const dataProviderStateValue = dataProviderState.get(entityHandler);

      if (dataProviderStateValue !== undefined) {
        if (arguments.length > 2) {
          const serializedParameter = JSON.stringify(parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

          if (serializedParameter in dataProviderStateValue) {
            dataProviderStateValue[serializedParameter].cacheValid.value =
              false;
          }
        } else {
          batch(() => {
            for (const serializedParameter in dataProviderStateValue) {
              dataProviderStateValue[serializedParameter].cacheValid.value =
                false;
            }
          });
        }
      }
    }
  }

  return {
    getEntityHandler,
    getState,
    invalidateCache,
  };
}

export function createBranch(
  dataProvider: DataProvider,
  commands: ReadonlySignal<unknown[]>
): DataProvider {
  const dataProviderState = new Map<
    EntityHandler<any, any>,
    { [request: string]: Signal<any> }
  >();

  const getState = <T, U>(
    entityHandler: EntityHandler<T, U>,
    parameter: U
  ): ReadonlySignal<T> => {
    let dataProviderStateValue = dataProviderState.get(entityHandler);

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState.set(entityHandler, dataProviderStateValue);
    }

    const serializedParameter = JSON.stringify(parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

    if (serializedParameter in dataProviderStateValue === false) {
      dataProviderStateValue[serializedParameter] = computed(() => {
        return commands.value.reduce<T>(
          (accumulator, command) =>
            entityHandler.reduce({
              command,
              parameter: parameter,
              state: accumulator,
            }),
          dataProvider.getState(entityHandler, parameter).value
        );
      });
    }
    return dataProviderStateValue[serializedParameter];
  };

  return {
    getState,
    getEntityHandler: dataProvider.getEntityHandler,
    invalidateCache: dataProvider.invalidateCache,
  };
}

export function createCacheBreaker(dataProvider: DataProvider): DataProvider {
  const cache = new Map<EntityHandler<any, any>, string[]>();
  function invalidateCache<T, U>(
    invalidate: boolean,
    entityHandler: EntityHandler<T, U>,
    parameter?: U
  ) {
    const serializedParameter = JSON.stringify(parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders
    let cacheValue = cache.get(entityHandler);

    if (cacheValue === undefined) {
      cacheValue = [];
      cache.set(entityHandler, cacheValue);
    }

    const hasSeenRequest = cacheValue.includes(serializedParameter);
    if (hasSeenRequest === false) {
      invalidate = true;
      cacheValue.push(serializedParameter);
    }
    if (arguments.length > 2) {
      dataProvider.invalidateCache(invalidate, entityHandler, parameter);
    } else {
      dataProvider.invalidateCache(invalidate, entityHandler);
    }
  }

  return {
    invalidateCache: invalidateCache,
    getEntityHandler: dataProvider.getEntityHandler,
    getState: dataProvider.getState,
  };
}

export function createEntity<T, U>(
  entityHandlerFactory: () => EntityHandler<T, U>
) {
  const get = function (this: any, dataProvider: DataProvider, parameter: U) {
    const entityHandler = dataProvider.getEntityHandler(entityHandlerFactory);
    dataProvider.invalidateCache(false, entityHandler, parameter);

    return dataProvider.getState<T, U>(entityHandler, parameter).value;
  };

  get.invalidateCache = function (dataProvider: DataProvider, parameter?: U) {
    const entityHandler = dataProvider.getEntityHandler(entityHandlerFactory);
    if (arguments.length > 1) {
      dataProvider.invalidateCache(true, entityHandler, parameter as U);
    } else {
      dataProvider.invalidateCache(true, entityHandler);
    }
  };
  return get;
}
