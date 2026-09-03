import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { useWhitelabel, WhitelabelProvider } from "@/utilities/whitelabel-context";

/**
 * WhitelabelProvider is the single place the whitelabel promise is unwrapped,
 * which is what lets the root layout stay synchronous while ~25 consumers —
 * `Link` among them, rendered inside almost every page — keep receiving a
 * plain, non-suspending value.
 */

const TENANT = {
  isWhitelabel: true,
  communitySlug: "optimism",
  config: null,
  tenantConfig: null,
};

const MAIN = {
  isWhitelabel: false,
  communitySlug: null,
  config: null,
  tenantConfig: null,
};

function Consumer() {
  const { isWhitelabel, communitySlug } = useWhitelabel();

  return <span data-testid="consumer">{isWhitelabel ? communitySlug : "main"}</span>;
}

describe("WhitelabelProvider", () => {
  it("accepts an already-resolved value without suspending", () => {
    render(
      <WhitelabelProvider value={MAIN}>
        <Consumer />
      </WhitelabelProvider>
    );

    expect(screen.getByTestId("consumer")).toHaveTextContent("main");
  });

  it("unwraps a promise and hands consumers the resolved value", async () => {
    const pending = Promise.resolve(TENANT);

    await act(async () => {
      render(
        <Suspense fallback={<span data-testid="pending" />}>
          <WhitelabelProvider value={pending}>
            <Consumer />
          </WhitelabelProvider>
        </Suspense>
      );
    });

    expect(screen.getByTestId("consumer")).toHaveTextContent("optimism");
    expect(screen.queryByTestId("pending")).not.toBeInTheDocument();
  });

  // The reason the change stays small: making `useWhitelabel` itself suspend
  // would put every page that renders a `Link` behind a boundary.
  it("does not make consumers suspend once the value is in context", () => {
    render(
      <Suspense fallback={<span data-testid="pending" />}>
        <WhitelabelProvider value={TENANT}>
          <Consumer />
        </WhitelabelProvider>
      </Suspense>
    );

    // Rendered on the first pass: the boundary never showed its fallback.
    expect(screen.getByTestId("consumer")).toHaveTextContent("optimism");
    expect(screen.queryByTestId("pending")).not.toBeInTheDocument();
  });

  it("falls back to the non-whitelabel default with no provider above", () => {
    render(<Consumer />);

    expect(screen.getByTestId("consumer")).toHaveTextContent("main");
  });
});
