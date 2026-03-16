import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";

let mockIsEndorsementOpen = false;
let mockIsIntroModalOpen = false;
let mockIsProgressModalOpen = false;

jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-id" }),
  usePathname: () => "/project/test-project-id",
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
}));
jest.mock("@/hooks/useProjectPermissions", () => ({ useProjectPermissions: () => ({}) }));
jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => ({
    project: { uid: "u", title: "T", owner: "0x1", members: [], details: { data: { description: "d" } } },
    isLoading: false, isError: false, isVerified: false,
    stats: { grantsCount: 0, endorsementsCount: 0, lastUpdate: null },
  }),
}));
jest.mock("@/store/modals/endorsement", () => ({ useEndorsementStore: () => ({ isEndorsementOpen: mockIsEndorsementOpen }) }));
jest.mock("@/store/modals/intro", () => ({ useIntroModalStore: () => ({ isIntroModalOpen: mockIsIntroModalOpen }) }));
jest.mock("@/store/modals/progress", () => ({ useProgressModalStore: () => ({ isProgressModalOpen: mockIsProgressModalOpen }) }));
jest.mock("@/store/modals/shareDialog", () => ({ useShareDialogStore: () => ({ isOpen: false }) }));
jest.mock("@/store/modals/contributorProfile", () => ({ useContributorProfileModalStore: () => ({ openModal: jest.fn() }) }));
jest.mock("@/components/Pages/Project/v2/Skeletons", () => ({ ContentTabsSkeleton: () => null, MobileProfileContentSkeleton: () => null, ProjectSidePanelSkeleton: () => null }));
jest.mock("@/components/Pages/Project/v2/MainContent/ContentTabs", () => ({ ContentTabs: () => <div data-testid="content-tabs" /> }));
jest.mock("@/components/Pages/Project/v2/Mobile/MobileSupportContent", () => ({ MobileSupportContent: () => null }));
jest.mock("@/components/Pages/Project/v2/SidePanel/ProjectSidePanel", () => ({ ProjectSidePanel: () => null }));
jest.mock("@/components/Pages/Project/v2/SidePanel/SidebarProfileCard", () => ({ SidebarProfileCard: () => null }));
jest.mock("@/components/ErrorBoundary", () => ({ ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("@/utilities/tailwind", () => ({ cn: (...a: string[]) => a.filter(Boolean).join(" ") }));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<any>) => {
    const s = loader.toString();
    const C = (p: any) => {
      if (s.includes("ProjectOptionsDialogs")) return <div data-testid="project-options-dialogs" />;
      if (s.includes("ProjectOptionsMenu")) return <div data-testid="project-options-menu" />;
      if (s.includes("EndorsementsListDialog")) return <div data-testid="endorsements-list-dialog" />;
      if (s.includes("EndorsementDialog")) return <div data-testid="endorsement-dialog" />;
      if (s.includes("ProgressDialog")) return <div data-testid="progress-dialog" />;
      if (s.includes("IntroDialog")) return <div data-testid="intro-dialog" />;
      if (s.includes("ShareDialog")) return <div data-testid="share-dialog" />;
      return <div />;
    };
    C.displayName = "Dyn";
    return C;
  },
}));

import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";

const src = fs.readFileSync(path.resolve(__dirname, "../../components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx"), "utf-8");

describe("ProjectProfileLayout - Dynamic Imports", () => {
  beforeEach(() => { mockIsEndorsementOpen = false; mockIsIntroModalOpen = false; mockIsProgressModalOpen = false; });

  it("no static import for ProgressDialog", () => { expect(src).not.toMatch(/^import\s.*ProgressDialog.*from/m); });
  it("no static import for EndorsementDialog", () => { expect(src).not.toMatch(/^import\s.*EndorsementDialog.*from/m); });
  it("no static import for IntroDialog", () => { expect(src).not.toMatch(/^import\s.*IntroDialog.*from/m); });
  it("no static import for EndorsementsListDialog", () => { expect(src).not.toMatch(/^import\s.*EndorsementsListDialog.*from/m); });
  it("no static import for ProjectOptionsDialogs/Menu", () => {
    expect(src).not.toMatch(/^import\s.*ProjectOptionsDialogs.*from/m);
    expect(src).not.toMatch(/^import\s.*ProjectOptionsMenu.*from/m);
  });
  it("uses dynamic() for all dialogs", () => {
    for (const name of ["ProgressDialog","EndorsementDialog","IntroDialog","EndorsementsListDialog","ProjectOptionsDialogs","ProjectOptionsMenu"]) {
      expect(src).toMatch(new RegExp("dynamic\\([\\s\\S]*?" + name));
    }
  });
  it("renders EndorsementDialog when open", () => {
    mockIsEndorsementOpen = true;
    render(<ProjectProfileLayout><div>C</div></ProjectProfileLayout>);
    expect(screen.getByTestId("endorsement-dialog")).toBeInTheDocument();
  });
  it("renders IntroDialog when open", () => {
    mockIsIntroModalOpen = true;
    render(<ProjectProfileLayout><div>C</div></ProjectProfileLayout>);
    expect(screen.getByTestId("intro-dialog")).toBeInTheDocument();
  });
  it("renders ProgressDialog when open", () => {
    mockIsProgressModalOpen = true;
    render(<ProjectProfileLayout><div>C</div></ProjectProfileLayout>);
    expect(screen.getByTestId("progress-dialog")).toBeInTheDocument();
  });
  it("does not render dialogs when closed", () => {
    render(<ProjectProfileLayout><div>C</div></ProjectProfileLayout>);
    expect(screen.queryByTestId("endorsement-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("intro-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("progress-dialog")).not.toBeInTheDocument();
  });
  it("always renders ProjectOptionsDialogs and EndorsementsListDialog", () => {
    render(<ProjectProfileLayout><div>C</div></ProjectProfileLayout>);
    expect(screen.getByTestId("project-options-dialogs")).toBeInTheDocument();
    expect(screen.getByTestId("endorsements-list-dialog")).toBeInTheDocument();
  });
  it("renders layout with children", () => {
    render(<ProjectProfileLayout><div data-testid="child">X</div></ProjectProfileLayout>);
    expect(screen.getByTestId("project-profile-layout")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
