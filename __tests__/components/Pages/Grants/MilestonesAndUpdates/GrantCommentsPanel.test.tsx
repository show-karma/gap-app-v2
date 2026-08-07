/**
 * @file Tests for the grant-page comments wrapper.
 *
 * Covers the tri-state gate (flow 9), the no-linked-application case (flow 2),
 * the private-program/anonymous failure path (flow 8), and — most importantly —
 * that a real `PermissionProvider` is mounted with an `applicationId`, without
 * which `can(APPLICATION_COMMENT)` is `false` forever on `app/project/**`.
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
const mockUseFundingApplicationByProjectUID = vi.fn();
const mockPermissionProvider = vi.fn();
const mockGrantCommentsSection = vi.fn();

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: (communityUID?: string) => mockUseProjectAuthorization(communityUID),
}));

vi.mock("@/hooks/useFundingApplicationByProjectUID", () => ({
  useFundingApplicationByProjectUID: (projectUID: string, programId?: string) =>
    mockUseFundingApplicationByProjectUID(projectUID, programId),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: (state: { project?: { uid: string } }) => unknown) =>
    selector({ project: undefined }),
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
  data: { communityUID: "0xcommunity" },
  details: { title: "ProPGF Batch 2", programId: "1013_42161" },
};

const APPLICATION = {
  referenceNumber: "APP-00012-00003",
  statusHistory: [{ status: "approved", timestamp: "2026-01-01T00:00:00.000Z" }],
};

function setApplicationQuery({
  application = APPLICATION as unknown,
  isLoading = false,
  error = null as Error | null,
} = {}) {
  mockUseFundingApplicationByProjectUID.mockReturnValue({
    application,
    isLoading,
    error,
    refetch: vi.fn(),
  });
}

describe("GrantCommentsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });
    setApplicationQuery();
  });

  describe("application lookup scoping (flow 5)", () => {
    it("scopes the lookup with the RAW composite programId", () => {
      render(<GrantCommentsPanel grant={GRANT} />);

      expect(mockUseFundingApplicationByProjectUID).toHaveBeenCalledWith("0xproject", "1013_42161");
    });

    it("falls back to details.programId when the top-level field is null", () => {
      render(<GrantCommentsPanel grant={{ ...GRANT, programId: null }} />);

      expect(mockUseFundingApplicationByProjectUID).toHaveBeenCalledWith("0xproject", "1013_42161");
    });

    it("resolves the community from data.communityUID when the top-level field is missing", () => {
      render(<GrantCommentsPanel grant={{ ...GRANT, communityUID: undefined }} />);

      expect(mockUseProjectAuthorization).toHaveBeenCalledWith("0xcommunity");
    });
  });

  describe("tri-state gate (flow 9)", () => {
    it("renders a skeleton while authorization is resolving", () => {
      mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: true });

      render(<GrantCommentsPanel grant={GRANT} />);

      expect(screen.getByTestId("grant-comments-skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("permission-provider")).not.toBeInTheDocument();
    });

    it("renders a skeleton while the application lookup is in flight", () => {
      setApplicationQuery({ application: undefined, isLoading: true });

      render(<GrantCommentsPanel grant={GRANT} />);

      expect(screen.getByTestId("grant-comments-skeleton")).toBeInTheDocument();
    });
  });

  describe("no linked funding application (flow 2)", () => {
    it("renders nothing when the lookup resolves to null", () => {
      setApplicationQuery({ application: null });

      const { container } = render(<GrantCommentsPanel grant={GRANT} />);

      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when there is no project UID to look up", () => {
      setApplicationQuery({ application: null });

      const { container } = render(
        <GrantCommentsPanel grant={{ ...GRANT, projectUID: undefined }} />
      );

      expect(container).toBeEmptyDOMElement();
      expect(mockUseFundingApplicationByProjectUID).toHaveBeenCalledWith("", "1013_42161");
    });
  });

  describe("error handling (flow 8)", () => {
    it("surfaces a retry card to an authorized viewer", () => {
      setApplicationQuery({ application: undefined, error: new Error("boom") });

      render(<GrantCommentsPanel grant={GRANT} />);

      expect(screen.getByTestId("grant-comments-error")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("stays silent for an unauthorized visitor instead of showing an error card", () => {
      mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: false });
      setApplicationQuery({ application: undefined, error: new Error("403") });

      const { container } = render(<GrantCommentsPanel grant={GRANT} />);

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

    it("hands the section the BASE programId and the application reference", async () => {
      render(<GrantCommentsPanel grant={GRANT} />);

      await waitFor(() =>
        expect(mockGrantCommentsSection).toHaveBeenCalledWith(
          expect.objectContaining({
            referenceNumber: "APP-00012-00003",
            communityId: "0xcommunity",
            programId: "1013",
            statusHistory: APPLICATION.statusHistory,
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
