/**
 * @file Tests for useInstallSkill and useUninstallSkill optimistic updates.
 *
 * Both mutations follow the cancel → snapshot → optimistic mutate → rollback-on-error
 * pattern. These tests verify that pattern is implemented correctly.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useInstallSkill, useUninstallSkill } from "@/hooks/useSkills";
import { type AIAgentSkillSummary, aiAgentClient } from "@/lib/ai-agent-client";

vi.mock("@/lib/ai-agent-client", () => ({
  aiAgentClient: {
    listAvailableSkills: vi.fn(),
    listProfileSkills: vi.fn(),
    installProfileSkill: vi.fn(),
    uninstallProfileSkill: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const mockClient = aiAgentClient as {
  [K in keyof typeof aiAgentClient]: ReturnType<typeof vi.fn>;
};

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const PROFILE_KEY = ["ai-agent-skills", "profile", "acme", "fundraiser"];
const AVAILABLE_KEY = ["ai-agent-skills", "available", "acme"];

const installedSkills: AIAgentSkillSummary[] = [
  {
    id: "grant-tracker/grant-tracker",
    namespace: "grant-tracker",
    name: "Grant Tracker",
    description: null,
    version: "1.0.0",
    tags: [],
  },
];

const availableSkill: AIAgentSkillSummary = {
  id: "email-drafter/email-drafter",
  namespace: "email-drafter",
  name: "Email Drafter",
  description: null,
  version: "1.0.0",
  tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useInstallSkill", () => {
  it("optimistically appends the skill to the profile cache", async () => {
    mockClient.installProfileSkill.mockResolvedValue({
      installed: true,
      skill: availableSkill,
    });

    const qc = makeClient();
    qc.setQueryData<AIAgentSkillSummary[]>(PROFILE_KEY, installedSkills);
    qc.setQueryData<AIAgentSkillSummary[]>(AVAILABLE_KEY, [availableSkill]);

    const { result } = renderHook(() => useInstallSkill("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("email-drafter/email-drafter");

    await waitFor(() => {
      const skills = qc.getQueryData<AIAgentSkillSummary[]>(PROFILE_KEY);
      expect(skills?.some((s) => s.id === availableSkill.id)).toBe(true);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the optimistic append on error", async () => {
    mockClient.installProfileSkill.mockRejectedValue(new Error("install failed"));

    const qc = makeClient();
    qc.setQueryData<AIAgentSkillSummary[]>(PROFILE_KEY, installedSkills);
    qc.setQueryData<AIAgentSkillSummary[]>(AVAILABLE_KEY, [availableSkill]);

    const { result } = renderHook(() => useInstallSkill("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("email-drafter/email-drafter");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const skills = qc.getQueryData<AIAgentSkillSummary[]>(PROFILE_KEY);
    // Rolled back — only the original skill remains
    expect(skills).toHaveLength(1);
    expect(skills?.[0].id).toBe("grant-tracker/grant-tracker");
  });

  it("does not mutate cache when the skill is not found in available list", async () => {
    mockClient.installProfileSkill.mockResolvedValue({
      installed: false,
      skill: null,
    });

    const qc = makeClient();
    qc.setQueryData<AIAgentSkillSummary[]>(PROFILE_KEY, installedSkills);
    qc.setQueryData<AIAgentSkillSummary[]>(AVAILABLE_KEY, []); // empty available list

    const { result } = renderHook(() => useInstallSkill("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("nonexistent/skill");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const skills = qc.getQueryData<AIAgentSkillSummary[]>(PROFILE_KEY);
    // Cache unchanged since skill wasn't in available list
    expect(skills).toHaveLength(1);
  });
});

describe("useUninstallSkill", () => {
  it("optimistically removes the skill from the profile cache", async () => {
    mockClient.uninstallProfileSkill.mockResolvedValue({
      removed: true,
      id: "grant-tracker/grant-tracker",
    });

    const qc = makeClient();
    qc.setQueryData<AIAgentSkillSummary[]>(PROFILE_KEY, installedSkills);

    const { result } = renderHook(() => useUninstallSkill("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ namespace: "grant-tracker", skillId: "grant-tracker" });

    await waitFor(() => {
      const skills = qc.getQueryData<AIAgentSkillSummary[]>(PROFILE_KEY);
      expect(skills?.some((s) => s.id === "grant-tracker/grant-tracker")).toBe(false);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the optimistic removal on error", async () => {
    mockClient.uninstallProfileSkill.mockRejectedValue(new Error("uninstall failed"));

    const qc = makeClient();
    qc.setQueryData<AIAgentSkillSummary[]>(PROFILE_KEY, installedSkills);

    const { result } = renderHook(() => useUninstallSkill("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ namespace: "grant-tracker", skillId: "grant-tracker" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const skills = qc.getQueryData<AIAgentSkillSummary[]>(PROFILE_KEY);
    expect(skills?.some((s) => s.id === "grant-tracker/grant-tracker")).toBe(true);
  });
});
