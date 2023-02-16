import type { Signal } from "@preact/signals-core";
import { batch, effect, signal } from "@preact/signals-core";
import type {
  DataProvider,
  EntityHandler,
  EntityHandlerFactory,
} from "../context/dataContext";

type EntityHandlerRepositoryValue<T, U> = {
  originalParameter: U;
  index: number;
  value: Signal<T>;
};

type EntityHandlerRepository<T, U> = {
  [parameter: string]: EntityHandlerRepositoryValue<T, U> | undefined;
};

export default function createRepository(): DataProvider {
  const state = new Map<
    EntityHandler<any, any, any>,
    EntityHandlerRepository<any, any>
  >();
  const entityHandlers = new Map<
    EntityHandlerFactory<any, any, any>,
    EntityHandler<any, any, any>
  >();
  const commands = signal<unknown[]>([]);
  const dispatch = (type: "commit" | "merge", command: unknown) => {
    if (type === "commit") {
      commands.value = [...commands.value, command];
    } else {
      throw new Error("Cant merge on a repository");
    }
  };

  return {
    getState: <T, U, V>(request: {
      entityHandlerFactory: EntityHandlerFactory<T, U, V>;
      parameter: U;
      forceCacheRefresh: boolean;
    }) => {
      let entityHandler = entityHandlers.get(request.entityHandlerFactory);
      if (entityHandler === undefined) {
        entityHandler = request.entityHandlerFactory();
        entityHandlers.set(request.entityHandlerFactory, entityHandler);
      }
      let entityHandlerRepository = state.get(entityHandler);
      if (entityHandlerRepository === undefined) {
        entityHandlerRepository = {};
        state.set(entityHandler, entityHandlerRepository);
      }
      const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

      if (serializedParameter in entityHandlerRepository === false) {
        entityHandlerRepository[serializedParameter] = {
          originalParameter: request.parameter,
          index: commands.value.length,
          value: signal(
            (entityHandler as EntityHandler<T, U, V>).mount({
              parameter: request.parameter,
              state: null,
              dispatch: (command) => dispatch("commit", command),
            })
          ),
        };

        effect(() => {
          //   debugger;
          batch(() => {
            const entityHandlerRepositoryValue = (
              entityHandlerRepository as EntityHandlerRepository<T, U>
            )[serializedParameter] as EntityHandlerRepositoryValue<T, U>;
            // debugger;
            while (entityHandlerRepositoryValue.index < commands.value.length) {
              entityHandlerRepositoryValue.value.value = (
                entityHandler as EntityHandler<T, U, V>
              ).reduce({
                command: commands.value[entityHandlerRepositoryValue.index],
                parameter: entityHandlerRepositoryValue.originalParameter,
                state: entityHandlerRepositoryValue.value.value,
              });

              entityHandlerRepositoryValue.index++;
            }
          });
        });
      }

      return {
        entityHandler,
        state: entityHandlerRepository[serializedParameter]?.value as Signal<T>,
        originalParameter: (
          entityHandlerRepository[
            serializedParameter
          ] as EntityHandlerRepositoryValue<T, U>
        ).originalParameter,
      };
    },
    dispatch: dispatch,
    commands,
  };
}
