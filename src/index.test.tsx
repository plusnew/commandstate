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
    const entity = createEntity<
      { id: number; value: number },
      { id: number },
      Increment
    >(() => ({
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
    }));

    const repository = createRepository();
    const branch = createBranch(repository);
    const { state: firstNestedState, dispatch } = entity(branch, {
      id: 1,
    });
    const { state: secondState } = entity(branch, { id: 3 });
    const { state: firstNotNestedState } = entity(repository, { id: 1 });

    let firstNestedExpectedResult = 1;
    let firstNestedEffectCounter = 0;
    let secondEffectCounter = 0;
    const firstNotNestedExpectedResult = 1;
    let firstNotNestedEffectCounter = 0;

    const disconnectFirstNested = effect(() => {
      firstNestedEffectCounter++;
      expect(firstNestedState.value).to.deep.equal({
        id: 1,
        value: firstNestedExpectedResult,
      });
    });
    const disconnectSecond = effect(() => {
      secondEffectCounter++;
      expect(secondState.value).to.deep.equal({ id: 3, value: 3 });
    });
    const disconnectFirstNotNested = effect(() => {
      firstNotNestedEffectCounter++;
      expect(firstNotNestedState.value).to.deep.equal({
        id: 1,
        value: firstNotNestedExpectedResult,
      });
    });

    expect(firstNestedEffectCounter).to.equal(1);
    expect(secondEffectCounter).to.equal(1);
    expect(firstNotNestedEffectCounter).to.equal(1);

    firstNestedExpectedResult = 2;
    dispatch(new Increment(1));

    expect(firstNestedEffectCounter).to.equal(2);
    expect(secondEffectCounter).to.equal(1);
    expect(firstNotNestedEffectCounter).to.equal(1);

    disconnectFirstNested();
    disconnectSecond();
    disconnectFirstNotNested();
  });
});
