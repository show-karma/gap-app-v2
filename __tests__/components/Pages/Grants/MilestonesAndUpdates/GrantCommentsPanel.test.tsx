/**
 * @file Tests for the grant-page comments wrapper.
 *
 * Covers the tri-state gate, the no-linked-application case, and — most
 * importantly — that a real `PermissionProvider` is mounted with an
 * `applicationId`, without which `can(APPLICATION_COMMENT)` is `false` forever
 * on `app/project/**`.
 */
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { GrantCommentsPanel } from "@/components/Pages/Grants/MilestonesAndUpdates/GrantCommentsPanel";
import type { Grant } from "@/types/v2/grant";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const Lazy = React.lazy(() =>
      loader().then((mod) => {
        // The loader may resolve to the component itself (`.then(m => m.Foo)`)
        // or to a module namespace.
        const component =
          typeof mod === "function"
            ? mod
            : ((mod as Record<string, unknown>).default ??
              Object.values(mod as Record<string, unknown>)[0]);
        return { default: component as React.ComponentType };
      })
    );
    const Wrapper = (props: Record<string, unknown>) =>
      React.createElement(React.Suspense, { fallback: null }, React.createElement(Lazy, props));
    Wrapper.displayName = "DynamicMock";
    return Wrapper;
  },
}));

const mockUseProjectAuthorization = vi.fn();
const mockPermissionProvider = vi.fn();
const mockGrantCommentsSection = vi.fn();

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: (communityUID?: string) => mockUseProjectAuthorization(communityUID),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({
    children,
    resourceContext,
  }: {
    children: React.ReactNode;
    resourceContext?: Record<string, unknown>;
  }) => {
    mockPermissionProvider(resourceContext);
    return <div data-testid="permission-provider">{children}</div>;
  },
}));

vi.mock("@/components/Pages/Grants/MilestonesAndUpdates/GrantCommentsSection", () => ({
  GrantCommentsSection: (props: Record<string, unknown>) => {
    mockGrantCommentsSection(props);
    return <div data-testid="grant-comments-section" />;
  },
}));

const GRANT: Grant = {
  uid: "0xgrant",
  chainID: 42161,
  projectUID: "0xproject",
  communityUID: "0xcommunity",
  programId: "1013_42161",
  referenceNumber: "APP-00012-00003",
  data: { communityUID: "0xcommunity" },
  details: { title: "ProPGF Batch 2", programId: "1013_42161" },
};

describe("GrantCommentsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });
  });

  describe("tri-state gate", () => {
    it("renders a skeleton while authorization is resolving", () => {
      mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: true });

      render(<GrantCommentsPanel grant={GRANT} />);

      expect(screen.getByTestId("grant-comments-skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("permission-provider")).not.toBeInTheDocument();
    });

    it("resolves the community from data.communityUID when the top-level field is missing", () => {
      render(<GrantCommentsPanel grant={{ ...GRANT, communityUID: undefined }} />);

      expect(mockUseProjectAuthorization).toHaveBeenCalledWith("0xcommunity");
    });
  });

  describe("no linked funding application", () => {
    it("renders nothing when the grant carries no referenceNumber", () => {
      const { container } = render(
        <GrantCommentsPanel grant={{ ...GRANT, referenceNumber: undefined }} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when the referenceNumber is null", () => {
      const { container } = render(
        <GrantCommentsPanel grant={{ ...GRANT, referenceNumber: null }} />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("PermissionProvider mount", () => {
    it("supplies community, BASE programId and applicationId", async () => {
      render(<GrantCommentsPanel grant={GRANT} />);

      await waitFor(() => expect(screen.getByTestId("permission-provider")).toBeInTheDocument());

      expect(mockPermissionProvider).toHaveBeenCalledWith({
        communityId: "0xcommunity",
        programId: "1013",
        applicationId: "APP-00012-00003",
      });
    });

    it("falls back to details.programId when the top-level field is null", async () => {
      render(<GrantCommentsPanel grant={{ ...GRANT, programId: null }} />);

      await waitFor(() =>
        expect(mockPermissionProvider).toHaveBeenCalledWith(
          expect.objectContaining({ programId: "1013" })
        )
      );
    });

    it("hands the section the BASE programId and the application reference", async () => {
      render(<GrantCommentsPanel grant={GRANT} />);

      await waitFor(() =>
        expect(mockGrantCommentsSection).toHaveBeenCalledWith(
          expect.objectContaining({
            referenceNumber: "APP-00012-00003",
            communityId: "0xcommunity",
            programId: "1013",
          })
        )
      );
    });

    it("renders the section inside the provider", async () => {
      render(<GrantCommentsPanel grant={GRANT} />);

      await waitFor(() => expect(screen.getByTestId("grant-comments-section")).toBeInTheDocument());

      expect(screen.getByTestId("permission-provider")).toContainElement(
        screen.getByTestId("grant-comments-section")
      );
    });
  });
});
