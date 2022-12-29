import type { ApplicationElement } from "@plusnew/core";
import { Component } from "@plusnew/core";

export function entity<T, U, V>(
  cb: () => {
    mount: (context: { parameter: U; state: T | null }) => T;
    reduce: (context: { event: V; parameter: U; state: T }) => T;
  }
) {
  return class Entity extends Component<{
    parameters: U[];
    children: (result: {
      views: T[];
      dispatch: (events: V[]) => void;
    }) => ApplicationElement;
  }> {
    render() {
      return null;
    }
  };
}
