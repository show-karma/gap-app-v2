import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

/**
 * Smoke tests for pages that simply delegate to a single inner component.
 * Each test mocks the inner component with a sentinel, then asserts the
 * page renders that sentinel — proving the page module loads, its imports
 * resolve, and the component is mounted.
 */

vi.mock("@/components/Pages/Admin/SuperAdmin", () => ({
  __esModule: true,
  default: () => <div data-testid="super-admin-page">SuperAdmin</div>,
}));

vi.mock("@/components/Pages/Admin/CommunityAdmin", () => ({
  __esModule: true,
  default: () => <div data-testid="communities-to-admin-page">CommunityAdmin</div>,
}));

vi.mock("@/components/Pages/Admin/AllProjects", () => ({
  AllProjects: () => <div data-testid="all-projects">AllProjects</div>,
}));

vi.mock("@/components/Pages/Admin/CommunityStats", () => ({
  __esModule: true,
  default: () => <div data-testid="community-stats">CommunityStats</div>,
}));

vi.mock("@/components/FaucetAdmin/Dashboard", () => ({
  FaucetAdminDashboard: () => <div data-testid="faucet-admin-dashboard">FaucetDashboard</div>,
}));

vi.mock("@/components/Pages/Admin/SumupAdmin", () => ({
  __esModule: true,
  default: () => <div data-testid="sumup-admin">SumupAdmin</div>,
}));

vi.mock("@/components/Pages/Dashboard/Dashboard", () => ({
  Dashboard: () => <div data-testid="dashboard-component">Dashboard</div>,
}));

vi.mock("@/components/Pages/Communities/CommunitiesPage", () => ({
  CommunitiesPage: () => <div data-testid="communities-page">CommunitiesPage</div>,
}));

vi.mock("@/components/Pages/ProgramRegistry/AddProgramWrapper", () => ({
  AddProgramWrapper: () => <div data-testid="add-program-wrapper">AddProgramWrapper</div>,
}));

vi.mock("@/components/Pages/ProgramRegistry/ManageProgramsWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="manage-programs-wrapper">ManageProgramsWrapper</div>,
}));

vi.mock("@/components/Disbursement/DisbursementForm", () => ({
  DisbursementForm: () => <div data-testid="disbursement-form">DisbursementForm</div>,
}));

vi.mock("@/components/Pages/Home/Communities", () => ({
  Communities: () => <div data-testid="home-communities">Communities</div>,
}));
vi.mock("@/components/Pages/Home/Presentation", () => ({
  Presentation: () => <div data-testid="home-presentation">Presentation</div>,
}));
vi.mock("@/components/Pages/Home/WhatIsSolving", () => ({
  WhatIsSolving: () => <div data-testid="home-what-is-solving">WhatIsSolving</div>,
}));

vi.mock("@/components/DonationCheckout", () => ({
  __esModule: true,
  default: () => <div data-testid="donation-checkout">DonationCheckout</div>,
}));

vi.mock("@/components/Pages/Admin/ControlCenter/ControlCenterPage", () => ({
  ControlCenterPage: () => <div data-testid="control-center-page">ControlCenterPage</div>,
}));

vi.mock("@/components/Pages/Admin/EditCategoriesPage", () => ({
  __esModule: true,
  default: () => <div data-testid="edit-categories-page">EditCategoriesPage</div>,
}));

vi.mock("@/components/Pages/Admin/EditProjectsPage", () => ({
  __esModule: true,
  default: () => <div data-testid="edit-projects-page">EditProjectsPage</div>,
}));

vi.mock("@/components/Pages/Admin/ImpactPage", () => ({
  __esModule: true,
  default: () => <div data-testid="manage-impact-page">ManageImpactPage</div>,
}));

vi.mock("@/components/Pages/Admin/ManageIndicatorsPage", () => ({
  __esModule: true,
  default: () => <div data-testid="manage-indicators-page">ManageIndicatorsPage</div>,
}));

vi.mock("@/components/Pages/Communities/Impact/ImpactCharts", () => ({
  CommunityImpactCharts: () => <div data-testid="community-impact-charts">ImpactCharts</div>,
}));

vi.mock("@/components/Pages/Communities/Impact/ProjectDiscovery", () => ({
  ProjectDiscovery: () => <div data-testid="project-discovery">ProjectDiscovery</div>,
}));

vi.mock("@/app/community/[communityId]/(whitelabel)/claim-funds/ClaimFundsClient", () => ({
  __esModule: true,
  default: () => <div data-testid="claim-funds-client">ClaimFundsClient</div>,
}));

const renderPage = async (importer: () => Promise<{ default: React.ComponentType }>) => {
  const mod = await importer();
  const Page = mod.default;
  return render(<Page />);
};

