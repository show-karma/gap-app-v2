/**
 * @file Tests for the donor-research OnboardingFlow wizard.
 * @description Locks the accessibility/observability behavior added for
 * issue #1587: the wizard's step state must be programmatically
 * determinable (aria-current moves across steps, focus lands on the active
 * step heading), validation errors are announced via role="alert", and the
 * advisor-exists redirect / successful-submit redirect fire correctly.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { PAGES } from "@/utilities/pages";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: vi.fn(() => "/donor-research/onboarding"),
}));

vi.mock("@/services/donor-research.service", () => ({
  fetchCurrentAdvisor: vi.fn(),
  onboardAdvisor: vi.fn(),
  fetchMyCounters: vi.fn(),
}));

// Controllable Privy bridge so we can simulate a logged-in email/Google
// session. Defaults to an unresolved session (no pre-fill).
interface MockPrivyValue {
  ready: boolean;
  authenticated: boolean;
  user: { email?: { address: string }; google?: { email: string } } | null;
}
const DEFAULT_PRIVY: MockPrivyValue = { ready: false, authenticated: false, user: null };
let mockPrivyValue: MockPrivyValue = DEFAULT_PRIVY;
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockPrivyValue,
}));

// SampleReportPreview pulls in unrelated fixture content; keep the wizard
// test focused on step semantics.
vi.mock("@/src/features/donor-research/components/onboarding/SampleReportPreview", () => ({
  SampleReportPreview: () => <div data-testid="sample-report-preview" />,
}));

import { fetchCurrentAdvisor, onboardAdvisor } from "@/services/donor-research.service";
import { OnboardingFlow } from "@/src/features/donor-research/components/onboarding/OnboardingFlow";

const mockFetchCurrentAdvisor = vi.mocked(fetchCurrentAdvisor);
const mockOnboardAdvisor = vi.mocked(onboardAdvisor);

const ADVISOR = {
  id: "advisor-1",
  privyUserId: "did:privy:abc",
  displayName: "Avery Boutique",
  orgName: "Boutique Philanthropy LLC",
  timezone: "America/Los_Angeles",
} as Awaited<ReturnType<typeof fetchCurrentAdvisor>> & object;

function renderFlow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...render(<OnboardingFlow />, { wrapper }) };
}

/** The active step is the stepper item carrying aria-current="step". */
function getCurrentStepLabel(): string | null {
  const current = document.querySelector('[aria-current="step"]');
  return current?.textContent?.trim() ?? null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrivyValue = DEFAULT_PRIVY;
});

describe("OnboardingFlow — loading state", () => {
  it("renders the checking-account loading state while the advisor query is in flight", () => {
    // Never resolves during this test.
    mockFetchCurrentAdvisor.mockReturnValue(new Promise(() => {}));

    renderFlow();

    expect(screen.getByText("Checking your account…")).toBeInTheDocument();
  });
});

describe("OnboardingFlow — advisor already exists", () => {
  it("redirects to the donor-research index without rendering the wizard", async () => {
    mockFetchCurrentAdvisor.mockResolvedValue(ADVISOR);

    renderFlow();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(PAGES.DONOR_RESEARCH.INDEX);
    });
  });
});

describe("OnboardingFlow — step semantics (issue #1587)", () => {
  beforeEach(() => {
    // Not onboarded yet -> stay in the wizard.
    mockFetchCurrentAdvisor.mockResolvedValue(null);
  });

  it("marks only the welcome step as current on first render", async () => {
    renderFlow();

    await waitFor(() => {
      expect(getCurrentStepLabel()).toBe("1. Welcome");
    });
    // Exactly one current step at a time.
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });

  it("moves aria-current and focus forward through welcome -> sample -> form", async () => {
    const user = userEvent.setup();
    renderFlow();

    await screen.findByRole("button", { name: /continue to sample report/i });

    await user.click(screen.getByRole("button", { name: /continue to sample report/i }));

    await waitFor(() => {
      expect(getCurrentStepLabel()).toBe("2. Sample report");
    });
    // Focus lands on the new step heading.
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: /what a report looks like/i })
    );

    await user.click(screen.getByRole("button", { name: /continue to setup/i }));

    await waitFor(() => {
      expect(getCurrentStepLabel()).toBe("3. Get started");
    });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: /get started/i }));
  });

  it("walks back from the form to the welcome step", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(await screen.findByRole("button", { name: /continue to sample report/i }));
    await user.click(await screen.findByRole("button", { name: /continue to setup/i }));

    // Back from form -> sample
    await user.click(await screen.findByRole("button", { name: /^back$/i }));
    await waitFor(() => {
      expect(getCurrentStepLabel()).toBe("2. Sample report");
    });

    // Back from sample -> welcome
    await user.click(screen.getByRole("button", { name: /^back$/i }));
    await waitFor(() => {
      expect(getCurrentStepLabel()).toBe("1. Welcome");
    });
  });
});

