import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the network layer so we can assert on the URL the service builds.
const apiGetMock = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getReviewerInbox } from "@/services/reviewerInboxService";

const emptyResponse = {
  items: [],
  pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
  stats: {},
};

/** The query string of the single URL the service requested. */
function requestedQuery(): URLSearchParams {
  const url = apiGetMock.mock.calls[0][0] as string;
  return new URLSearchParams(url.split("?")[1] ?? "");
}

/**
 * Wire contract, client half. The frontend calls the indexer DIRECTLY (no Next
 * proxy), so this file and the indexer's query-schema test are the only two
 * places the `inboxSort` parameter name is pinned. A rename on either side has
 * to break one of them rather than degrade silently to the default ordering.
 */
describe("getReviewerInbox › inboxSort", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue(emptyResponse);
  });

  it("should_send_the_follow_up_wire_value_the_indexer_accepts", async () => {
    await getReviewerInbox("filecoin", { inboxSort: "follow_up_date" });

    expect(requestedQuery().get("inboxSort")).toBe("follow_up_date");
  });

  it("should_omit_inboxSort_for_the_default_mode", async () => {
    // The server owns the default. Sending "priority" explicitly would mean two
    // places could disagree about what the default is.
    await getReviewerInbox("filecoin", { inboxSort: "priority" });

    expect(requestedQuery().has("inboxSort")).toBe(false);
  });

  it("should_omit_inboxSort_when_no_sort_is_given", async () => {
    await getReviewerInbox("filecoin", {});

    expect(requestedQuery().has("inboxSort")).toBe(false);
  });

  it("should_carry_inboxSort_alongside_the_stage_and_program_filters", async () => {
    await getReviewerInbox("filecoin", {
      attention: "past_due",
      programId: "774",
      inboxSort: "follow_up_date",
    });

    const query = requestedQuery();
    expect(query.get("attention")).toBe("past_due");
    expect(query.get("programId")).toBe("774");
    expect(query.get("inboxSort")).toBe("follow_up_date");
  });

  it("sends project and pending-action-item filters to the indexer", async () => {
    await getReviewerInbox("filecoin", {
      projectUid: "project-9",
      pendingActionItems: true,
    });

    expect(requestedQuery().get("projectUid")).toBe("project-9");
    expect(requestedQuery().get("pendingActionItems")).toBe("true");
  });
});
