import type { ReadonlySignal } from "@preact/signals-core";
import { computed, signal } from "@preact/signals-core";
import type {
  DataProvider,
  EntityHandlerFactory,
} from "../context/dataContext";

type EntityHandlerBranchValue<T> = ReadonlySignal<T>;

type EntityHandlerBranch<T> = {
  [parameter: string]: EntityHandlerBranchValue<T> | undefined;
};

export default function createBranch(dataContext: DataProvider): DataProvider {
  const state = new Map<
    EntityHandlerFactory<any, any, any>,
    EntityHandlerBranch<any>
  >();
  const commands = signal<unknown[]>([]);
  const dispatch = (type: "commit" | "merge", command: unknown) => {
    if (type === "commit") {
      commands.value = [...commands.value, command];
    } else {
      throw new Error("Cant merge on a Branch");
    }
  };

  return {
    getState: <T, U, V>(request: {
      entityHandlerFactory: EntityHandlerFactory<T, U, V>;
      parameter: U;
      forceCacheRefresh: boolean;
    }) => {
      let entityHandlerBranch = state.get(request.entityHandlerFactory);
      const parentResult = dataContext.getState(request);

      if (entityHandlerBranch === undefined) {
        entityHandlerBranch = {};
        state.set(request.entityHandlerFactory, entityHandlerBranch);
      }

      const serializedParameter = JSON.stringify(request.parameter); // @TODO improve serializer, stringify doesn always produce the same results in case of different orders

      if (serializedParameter in entityHandlerBranch === false) {
        entityHandlerBranch[serializedParameter] = computed(() =>
          commands.value.reduce(
            (accumulator, command) =>
              parentResult.entityHandler.reduce({
                command,
                parameter: request.parameter,
                state: accumulator as T,
              }),
            parentResult.state.value
          )
        );
      }

      return {
        entityHandler: parentResult.entityHandler,
        state: entityHandlerBranch[
          serializedParameter
        ] as EntityHandlerBranchValue<T>,
        originalParameter: parentResult.originalParameter,
      };
    },
    dispatch: dispatch,
    commands,
  };
}
