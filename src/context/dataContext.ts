import { context } from "@plusnew/core";

export type EntityHandler<T, U> = {
  mount: (context: { parameter: U; state: T | null }) => T;
  reduce: (context: { event: unknown; parameter: U; state: T }) => T;
};
export type DataContextState = {
  getState: <T, U>(request: {
    entityHandler: EntityHandler<T, U>;
    parameter: U;
    forceCacheRefresh: boolean;
  }) => T;
  events: unknown[];
  onchange: (cb: () => void) => void;
};
export type DataContextAction = ["commit" | "merge", unknown[]];

export default context<DataContextState, DataContextAction>();
