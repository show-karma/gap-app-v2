/**
 * @file Tests for the commenter-identity hook. Reads `drsc_name` from
 * the FE-origin cookie, exposes the advisor flag plumbed in from the
 * parent, derives `hasIdentity`, and exposes a `clearIdentity()` action
 * that POSTs to the proxy clear-identity route.
 */

import { act, renderHook, waitFor } from "@testing-library/react";

import { useCommenterIdentity } from "@/hooks/useCommenterIdentity";
import { clearCommenterIdentity } from "@/services/donor-research-comments.service";

vi.mock("@/services/donor-research-comments.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/donor-research-comments.service")>(
    "@/services/donor-research-comments.service"
  );
  return {
    ...actual,
    clearCommenterIdentity: vi.fn().mockResolvedValue(undefined),
  };
});

const mockClear = vi.mocked(clearCommenterIdentity);

const TOKEN = "share-token-1";

function setNameCookie(value: string | null) {
  // jsdom's document.cookie setter appends rather than replaces; expire any
  // existing value first.
  document.cookie = "drsc_name=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  if (value !== null) {
    document.cookie = `drsc_name=${encodeURIComponent(value)}; path=/`;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  setNameCookie(null);
});

afterEach(() => {
  setNameCookie(null);
});

describe("useCommenterIdentity — displayName", () => {
  it("returns null displayName when no drsc_name cookie is present", () => {
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, false));
    expect(result.current.displayName).toBeNull();
  });

  it("returns the cookie value when drsc_name is present", () => {
    setNameCookie("Donor Dana");
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, false));
    expect(result.current.displayName).toBe("Donor Dana");
  });

  it("URI-decodes the cookie value", () => {
    setNameCookie("José Müller");
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, false));
    expect(result.current.displayName).toBe("José Müller");
  });
});

describe("useCommenterIdentity — isAdvisor + hasIdentity", () => {
  it("reflects the isAdvisor input prop", () => {
    const { result, rerender } = renderHook(
      ({ advisor }: { advisor: boolean }) => useCommenterIdentity(TOKEN, advisor),
      { initialProps: { advisor: false } }
    );
    expect(result.current.isAdvisor).toBe(false);
    rerender({ advisor: true });
    expect(result.current.isAdvisor).toBe(true);
  });

  it("hasIdentity is true when displayName is set even if not advisor", () => {
    setNameCookie("Donor Dana");
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, false));
    expect(result.current.hasIdentity).toBe(true);
  });

  it("hasIdentity is true when isAdvisor is true even without a cookie", () => {
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, true));
    expect(result.current.hasIdentity).toBe(true);
  });

  it("hasIdentity is false when neither displayName nor isAdvisor is set", () => {
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, false));
    expect(result.current.hasIdentity).toBe(false);
  });
});

describe("useCommenterIdentity — clearIdentity", () => {
  it("calls the proxy clear-identity route via the service and resets displayName", async () => {
    setNameCookie("Donor Dana");
    const { result } = renderHook(() => useCommenterIdentity(TOKEN, false));
    expect(result.current.displayName).toBe("Donor Dana");

    await act(async () => {
      await result.current.clearIdentity();
    });

    expect(mockClear).toHaveBeenCalledWith(TOKEN);
    await waitFor(() => expect(result.current.displayName).toBeNull());
    expect(result.current.hasIdentity).toBe(false);
  });
});
