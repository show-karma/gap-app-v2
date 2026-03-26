/**
 * MSW integration tests for useFundingApplicationByProjectUID hook.
 *
 * The hook fetches a funding application by project UID via
 * fetchApplicationByProjectUID service which calls fetchData (axios)
 * against /v2/funding-applications/project/:projectUID.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const PROJECT_UID = "proj-uid-001";

describe("useFundingApplicationByProjectUID (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() =>
      useFundingApplicationByProjectUID(PROJECT_UID)
    );
    expect(result.current.isLoading).toBe(true);
  });

  it("returns application data on success", async () => {
    const mockApp = {
      id: "app-1",
      projectUID: PROJECT_UID,
      programId: "prog-001",
      chainID: 1,
      applicantEmail: "test@example.com",
      applicationData: { title: "Growth Proposal" },
      status: "pending",
      statusHistory: [],
      referenceNumber: "APP-00001-00001",
      createdAt: "2024-06-15T10:30:00.000Z",
      updatedAt: "2024-06-15T10:30:00.000Z",
    };

    server.use(
      http.get("*/v2/funding-applications/project/:uid", () => HttpResponse.json(mockApp))
    );

    const { result } = renderHookWithProviders(() =>
      useFundingApplicationByProjectUID(PROJECT_UID)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.application).toBeDefined();
    expect(result.current.application!.referenceNumber).toBe("APP-00001-00001");
    expect(result.current.error).toBeNull();
  });

  it("returns null application on 404", async () => {
    server.use(
      http.get("*/v2/funding-applications/project/:uid", () =>
        HttpResponse.json({ message: "Application not found" }, { status: 404 })
      )
    );

    const { result } = renderHookWithProviders(() =>
      useFundingApplicationByProjectUID(PROJECT_UID)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The service returns null for 404
    expect(result.current.application).toBeNull();
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/funding-applications/project/:uid", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() =>
      useFundingApplicationByProjectUID(PROJECT_UID)
    );

    // The hook exposes `error` (not `isError`) from React Query
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("does not fetch when projectUID is empty", () => {
    const { result } = renderHookWithProviders(() => useFundingApplicationByProjectUID(""));
    // enabled: !!projectUID is false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.application).toBeUndefined();
  });
});
