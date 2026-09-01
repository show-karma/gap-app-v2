/**
 * @file Branching tests for the grant-page comment surface.
 *
 * Mirrors `ApplicationPageClient`: authenticated commenters get the full
 * timeline, everyone else gets the public stream only when the program opted
 * in, and otherwise nothing renders at all. Prop-capture harness copied from
 * `__tests__/components/Pages/Admin/MilestonesReview/GrantCommentsAndActivity.test.tsx`.
 */
import { render, screen } from "@testing-library/react";
import { GrantCommentsSection } from "@/components/Pages/Grants/MilestonesAndUpdates/GrantCommentsSection";
import { Permission } from "@/src/core/rbac/types/permission";

const mockUsePermissionContext = vi.fn();
const mockUseIsFundingPlatformAdmin = vi.fn();
const mockUseProgram = vi.fn();
const mockCommentTimeline = vi.fn();
const mockPublicComments = vi.fn();

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mockUsePermissionContext(),
}));

vi.mock("@/src/core/rbac/components/funding-platform-guard", () => ({
  useIsFundingPlatformAdmin: () => mockUseIsFundingPlatformAdmin(),
}));

vi.mock("@/src/features/programs/hooks/use-program", () => ({
  useProgram: (programId: string) => mockUseProgram(programId),
}));

vi.mock("@/src/features/application-comments/components/CommentTimeline", () => ({
  CommentTimeline: (props: Record<string, unknown>) => {
    mockCommentTimeline(props);
    return <div data-testid="comment-timeline" />;
  },
}));

vi.mock("@/src/features/application-comments/components/PublicComments", () => ({
  PublicComments: (props: Record<string, unknown>) => {
    mockPublicComments(props);
    return (
      <div data-testid="public-comments">
        <span data-testid="public-program-id">{String(props.programId ?? "")}</span>
        <span data-testid="public-is-admin">{String(props.isAdmin)}</span>
      </div>
    );
  },
}));

const DEFAULT_PROPS = {
  referenceNumber: "APP-00012-00003",
  communityId: "0xcommunity",
  programId: "1013",
};

function setPermissions({
  permissions = [] as Permission[],
  isLoading = false,
}: {
  permissions?: Permission[];
  isLoading?: boolean;
} = {}) {
  mockUsePermissionContext.mockReturnValue({
    can: (permission: Permission) => permissions.includes(permission),
    isLoading,
  });
}

function setProgram({
  showCommentsOnPublicPage = false,
  loading = false,
}: {
  showCommentsOnPublicPage?: boolean;
  loading?: boolean;
} = {}) {
  mockUseProgram.mockReturnValue({
    program: loading
      ? null
      : {
          applicationConfig: { formSchema: { settings: { showCommentsOnPublicPage } } },
        },
    loading,
    error: null,
    refetch: vi.fn(),
  });
}

describe("GrantCommentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsFundingPlatformAdmin.mockReturnValue(false);
    setPermissions();
    setProgram();
  });

  describe("tri-state resolution (flow 9)", () => {
    it("renders a skeleton while permissions are still resolving", () => {
      setPermissions({ isLoading: true });

      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("grant-comments-skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("comment-timeline")).not.toBeInTheDocument();
      expect(screen.queryByTestId("public-comments")).not.toBeInTheDocument();
    });

    it("renders a skeleton while the program config is still loading", () => {
      setProgram({ loading: true });

      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("grant-comments-skeleton")).toBeInTheDocument();
    });

    it("does not treat a disabled program query as loading when there is no programId", () => {
      // React Query v5 reports isLoading=false for a disabled query; without
      // the `!!programId` guard this would still be a skeleton forever.
      setProgram({ loading: false });

      render(<GrantCommentsSection {...DEFAULT_PROPS} programId={undefined} />);

      expect(screen.queryByTestId("grant-comments-skeleton")).not.toBeInTheDocument();
    });
  });

  describe("authenticated branch (flow 1)", () => {
    beforeEach(() => {
      setPermissions({ permissions: [Permission.APPLICATION_COMMENT] });
    });

    it("renders the comment timeline for a viewer who may comment", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("comment-timeline")).toBeInTheDocument();
      expect(screen.queryByTestId("public-comments")).not.toBeInTheDocument();
    });

    it("passes the reference number and community to the timeline", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(mockCommentTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: "APP-00012-00003",
          communityId: "0xcommunity",
        })
      );
    });

    it("wins over the public stream even when public comments are enabled", () => {
      setProgram({ showCommentsOnPublicPage: true });

      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("comment-timeline")).toBeInTheDocument();
      expect(screen.queryByTestId("public-comments")).not.toBeInTheDocument();
    });
  });

  describe("public branch (flow 3)", () => {
    beforeEach(() => {
      setProgram({ showCommentsOnPublicPage: true });
    });

    it("renders the public stream when the program opted in", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("public-comments")).toBeInTheDocument();
      expect(screen.queryByTestId("comment-timeline")).not.toBeInTheDocument();
    });

    it("withholds programId from non-admin viewers so mention fetches stay off", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("public-program-id").textContent).toBe("");
      expect(mockPublicComments).toHaveBeenCalledWith(
        expect.objectContaining({ programId: undefined, isAdmin: false })
      );
    });

    it("passes programId for admin viewers so mentions work", () => {
      mockUseIsFundingPlatformAdmin.mockReturnValue(true);

      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("public-program-id").textContent).toBe("1013");
      expect(screen.getByTestId("public-is-admin").textContent).toBe("true");
    });
  });

  describe("no-surface branch (flow 4)", () => {
    it("renders the quiet private-conversation note when the viewer cannot comment and public comments are off", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("grant-comments-private")).toBeInTheDocument();
      expect(screen.queryByTestId("comment-timeline")).not.toBeInTheDocument();
      expect(screen.queryByTestId("public-comments")).not.toBeInTheDocument();
    });

    it("renders the note when the program cannot be resolved", () => {
      mockUseProgram.mockReturnValue({
        program: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GrantCommentsSection {...DEFAULT_PROPS} />);

      expect(screen.getByTestId("grant-comments-private")).toBeInTheDocument();
    });
  });

  describe("program lookup", () => {
    it("queries the program with the base id it was given", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} programId="1013" />);

      expect(mockUseProgram).toHaveBeenCalledWith("1013");
    });

    it("passes an empty id when there is no program so the query stays disabled", () => {
      render(<GrantCommentsSection {...DEFAULT_PROPS} programId={undefined} />);

      expect(mockUseProgram).toHaveBeenCalledWith("");
    });
  });
});
