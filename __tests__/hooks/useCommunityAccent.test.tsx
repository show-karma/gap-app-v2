/**
 * @file Tests for useCommunityAccent override priority chain.
 */

import { renderHook } from "@testing-library/react";
import { useCommunityAccent } from "@/hooks/useCommunityAccent";

vi.mock("@/hooks/useDominantColor", () => ({
  useDominantColor: vi.fn(() => null),
}));
vi.mock("@/hooks/v2/useCommunityDetails", () => ({
  useCommunityDetails: vi.fn(),
}));
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(),
}));
vi.mock("@/utilities/communityColors", () => ({
  communityColors: {
    "0xabc": "#ABCDEF",
    filecoin: "#0090FF",
  },
}));

import { useDominantColor } from "@/hooks/useDominantColor";
import { useCommunityDetails } from "@/hooks/v2/useCommunityDetails";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const mockUseDominantColor = useDominantColor as vi.MockedFunction<typeof useDominantColor>;
const mockUseCommunityDetails = useCommunityDetails as vi.MockedFunction<
  typeof useCommunityDetails
>;
const mockUseWhitelabel = useWhitelabel as vi.MockedFunction<typeof useWhitelabel>;

describe("useCommunityAccent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDominantColor.mockReturnValue(null);
    mockUseWhitelabel.mockReturnValue({ config: null } as ReturnType<typeof useWhitelabel>);
    mockUseCommunityDetails.mockReturnValue({
      community: { uid: "0xabc", details: { slug: "filecoin" } },
    } as ReturnType<typeof useCommunityDetails>);
  });

  it("prefers whitelabel config logoBackground over all other sources", () => {
    mockUseWhitelabel.mockReturnValue({
      config: { theme: { logoBackground: "#FF0000" } },
    } as ReturnType<typeof useWhitelabel>);
    mockUseDominantColor.mockReturnValue("#222222");
    const { result } = renderHook(() => useCommunityAccent("filecoin"));
    expect(result.current).toBe("#FF0000");
  });

  it("falls back to communityColors mapping by uid when no theme override", () => {
    const { result } = renderHook(() => useCommunityAccent("filecoin"));
    expect(result.current).toBe("#ABCDEF");
  });

  it("falls back to communityColors mapping by slug when uid not present", () => {
    mockUseCommunityDetails.mockReturnValue({
      community: { uid: "0xunknown", details: { slug: "filecoin" } },
    } as ReturnType<typeof useCommunityDetails>);
    const { result } = renderHook(() => useCommunityAccent("filecoin"));
    expect(result.current).toBe("#0090FF");
  });

  it("falls back to dominant color extracted from logo", () => {
    mockUseCommunityDetails.mockReturnValue({
      community: { uid: "0xunknown", details: { slug: "unknown-slug", logoUrl: "x.png" } },
    } as ReturnType<typeof useCommunityDetails>);
    mockUseDominantColor.mockReturnValue("#123456");
    const { result } = renderHook(() => useCommunityAccent("unknown-slug"));
    expect(result.current).toBe("#123456");
  });

  it("falls back to a deterministic seeded palette color when nothing else matches", () => {
    mockUseCommunityDetails.mockReturnValue({
      community: { uid: "0xseed", details: { slug: "seeded" } },
    } as ReturnType<typeof useCommunityDetails>);
    const { result: a } = renderHook(() => useCommunityAccent("seeded"));
    const { result: b } = renderHook(() => useCommunityAccent("seeded"));
    expect(a.current).toBe(b.current);
    expect(a.current).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("returns a fallback color even when community details are missing", () => {
    mockUseCommunityDetails.mockReturnValue({ community: null } as unknown as ReturnType<
      typeof useCommunityDetails
    >);
    const { result } = renderHook(() => useCommunityAccent(undefined));
    expect(result.current).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
