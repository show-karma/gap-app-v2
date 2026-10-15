import { describe, expect, it, vi } from "vitest";
import {
  matchPayoutCsvRows,
  type PayoutGrantRow,
  type ResolvedProject,
} from "@/utilities/payouts/matchPayoutCsvRows";

const ORIGINAL = `0x${"a".repeat(64)}`;
const DUPLICATE = `0x${"b".repeat(64)}`;
const MIDDLE = `0x${"c".repeat(64)}`;

const grants: PayoutGrantRow[] = [
  { uid: "grant-original", projectUid: ORIGINAL, projectSlug: "ipni-network-indexer" },
  { uid: "grant-other", projectUid: `0x${"d".repeat(64)}`, projectSlug: "other-project" },
];

const row = (projectSlug: string) => ({ projectSlug, payoutAddress: "0xabc", amount: "10" });

describe("matchPayoutCsvRows", () => {
  it("matches a row by the project slug without calling the resolver", async () => {
    const resolve = vi.fn<(s: string) => Promise<ResolvedProject | null>>();

    const result = await matchPayoutCsvRows([row("IPNI-Network-Indexer")], grants, resolve);

    expect(result.matches).toEqual([
      { grantUid: "grant-original", payoutAddress: "0xabc", amount: "10" },
    ]);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("matches a row that carries the project uid instead of the slug", async () => {
    const result = await matchPayoutCsvRows([row(ORIGINAL)], grants, vi.fn());

    expect(result.matches[0].grantUid).toBe("grant-original");
  });

  it("follows the pointer when the slug names a profile merged into a project in the table", async () => {
    const resolve = vi.fn(async (slugOrUid: string): Promise<ResolvedProject | null> => {
      if (slugOrUid === "ipni-network-indexers-1")
        return { uid: DUPLICATE, pointers: [{ originalProjectUID: ORIGINAL }] };
      if (slugOrUid === ORIGINAL) return { uid: ORIGINAL, pointers: [] };
      return null;
    });

    const result = await matchPayoutCsvRows([row("ipni-network-indexers-1")], grants, resolve);

    expect(result.matches[0].grantUid).toBe("grant-original");
    expect(result.unmatchedProjects).toEqual([]);
  });

  it("follows a chain of pointers up to the surviving project", async () => {
    const resolve = vi.fn(async (slugOrUid: string): Promise<ResolvedProject | null> => {
      if (slugOrUid === "old-slug")
        return { uid: DUPLICATE, pointers: [{ originalProjectUID: MIDDLE }] };
      if (slugOrUid === MIDDLE)
        return { uid: MIDDLE, pointers: [{ originalProjectUID: ORIGINAL }] };
      if (slugOrUid === ORIGINAL) return { uid: ORIGINAL };
      return null;
    });

    const result = await matchPayoutCsvRows([row("old-slug")], grants, resolve);

    expect(result.matches[0].grantUid).toBe("grant-original");
  });

  it("reports the row as unmatched when the resolved project is not in the table", async () => {
    const resolve = vi.fn(
      async (): Promise<ResolvedProject | null> => ({ uid: MIDDLE, pointers: [] })
    );

    const result = await matchPayoutCsvRows([row("unrelated")], grants, resolve);

    expect(result.matches).toEqual([]);
    expect(result.unmatchedProjects).toEqual(["unrelated"]);
  });

  it("reports the row as unmatched when the resolver fails or finds nothing", async () => {
    const failing = vi.fn(async () => {
      throw new Error("network");
    });
    const missing = vi.fn(async () => null);

    const failed = await matchPayoutCsvRows([row("x")], grants, failing);
    const notFound = await matchPayoutCsvRows([row("y")], grants, missing);

    expect(failed.unmatchedProjects).toEqual(["x"]);
    expect(notFound.unmatchedProjects).toEqual(["y"]);
  });

  it("stops on a self pointer instead of looping", async () => {
    const resolve = vi.fn(
      async (): Promise<ResolvedProject | null> => ({
        uid: DUPLICATE,
        pointers: [{ originalProjectUID: DUPLICATE }],
      })
    );

    const result = await matchPayoutCsvRows([row("loop")], grants, resolve);

    expect(result.unmatchedProjects).toEqual(["loop"]);
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
