import { captureMessage } from "@sentry/nextjs";
import { reportCanonicalMismatchIfAny } from "@/utilities/sentry/reportCanonicalMismatch";

const UID = `0x${"a".repeat(64)}`;

describe("reportCanonicalMismatchIfAny", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures a Sentry event when the resolved slug differs from the requested id", () => {
    reportCanonicalMismatchIfAny({
      scope: "project",
      requestedId: "karma---governance",
      resolvedSlug: "fundacin-salva-terra-1",
      resolvedUid: UID,
    });

    expect(captureMessage).toHaveBeenCalledWith("canonical-mismatch:project", {
      level: "error",
      tags: { kind: "canonical-mismatch", scope: "project" },
      extra: {
        requestedId: "karma---governance",
        resolvedSlug: "fundacin-salva-terra-1",
        resolvedUid: UID,
      },
    });
  });

  it("does not fire when the resolved slug matches the requested id (case-insensitive)", () => {
    reportCanonicalMismatchIfAny({
      scope: "community",
      requestedId: "Arbitrum",
      resolvedSlug: "arbitrum",
      resolvedUid: UID,
    });

    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("does not fire when the requested id is a uid (no slug to compare)", () => {
    reportCanonicalMismatchIfAny({
      scope: "project",
      requestedId: UID,
      resolvedSlug: "some-other-slug",
      resolvedUid: UID,
    });

    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("does not fire when no slug was resolved", () => {
    reportCanonicalMismatchIfAny({
      scope: "project",
      requestedId: "karma---governance",
      resolvedSlug: undefined,
      resolvedUid: undefined,
    });

    expect(captureMessage).not.toHaveBeenCalled();
  });
});
