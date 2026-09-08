/**
 * @file Tests for useAggregatedApplications
 * @description The client-side path behind "All Programs" and every track
 * selection: it loads the community's public applications whole and narrows
 * them itself, because an application carries no track of its own.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  type ApplicationProgram,
  useAggregatedApplications,
} from "@/hooks/useAggregatedApplications";
import type { Application } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn() },
}));

const mockGet = vi.mocked(api.get);

const makeProgram = (overrides: Partial<ApplicationProgram> = {}): ApplicationProgram => ({
  programId: "program-abc",
  ...overrides,
});

const privateProgram = (programId: string): ApplicationProgram => ({
  programId,
  applicationConfig: { formSchema: { settings: { privateApplications: true } } },
});

const makeApplication = (overrides: Partial<Application>): Application =>
  ({
    referenceNumber: "APP-1",
    status: "approved",
    projectUID: "0xproject",
    applicationData: { "Pod Name": "A project" },
    ...overrides,
  }) as Application;

const getTitle = (application: Application) =>
  ((application.applicationData as Record<string, unknown> | undefined)?.["Pod Name"] as string) ??
  "Untitled";

/** One page of applications, shaped like the API's envelope. */
const applicationsPage = (applications: Application[], page = 1, totalPages = 1) => ({
  applications,
  pagination: { total: applications.length, page, limit: 100, totalPages },
});

/** One page of community projects, shaped like the API's envelope. */
const projectsPage = (uids: string[], totalPages = 1) => ({
  payload: uids.map((uid) => ({ uid })),
  pagination: { totalPages },
});

const baseOptions = {
  communityId: "filecoin",
  enabled: true,
  programId: null,
  trackId: null,
  programs: [makeProgram()],
  status: "all" as const,
  search: "",
  getTitle,
};