describe("Admin pages", () => {
  it("/super-admin renders SuperAdminPage", async () => {
    await renderPage(() => import("@/app/super-admin/page"));
    expect(screen.getByTestId("super-admin-page")).toBeInTheDocument();
  });

  it("/admin renders CommunitiesToAdmin", async () => {
    await renderPage(() => import("@/app/admin/page"));
    expect(screen.getByTestId("communities-to-admin-page")).toBeInTheDocument();
  });

  it("/admin/projects renders AllProjects", async () => {
    await renderPage(() => import("@/app/admin/projects/page"));
    expect(screen.getByTestId("all-projects")).toBeInTheDocument();
  });

  it("/admin/communities/stats renders CommunityStats", async () => {
    await renderPage(() => import("@/app/admin/communities/stats/page"));
    expect(screen.getByTestId("community-stats")).toBeInTheDocument();
  });

  it("/admin/faucet renders FaucetAdminDashboard", async () => {
    await renderPage(() => import("@/app/admin/faucet/page"));
    expect(screen.getByTestId("faucet-admin-dashboard")).toBeInTheDocument();
  });

  it("/admin/sumup renders SumupAdmin", async () => {
    await renderPage(() => import("@/app/admin/sumup/page"));
    expect(screen.getByTestId("sumup-admin")).toBeInTheDocument();
  });
});

describe("Top-level component-wrapper pages", () => {
  it("/dashboard renders Dashboard", async () => {
    await renderPage(() => import("@/app/dashboard/page"));
    expect(screen.getByTestId("dashboard-component")).toBeInTheDocument();
  });

  it("/communities renders CommunitiesPage", async () => {
    await renderPage(() => import("@/app/communities/page"));
    expect(screen.getByTestId("communities-page")).toBeInTheDocument();
  });

  it("/funding-map/add-program renders AddProgramWrapper", async () => {
    await renderPage(() => import("@/app/funding-map/add-program/page"));
    expect(screen.getByTestId("add-program-wrapper")).toBeInTheDocument();
  });

  it("/funding-map/manage-programs renders ManageProgramsWrapper", async () => {
    await renderPage(() => import("@/app/funding-map/manage-programs/page"));
    expect(screen.getByTestId("manage-programs-wrapper")).toBeInTheDocument();
  });

  it("/safe/disburse renders DisbursementForm", async () => {
    await renderPage(() => import("@/app/safe/disburse/page"));
    expect(screen.getByTestId("disbursement-form")).toBeInTheDocument();
  });

  it("/old-home renders all sections", async () => {
    await renderPage(() => import("@/app/old-home/page"));
    expect(screen.getByTestId("home-presentation")).toBeInTheDocument();
    expect(screen.getByTestId("home-communities")).toBeInTheDocument();
    expect(screen.getByTestId("home-what-is-solving")).toBeInTheDocument();
  });
});

describe("Community manage component-wrapper pages", () => {
  it("/manage/control-center renders ControlCenterPage", async () => {
    await renderPage(() => import("@/app/community/[communityId]/manage/control-center/page"));
    expect(screen.getByTestId("control-center-page")).toBeInTheDocument();
  });

  it("/manage/edit-categories renders EditCategoriesPage", async () => {
    await renderPage(() => import("@/app/community/[communityId]/manage/edit-categories/page"));
    expect(screen.getByTestId("edit-categories-page")).toBeInTheDocument();
  });

  it("/manage/edit-projects renders EditProjectsPage", async () => {
    await renderPage(() => import("@/app/community/[communityId]/manage/edit-projects/page"));
    expect(screen.getByTestId("edit-projects-page")).toBeInTheDocument();
  });

  it("/manage/impact renders ImpactPage", async () => {
    await renderPage(() => import("@/app/community/[communityId]/manage/impact/page"));
    expect(screen.getByTestId("manage-impact-page")).toBeInTheDocument();
  });

  it("/manage/manage-indicators renders ManageIndicatorsPage", async () => {
    await renderPage(() => import("@/app/community/[communityId]/manage/manage-indicators/page"));
    expect(screen.getByTestId("manage-indicators-page")).toBeInTheDocument();
  });
});

describe("Community with-header component-wrapper pages", () => {
  it("/(with-header)/impact renders CommunityImpactCharts", async () => {
    await renderPage(() => import("@/app/community/[communityId]/(with-header)/impact/page"));
    expect(screen.getByTestId("community-impact-charts")).toBeInTheDocument();
  });

  it("/(with-header)/impact/project-discovery renders ProjectDiscovery", async () => {
    await renderPage(
      () => import("@/app/community/[communityId]/(with-header)/impact/project-discovery/page")
    );
    expect(screen.getByTestId("project-discovery")).toBeInTheDocument();
  });

  it("/donate/[programId]/checkout renders DonationCheckout", async () => {
    await renderPage(
      () => import("@/app/community/[communityId]/donate/[programId]/checkout/page")
    );
    expect(screen.getByTestId("donation-checkout")).toBeInTheDocument();
  });
});

describe("Whitelabel component-wrapper pages", () => {
  it("/(whitelabel)/claim-funds renders ClaimFundsClient", async () => {
    await renderPage(() => import("@/app/community/[communityId]/(whitelabel)/claim-funds/page"));
    expect(screen.getByTestId("claim-funds-client")).toBeInTheDocument();
  });
});
