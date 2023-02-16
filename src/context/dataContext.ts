import type { Signal } from "@preact/signals-core";

export type EntityHandlerFactory<T, U, V> = () => EntityHandler<T, U, V>;

export type EntityHandler<T, U, V> = {
  mount: (context: {
    parameter: U;
    state: T | null;
    merge: (events: V[]) => void;
  }) => T;
  reduce: (context: { command: unknown; parameter: U; state: T }) => T;
};

export type DataProvider = {
  getState: <T, U, V>(request: {
    entityHandler: EntityHandler<T, U, V>;
    entityHandlerIdentifier: symbol;
    parameter: U;
    // forceCacheRefresh: boolean;
  }) => Signal<T>;
  commands: unknown[];
  commit: (command: unknown[]) => void;
  merge: (command: unknown[]) => void;
};