describe("useAggregatedApplications", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("fetching scope", () => {
    it("fetches nothing while disabled", () => {
      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, enabled: false }),
        { wrapper }
      );

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.applications).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it("reads every public program when no program is selected", async () => {
      mockGet.mockResolvedValue(applicationsPage([makeApplication({})]));

      const { result } = renderHook(
        () =>
          useAggregatedApplications({
            ...baseOptions,
            programs: [makeProgram(), makeProgram({ programId: "program-xyz" })],
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const urls = mockGet.mock.calls.map(([url]) => url);
      expect(urls).toContainEqual(expect.stringContaining("/program/program-abc"));
      expect(urls).toContainEqual(expect.stringContaining("/program/program-xyz"));
    });

    it("reads only the selected program when one is given", async () => {
      mockGet.mockResolvedValue(applicationsPage([makeApplication({})]));

      const { result } = renderHook(
        () =>
          useAggregatedApplications({
            ...baseOptions,
            programId: "program-abc",
            programs: [makeProgram(), makeProgram({ programId: "program-xyz" })],
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const urls = mockGet.mock.calls.map(([url]) => url);
      expect(urls).toContainEqual(expect.stringContaining("/program/program-abc"));
      expect(urls).not.toContainEqual(expect.stringContaining("/program/program-xyz"));
    });

    // A private program's applications are not the public's to read, so the
    // aggregate path skips it rather than surfacing a locked row.
    it("never reads a program whose applications are private", async () => {
      mockGet.mockResolvedValue(applicationsPage([makeApplication({})]));

      const { result } = renderHook(
        () =>
          useAggregatedApplications({
            ...baseOptions,
            programs: [makeProgram(), privateProgram("program-secret")],
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const urls = mockGet.mock.calls.map(([url]) => url);
      expect(urls).toContainEqual(expect.stringContaining("/program/program-abc"));
      expect(urls).not.toContainEqual(expect.stringContaining("/program/program-secret"));
    });

    it("fetches nothing when every program in scope is private", () => {
      renderHook(
        () =>
          useAggregatedApplications({
            ...baseOptions,
            programs: [privateProgram("program-secret")],
          }),
        { wrapper }
      );

      expect(mockGet).not.toHaveBeenCalled();
    });

    // The applications API caps limit at 100 and a program can hold more, so a
    // single page would silently drop rows off the end.
    it("follows every page of a program that spills past the first", async () => {
      mockGet.mockImplementation((url: string) => {
        const page = Number(url.match(/[?&]page=(\d+)/)?.[1] ?? 1);
        return Promise.resolve(
          applicationsPage([makeApplication({ referenceNumber: `APP-PAGE-${page}` })], page, 2)
        );
      });

      const { result } = renderHook(() => useAggregatedApplications(baseOptions), { wrapper });

      await waitFor(() => expect(result.current.applications).toHaveLength(2));
      expect(result.current.applications.map((a) => a.referenceNumber)).toEqual([
        "APP-PAGE-1",
        "APP-PAGE-2",
      ]);
    });
  });

  describe("track narrowing", () => {
    it("resolves the track's projects at the endpoint's maximum page size", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/projects")) return Promise.resolve(projectsPage(["0xkernel"]));
        return Promise.resolve(applicationsPage([makeApplication({ projectUID: "0xkernel" })]));
      });

      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, trackId: "track-kernel" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const projectsUrl = mockGet.mock.calls
        .map(([url]) => url)
        .find((u) => u.includes("/projects"));
      expect(projectsUrl).toContain("trackIds=track-kernel");
      expect(projectsUrl).toContain("limit=1000");
    });

    // A track wider than one page must not lose the projects on page two —
    // their applications would silently vanish from the list.
    it("unions the project UIDs across every page of the track", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/projects")) {
          const page = Number(url.match(/[?&]page=(\d+)/)?.[1] ?? 1);
          return Promise.resolve(
            page === 1 ? projectsPage(["0xpage-one"], 2) : projectsPage(["0xpage-two"], 2)
          );
        }
        return Promise.resolve(
          applicationsPage([
            makeApplication({ referenceNumber: "APP-ONE", projectUID: "0xpage-one" }),
            makeApplication({ referenceNumber: "APP-TWO", projectUID: "0xpage-two" }),
            makeApplication({ referenceNumber: "APP-OTHER", projectUID: "0xelsewhere" }),
          ])
        );
      });

      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, trackId: "track-kernel" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.applications).toHaveLength(2));
      expect(result.current.applications.map((a) => a.referenceNumber)).toEqual([
        "APP-ONE",
        "APP-TWO",
      ]);
    });

    // An application whose project was never funded carries no track at all.
    it("drops applications with no project when a track is chosen", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/projects")) return Promise.resolve(projectsPage(["0xkernel"]));
        return Promise.resolve(
          applicationsPage([
            makeApplication({ referenceNumber: "APP-FUNDED", projectUID: "0xkernel" }),
            makeApplication({ referenceNumber: "APP-UNFUNDED", projectUID: null }),
          ])
        );
      });

      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, trackId: "track-kernel" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.applications).toHaveLength(1));
      expect(result.current.applications[0].referenceNumber).toBe("APP-FUNDED");
    });

    it("never asks the projects endpoint for anything when no track is chosen", async () => {
      mockGet.mockResolvedValue(applicationsPage([makeApplication({})]));

      const { result } = renderHook(() => useAggregatedApplications(baseOptions), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGet.mock.calls.map(([url]) => url)).not.toContainEqual(
        expect.stringContaining("/projects")
      );
    });
  });

  describe("client-side status and search", () => {
    const loadedApplications = [
      makeApplication({ referenceNumber: "APP-A", status: "approved" }),
      makeApplication({
        referenceNumber: "APP-B",
        status: "pending",
        applicationData: { "Pod Name": "Storage tooling" },
      }),
      makeApplication({ referenceNumber: "APP-C", status: "rejected" }),
    ];

    beforeEach(() => {
      mockGet.mockResolvedValue(applicationsPage(loadedApplications));
    });

    it("narrows the list by status", async () => {
      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, status: "approved" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.applications).toHaveLength(1));
      expect(result.current.applications[0].referenceNumber).toBe("APP-A");
      expect(result.current.totalCount).toBe(1);
    });

    it("matches search against the rendered title and the reference number", async () => {
      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, search: "storage" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.applications).toHaveLength(1));
      expect(result.current.applications[0].referenceNumber).toBe("APP-B");

      const { result: byReference } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, search: "app-c" }),
        { wrapper }
      );

      await waitFor(() => expect(byReference.current.applications).toHaveLength(1));
      expect(byReference.current.applications[0].referenceNumber).toBe("APP-C");
    });

    // The chips have to read as counts of the whole list, not of whatever the
    // active chip already narrowed it to.
    it("counts the chips over the loaded set, before status and search", async () => {
      const { result } = renderHook(
        () => useAggregatedApplications({ ...baseOptions, status: "approved", search: "storage" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.chipCounts.all).toBe(3));
      expect(result.current.chipCounts.approved).toBe(1);
      expect(result.current.chipCounts.pending).toBe(1);
      expect(result.current.chipCounts.rejected).toBe(1);
    });
  });

  describe("error handling", () => {
    it("surfaces a failed load and can retry it", async () => {
      mockGet.mockRejectedValue(new Error("boom"));

      const { result } = renderHook(() => useAggregatedApplications(baseOptions), { wrapper });

      await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
      expect(result.current.applications).toEqual([]);
      expect(typeof result.current.refetch).toBe("function");
    });
  });
});
