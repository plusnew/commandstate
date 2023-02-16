import type { Signal } from "@preact/signals-core";

export type EntityHandlerFactory<T, U, V> = () => EntityHandler<T, U, V>;

export type EntityHandler<T, U, V> = {
  mount: (context: {
    parameter: U;
    state: T | null;
    dispatch: (events: V[]) => void;
  }) => T;
  reduce: (context: { command: unknown; parameter: U; state: T }) => T;
};

export type DataProvider = {
  getState: <T, U, V>(request: {
    entityHandlerFactory: EntityHandlerFactory<T, U, V>;
    parameter: U;
    forceCacheRefresh: boolean;
  }) => {
    entityHandler: EntityHandler<T, U, V>;
    state: Signal<T>;
    originalParameter: U;
  };
  dispatch: (type: "commit" | "merge", events: unknown) => void;
  commands: Signal<unknown[]>;
};
export type DataContextAction = ["commit" | "merge", unknown[]];
