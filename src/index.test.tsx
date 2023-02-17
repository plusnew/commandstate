import { createEntity, createRepository, createBranch } from "./index";
import { expect } from "@esm-bundle/chai";
import { effect } from "@preact/signals-core";

describe("api", () => {
  it("repository and branch handling", () => {
    class Increment {
      public payload: { id: number };
      constructor(id: number) {
        this.payload = { id };
      }
    }
    const entity = createEntity<{ id: number; value: number }, { id: number }>(
      () => ({
        mount: ({ parameter }) => ({ id: parameter.id, value: parameter.id }),
        reduce: ({ state, command, parameter }) => {
          if (
            command instanceof Increment &&
            command.payload.id === parameter.id
          ) {
            return { id: state.id, value: state.value + 1 };
          }
          return state;
        },
      })
    );

    const repository = createRepository();
    const branch = createBranch(repository);
    const firstNested = entity(branch, {
      id: 1,
    });
    const secondNested = entity(branch, { id: 3 });
    const firstNotNested = entity(repository, { id: 1 });

    let firstNestedExpectedResult = 1;
    let firstNestedEffectCounter = 0;
    let secondEffectCounter = 0;
    let firstNotNestedExpectedResult = 1;
    let firstNotNestedEffectCounter = 0;

    const disconnectFirstNested = effect(() => {
      firstNestedEffectCounter++;
      expect(firstNested.value).to.deep.equal({
        id: 1,
        value: firstNestedExpectedResult,
      });
    });
    const disconnectSecond = effect(() => {
      secondEffectCounter++;
      expect(secondNested.value).to.deep.equal({ id: 3, value: 3 });
    });
    const disconnectFirstNotNested = effect(() => {
      firstNotNestedEffectCounter++;
      expect(firstNotNested.value).to.deep.equal({
        id: 1,
        value: firstNotNestedExpectedResult,
      });
    });

    expect(firstNestedEffectCounter).to.equal(1);
    expect(secondEffectCounter).to.equal(1);
    expect(firstNotNestedEffectCounter).to.equal(1);

    firstNestedExpectedResult = 2;
    branch.value.commit([new Increment(1)]);

    expect(firstNestedEffectCounter).to.equal(2);
    expect(secondEffectCounter).to.equal(1);
    expect(firstNotNestedEffectCounter).to.equal(1);

    firstNestedExpectedResult = 2;
    firstNotNestedExpectedResult = 2;
    branch.value.merge(branch.value.commands);

    expect(firstNestedEffectCounter).to.equal(3);
    expect(secondEffectCounter).to.equal(1);
    expect(firstNotNestedEffectCounter).to.equal(2);

    disconnectFirstNested();
    disconnectSecond();
    disconnectFirstNotNested();
  });
});
