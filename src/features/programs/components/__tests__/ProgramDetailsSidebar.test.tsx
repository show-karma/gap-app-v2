import { render, screen } from "@testing-library/react";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { ProgramDetailsSidebar } from "../ProgramDetailsSidebar";

const mocks = vi.hoisted(() => ({ canBypass: false }));

vi.mock("../../hooks/use-can-bypass-closed-program", () => ({
  useCanBypassClosedProgram: () => ({ canBypass: mocks.canBypass, isLoading: false }),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: unknown;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children as never}
    </a>
  ),
}));

vi.mock("../ProgramDetailsCard", () => ({
  ProgramDetailsCard: () => null,
}));

function makeClosedProgram(overrides: Partial<FundingProgram> = {}): FundingProgram {
  return {
    programId: "101119",
    applicationConfig: { isEnabled: true, formSchema: { settings: {} } },
    metadata: { endsAt: "2020-01-01T00:00:00Z", title: "Test Program" },
    ...overrides,
  } as unknown as FundingProgram;
}

describe("ProgramDetailsSidebar", () => {
  beforeEach(() => {
    mocks.canBypass = false;
  });

  it("should_show_disabled_reason_and_no_apply_link_when_closed_for_non_admin", () => {
    render(
      <ProgramDetailsSidebar
        program={makeClosedProgram()}
        communityId="filecoin"
        isEnabled={false}
      />
    );

    expect(screen.queryByRole("link", { name: /apply now/i })).not.toBeInTheDocument();
    expect(screen.getByText(/application deadline has passed/i)).toBeInTheDocument();
    expect(screen.queryByText(/submit as an admin/i)).not.toBeInTheDocument();
  });

  it("should_show_active_apply_link_and_override_hint_when_closed_for_admin", () => {
    mocks.canBypass = true;

    render(
      <ProgramDetailsSidebar
        program={makeClosedProgram()}
        communityId="filecoin"
        isEnabled={false}
      />
    );

    const applyLink = screen.getByRole("link", { name: /apply now/i });
    expect(applyLink).toHaveAttribute("href", "/community/filecoin/programs/101119/apply");
    expect(screen.getByText(/you can still submit as an admin/i)).toBeInTheDocument();
  });

  it("should_show_active_apply_link_without_hint_when_program_is_open", () => {
    render(
      <ProgramDetailsSidebar
        program={makeClosedProgram()}
        communityId="filecoin"
        isEnabled={true}
      />
    );

    expect(screen.getByRole("link", { name: /apply now/i })).toBeInTheDocument();
    expect(screen.queryByText(/submit as an admin/i)).not.toBeInTheDocument();
  });
});
