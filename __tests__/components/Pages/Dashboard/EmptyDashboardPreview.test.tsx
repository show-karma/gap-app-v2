import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyDashboardPreview } from "@/components/Pages/Dashboard/EmptyDashboardPreview";

// SoftShell resolves the signed-in user via auth hooks; stub it to a passthrough
// so the preview renders without a session.
vi.mock("@/components/Pages/Dashboard/v3/SoftShell", () => ({
  SoftShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The "Create a project" card renders the lazy ProjectDialog; stub to a button.
vi.mock("@/components/Dialogs/ProjectDialog/index", () => ({
  ProjectDialog: ({ buttonElement }: { buttonElement: { text: string } }) => (
    <button type="button">{buttonElement.text}</button>
  ),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Render motion elements/AnimatePresence synchronously (jsdom has no layout
// engine). Scoped here rather than globally so it can't mask motion behavior
// in other suites.
vi.mock("motion/react", () => import("@/__tests__/helpers/motion-mock"));

describe("EmptyDashboardPreview", () => {
  it("renders the getting-started cards, including Review applications", () => {
    render(<EmptyDashboardPreview />);

    expect(screen.getByText("Get started with Karma")).toBeInTheDocument();
    expect(screen.getByText("Create a project")).toBeInTheDocument();
    expect(screen.getByText("Apply for funding")).toBeInTheDocument();
    expect(screen.getByText("Explore communities")).toBeInTheDocument();
    expect(screen.getByText("Review applications")).toBeInTheDocument();
    expect(screen.getByText("Find funders")).toBeInTheDocument();
  });
});
