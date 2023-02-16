import type { ReadonlySignal, Signal } from "@preact/signals-core";
import { computed } from "@preact/signals-core";
import { signal } from "@preact/signals-core";
import type { DataProvider, EntityHandler } from "./context/dataContext";

export function createRepository(): Signal<DataProvider> {
  const dataProviderState: {
    [entityHandlerIdentifier: symbol]: {
      [request: string]: { value: Signal<any>; index: number };
    };
  } = {};
  const commands = signal([] as unknown[]);

  const commit = (newCommands: unknown[]) => {
    commands.value = [...commands.value, ...newCommands];
  };

  const merge = (_commands: unknown[]) => {
    throw new Error("not yet implemtend");
  };

  const getState = <T, U, V>(request: {
    entityHandler: EntityHandler<T, U, V>;
    entityHandlerIdentifier: symbol;
    parameter: U;
    // forceCacheRefresh: boolean;
  }): ReadonlySignal<T> => {
    let dataProviderStateValue =
      dataProviderState[request.entityHandlerIdentifier];

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState[request.entityHandlerIdentifier] =
        dataProviderStateValue;
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
    commit,
    merge,
    getState,
  }));
}

export function createBranch(
  dataProvider: Signal<DataProvider>
): Signal<DataProvider> {
  const commands = signal([] as unknown[]);

  const dataProviderState: {
    [entityHandlerIdentifier: symbol]: { [request: string]: Signal<any> };
  } = {};

  const commit = (newCommands: unknown[]) => {
    commands.value = [...commands.value, ...newCommands];
  };

  const merge = (_commands: unknown[]) => {
    throw new Error("not yet implemtend");
  };

  const getState = <T, U, V>(request: {
    entityHandler: EntityHandler<T, U, V>;
    entityHandlerIdentifier: symbol;
    parameter: U;
    // forceCacheRefresh: boolean;
  }): ReadonlySignal<T> => {
    let dataProviderStateValue =
      dataProviderState[request.entityHandlerIdentifier];

    if (dataProviderStateValue === undefined) {
      dataProviderStateValue = {};
      dataProviderState[request.entityHandlerIdentifier] =
        dataProviderStateValue;
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
    commit,
    merge,
    getState,
  }));
}

export function createEntity<T, U, V>(
  entityHandlerFactory: () => EntityHandler<T, U, V>
) {
  const entityHandler = entityHandlerFactory();
  const entityHandlerIdentifier = Symbol();

  return (dataProvider: Signal<DataProvider>, parameter: U) => {
    return computed(
      () =>
        dataProvider.value.getState<T, U, V>({
          parameter,
          entityHandler,
          entityHandlerIdentifier,
        }).value
    );
  };
}
