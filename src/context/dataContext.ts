import { context } from "@plusnew/core";

export type EntityHandlerFactory<T, U, V> = () => EntityHandler<T, U, V>;

export type EntityHandler<T, U, V> = {
  mount: (context: {
    parameter: U;
    state: T | null;
    dispatch: (events: V[]) => void;
  }) => T;
  reduce: (context: { event: unknown; parameter: U; state: T }) => T;
};

export type DataContextState = {
  getState: <T, U, V>(request: {
    entityHandler: EntityHandler<T, U, V>;
    parameter: U;
    forceCacheRefresh: boolean;
  }) => { state: T; originalParameter: U };
  getEntityHandler: <T, U, V>(
    entityHandlerFactory: EntityHandlerFactory<T, U, V>
  ) => EntityHandler<T, U, V>;
  events: unknown[];
  addOnchangeListener: (cb: () => void) => void;
  removeOnchangeListener: (cb: () => void) => void;
};
export type DataContextAction = ["commit" | "merge", unknown[]];

export default context<DataContextState, DataContextAction>();
