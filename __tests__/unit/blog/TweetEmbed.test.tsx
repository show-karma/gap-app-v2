/**
 * @file `TweetEmbed` graceful-fallback behavior.
 *
 * `react-tweet` is lazy-loaded via `next/dynamic`; these tests assert the
 * fallback link renders whenever there's nothing to embed (missing id,
 * or the underlying `Tweet` fetch reporting not-found), never internal
 * `react-tweet` wiring.
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TweetEmbed } from "@/src/components/blog/TweetEmbed";

// Simulates react-tweet's own behavior when a tweet can't be fetched
// (deleted/protected/rate-limited): it renders the caller-supplied
// `TweetNotFound` override instead of the embed.
vi.mock("react-tweet", () => ({
  Tweet: ({
    components,
  }: {
    components?: { TweetNotFound?: (props: { error?: unknown }) => React.ReactNode };
  }) => {
    const NotFound = components?.TweetNotFound;
    return NotFound ? NotFound({ error: new Error("not found") }) : null;
  },
}));

describe("TweetEmbed", () => {
  it("renders a fallback link to X when the tweet id is missing", () => {
    render(<TweetEmbed />);

    expect(screen.getByRole("link", { name: /view post on x/i })).toHaveAttribute(
      "href",
      "https://x.com"
    );
  });

  it("shows a loading state before the lazy embed resolves", () => {
    render(<TweetEmbed tweetId="1234567890123456789" />);

    expect(screen.getByLabelText(/loading tweet/i)).toBeInTheDocument();
  });

  it("renders a fallback link to the specific tweet when the embed reports not-found (deleted tweet)", async () => {
    render(<TweetEmbed tweetId="1234567890123456789" />);

    const link = await screen.findByRole("link", { name: /view post on x/i });
    expect(link).toHaveAttribute("href", "https://x.com/i/status/1234567890123456789");
  });
});
