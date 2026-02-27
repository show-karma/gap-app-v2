/**
 * Unit tests for the payouts redirect page.
 *
 * This is a Next.js 15 server component that:
 * 1. Awaits the params promise (async params pattern)
 * 2. Calls redirect() to the CONTROL_CENTER route
 */

// Mock next/navigation with redirect function
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  notFound: jest.fn(),
}));

import { redirect } from "next/navigation";
import CommunityPayoutsPage from "@/app/community/[communityId]/manage/payouts/page";
import { PAGES } from "@/utilities/pages";

const mockedRedirect = jest.mocked(redirect);

describe("CommunityPayoutsPage (payouts redirect)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
