import { fireEvent, render, screen } from "@testing-library/react";

// Mock boring-avatars (needed by ProfilePicture)
vi.mock("boring-avatars", () => ({
  __esModule: true,
  default: ({ size, name, variant, colors }: Record<string, unknown>) => (
    <div
      data-testid="boring-avatar"
      data-size={size}
      data-name={name}
      data-variant={variant}
      data-colors={JSON.stringify(colors)}
    >
      {name as string}
    </div>
  ),
}));

// Unmock ProfilePicture so we test real fallback behavior
vi.unmock("@/components/Utilities/ProfilePicture");

// Mock hooks and stores used by GrantAssociation
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({ grants: [] })),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn(() => ({ project: { uid: "test-project-uid" } })),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: {
      ALL_GRANTS: vi.fn(
        (slug: string, programId?: string) => `/community/${slug}/grants/${programId || ""}`
      ),
    },
  },
}));

import { GrantAssociation } from "@/components/Shared/ActivityCard/GrantAssociation";

describe("GrantAssociation", () => {
  describe("GrantItem with ProfilePicture", () => {
    it("should render ProfilePicture for community image in milestone grants", () => {
      const milestone = {
        type: "grant" as const,
        uid: "milestone-1",
        title: "Test Milestone",
        source: {
          grantMilestone: {
            grant: {
              details: { title: "Test Grant", programId: "prog-1" },
              community: {
                details: {
                  name: "Test Community",
                  slug: "test-community",
                  imageURL: "https://example.com/community-logo.png",
                },
              },
            },
          },
        },
        mergedGrants: [],
      };

      render(<GrantAssociation milestone={milestone as never} />);

      // Should render an image element via ProfilePicture
      const img = screen.getByAltText("Test Community");
      expect(img).toBeInTheDocument();
    });

    it("should show boring-avatar fallback when communityImage URL fails to load", () => {
      const milestone = {
        type: "grant" as const,
        uid: "milestone-2",
        title: "Test Milestone",
        source: {
          grantMilestone: {
            grant: {
              details: { title: "Broken Grant", programId: "prog-2" },
              community: {
                details: {
                  name: "Broken Community",
                  slug: "broken-community",
                  imageURL: "https://example.com/broken-logo.png",
                },
              },
            },
          },
        },
        mergedGrants: [],
      };

      render(<GrantAssociation milestone={milestone as never} />);

      const img = screen.getByAltText("Broken Community");

      // Simulate image load failure
      fireEvent.error(img);

      // Should show boring-avatar fallback
      expect(screen.getByTestId("boring-avatar")).toBeInTheDocument();
    });

    it("should show boring-avatar when communityImage is undefined", () => {
      const milestone = {
        type: "grant" as const,
        uid: "milestone-3",
        title: "Test Milestone",
        source: {
          grantMilestone: {
            grant: {
              details: { title: "No Image Grant", programId: "prog-3" },
              community: {
                details: {
                  name: "No Image Community",
                  slug: "no-image",
                  imageURL: undefined,
                },
              },
            },
          },
        },
        mergedGrants: [],
      };

      render(<GrantAssociation milestone={milestone as never} />);

      // Without an image URL, ProfilePicture should render boring-avatar
      expect(screen.getByTestId("boring-avatar")).toBeInTheDocument();
    });
  });
});
