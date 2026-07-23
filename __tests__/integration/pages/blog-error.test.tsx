/**
 * @file Error-boundary behavior for the blog routes: app/blog/error.tsx
 * (BlogError) and app/blog/[slug]/error.tsx (BlogPostError). These are
 * client components Next.js mounts on a render throw, so they're exercised
 * directly here rather than via the page integration tests.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { errorManager } from "@/components/Utilities/errorManager";
import { PAGES } from "@/utilities/pages";

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockErrorManager = vi.mocked(errorManager);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app/blog/error.tsx (BlogError)", () => {
  it("renders the error heading and copy, reports via errorManager, and links back home", async () => {
    const { default: BlogError } = await import("@/app/blog/error");
    const error = Object.assign(new Error("boom"), { digest: "DIGEST_1" });
    const reset = vi.fn();

    render(<BlogError error={error} reset={reset} />);

    expect(screen.getByRole("heading", { name: "We couldn't load the blog" })).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong while fetching posts. This is usually temporary.")
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: "Back to home" });
    expect(backLink).toHaveAttribute("href", PAGES.HOME);

    expect(mockErrorManager).toHaveBeenCalledWith("Failed to load blog index", error);
  });

  it("invokes reset when Try again is clicked", async () => {
    const { default: BlogError } = await import("@/app/blog/error");
    const error = Object.assign(new Error("boom"), { digest: undefined });
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<BlogError error={error} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("app/blog/[slug]/error.tsx (BlogPostError)", () => {
  it("renders the error heading and copy, reports via errorManager, and links back to the blog index", async () => {
    const { default: BlogPostError } = await import("@/app/blog/[slug]/error");
    const error = Object.assign(new Error("boom"), { digest: "DIGEST_2" });
    const reset = vi.fn();

    render(<BlogPostError error={error} reset={reset} />);

    expect(screen.getByRole("heading", { name: "We couldn't load this post" })).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong while fetching this post. This is usually temporary.")
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: "Back to blog" });
    expect(backLink).toHaveAttribute("href", PAGES.BLOG);

    expect(mockErrorManager).toHaveBeenCalledWith("Failed to load blog post", error);
  });

  it("invokes reset when Try again is clicked", async () => {
    const { default: BlogPostError } = await import("@/app/blog/[slug]/error");
    const error = Object.assign(new Error("boom"), { digest: undefined });
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<BlogPostError error={error} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
