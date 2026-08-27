/**
 * @file Analytics tests for the application funnel: submit, post-approval, and
 * the status write every admin screen shares.
 *
 * The submit hook is where `time_to_submit_s` is read, so the case that matters
 * is a submit whose start this page session never saw — it must report `null`
 * rather than a duration measured from module load.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Application } from "@/types/whitelabel-entities";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const apiClient = vi.hoisted(() => ({
  api: { post: vi.fn(), put: vi.fn(), get: vi.fn() },
}));
vi.mock("@/utilities/api/client", () => apiClient);

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useApplicationSubmit } from "@/src/features/applications/hooks/use-application-submit";
import { usePostApprovalSubmit } from "@/src/features/applications/hooks/use-post-approval-submit";
import {
  __resetApplicationTimingForTests,
  markApplicationStarted,
} from "@/src/features/applications/lib/application-timing";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);
const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

const application = {
  id: "app-1",
  programId: "prog-1",
  postApprovalData: undefined,
} as unknown as Application;

beforeEach(() => {
  vi.clearAllMocks();
  __resetApplicationTimingForTests();
});

describe("useApplicationSubmit", () => {
  const submitOnce = async () => {
    const { result } = renderHook(() => useApplicationSubmit("gitcoin"), { wrapper });
    await act(async () => {
      await result.current.submit("prog-1", {}, "applicant@example.test").catch(() => undefined);
    });
  };

  it("reports the submission against its program and community", async () => {
    apiClient.api.post.mockResolvedValue({ id: "app-1", referenceNumber: "APP-1" });

    await submitOnce();

    expect(propsOf("application_submitted")).toMatchObject({
      program_id: "prog-1",
      community_id: "gitcoin",
    });
  });

  it("reports how long the applicant took when the form was opened here", async () => {
    apiClient.api.post.mockResolvedValue({ id: "app-1" });
    // The clock is read at two separate moments; drive Date.now directly so the
    // gap between them is exact rather than however long the test took.
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    markApplicationStarted("prog-1");
    nowSpy.mockReturnValue(1_120_000);

    await submitOnce();

    expect(propsOf("application_submitted")?.time_to_submit_s).toBe(120);
    nowSpy.mockRestore();
  });

  it("reports an unknown duration for a submit this session never saw start", async () => {
    apiClient.api.post.mockResolvedValue({ id: "app-1" });

    await submitOnce();

    expect(propsOf("application_submitted")?.time_to_submit_s).toBeNull();
  });

  it("never puts the applicant's email on an event", async () => {
    apiClient.api.post.mockResolvedValue({ id: "app-1" });

    await submitOnce();

    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("applicant@example.test");
  });

  it("reports a rejected submit with a stable code", async () => {
    apiClient.api.post.mockRejectedValue(
      Object.assign(new Error("Access code incorrect"), { response: { status: 403 } })
    );

    await submitOnce();

    expect(eventNames()).toEqual(["application_submit_failed"]);
    expect(propsOf("application_submit_failed")).toEqual({
      program_id: "prog-1",
      error_code: "http_403",
    });
  });
});

describe("usePostApprovalSubmit", () => {
  const submitOnce = async () => {
    const { result } = renderHook(() => usePostApprovalSubmit("gitcoin", "APP-1", application), {
      wrapper,
    });
    await act(async () => {
      await result.current.submitPostApprovalForm({ bankName: "Acme" });
    });
  };

  it("reports a successful post-approval submission", async () => {
    apiClient.api.put.mockResolvedValue({ id: "app-1" });

    await submitOnce();

    expect(track).toHaveBeenCalledWith("post_approval_submitted", {
      application_id: "app-1",
      program_id: "prog-1",
    });
  });

  it("reports a failure with a stable code rather than the backend prose", async () => {
    apiClient.api.put.mockRejectedValue(new Error("Bank details rejected by provider"));

    await submitOnce();

    expect(propsOf("post_approval_submit_failed")).toMatchObject({
      application_id: "app-1",
      program_id: "prog-1",
    });
    expect(JSON.stringify(propsOf("post_approval_submit_failed"))).not.toContain("Bank details");
  });
});
