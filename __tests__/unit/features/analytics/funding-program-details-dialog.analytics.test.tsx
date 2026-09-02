/**
 * @file Analytics tests for the funding-program details dialog.
 *
 * This dialog carries the tail of the discovery funnel: it is where a visitor
 * decides whether to apply, and every outbound route off it is a different
 * outcome. The events must therefore stay distinguishable — an apply, a bug
 * bounty visit, a social link and a claim-this-program request all leave the
 * page, and collapsing any two of them would make the apply rate wrong.
 *
 * `open_duration_s` on close is the one derived value here: it must be null
 * when the open timestamp is unknown rather than 0, since "closed instantly"
 * and "we never saw it open" are different facts.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

// Radix's dialog is replaced with a passthrough that exposes `onOpenChange`
// as a button, so the close path can be driven without a real portal.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div>
        <button type="button" data-testid="close-dialog" onClick={() => onOpenChange(false)}>
          close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("next/image", () => ({ default: () => <img alt="" /> }));
vi.mock("next/link", () => ({
  default: ({
    children,
    onClick,
    href,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    href: string;
  }) => (
    <a href={typeof href === "string" ? href : "#"} onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => <div>{source}</div>,
}));
vi.mock("@/utilities/enviromentVars", () => ({ envVars: { VERCEL_ENV: "test" } }));
vi.mock("@/utilities/pages", () => ({
  FUNDING_PLATFORM_PAGES: { APPLY: () => "/apply" },
  PAGES: {},
}));

import { FundingProgramDetailsDialog } from "@/src/features/funding-map/components/funding-program-details-dialog";

const PROGRAM_ID = "prog-123";

// The dialog reads almost everything off `program.metadata`, not off the
// program root — a flat fixture renders a dialog with none of the outbound
// links this suite exists to exercise.
const program = {
  programId: PROGRAM_ID,
  name: "A funding program",
  status: "Active",
  isActive: true,
  submissionUrl: "https://example.com/apply",
  communities: [],
  networks: [],
  types: [],
  grantTypes: [],
  metadata: {
    title: "A funding program",
    description: "Some description",
    status: "Active",
    socialLinks: {
      twitter: "https://twitter.com/example",
      grantsSite: "https://example.com/grants",
    },
    bugBounty: "https://example.com/bounty",
    organizations: ["Example Org"],
  },
} as never;

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);
const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

const renderDialog = (open = true) =>
  render(<FundingProgramDetailsDialog program={program} open={open} onOpenChange={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("funding program details dialog analytics", () => {
  it("reports details_opened once, with the program it opened for", () => {
    renderDialog();

    expect(eventNames().filter((n) => n === "funding_map_details_opened")).toHaveLength(1);
    expect(propsOf("funding_map_details_opened")).toEqual({ program_id: PROGRAM_ID });
  });

  it("reports nothing while the dialog is closed", () => {
    renderDialog(false);

    expect(eventNames()).not.toContain("funding_map_details_opened");
  });

  it("reports details_closed with a numeric open_duration_s", () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("close-dialog"));

    const props = propsOf("funding_map_details_closed");
    expect(props).toMatchObject({ program_id: PROGRAM_ID });
    expect(Object.keys(props ?? {}).sort()).toEqual(["open_duration_s", "program_id"]);
    // Opened and closed in the same tick, so the duration rounds to 0 — but it
    // must be a number, not null, because the open time *was* observed.
    expect(typeof props?.open_duration_s).toBe("number");
  });

  it("keeps every outbound route a distinct event", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("link", { name: /bug bounty/i }));
    expect(propsOf("funding_map_bug_bounty_clicked")).toEqual({ program_id: PROGRAM_ID });

    // A bug-bounty visit is not an apply; if these collapsed, the apply rate
    // for any program with a bounty link would be inflated.
    expect(eventNames()).not.toContain("funding_map_apply_clicked");
  });

  it("reports a social link with the network it points at", () => {
    renderDialog();

    const twitter = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("href")?.includes("twitter.com"));
    expect(twitter).toBeDefined();
    fireEvent.click(twitter as HTMLElement);

    const props = propsOf("funding_map_social_link_clicked");
    expect(props).toMatchObject({ program_id: PROGRAM_ID });
    expect(typeof props?.network).toBe("string");
  });

  it("reports a claim-this-program request separately from an apply", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("link", { name: /are you the manager|claim/i }));

    expect(propsOf("funding_map_claim_program_clicked")).toEqual({ program_id: PROGRAM_ID });
    expect(eventNames()).not.toContain("funding_map_apply_clicked");
  });

  it("reports an apply with whether it stayed on Karma or left", () => {
    renderDialog();

    const apply = screen.getAllByRole("link").find((el) => /apply/i.test(el.textContent ?? ""));
    expect(apply).toBeDefined();
    fireEvent.click(apply as HTMLElement);

    const props = propsOf("funding_map_apply_clicked");
    expect(props).toMatchObject({ program_id: PROGRAM_ID });
    // internal vs external is what separates a funnel we can follow from one
    // that ends at our own boundary.
    expect(["internal", "external"]).toContain(props?.apply_target);
  });
});
