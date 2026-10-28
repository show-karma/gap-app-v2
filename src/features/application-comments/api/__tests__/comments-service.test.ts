import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/utilities/api/errors";

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { CommentsService } from "../comments-service";

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe("CommentsService.getComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the comments on success", async () => {
    mockGet.mockResolvedValueOnce({ comments: [{ id: "c1" }] });

    await expect(CommentsService.getComments("APP-1")).resolves.toEqual([{ id: "c1" }]);
  });

  it("rethrows a 403 with the backend message instead of hiding it as an empty list", async () => {
    mockGet.mockRejectedValueOnce(
      new HttpError(403, {
        endpoint: "/v2/applications/APP-1/comments",
        method: "get",
        body: {
          error: "Forbidden",
          message: "Access denied to view comments for application APP-1",
        },
      })
    );

    await expect(CommentsService.getComments("APP-1")).rejects.toThrow(
      "Access denied to view comments for application APP-1"
    );
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("keeps reporting other failures and returns an empty list", async () => {
    mockGet.mockRejectedValueOnce(
      new HttpError(500, { endpoint: "/v2/applications/APP-1/comments", method: "get" })
    );

    await expect(CommentsService.getComments("APP-1")).resolves.toEqual([]);
    expect(errorManager).toHaveBeenCalledTimes(1);
  });
});
