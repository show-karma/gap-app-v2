import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mock stores and hooks
// ---------------------------------------------------------------------------

const mockPopulateEns = vi.fn();
const mockEnsData: Record<string, { name?: string | null; avatar?: string | null }> = {};

vi.mock("@/store/ens", () => ({
  useENS: vi.fn((selector: (state: unknown) => unknown) => {
    const state = {
      ensData: mockEnsData,
      populateEns: mockPopulateEns,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockPopulateProfiles = vi.fn();
const mockProfilesData: Record<
  string,
  {
    publicAddress: string;
    name: string;
    email?: string;
    picture?: string;
    isTried?: boolean;
    isFetching?: boolean;
  }
> = {};

vi.mock("@/store/userProfiles", () => ({
  useUserProfiles: vi.fn((selector: (state: unknown) => unknown) => {
    const state = {
      profiles: mockProfilesData,
      populateProfiles: mockPopulateProfiles,
    };
    return selector ? selector(state) : state;
  }),
}));

// Minimal ContributorProfile mock
interface MockContributorProfile {
  name?: string;
}
let mockContributorProfile: MockContributorProfile | null = null;

vi.mock("@/hooks/useContributorProfile", () => ({
  useContributorProfile: vi.fn(() => ({
    profile: mockContributorProfile,
    isLoading: false,
  })),
}));

// Mock next/image to avoid Next.js image optimization in tests
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

// Mock blo
vi.mock("blo", () => ({
  blo: vi.fn((addr: string) => `blockie:${addr}`),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const MOCK_ADDRESS_LOWER = MOCK_ADDRESS.toLowerCase();

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("EthereumAddressToProfileName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mutable state
    Object.keys(mockEnsData).forEach((k) => delete mockEnsData[k]);
    Object.keys(mockProfilesData).forEach((k) => delete mockProfilesData[k]);
    mockContributorProfile = null;
  });

  // -------------------------------------------------------------------------
  // Rendering basics
  // -------------------------------------------------------------------------
  describe("basic rendering", () => {
    it("renders a span element", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });
      const span = screen.getByText(/0x1234/);
      expect(span.tagName).toBe("SPAN");
    });

    it("applies font-body class", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText(/0x1234/)).toHaveClass("font-body");
    });

    it("applies custom className", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} className="text-red-500" />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText(/0x1234/)).toHaveClass("text-red-500");
    });
  });

  // -------------------------------------------------------------------------
  // Address display
  // -------------------------------------------------------------------------
  describe("address truncation", () => {
    it("truncates address by default", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText("0x1234...345678")).toBeInTheDocument();
    });

    it("shows full address when shouldTruncate is false", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} shouldTruncate={false} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText(MOCK_ADDRESS_LOWER)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Fallback chain
  // -------------------------------------------------------------------------
  describe("fallback chain", () => {
    it("tier 1: prefers ContributorProfile.name over everything", () => {
      mockContributorProfile = { name: "Contributor Alice" };
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "Privy Name",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: "ens.eth" };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Contributor Alice")).toBeInTheDocument();
    });

    it("tier 2: falls back to Privy name when no contributor profile", () => {
      mockContributorProfile = null;
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "Privy Name",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: "ens.eth" };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Privy Name")).toBeInTheDocument();
    });

    it("tier 3: falls back to Privy email when no name", () => {
      mockContributorProfile = null;
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        email: "user@example.com",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: "ens.eth" };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    it("tier 4: falls back to ENS name when no privy data", () => {
      mockContributorProfile = null;
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: "vitalik.eth" };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("vitalik.eth")).toBeInTheDocument();
    });

    it("tier 5: falls back to truncated address when no other data", () => {
      mockContributorProfile = null;
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: null };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("0x1234...345678")).toBeInTheDocument();
    });

    it("does not show privy name when isTried is false (still fetching)", () => {
      mockContributorProfile = null;
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "Privy Name",
        isTried: false,
        isFetching: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: "ens.eth" };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      // Should fall through to ENS since privy not yet tried
      expect(screen.getByText("ens.eth")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Profile picture
  // -------------------------------------------------------------------------
  describe("showProfilePicture=false (default)", () => {
    it("renders no avatar by default", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        picture: "https://example.com/pic.png",
        isTried: true,
      };

      const { container } = render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(container.querySelector("img")).not.toBeInTheDocument();
    });
  });

  describe("showProfilePicture=true", () => {
    it("renders privy picture when available and not problematic", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "Alice",
        picture: "https://example.com/pic.png",
        isTried: true,
      };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} showProfilePicture />, {
        wrapper: createWrapper(),
      });

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/pic.png");
    });

    it("falls back to ENS avatar when privy picture is absent", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = {
        avatar: "https://example.com/ens-avatar.png",
      };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} showProfilePicture />, {
        wrapper: createWrapper(),
      });

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/ens-avatar.png");
    });

    it("falls back to blockie when privy picture is problematic domain", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "Alice",
        // euc.li is in the problematic list
        picture: "https://euc.li/some-avatar.png",
        isTried: true,
      };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} showProfilePicture />, {
        wrapper: createWrapper(),
      });

      const img = screen.getByRole("img");
      expect(img.getAttribute("src")).toContain("blockie:");
    });

    it("falls back to blockie when ENS avatar is problematic domain", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        isTried: true,
      };
      mockEnsData[MOCK_ADDRESS_LOWER] = {
        avatar: "https://euc.li/ens-avatar.png",
      };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} showProfilePicture />, {
        wrapper: createWrapper(),
      });

      const img = screen.getByRole("img");
      expect(img.getAttribute("src")).toContain("blockie:");
    });

    it("falls back to blockie when no privy picture and no ENS avatar", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        isTried: true,
      };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} showProfilePicture />, {
        wrapper: createWrapper(),
      });

      const img = screen.getByRole("img");
      expect(img.getAttribute("src")).toContain("blockie:");
    });

    it("applies pictureClassName to the avatar image", () => {
      mockProfilesData[MOCK_ADDRESS_LOWER] = {
        publicAddress: MOCK_ADDRESS_LOWER,
        name: "",
        isTried: true,
      };

      render(
        <EthereumAddressToProfileName
          address={MOCK_ADDRESS}
          showProfilePicture
          pictureClassName="border-red-500"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole("img")).toHaveClass("border-red-500");
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe("edge cases", () => {
    it("renders empty span for undefined address", () => {
      const { container } = render(<EthereumAddressToProfileName address={undefined} />, {
        wrapper: createWrapper(),
      });
      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("renders raw non-0x input as-is", () => {
      render(<EthereumAddressToProfileName address="some-non-address-value" />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText("some-non-address-value")).toBeInTheDocument();
    });

    it("calls populateEns on mount", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });
      expect(mockPopulateEns).toHaveBeenCalledWith([MOCK_ADDRESS_LOWER]);
    });

    it("calls populateProfiles on mount", () => {
      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });
      expect(mockPopulateProfiles).toHaveBeenCalledWith([MOCK_ADDRESS_LOWER]);
    });

    it("does not call populateEns when address is already in cache", () => {
      mockEnsData[MOCK_ADDRESS_LOWER] = { name: "cached.eth" };

      render(<EthereumAddressToProfileName address={MOCK_ADDRESS} />, {
        wrapper: createWrapper(),
      });

      expect(mockPopulateEns).not.toHaveBeenCalled();
    });

    it("does not crash when address is empty string", () => {
      const { container } = render(<EthereumAddressToProfileName address="" />, {
        wrapper: createWrapper(),
      });
      expect(container.querySelector("span")).toBeInTheDocument();
    });
  });
});
