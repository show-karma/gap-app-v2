import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Simulated query string seeding the hook. Each test mutates this before
// rendering to emulate a deep link such as `?search=foo&status=enabled`.
const initialParams: Record<string, string | null> = {};

// Stateful nuqs mock backed by useState, but seeded from `initialParams` and
// passed through the hook's own `parse` so the typed-narrowing logic (invalid
// status -> "all") is genuinely exercised, mirroring real nuqs read behavior.
vi.mock("nuqs", () => ({
  useQueryState: (
    key: string,
    options: {
      defaultValue?: unknown;
      parse?: (value: string) => unknown;
    }
  ) => {
    const raw = initialParams[key];
    const seeded =
      raw != null ? (options?.parse ? options.parse(raw) : raw) : (options?.defaultValue ?? null);
    const [value, setValue] = useState<unknown>(seeded);
    return [value, (next: unknown) => setValue(next)] as const;
  },
}));

import { useFundingProgramFilters } from "@/hooks/useFundingProgramFilters";

describe("useFundingProgramFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(initialParams)) {
      delete initialParams[key];
    }
  });

  describe("defaults", () => {
    it("returns empty search and 'all' status with an empty URL", () => {
      const { result } = renderHook(() => useFundingProgramFilters());

      expect(result.current.search).toBe("");
      expect(result.current.status).toBe("all");
    });
  });

  describe("deep-link seeding", () => {
    it("seeds search and status from ?search=foo&status=enabled", () => {
      initialParams.search = "foo";
      initialParams.status = "enabled";

      const { result } = renderHook(() => useFundingProgramFilters());

      expect(result.current.search).toBe("foo");
      expect(result.current.status).toBe("enabled");
    });

    it("seeds the disabled status", () => {
      initialParams.status = "disabled";

      const { result } = renderHook(() => useFundingProgramFilters());

      expect(result.current.status).toBe("disabled");
    });

    it("narrows an invalid status value to 'all'", () => {
      initialParams.status = "bogus";

      const { result } = renderHook(() => useFundingProgramFilters());

      expect(result.current.status).toBe("all");
    });
  });

  describe("setters", () => {
    it("round-trips the search value", () => {
      const { result } = renderHook(() => useFundingProgramFilters());

      act(() => result.current.setSearch("grants"));

      expect(result.current.search).toBe("grants");
    });

    it("round-trips the status value", () => {
      const { result } = renderHook(() => useFundingProgramFilters());

      act(() => result.current.setStatus("enabled"));
      expect(result.current.status).toBe("enabled");

      act(() => result.current.setStatus("disabled"));
      expect(result.current.status).toBe("disabled");

      act(() => result.current.setStatus("all"));
      expect(result.current.status).toBe("all");
    });
  });
});
