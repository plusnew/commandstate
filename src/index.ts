import type { ReadonlySignal, Signal } from "@preact/signals-core";
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

type DataProvider = {
  getState: <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    // forceCacheRefresh: boolean;
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
    { [request: string]: { value: Signal<any>; index: number } }
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
    // forceCacheRefresh: boolean;
  }): ReadonlySignal<T> => {
    let dataProviderStateValue = dataProviderState.get(request.entityHandler);

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState.set(request.entityHandler, dataProviderStateValue);
    }

    const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

    if (serializedParameter in dataProviderStateValue === false) {
      dataProviderStateValue[serializedParameter] = {
        value: signal(
          request.entityHandler.mount({
            parameter: request.parameter,
            state: null,
            merge: commit,
          })
        ),
        index: commands.peek().length,
      };

      while (
        dataProviderStateValue[serializedParameter].index <
        commands.value.length
      ) {
        dataProviderStateValue[serializedParameter].value.value =
          request.entityHandler.reduce({
            command:
              commands.value[dataProviderStateValue[serializedParameter].index],
            parameter: request.parameter,
            state: dataProviderStateValue[serializedParameter].value.value,
          });

        dataProviderStateValue[serializedParameter].index++;
      }
    }
    return dataProviderStateValue[serializedParameter].value;
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

  const merge = (_commands: unknown[]) => {
    throw new Error("not yet implemtend");
  };

  const getState = <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    // forceCacheRefresh: boolean;
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

    return computed(
      () =>
        dataProvider.value.getState<T, U>({
          parameter,
          entityHandler,
        }).value
    );
  };
}
