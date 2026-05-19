/**
 * @file Tests for the nonprofit onboarding page.
 *
 * Verifies the form wires up correctly with useProvisionOrg, that a
 * successful provision redirects to the team directory, and that
 * provisioning errors are surfaced to the user.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";

// ─── next/navigation mock ────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/onboarding",
  useSearchParams: () => new URLSearchParams(),
}));

// ─── aiAgentClient mock ──────────────────────────────────────────────────────
import { aiAgentClient } from "@/lib/ai-agent-client";

vi.mock("@/lib/ai-agent-client", () => ({
  aiAgentClient: {
    provision: vi.fn(),
    getOrg: vi.fn(),
    listProfiles: vi.fn(),
    getAbout: vi.fn(),
    updateAbout: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const mockClient = aiAgentClient as {
  [K in keyof typeof aiAgentClient]: ReturnType<typeof vi.fn>;
};

// ─── import the component under test AFTER mocks ─────────────────────────────
import OnboardingPage from "@/app/(nonprofit)/onboarding/page";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <OnboardingPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingPage", () => {
  it("renders the setup form with required fields", () => {
    renderPage();
    expect(screen.getByLabelText(/organization handle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/runtime url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/runtime session token/i)).toBeInTheDocument();
  });

  it("calls useProvisionOrg with correct payload on submit and redirects on success", async () => {
    const user = userEvent.setup();
    mockClient.provision.mockResolvedValue({
      id: "org-1",
      slug: "acme-nonprofit",
      communityId: null,
      status: "active",
      statusReason: null,
      provisionedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderPage();

    await user.type(screen.getByLabelText(/organization handle/i), "acme-nonprofit");
    await user.type(screen.getByLabelText(/runtime url/i), "https://team-acme.karma.xyz");
    await user.type(screen.getByLabelText(/runtime session token/i), "tok_aaaaaaaaaaaaaaaa");

    await user.click(screen.getByRole("button", { name: /set up team/i }));

    await waitFor(() => {
      expect(mockClient.provision).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "acme-nonprofit",
          containerUrl: "https://team-acme.karma.xyz",
          sessionToken: "tok_aaaaaaaaaaaaaaaa",
        })
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("acme-nonprofit"));
    });
  });

  it("renders the error message when provisioning fails", async () => {
    const user = userEvent.setup();
    mockClient.provision.mockRejectedValue(new Error("Container unreachable"));

    renderPage();

    await user.type(screen.getByLabelText(/organization handle/i), "fail-org");
    await user.type(screen.getByLabelText(/runtime url/i), "https://bad.example.com");
    await user.type(screen.getByLabelText(/runtime session token/i), "tok_aaaaaaaaaaaaaaaa");

    await user.click(screen.getByRole("button", { name: /set up team/i }));

    await waitFor(() => {
      expect(screen.getByText(/container unreachable/i)).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
