import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren, ReactNode } from "react";
import type { MockedFunction } from "vitest";
import { TelegramPairChatModal } from "@/components/Pages/Admin/TelegramPairChatModal";
import fetchData from "@/utilities/fetchData";
import "@testing-library/jest-dom";

vi.mock("@/utilities/fetchData");

// Flatten Radix Dialog so children render straight into the DOM. Props are
// PropsWithChildren rather than `any`, with className narrowed where Radix
// would normally pass it through. (Avoids `any` per CLAUDE.md.)
type DialogStubProps = PropsWithChildren<{ open?: boolean }>;
type DialogStyledProps = PropsWithChildren<{ className?: string }>;
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: DialogStubProps) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: DialogStyledProps) => (
    <div data-testid="dialog-panel" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, className }: DialogStyledProps) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
}));

// Avoid noisy toasts in tests
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFetchData = fetchData as MockedFunction<typeof fetchData>;

describe("TelegramPairChatModal", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("renders nothing when closed", () => {
    render(<TelegramPairChatModal communitySlug="filecoin" open={false} onOpenChange={vi.fn()} />, {
      wrapper,
    });
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("starts a pairing session and displays the /karma-pair command + countdown when opened", async () => {
    const futureIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // `/start` returns the token; any subsequent `/verify` poll returns 422
    // (pending — bot hasn't claimed yet) so the polling loop stays quiet.
    mockFetchData.mockImplementation(async (url: string) => {
      if (url.includes("/telegram-pair/start")) {
        return [{ token: "KARMA-PAIR-ab3f9k", expiresAt: futureIso }, null, null, 200];
      }
      return [null, "pending", null, 422];
    });

    render(<TelegramPairChatModal communitySlug="filecoin" open={true} onOpenChange={vi.fn()} />, {
      wrapper,
    });

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Pair a Telegram chat/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("telegram-pair-command")).toHaveTextContent(
        "/karma-pair KARMA-PAIR-ab3f9k"
      );
    });

    // Countdown is rendered in m:ss format
    expect(screen.getByTestId("telegram-pair-countdown").textContent).toMatch(/^\d+:\d{2}$/);

    // Polling indicator replaces the old "Verify now" CTA
    expect(screen.getByRole("status")).toHaveTextContent(/Waiting for the bot/i);

    // Pairing /start was hit
    expect(mockFetchData).toHaveBeenCalledWith(
      expect.stringContaining("/v2/community-configs/filecoin/telegram-pair/start"),
      "POST",
      {},
      {},
      {},
      true
    );
  });
});
