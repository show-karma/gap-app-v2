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
import OnboardingPage from "@/app/ai-teams/onboarding/page";

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

  // ───────────────────────────────────────────────────────────────────────────
  // Issue #1426: the old page gated submit on a truthy-only `canSubmit`, so an
  // invalid Runtime URL ("not-a-valid-url") still enabled the button, and a
  // click silently did nothing (native browser bubbles only). The form now uses
  // zodResolver and renders inline, ARIA-associated errors; clicking submit on
  // an invalid form surfaces the error and never calls the mutation.
  // ───────────────────────────────────────────────────────────────────────────
  describe("inline validation (issue #1426)", () => {
    it("shows an inline error for an invalid Runtime URL and does not provision", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/organization handle/i), "acme-nonprofit");
      await user.type(screen.getByLabelText(/runtime url/i), "not-a-valid-url");
      await user.type(screen.getByLabelText(/runtime session token/i), "tok_aaaaaaaaaaaaaaaa");

      await user.click(screen.getByRole("button", { name: /set up team/i }));

      const urlInput = screen.getByLabelText(/runtime url/i);
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });

      // Error is associated with the field for assistive tech.
      expect(urlInput).toHaveAttribute("aria-invalid", "true");
      const describedBy = urlInput.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy as string)).toHaveTextContent(
        /please enter a valid url/i
      );

      // The mutation must NOT fire for an invalid form.
      expect(mockClient.provision).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows an inline error when the session token is shorter than 16 characters", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/organization handle/i), "acme-nonprofit");
      await user.type(screen.getByLabelText(/runtime url/i), "https://team-acme.karma.xyz");
      await user.type(screen.getByLabelText(/runtime session token/i), "short");

      await user.click(screen.getByRole("button", { name: /set up team/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 16 characters/i)).toBeInTheDocument();
      });
      expect(mockClient.provision).not.toHaveBeenCalled();
    });

    it("keeps the submit button enabled on an invalid form so errors can surface", () => {
      renderPage();
      // Unlike the old truthy-only gate, the button is only disabled while the
      // mutation is pending — an invalid form still allows a click that reveals
      // the inline errors.
      expect(screen.getByRole("button", { name: /set up team/i })).not.toBeDisabled();
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
