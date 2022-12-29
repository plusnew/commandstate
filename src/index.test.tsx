import plusnew from "@plusnew/core";
import "@plusnew/driver-dom";
import driver from "@plusnew/driver-dom";
import { entity } from "./index";

describe("api", () => {
  it("map handling", () => {
    const container = document.createElement("div");
    const Entity = entity<
      { id: number; value: number },
      number,
      { id: number; type: "increment" | "something" }
    >(() => ({
      mount: ({ parameter }) => ({ id: parameter, value: parameter }),
      reduce: ({ state, event, parameter }) => {
        if (event.id === parameter) {
          switch (event.type) {
            case "increment":
              return { id: state.id, value: state.value + 1 };
          }
        }
        return state;
      },
    }));

    const component = plusnew.render(
      <Entity parameters={[0, 2]}>
        {({ views, dispatch }) =>
          views.map((view) => (
            <span
              onclick={() => dispatch([{ id: view.id, type: "increment" }])}
              data-test-id={view.id}
            >
              {view.value}
            </span>
          ))
        }
      </Entity>,
      {
        driver: driver(container),
      }
    );

    component.remove(false);
  });
});
