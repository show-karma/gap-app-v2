/**
 * @file Analytics tests for `scanner_scorecard_viewed`.
 *
 * This emit site is a PII regression guard as much as a coverage one: the
 * pre-migration version put the viewer's email and user id on every scorecard
 * view. The catalog replaced those with the two booleans the conversion funnel
 * actually splits on — `viewer_is_owner` and `viewer_is_authenticated` — so the
 * tests below assert both that the booleans are right and that no identifier
 * came back with them.
 *
 * The tracker also fires exactly once per mount and only after auth resolves,
 * because `viewer_is_authenticated` read before `ready` would report every
 * signed-in viewer as anonymous.
 */

import { render } from "@testing-library/react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const auth = vi.hoisted(() => ({ state: { ready: true, authenticated: true } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth.state }));

import { ScannerViewTracker } from "@/src/features/scanner/components/scanner-view-tracker";

const viewedEvents = () =>
  vi.mocked(track).mock.calls.filter(([name]) => name === "scanner_scorecard_viewed");

const baseProps = {
  variant: "public" as const,
  scanId: "scan-1",
  slug: "example.com",
  grade: "B",
  totalScore: 72,
  viewerIsOwner: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.state = { ready: true, authenticated: true };
});

describe("ScannerViewTracker analytics", () => {
  it("emits scanner_scorecard_viewed with exactly the catalog properties", () => {
    render(<ScannerViewTracker {...baseProps} />);

    expect(viewedEvents()).toHaveLength(1);
    expect(Object.keys(viewedEvents()[0][1] as object).sort()).toEqual([
      "grade",
      "scan_id",
      "total_score",
      "variant",
      "viewer_is_authenticated",
      "viewer_is_owner",
    ]);
  });

  it("carries no viewer email, user id or wallet — the regression this replaced", () => {
    render(<ScannerViewTracker {...baseProps} />);

    const props = viewedEvents()[0][1] as Record<string, unknown>;
    for (const key of ["email", "userId", "user_id", "wallet", "address", "viewerEmail"]) {
      expect(props).not.toHaveProperty(key);
    }
  });

  it("splits the funnel on ownership and sign-in state", () => {
    auth.state = { ready: true, authenticated: false };

    render(<ScannerViewTracker {...baseProps} viewerIsOwner />);

    expect(viewedEvents()[0][1]).toMatchObject({
      viewer_is_owner: true,
      viewer_is_authenticated: false,
    });
  });

  it("defaults viewer_is_owner to false rather than undefined when not supplied", () => {
    const { viewerIsOwner: _omitted, ...withoutOwner } = baseProps;

    render(<ScannerViewTracker {...withoutOwner} />);

    expect(viewedEvents()[0][1]).toMatchObject({ viewer_is_owner: false });
  });

  it("reports null (not undefined) for a scorecard with no grade or score yet", () => {
    render(<ScannerViewTracker {...baseProps} grade={undefined} totalScore={undefined} />);

    const props = viewedEvents()[0][1] as Record<string, unknown>;
    expect(props.grade).toBeNull();
    expect(props.total_score).toBeNull();
  });

  it("waits for auth to resolve before reporting", () => {
    auth.state = { ready: false, authenticated: false };

    const { rerender } = render(<ScannerViewTracker {...baseProps} />);
    expect(viewedEvents()).toHaveLength(0);

    // Reporting before `ready` would record every signed-in viewer as anonymous.
    auth.state = { ready: true, authenticated: true };
    rerender(<ScannerViewTracker {...baseProps} />);

    expect(viewedEvents()).toHaveLength(1);
    expect(viewedEvents()[0][1]).toMatchObject({ viewer_is_authenticated: true });
  });

  it("fires once per mount, not on every re-render", () => {
    const { rerender } = render(<ScannerViewTracker {...baseProps} />);
    rerender(<ScannerViewTracker {...baseProps} />);
    rerender(<ScannerViewTracker {...baseProps} />);

    expect(viewedEvents()).toHaveLength(1);
  });

  it("does not report a view with neither a scan id nor a slug", () => {
    render(<ScannerViewTracker variant="public" scanId={undefined} slug={undefined} />);

    expect(viewedEvents()).toHaveLength(0);
  });
});
