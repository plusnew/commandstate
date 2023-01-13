import plusnew, { store } from "@plusnew/core";
import "@plusnew/driver-dom";
import driver from "@plusnew/driver-dom";
import { entity, Branch, Repository, Merge, CacheBreaker } from "../index";
import { expect } from "@esm-bundle/chai";

describe("api", () => {
  it("map handling", () => {
    const container = document.createElement("div");

    class Increment {
      public payload: { id: number };
      constructor(id: number) {
        this.payload = { id };
      }
    }
    const Entity = entity<
      { id: number; value: number },
      { id: number },
      Increment
    >(() => ({
      mount: ({ parameter }) => ({ id: parameter.id, value: parameter.id }),
      reduce: ({ state, event, parameter }) => {
        if (event instanceof Increment && event.payload.id === parameter.id) {
          return { id: state.id, value: state.value + 1 };
        }
        return state;
      },
    }));

    const component = plusnew.render(
      <Repository>
        <section data-test-id="branched">
          <Branch>
            <Entity parameters={[{ id: 0 }, { id: 5 }]}>
              {({ views, dispatch }) =>
                views.map((view) => (
                  <button
                    onclick={() => dispatch([new Increment(view.id)])}
                    data-test-id={view.id}
                  >
                    {view.value}
                  </button>
                ))
              }
            </Entity>
            <Merge>
              {({ events, merge }) => (
                <button onclick={() => merge(events)} data-test-id="submit" />
              )}
            </Merge>
          </Branch>
        </section>
        <section data-test-id="branchless">
          <Entity parameters={[{ id: 0 }, { id: 5 }]}>
            {({ views, dispatch }) =>
              views.map((view) => (
                <button
                  onclick={() => dispatch([new Increment(view.id)])}
                  data-test-id={view.id}
                >
                  {view.value}
                </button>
              ))
            }
          </Entity>
        </section>
      </Repository>,
      {
        driver: driver(container),
      }
    );

    const branchedSection = container.querySelector(
      '[data-test-id="branched"]'
    ) as Element;
    const branchedFirstButton = branchedSection.querySelector(
      '[data-test-id="0"'
    ) as Element;
    const branchedSecondButton = branchedSection.querySelector(
      '[data-test-id="5"'
    ) as Element;
    const branchlessSection = container.querySelector(
      '[data-test-id="branchless"]'
    ) as Element;
    const branchlessFirstButton = branchlessSection.querySelector(
      '[data-test-id="0"'
    ) as Element;
    const branchlessSecondButton = branchlessSection.querySelector(
      '[data-test-id="5"'
    ) as Element;

    expect(branchedFirstButton.textContent).to.equal("0");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("0");
    expect(branchlessSecondButton.textContent).to.equal("5");

    branchedFirstButton.dispatchEvent(new MouseEvent("click"));

    expect(branchedFirstButton.textContent).to.equal("1");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("0");
    expect(branchlessSecondButton.textContent).to.equal("5");

    branchlessFirstButton.dispatchEvent(new MouseEvent("click"));

    expect(branchedFirstButton.textContent).to.equal("2");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("1");
    expect(branchlessSecondButton.textContent).to.equal("5");

    (
      branchedSection.querySelector('[data-test-id="submit"]') as Element
    ).dispatchEvent(new MouseEvent("click"));

    expect(branchedFirstButton.textContent).to.equal("2");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("2");
    expect(branchlessSecondButton.textContent).to.equal("5");

    branchedFirstButton.dispatchEvent(new MouseEvent("click"));

    expect(branchedFirstButton.textContent).to.equal("3");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("2");
    expect(branchlessSecondButton.textContent).to.equal("5");

    component.remove(false);
  });

  it("repository first", () => {
    const container = document.createElement("div");
    class Increment {
      public payload: { id: number };
      constructor(id: number) {
        this.payload = { id };
      }
    }
    const Entity = entity<
      { id: number; value: number },
      { id: number },
      Increment
    >(() => ({
      mount: ({ parameter }) => ({ id: parameter.id, value: parameter.id }),
      reduce: ({ state, event, parameter }) => {
        if (event instanceof Increment && event.payload.id === parameter.id) {
          return { id: state.id, value: state.value + 1 };
        }
        return state;
      },
    }));

    const component = plusnew.render(
      <Repository>
        <section data-test-id="branched">
          <Branch>
            <Entity parameters={[{ id: 0 }, { id: 5 }]}>
              {({ views, dispatch }) =>
                views.map((view) => (
                  <button
                    onclick={() => dispatch([new Increment(view.id)])}
                    data-test-id={view.id}
                  >
                    {view.value}
                  </button>
                ))
              }
            </Entity>
            <Merge>
              {({ events, merge }) => (
                <button onclick={() => merge(events)} data-test-id="submit" />
              )}
            </Merge>
          </Branch>
        </section>
        <section data-test-id="branchless">
          <Entity parameters={[{ id: 0 }, { id: 5 }]}>
            {({ views, dispatch }) =>
              views.map((view) => (
                <button
                  onclick={() => dispatch([new Increment(view.id)])}
                  data-test-id={view.id}
                >
                  {view.value}
                </button>
              ))
            }
          </Entity>
        </section>
      </Repository>,
      {
        driver: driver(container),
      }
    );

    const branchedSection = container.querySelector(
      '[data-test-id="branched"]'
    ) as Element;
    const branchedFirstButton = branchedSection.querySelector(
      '[data-test-id="0"'
    ) as Element;
    const branchedSecondButton = branchedSection.querySelector(
      '[data-test-id="5"'
    ) as Element;
    const branchlessSection = container.querySelector(
      '[data-test-id="branchless"]'
    ) as Element;
    const branchlessFirstButton = branchlessSection.querySelector(
      '[data-test-id="0"'
    ) as Element;
    const branchlessSecondButton = branchlessSection.querySelector(
      '[data-test-id="5"'
    ) as Element;

    expect(branchedFirstButton.textContent).to.equal("0");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("0");
    expect(branchlessSecondButton.textContent).to.equal("5");

    branchlessFirstButton.dispatchEvent(new MouseEvent("click"));

    expect(branchedFirstButton.textContent).to.equal("1");
    expect(branchedSecondButton.textContent).to.equal("5");
    expect(branchlessFirstButton.textContent).to.equal("1");
    expect(branchlessSecondButton.textContent).to.equal("5");

    component.remove(false);
  });

  describe("CacheBreaker", () => {
    it("Request again when cache breaker is present", () => {
      const container = document.createElement("div");
      let result = "foo";

      const Entity = entity<string, number, never>(() => ({
        mount: ({ parameter }) => result + parameter,
        reduce: ({ state }) => {
          return state;
        },
      }));
      const show = store(false);

      const component = plusnew.render(
        <Repository>
          <section data-test-id="without-cachebreaker">
            <Entity parameters={[0]}>{({ views: [view] }) => view}</Entity>
          </section>

          <show.Observer>
            {(showState) =>
              showState && (
                <CacheBreaker>
                  <section data-test-id="with-cachebreaker">
                    <Entity parameters={[0]}>
                      {({ views: [view] }) => view}
                    </Entity>
                  </section>
                </CacheBreaker>
              )
            }
          </show.Observer>
        </Repository>,
        {
          driver: driver(container),
        }
      );

      const withoutCachebreaker = container.querySelector(
        '[data-test-id="without-cachebreaker"]'
      ) as Element;

      expect(withoutCachebreaker.textContent).to.equal("foo0");

      result = "bar";
      show.dispatch(true);

      const withCachebreaker = container.querySelector(
        '[data-test-id="with-cachebreaker"]'
      ) as Element;

      expect(withoutCachebreaker.textContent).to.equal("bar0");
      expect(withCachebreaker.textContent).to.equal("bar0");

      component.remove(false);
    });

    it("Request again when nested cache breaker is present", () => {
      const container = document.createElement("div");
      let result = "foo";

      const Entity = entity<string, number, never>(() => ({
        mount: ({ parameter }) => result + parameter,
        reduce: ({ state }) => {
          return state;
        },
      }));
      const show = store(false);

      const component = plusnew.render(
        <Repository>
          <CacheBreaker>
            <section data-test-id="without-cachebreaker">
              <Entity parameters={[0]}>{({ views: [view] }) => view}</Entity>
            </section>

            <show.Observer>
              {(showState) =>
                showState && (
                  <CacheBreaker>
                    <section data-test-id="with-cachebreaker">
                      <Entity parameters={[0]}>
                        {({ views: [view] }) => view}
                      </Entity>
                    </section>
                  </CacheBreaker>
                )
              }
            </show.Observer>
          </CacheBreaker>
        </Repository>,
        {
          driver: driver(container),
        }
      );

      const withoutCachebreaker = container.querySelector(
        '[data-test-id="without-cachebreaker"]'
      ) as Element;

      expect(withoutCachebreaker.textContent).to.equal("foo0");

      result = "bar";
      show.dispatch(true);

      const withCachebreaker = container.querySelector(
        '[data-test-id="with-cachebreaker"]'
      ) as Element;

      expect(withoutCachebreaker.textContent).to.equal("bar0");
      expect(withCachebreaker.textContent).to.equal("bar0");

      component.remove(false);
    });

    it("Request again with cacheInvalidation", () => {
      const container = document.createElement("div");
      let result = "foo";

      const Entity = entity<string, number, never>(() => ({
        mount: ({ parameter }) => result + parameter,
        reduce: ({ state }) => {
          return state;
        },
      }));

      const component = plusnew.render(
        <Repository>
          <Entity parameters={[0]}>
            {({ views: [view], invalidateCache }) => (
              <section
                onclick={invalidateCache}
                data-test-id="without-cachebreaker"
              >
                {view}
              </section>
            )}
          </Entity>
        </Repository>,
        {
          driver: driver(container),
        }
      );

      const withoutCachebreaker = container.querySelector(
        '[data-test-id="without-cachebreaker"]'
      ) as Element;

      expect(withoutCachebreaker.textContent).to.equal("foo0");

      result = "bar";
      withoutCachebreaker.dispatchEvent(new MouseEvent("click"));

      expect(withoutCachebreaker.textContent).to.equal("bar0");

      component.remove(false);
    });
  });
});
