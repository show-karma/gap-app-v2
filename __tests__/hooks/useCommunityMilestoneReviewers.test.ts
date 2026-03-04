/**
 * Tests for the useCommunityMilestoneReviewers hook logic.
 *
 * Since the hook wraps useQueries, we test the deduplication and sorting
 * logic by extracting it into a pure function.
 */

interface CommunityReviewer {
  publicAddress: string;
  name: string;
  email: string;
}

interface MilestoneReviewer {
  publicAddress?: string;
  name: string;
  email: string;
}

/**
 * Extracted deduplication and sorting logic from useCommunityMilestoneReviewers.
 * Takes arrays of reviewer data (one per program) and returns a deduplicated,
 * sorted list of community reviewers.
 */
function deduplicateAndSortReviewers(
  queryResults: Array<MilestoneReviewer[] | undefined>
): CommunityReviewer[] {
  const seen = new Map<string, CommunityReviewer>();

  for (const data of queryResults) {
    if (!data) continue;
    for (const reviewer of data) {
      if (!reviewer.publicAddress) continue;
      const address = reviewer.publicAddress.toLowerCase();
      if (!seen.has(address)) {
        seen.set(address, {
          publicAddress: reviewer.publicAddress,
          name: reviewer.name,
          email: reviewer.email,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    (a.name || a.publicAddress).localeCompare(b.name || b.publicAddress)
  );
}

describe("useCommunityMilestoneReviewers deduplication logic", () => {
  it("returns empty array when no query results", () => {
    expect(deduplicateAndSortReviewers([])).toEqual([]);
  });

  it("returns empty array when all queries returned undefined", () => {
    expect(deduplicateAndSortReviewers([undefined, undefined])).toEqual([]);
  });

  it("returns empty array when all queries returned empty arrays", () => {
    expect(deduplicateAndSortReviewers([[], []])).toEqual([]);
  });

  it("deduplicates reviewers by address (case-insensitive)", () => {
    const program1 = [
      { publicAddress: "0xABC", name: "Alice", email: "alice@test.com" },
      { publicAddress: "0xDEF", name: "Bob", email: "bob@test.com" },
    ];
    const program2 = [
      { publicAddress: "0xabc", name: "Alice Duplicate", email: "alice2@test.com" },
      { publicAddress: "0xGHI", name: "Charlie", email: "charlie@test.com" },
    ];

    const result = deduplicateAndSortReviewers([program1, program2]);

    expect(result).toHaveLength(3);
    // Should keep the first occurrence
    const alice = result.find((r) => r.publicAddress === "0xABC");
    expect(alice?.name).toBe("Alice");
    expect(alice?.email).toBe("alice@test.com");
  });

  it("sorts reviewers by name alphabetically", () => {
    const data = [
      [
        { publicAddress: "0x3", name: "Charlie", email: "c@test.com" },
        { publicAddress: "0x1", name: "Alice", email: "a@test.com" },
        { publicAddress: "0x2", name: "Bob", email: "b@test.com" },
      ],
    ];

    const result = deduplicateAndSortReviewers(data);

    expect(result.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("uses publicAddress for sorting when name is empty", () => {
    const data = [
      [
        { publicAddress: "0xZZZ", name: "", email: "z@test.com" },
        { publicAddress: "0xAAA", name: "", email: "a@test.com" },
      ],
    ];

    const result = deduplicateAndSortReviewers(data);

    expect(result[0].publicAddress).toBe("0xAAA");
    expect(result[1].publicAddress).toBe("0xZZZ");
  });

  it("skips reviewers without publicAddress", () => {
    const data = [
      [
        { publicAddress: "0x1", name: "Alice", email: "a@test.com" },
        { publicAddress: undefined, name: "NoAddress", email: "na@test.com" },
      ],
    ];

    const result = deduplicateAndSortReviewers(data);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("aggregates from multiple programs correctly", () => {
    const program1 = [{ publicAddress: "0x1", name: "Alice", email: "a@test.com" }];
    const program2 = [{ publicAddress: "0x2", name: "Bob", email: "b@test.com" }];
    const program3 = [
      { publicAddress: "0x1", name: "Alice Again", email: "a2@test.com" },
      { publicAddress: "0x3", name: "Charlie", email: "c@test.com" },
    ];

    const result = deduplicateAndSortReviewers([program1, program2, program3]);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });
});
