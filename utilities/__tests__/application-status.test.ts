import { formatApplicationStatus } from "@/utilities/application-status";

describe("formatApplicationStatus", () => {
  it("uses Declined as the user-facing label for rejected applications", () => {
    expect(formatApplicationStatus("rejected")).toBe("Declined");
  });

  it("formats other application statuses", () => {
    expect(formatApplicationStatus("under_review")).toBe("Under Review");
    expect(formatApplicationStatus("custom_status")).toBe("Custom Status");
  });
});
