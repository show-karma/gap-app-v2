/**
 * Unit tests for the payouts redirect page.
 *
 * This is a Next.js 15 server component that:
 * 1. Awaits the params promise (async params pattern)
 * 2. Calls redirect() to the CONTROL_CENTER route
 */

// Mock next/navigation with redirect function
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  notFound: vi.fn(),
}));

import { redirect } from "next/navigation";
import CommunityPayoutsPage from "@/app/community/[communityId]/manage/payouts/page";
import { PAGES } from "@/utilities/pages";

const mockedRedirect = vi.mocked(redirect);

describe("CommunityPayoutsPage (payouts redirect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls redirect with the correct control center URL", async () => {
    // Arrange
    const communityId = "my-community-slug";
    const params = Promise.resolve({ communityId });

    // Act
    await CommunityPayoutsPage({ params });

    // Assert
    expect(mockedRedirect).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).toHaveBeenCalledWith(PAGES.ADMIN.CONTROL_CENTER(communityId));
  });

  it("resolves params before redirecting (async params pattern)", async () => {
    // Arrange
    const communityId = "test-uuid-12345";
    let paramsResolved = false;
    const params = new Promise<{ communityId: string }>((resolve) => {
      setTimeout(() => {
        paramsResolved = true;
        resolve({ communityId });
      }, 10);
    });

    // Act
    await CommunityPayoutsPage({ params });

    // Assert
    expect(paramsResolved).toBe(true);
    expect(mockedRedirect).toHaveBeenCalledWith(PAGES.ADMIN.CONTROL_CENTER(communityId));
  });

  it("generates the expected URL format", async () => {
    // Arrange
    const communityId = "some-community";
    const expectedUrl = `/community/${communityId}/manage/control-center`;
    const params = Promise.resolve({ communityId });

    // Act
    await CommunityPayoutsPage({ params });

    // Assert
    expect(mockedRedirect).toHaveBeenCalledWith(expectedUrl);
  });
});