describe("OnboardingFlow — form submission", () => {
  beforeEach(() => {
    mockFetchCurrentAdvisor.mockResolvedValue(null);
  });

  async function advanceToForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: /continue to sample report/i }));
    await user.click(await screen.findByRole("button", { name: /continue to setup/i }));
    await screen.findByRole("heading", { name: /get started/i });
  }

  it("announces a role=alert validation error and does not call the mutation when display name is empty", async () => {
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    // Submit with the required Display name still empty.
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((el) => /display name is required/i.test(el.textContent ?? ""))).toBe(true);
    expect(mockOnboardAdvisor).not.toHaveBeenCalled();

    // The invalid input is marked aria-invalid for assistive tech.
    expect(screen.getByLabelText(/display name/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("submits and redirects to the index on success", async () => {
    mockOnboardAdvisor.mockResolvedValue(ADVISOR);
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    await user.type(screen.getByLabelText(/display name/i), "Avery Boutique");
    await user.type(screen.getByLabelText(/email/i), "avery@example.com");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    await waitFor(() => {
      expect(mockOnboardAdvisor).toHaveBeenCalledTimes(1);
    });
    expect(mockOnboardAdvisor).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Avery Boutique" })
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(PAGES.DONOR_RESEARCH.INDEX);
    });
  });

  it("announces a role=alert when the onboarding mutation fails", async () => {
    mockOnboardAdvisor.mockRejectedValue(new Error("Boom from server"));
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    await user.type(screen.getByLabelText(/display name/i), "Avery Boutique");
    await user.type(screen.getByLabelText(/email/i), "avery@example.com");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    const alert = await screen.findByText(/boom from server/i);
    expect(alert).toHaveAttribute("role", "alert");
    expect(mockReplace).not.toHaveBeenCalledWith(PAGES.DONOR_RESEARCH.INDEX);
  });
});

describe("OnboardingFlow — email pre-fill from session", () => {
  beforeEach(() => {
    mockFetchCurrentAdvisor.mockResolvedValue(null);
  });

  async function advanceToForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: /continue to sample report/i }));
    await user.click(await screen.findByRole("button", { name: /continue to setup/i }));
    await screen.findByRole("heading", { name: /get started/i });
  }

  it("pre-fills the email from a Privy email login", async () => {
    mockPrivyValue = {
      ready: true,
      authenticated: true,
      user: { email: { address: "advisor@example.com" } },
    };
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    expect(screen.getByLabelText(/email/i)).toHaveValue("advisor@example.com");
  });

  it("pre-fills the email from a Google OAuth login", async () => {
    mockPrivyValue = {
      ready: true,
      authenticated: true,
      user: { google: { email: "advisor@gmail.com" } },
    };
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    expect(screen.getByLabelText(/email/i)).toHaveValue("advisor@gmail.com");
  });

  it("leaves the email empty when the session has no email (wallet login)", async () => {
    mockPrivyValue = { ready: true, authenticated: true, user: {} };
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    expect(screen.getByLabelText(/email/i)).toHaveValue("");
  });

  it("leaves the email empty until Privy resolves an authenticated session", async () => {
    mockPrivyValue = {
      ready: false,
      authenticated: false,
      user: { email: { address: "advisor@example.com" } },
    };
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    expect(screen.getByLabelText(/email/i)).toHaveValue("");
  });

  it("submits the pre-filled email without the advisor retyping it", async () => {
    mockOnboardAdvisor.mockResolvedValue(ADVISOR);
    mockPrivyValue = {
      ready: true,
      authenticated: true,
      user: { email: { address: "advisor@example.com" } },
    };
    const user = userEvent.setup();
    renderFlow();
    await advanceToForm(user);

    await user.type(screen.getByLabelText(/display name/i), "Avery Boutique");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    await waitFor(() => {
      expect(mockOnboardAdvisor).toHaveBeenCalledWith(
        expect.objectContaining({ email: "advisor@example.com" })
      );
    });
  });

  it("does not clobber an email the advisor has already typed", async () => {
    const user = userEvent.setup();
    // Session resolves with no email at first.
    renderFlow();
    await advanceToForm(user);

    await user.type(screen.getByLabelText(/email/i), "typed@example.com");

    // Session resolves an email afterwards; a re-render must not overwrite it.
    mockPrivyValue = {
      ready: true,
      authenticated: true,
      user: { email: { address: "session@example.com" } },
    };
    await user.type(screen.getByLabelText(/display name/i), "Avery");

    expect(screen.getByLabelText(/email/i)).toHaveValue("typed@example.com");
  });
});

describe("OnboardingFlow — stepper landmark", () => {
  it("exposes the progress as a named navigation landmark", async () => {
    mockFetchCurrentAdvisor.mockResolvedValue(null);
    renderFlow();

    const nav = await screen.findByRole("navigation", {
      name: /onboarding progress/i,
    });
    // All three step labels live inside the landmark.
    expect(within(nav).getByText(/welcome/i)).toBeInTheDocument();
    expect(within(nav).getByText(/sample report/i)).toBeInTheDocument();
    expect(within(nav).getByText(/get started/i)).toBeInTheDocument();
  });
});
