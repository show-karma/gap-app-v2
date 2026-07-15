/**
 * Tests for app/projects/error.tsx — the /projects route client error boundary.
 *
 * Covers the shared RouteErrorBoundary contract: accessible recovery UI, error
 * digest display, a reset action, and a home link.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectsError from "@/app/projects/error";
import { renderWithProviders } from "../utils/render";

vi.mock("lucide-react", () => ({
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-icon" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg data-testid="refresh-icon" className={className} />
  ),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ProjectsError boundary", () => {
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible error heading and recovery message", () => {
    const error = Object.assign(new Error("boom"), { digest: undefined });
    renderWithProviders(
      <ProjectsError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/please try again/i)).toBeInTheDocument();
  });

  it("calls reset when the Try again button is activated", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("boom"), { digest: undefined });
    renderWithProviders(
      <ProjectsError error={error as Error & { digest?: string }} reset={reset} />
    );

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("shows the error digest when present and omits it when absent", () => {
    const withDigest = Object.assign(new Error("boom"), { digest: "ERR_PROJECTS_1" });
    const { unmount } = renderWithProviders(<ProjectsError error={withDigest} reset={reset} />);
    expect(screen.getByText(/ERR_PROJECTS_1/)).toBeInTheDocument();
    unmount();

    const noDigest = Object.assign(new Error("boom"), { digest: undefined });
    renderWithProviders(
      <ProjectsError error={noDigest as Error & { digest?: string }} reset={reset} />
    );
    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("renders a home recovery link", () => {
    const error = Object.assign(new Error("boom"), { digest: undefined });
    renderWithProviders(
      <ProjectsError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByText(/go home/i).closest("a")).toHaveAttribute("href", "/");
  });
});
