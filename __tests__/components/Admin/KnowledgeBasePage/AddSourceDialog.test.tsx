import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { AddSourceDialog } from "@/components/Pages/Admin/KnowledgeBasePage/AddSourceDialog";
import { useCreateKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import "@testing-library/jest-dom";

// DEV-342: coverage for the Citation link field — visibility per kind and
// its presence in the create payload. The mutation hook is mocked; we
// assert what `mutateAsync` receives.

vi.mock("@/hooks/knowledge-base/useKnowledgeSourceMutations", () => ({
  useCreateKnowledgeSource: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const mockCreate = useCreateKnowledgeSource as ReturnType<typeof vi.fn>;

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderDialog() {
  return render(
    <AddSourceDialog communityIdOrSlug="filecoin" open onOpenChange={() => undefined} />,
    { wrapper: Wrapper }
  );
}

describe("AddSourceDialog citation URL (DEV-342)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the citation link field for the default gdrive_file kind", () => {
    mockCreate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    renderDialog();

    expect(screen.getByLabelText(/citation link/i)).toBeInTheDocument();
  });

  it("hides the citation link field when a non-Google-Doc kind is selected", async () => {
    mockCreate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    renderDialog();

    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /web page/i }));

    expect(screen.queryByLabelText(/citation link/i)).not.toBeInTheDocument();
  });

  it("includes citationUrl in the create payload when filled for a Google Doc", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    mockCreate.mockReturnValue({ mutateAsync, isPending: false });
    renderDialog();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^title$/i), "Handbook");
    await user.type(
      screen.getByLabelText(/google doc url or id/i),
      "https://docs.google.com/document/d/abc/edit"
    );
    await user.type(screen.getByLabelText(/citation link/i), "https://public.example.com/handbook");
    await user.click(screen.getByRole("button", { name: /add source/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "gdrive_file",
          citationUrl: "https://public.example.com/handbook",
        })
      );
    });
  });

  it("omits citationUrl when the field is left empty", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    mockCreate.mockReturnValue({ mutateAsync, isPending: false });
    renderDialog();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^title$/i), "Handbook");
    await user.type(
      screen.getByLabelText(/google doc url or id/i),
      "https://docs.google.com/document/d/abc/edit"
    );
    await user.click(screen.getByRole("button", { name: /add source/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(mutateAsync.mock.calls[0][0].citationUrl).toBeUndefined();
  });
});
