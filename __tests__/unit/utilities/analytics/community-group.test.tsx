/**
 * @file Tests for the community group binding (utilities/analytics/community-group.ts).
 *
 * The bug this replaced: `/community/[communityId]` accepts either a slug or a
 * uid, so grouping on the URL segment reached Mixpanel as two different groups
 * for one community — and a slug change split its history in two. The layout
 * has already resolved the community, so the binding is by uid.
 */

import { render } from "@testing-library/react";
import { setCommunityGroup } from "@/utilities/analytics/client";
import {
  __resetCommunityGroupForTests,
  useBoundCommunityId,
  useCommunityAnalyticsGroup,
} from "@/utilities/analytics/community-group";

vi.mock("@/utilities/analytics/client", () => ({ setCommunityGroup: vi.fn() }));

function Binder({ uid }: { uid: string | null }) {
  useCommunityAnalyticsGroup(uid);
  return null;
}

function Reader() {
  const bound = useBoundCommunityId();
  return <span data-testid="bound">{bound ?? "none"}</span>;
}

describe("useCommunityAnalyticsGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCommunityGroupForTests();
  });

  it("binds the resolved uid, not whatever the URL said", () => {
    render(<Binder uid="0xcommunityuid" />);

    expect(setCommunityGroup).toHaveBeenCalledWith("0xcommunityuid");
  });

  it("binds nothing when the route names no real community", () => {
    render(<Binder uid={null} />);

    expect(setCommunityGroup).toHaveBeenCalledWith(null);
  });

  it("unbinds when the visitor leaves the community subtree", () => {
    const { unmount } = render(<Binder uid="0xcommunityuid" />);
    vi.mocked(setCommunityGroup).mockClear();

    unmount();

    // Without this, events on the next screen are still attributed to the
    // community the visitor just left.
    expect(setCommunityGroup).toHaveBeenCalledWith(null);
  });

  it("rebinds when the community changes without a remount", () => {
    const { rerender } = render(<Binder uid="0xfirst" />);

    rerender(<Binder uid="0xsecond" />);

    expect(vi.mocked(setCommunityGroup).mock.calls.map(([id]) => id)).toEqual([
      "0xfirst",
      null,
      "0xsecond",
    ]);
  });
});

describe("useBoundCommunityId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCommunityGroupForTests();
  });

  it("reports nothing before a community is bound", () => {
    const { getByTestId } = render(<Reader />);

    expect(getByTestId("bound").textContent).toBe("none");
  });

  it("reaches a reader outside the community subtree", () => {
    // AnalyticsProvider is mounted from the ROOT layout, not inside the
    // community tree, which is why this is a module store and not context.
    const { getByTestId } = render(
      <>
        <Reader />
        <Binder uid="0xcommunityuid" />
      </>
    );

    expect(getByTestId("bound").textContent).toBe("0xcommunityuid");
  });

  it("clears for the reader when the binder unmounts", () => {
    function Tree({ inCommunity }: { inCommunity: boolean }) {
      return (
        <>
          <Reader />
          {inCommunity && <Binder uid="0xcommunityuid" />}
        </>
      );
    }

    const { getByTestId, rerender } = render(<Tree inCommunity />);
    expect(getByTestId("bound").textContent).toBe("0xcommunityuid");

    rerender(<Tree inCommunity={false} />);

    expect(getByTestId("bound").textContent).toBe("none");
  });
});
