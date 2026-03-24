import { useQuery, useQueryClient } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestQueryClient, renderHookWithProviders, renderWithProviders } from "../render";

describe("createTestQueryClient", () => {
  it("creates a QueryClient with retry disabled", () => {
    const qc = createTestQueryClient();
    const defaults = qc.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("sets gcTime and staleTime to 0", () => {
    const qc = createTestQueryClient();
    const defaults = qc.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(0);
    expect(defaults.queries?.staleTime).toBe(0);
  });
});

describe("renderWithProviders", () => {
  it("renders a simple component", () => {
    renderWithProviders(<div data-testid="hello">Hello</div>);
    expect(screen.getByTestId("hello")).toBeDefined();
    expect(screen.getByTestId("hello").textContent).toBe("Hello");
  });

  it("provides React Query context so useQuery works", async () => {
    function TestComponent() {
      const { data, isSuccess } = useQuery({
        queryKey: ["test"],
        queryFn: () => Promise.resolve("ok"),
      });
      if (isSuccess) return <span data-testid="result">{data}</span>;
      return <span data-testid="loading">loading</span>;
    }

    renderWithProviders(<TestComponent />);
    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("ok");
    });
  });

  it("accepts a custom QueryClient", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(["pre-seeded"], "seeded-value");

    function TestComponent() {
      const { data } = useQuery({
        queryKey: ["pre-seeded"],
        queryFn: () => Promise.resolve("should not be called"),
        initialData: undefined,
      });
      return <span data-testid="val">{data ?? "empty"}</span>;
    }

    renderWithProviders(<TestComponent />, { queryClient: qc });
    expect(screen.getByTestId("val").textContent).toBe("seeded-value");
  });
});

describe("renderHookWithProviders", () => {
  it("renders a hook that uses React Query", async () => {
    const { result } = renderHookWithProviders(() =>
      useQuery({ queryKey: ["hook-test"], queryFn: () => Promise.resolve(42) })
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBe(42);
  });

  it("returns the queryClient for cache inspection", () => {
    const { queryClient } = renderHookWithProviders(() => useQueryClient());
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.getQueryData).toBe("function");
  });
});
