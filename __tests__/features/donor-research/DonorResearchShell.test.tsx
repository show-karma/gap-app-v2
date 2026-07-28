import { screen, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { useDonorHandle } from "@/hooks/useDonorHandles";
import { DonorResearchShell } from "@/src/features/donor-research/components/common/DonorResearchShell";
import { PAGES } from "@/utilities/pages";
import { renderWithProviders } from "../../utils/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/hooks/useDonorAdvisor", () => ({
  useDonorAdvisor: vi.fn(),
}));

vi.mock("@/hooks/useDonorHandles", () => ({
  useDonorHandle: vi.fn(),
}));

vi.mock("@/src/features/donor-research/components/common/RateLimitCounter", () => ({
  RateLimitCounter: () => <div>Usage limits</div>,
}));

const mockUsePathname = vi.mocked(usePathname);
const mockUseRouter = vi.mocked(useRouter);
const mockUseDonorAdvisor = vi.mocked(useDonorAdvisor);
const mockUseDonorHandle = vi.mocked(useDonorHandle);

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePathname.mockReturnValue(`${PAGES.DONOR_RESEARCH.INDEX}/report-1`);
  mockUseRouter.mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  mockUseDonorHandle.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useDonorHandle>);
  mockUseDonorAdvisor.mockReturnValue({
    data: {
      id: "advisor-1",
      privyUserId: "privy-1",
      displayName: "Amaury",
      orgName: "Karma Advisors",
      timezone: "America/Sao_Paulo",
      rateLimitTier: "beta",
      createdAt: "2026-07-16T12:00:00.000Z",
      updatedAt: "2026-07-16T12:00:00.000Z",
    },
    isLoading: false,
    isError: false,
    isSuccess: true,
  } as unknown as ReturnType<typeof useDonorAdvisor>);
});

describe("DonorResearchShell", () => {
  it("uses the shared collapsible sidebar pattern and keeps Reports active on report details", () => {
    renderWithProviders(
      <DonorResearchShell>
        <div>Report content</div>
      </DonorResearchShell>
    );

    expect(document.querySelector('[data-sidebar="sidebar"]')).toBeInTheDocument();
    expect(document.querySelector('[data-sidebar="trigger"]')).toBeInTheDocument();
    expect(screen.queryByText("Karma Advisors")).not.toBeInTheDocument();
    expect(screen.queryByText("Research advisor")).not.toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Nonprofit research sections" });
    expect(within(navigation).getByRole("link", { name: "Reports" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(navigation).getByRole("link", { name: "New report" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("marks New report active on the report creation page", () => {
    mockUsePathname.mockReturnValue(PAGES.DONOR_RESEARCH.NEW);

    renderWithProviders(
      <DonorResearchShell>
        <div>New report form</div>
      </DonorResearchShell>
    );

    const navigation = screen.getByRole("navigation", { name: "Nonprofit research sections" });
    expect(within(navigation).getByRole("link", { name: "New report" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(navigation).getByRole("link", { name: "Reports" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("shows the persona label as the current shell breadcrumb", () => {
    mockUsePathname.mockReturnValue(PAGES.DONOR_RESEARCH.PERSONA("handle-1"));
    mockUseDonorHandle.mockReturnValue({
      data: {
        id: "handle-1",
        advisorId: "advisor-1",
        opaqueLabel: "Q1",
        notes: null,
        createdAt: "2026-07-16T12:00:00.000Z",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDonorHandle>);

    renderWithProviders(
      <DonorResearchShell>
        <div>Persona content</div>
      </DonorResearchShell>
    );

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Nonprofit Research" })).toHaveAttribute(
      "href",
      PAGES.DONOR_RESEARCH.INDEX
    );
    expect(within(breadcrumb).getByRole("link", { name: "Donors" })).toHaveAttribute(
      "href",
      PAGES.DONOR_RESEARCH.PERSONAS
    );
    expect(within(breadcrumb).getByText("Q1")).toHaveAttribute("aria-current", "page");
  });

  it("scopes the sidebar rail to the shell so the body-level footer is never overlaid", () => {
    // The rail is absolute within the (relative) provider rather than fixed
    // to the viewport — the platform footer rendered below the shell by the
    // root layout must stay clear of it.
    renderWithProviders(
      <DonorResearchShell>
        <div>Report content</div>
      </DonorResearchShell>
    );

    const rail = document.querySelector('[data-sidebar="sidebar"]')?.parentElement;
    expect(rail?.className).toContain("md:!absolute");
    expect(screen.queryByText(/All rights reserved/)).not.toBeInTheDocument();
  });

  it("shows the report number as the current shell breadcrumb", () => {
    const reportId = "fb95f6f5-1630-4f72-a8b9-d052030d9c3d";
    mockUsePathname.mockReturnValue(PAGES.DONOR_RESEARCH.REPORT(reportId));

    renderWithProviders(
      <DonorResearchShell>
        <div>Report content</div>
      </DonorResearchShell>
    );

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      PAGES.DONOR_RESEARCH.INDEX
    );
    expect(within(breadcrumb).getByText("No. FB95F6")).toHaveAttribute("aria-current", "page");
  });

  describe("super-admin without an advisor profile", () => {
    function mockNoAdvisorRow() {
      mockUseDonorAdvisor.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as unknown as ReturnType<typeof useDonorAdvisor>);
    }

    it("gets the same sidebar and breadcrumbs as the report owner on a report route", () => {
      mockNoAdvisorRow();

      renderWithProviders(
        <DonorResearchShell>
          <div>Report content</div>
        </DonorResearchShell>
      );

      expect(document.querySelector('[data-sidebar="sidebar"]')).toBeInTheDocument();
      expect(
        screen.getByRole("navigation", { name: "Nonprofit research sections" })
      ).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
      expect(screen.getByText("Report content")).toBeInTheDocument();
    });

    it("omits the advisor-owned usage counter rather than shimmering a skeleton forever", () => {
      mockNoAdvisorRow();

      renderWithProviders(
        <DonorResearchShell>
          <div>Report content</div>
        </DonorResearchShell>
      );

      // Only the collapsed-rail menu item remains; the advisor-scoped
      // RateLimitCounter (mocked to the same label) is not mounted, and no
      // loading skeleton is left in its place.
      expect(screen.getAllByText("Usage limits")).toHaveLength(1);
      expect(document.querySelector(".rounded-sf-tile")).not.toBeInTheDocument();
    });

    it("still redirects to onboarding away from report routes", () => {
      mockNoAdvisorRow();
      const replace = vi.fn();
      mockUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
      mockUsePathname.mockReturnValue(PAGES.DONOR_RESEARCH.INDEX);

      renderWithProviders(
        <DonorResearchShell>
          <div>Reports list</div>
        </DonorResearchShell>
      );

      expect(replace).toHaveBeenCalledWith(PAGES.DONOR_RESEARCH.ONBOARDING);
    });
  });
});
