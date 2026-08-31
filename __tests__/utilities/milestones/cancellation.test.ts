import { cancellationFromStatusHistory } from "@/utilities/milestones/cancellation";

describe("cancellationFromStatusHistory", () => {
  const cancelledEntry = {
    status: "cancelled",
    updatedAt: "2026-07-22T20:53:59.000Z",
    updatedBy: "0x8353e73573194d9275d82f775d248d30235e403a",
    statusReason: "This work carried over into Batch 2 contract tracking",
  };

  it("should_return_null_when_milestone_is_not_cancelled", () => {
    expect(
      cancellationFromStatusHistory({
        currentStatus: "pending",
        statusHistory: [cancelledEntry],
      })
    ).toBeNull();
  });

  it("should_return_null_when_cancelled_milestone_has_no_history", () => {
    expect(
      cancellationFromStatusHistory({
        currentStatus: "cancelled",
        statusHistory: undefined,
      })
    ).toBeNull();
    expect(
      cancellationFromStatusHistory({
        currentStatus: "cancelled",
        statusHistory: [{ status: "pending", updatedAt: "2026-06-03T14:36:45.000Z" }],
      })
    ).toBeNull();
  });

  it("should_map_the_cancelled_entry_fields_when_milestone_is_cancelled", () => {
    expect(
      cancellationFromStatusHistory({
        currentStatus: "cancelled",
        statusHistory: [
          { status: "pending", updatedAt: "2026-06-03T14:36:45.000Z", updatedBy: "0x23b7" },
          cancelledEntry,
        ],
      })
    ).toEqual({
      cancelledBy: "0x8353e73573194d9275d82f775d248d30235e403a",
      cancelledAt: "2026-07-22T20:53:59.000Z",
      reason: "This work carried over into Batch 2 contract tracking",
    });
  });

  it("should_pick_the_latest_cancelled_entry_when_history_has_several", () => {
    const latest = {
      status: "cancelled",
      updatedAt: "2026-07-22T20:54:02.000Z",
      updatedBy: "0x7177adc0f924b695c0294a40c4c5feff5ee1e141",
      statusReason: "Latest reason",
    };
    expect(
      cancellationFromStatusHistory({
        currentStatus: "cancelled",
        statusHistory: [cancelledEntry, latest],
      })
    ).toEqual({
      cancelledBy: "0x7177adc0f924b695c0294a40c4c5feff5ee1e141",
      cancelledAt: "2026-07-22T20:54:02.000Z",
      reason: "Latest reason",
    });
  });

  it("should_default_missing_entry_fields_to_null", () => {
    expect(
      cancellationFromStatusHistory({
        currentStatus: "cancelled",
        statusHistory: [{ status: "cancelled", updatedAt: "2026-07-22T20:54:02.000Z" }],
      })
    ).toEqual({
      cancelledBy: null,
      cancelledAt: "2026-07-22T20:54:02.000Z",
      reason: null,
    });
  });
});
