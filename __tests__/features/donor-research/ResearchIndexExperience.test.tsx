import { render, screen } from "@testing-library/react";
import { ResearchIndexExperience } from "@/src/features/donor-research/components/common/ResearchIndexExperience";

const authState = {
  ready: true,
  authenticated: false,
};

const loadPrivy = vi.fn();

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => authState,
  useLoadPrivy: () => loadPrivy,
}));

vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: ({ isLoading, title }: { isLoading?: boolean; title?: string }) =>
    isLoading ? <p>Checking access…</p> : <p>{title}</p>,
}));

vi.mock("@/src/features/donor-research/components/common/DonorResearchShell", () => ({
  DonorResearchShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="advisor-shell">{children}</div>
  ),
}));

vi.mock("@/src/features/donor-research/components/common/DonorResearchHome", () => ({
  DonorResearchHome: () => <div data-testid="research-home" />,
}));

describe("ResearchIndexExperience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.ready = true;
    authState.authenticated = false;
  });

  describe("loading", () => {
    it("renders the gate skeleton while Privy resolves, and triggers the Privy load", () => {
      authState.ready = false;

      render(<ResearchIndexExperience />);

      expect(screen.getByText("Checking access…")).toBeInTheDocument();
      expect(loadPrivy).toHaveBeenCalled();
    });
  });

  describe("signed out", () => {
    it("renders the same sign-in gate the layout used to render", () => {
      render(<ResearchIndexExperience />);

      expect(screen.getByText("Sign in to access nonprofit research")).toBeInTheDocument();
      expect(screen.queryByTestId("research-home")).not.toBeInTheDocument();
    });
  });

  describe("signed in", () => {
    it("renders the advisor shell with the research home, as before", () => {
      authState.authenticated = true;

      render(<ResearchIndexExperience />);

      expect(screen.getByTestId("advisor-shell")).toBeInTheDocument();
      expect(screen.getByTestId("research-home")).toBeInTheDocument();
      expect(screen.queryByText("Sign in to access nonprofit research")).not.toBeInTheDocument();
    });
  });
});
