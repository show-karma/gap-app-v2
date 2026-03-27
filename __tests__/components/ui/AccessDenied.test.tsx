import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockPush = vi.fn();
const mockLogin = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// lucide-react icons need to be mocked in jsdom
vi.mock("lucide-react", () => ({
  AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="alert-icon" {...props} />
  ),
  LogIn: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="login-icon" {...props} />,
}));

import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/src/components/ui/AccessDenied";

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when not authenticated", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("renders with default title and message", () => {
      render(<AccessDenied />);
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.getByText("You don't have permission to view this page.")).toBeInTheDocument();
    });

    it("shows Sign In button when not authenticated", () => {
      render(<AccessDenied />);
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("calls login() when Sign In button is clicked", () => {
      render(<AccessDenied />);
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it("does NOT use window.location.href for navigation", () => {
      const locationSpy = vi.spyOn(window, "location", "get");
      render(<AccessDenied />);
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
      // window.location.href should never be set
      expect(locationSpy).not.toHaveBeenCalled();
      locationSpy.mockRestore();
    });
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("shows Go to Home button when authenticated", () => {
      render(<AccessDenied />);
      expect(screen.getByRole("button", { name: /go to home/i })).toBeInTheDocument();
    });

    it("navigates to default returnUrl ('/') when button clicked", () => {
      render(<AccessDenied />);
      fireEvent.click(screen.getByRole("button", { name: /go to home/i }));
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("uses custom returnUrl when provided", () => {
      render(<AccessDenied returnUrl="/dashboard" />);
      fireEvent.click(screen.getByRole("button", { name: /go to home/i }));
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("does NOT use window.location.href for navigation", () => {
      const locationSpy = vi.spyOn(window, "location", "get");
      render(<AccessDenied returnUrl="/dashboard" />);
      fireEvent.click(screen.getByRole("button", { name: /go to home/i }));
      expect(locationSpy).not.toHaveBeenCalled();
      locationSpy.mockRestore();
    });
  });

  describe("custom props", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("renders custom title", () => {
      render(<AccessDenied title="Forbidden" />);
      expect(screen.getByText("Forbidden")).toBeInTheDocument();
    });

    it("renders custom message", () => {
      render(<AccessDenied message="You need admin privileges." />);
      expect(screen.getByText("You need admin privileges.")).toBeInTheDocument();
    });
  });
});
