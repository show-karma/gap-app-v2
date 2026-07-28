import {
  formatApplicationStatus,
  getStatusUpdateErrorMessage,
  isStatusConflictError,
  STATUS_CONFLICT_MESSAGE,
} from "@/utilities/application-status";

const httpError = (status: number, message: string) => ({
  response: { status, data: { message } },
});

// The backend maps every funding-application validation failure to 409, so the
// status code alone cannot tell a stale-status conflict from a correctable
// input error raised by the very same PUT.
describe("isStatusConflictError", () => {
  it("should_report_a_conflict_when_the_409_is_an_invalid_status_transition", () => {
    expect(
      isStatusConflictError(
        httpError(
          409,
          "Invalid status transition from 'approved' to 'approved'. Valid transitions are: "
        )
      )
    ).toBe(true);
  });

  it("should_not_report_a_conflict_when_the_409_is_a_currency_mismatch", () => {
    expect(
      isStatusConflictError(
        httpError(
          409,
          "Currency mismatch: Approved currency 'USDC' does not match program currency 'ETH'."
        )
      )
    ).toBe(false);
  });

  it("should_not_report_a_conflict_when_the_409_is_an_invalid_approved_amount", () => {
    expect(
      isStatusConflictError(
        httpError(
          409,
          "Invalid approved amount format: 'abc'. Amount must be a valid positive number."
        )
      )
    ).toBe(false);
  });

  it("should_not_report_a_conflict_when_the_409_is_a_missing_reason", () => {
    expect(
      isStatusConflictError(
        httpError(409, "A reason is required when changing status to 'revision_requested'")
      )
    ).toBe(false);
  });

  it("should_not_report_a_conflict_for_other_status_codes", () => {
    expect(isStatusConflictError(httpError(500, "Invalid status transition from 'a' to 'b'"))).toBe(
      false
    );
    expect(isStatusConflictError(undefined)).toBe(false);
    expect(isStatusConflictError(new Error("boom"))).toBe(false);
  });
});

describe("getStatusUpdateErrorMessage", () => {
  it("should_return_the_conflict_copy_when_the_transition_is_no_longer_valid", () => {
    expect(
      getStatusUpdateErrorMessage(httpError(409, "Invalid status transition from 'a' to 'b'"))
    ).toBe(STATUS_CONFLICT_MESSAGE);
  });

  it("should_surface_the_backend_message_when_a_409_is_a_correctable_validation_error", () => {
    const message = "Currency mismatch: Approved currency 'USDC' does not match program currency.";
    expect(getStatusUpdateErrorMessage(httpError(409, message))).toBe(message);
  });

  it("should_fall_back_to_a_generic_message_when_the_error_carries_none", () => {
    expect(getStatusUpdateErrorMessage(new Error("boom"))).toBe(
      "Failed to update application status"
    );
  });
});

describe("formatApplicationStatus", () => {
  it("uses Declined as the user-facing label for rejected applications", () => {
    expect(formatApplicationStatus("rejected")).toBe("Declined");
  });

  it("formats other application statuses", () => {
    expect(formatApplicationStatus("under_review")).toBe("Under Review");
    expect(formatApplicationStatus("custom_status")).toBe("Custom Status");
  });
});
