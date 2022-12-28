function entity<T, U, V>(value: {
  create: (parameter: U, previousState: T | null) => T;
  reduce: (event: V, previousState: T) => T;
}): [T, U, V];

const foo = entity({
  create: () => 0,
  reduce: (event: "increment" | "bar", previousState) => {
    switch (event) {
      case "increment":
        return previousState + 1;

      default:
        return previousState;
    }
  },
});
