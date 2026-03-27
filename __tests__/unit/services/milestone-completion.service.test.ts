/**
 * @file Tests for milestone-completion.service.ts
 * @description Tests CRUD operations for milestone completions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchData = vi.fn();
vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => mockFetchData(...args),
}));

import {
  createMilestoneCompletion,
  getMilestoneCompletions,
  updateMilestoneCompletion,
} from "@/features/applications/services/milestone-completion.service";

describe("milestone-completion.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getMilestoneCompletions
  // =========================================================================

  describe("getMilestoneCompletions", () => {
    it("returns array when response is an array", async () => {
      const completions = [{ id: "1", milestoneTitle: "M1" }];
      mockFetchData.mockResolvedValue([completions, null]);

      const result = await getMilestoneCompletions("REF-001");
      expect(result).toEqual(completions);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/funding-applications/REF-001/milestone-completions"
      );
    });

    it("extracts data array when response wraps in { data }", async () => {
      const completions = [{ id: "2", milestoneTitle: "M2" }];
      mockFetchData.mockResolvedValue([{ data: completions }, null]);

      const result = await getMilestoneCompletions("REF-002");
      expect(result).toEqual(completions);
    });

    it("returns empty array when response is null", async () => {
      mockFetchData.mockResolvedValue([null, null]);
      const result = await getMilestoneCompletions("REF-003");
      expect(result).toEqual([]);
    });

    it("throws on fetch error", async () => {
      mockFetchData.mockResolvedValue([null, "Network error"]);
      await expect(getMilestoneCompletions("REF-004")).rejects.toThrow("Network error");
    });
  });

  // =========================================================================
  // createMilestoneCompletion
  // =========================================================================

  describe("createMilestoneCompletion", () => {
    it("creates and returns milestone completion", async () => {
      const completion = { id: "new-1", milestoneTitle: "New M" };
      mockFetchData.mockResolvedValue([completion, null]);

      const payload = {
        milestoneFieldLabel: "m1",
        milestoneTitle: "New M",
        completionText: "Done",
      };
      const result = await createMilestoneCompletion("REF-001", payload);

      expect(result).toEqual(completion);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/funding-applications/REF-001/milestone-completions",
        "POST",
        payload
      );
    });

    it("throws on fetch error", async () => {
      mockFetchData.mockResolvedValue([null, "Server error"]);
      await expect(
        createMilestoneCompletion("REF-001", {
          milestoneFieldLabel: "m1",
          milestoneTitle: "M",
          completionText: "Done",
        })
      ).rejects.toThrow("Server error");
    });

    it("throws with default message when response is null and no error", async () => {
      mockFetchData.mockResolvedValue([null, null]);
      await expect(
        createMilestoneCompletion("REF-001", {
          milestoneFieldLabel: "m1",
          milestoneTitle: "M",
          completionText: "Done",
        })
      ).rejects.toThrow("Failed to create milestone completion");
    });
  });

  // =========================================================================
  // updateMilestoneCompletion
  // =========================================================================

  describe("updateMilestoneCompletion", () => {
    it("updates and returns milestone completion", async () => {
      const completion = { id: "1", milestoneTitle: "Updated M" };
      mockFetchData.mockResolvedValue([completion, null]);

      const payload = {
        milestoneFieldLabel: "m1",
        milestoneTitle: "Updated M",
        completionText: "Updated",
      };
      const result = await updateMilestoneCompletion("REF-001", payload);

      expect(result).toEqual(completion);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/funding-applications/REF-001/milestone-completions",
        "PUT",
        payload
      );
    });

    it("throws on fetch error", async () => {
      mockFetchData.mockResolvedValue([null, "Update failed"]);
      await expect(
        updateMilestoneCompletion("REF-001", {
          milestoneFieldLabel: "m1",
          milestoneTitle: "M",
          completionText: "Done",
        })
      ).rejects.toThrow("Update failed");
    });

    it("throws with default message when response is null and no error", async () => {
      mockFetchData.mockResolvedValue([null, null]);
      await expect(
        updateMilestoneCompletion("REF-001", {
          milestoneFieldLabel: "m1",
          milestoneTitle: "M",
          completionText: "Done",
        })
      ).rejects.toThrow("Failed to update milestone completion");
    });
  });
});
