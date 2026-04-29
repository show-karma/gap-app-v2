import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AddSourceDialog } from "@/components/Pages/Admin/KnowledgeBasePage/AddSourceDialog";
import { useCreateKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import "@testing-library/jest-dom";

// Stub the create mutation so the dialog stays a pure-render surface here.

vi.mock("@/hooks/knowledge-base/useKnowledgeSourceMutations", () => ({
  useCreateKnowledgeSource: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCreate = useCreateKnowledgeSource as ReturnType<typeof vi.fn>;

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function openDialog(initialKind?: "sitemap" | "url" | "gdrive_file" | "pdf_url") {
  return render(
    <AddSourceDialog
      communityIdOrSlug="filecoin"
      open={true}
      onOpenChange={vi.fn()}
      initialKind={initialKind}
    />,
    { wrapper: Wrapper }
  );
}

describe("AddSourceDialog", () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({});
    mockCreate.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("exposes the Sitemap kind in the kind picker", () => {
    openDialog();
    // The kind labels come from the shared map, so matching exact label
    // text guards against accidental relabeling that would orphan
    // existing screenshots / docs.
    expect(screen.getByRole("radio", { name: /Sitemap/i })).toBeInTheDocument();
  });

  it("submits a sitemap source with the URL the admin pastes", async () => {
    openDialog("sitemap");

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Filecoin docs" },
    });
    fireEvent.change(screen.getByLabelText(/Sitemap URL/i), {
      target: { value: "https://docs.filecoin.io/sitemap.xml" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add source/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
    // followLinks must NOT be sent for sitemap — it's a gdrive_file-only
    // toggle. Sending true on any other kind earns a 422 server-side, and
    // sending false would just bloat the payload.
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "sitemap",
        externalId: "https://docs.filecoin.io/sitemap.xml",
        title: "Filecoin docs",
      })
    );
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.followLinks).toBeUndefined();
  });

  it("hides the follow-links toggle when the kind is sitemap", () => {
    openDialog("sitemap");
    expect(screen.queryByText(/Follow links to other Google Docs/i)).not.toBeInTheDocument();
  });

  it("shows the follow-links toggle for gdrive_file (existing DEV-192 behavior unchanged)", () => {
    openDialog("gdrive_file");
    expect(screen.getByText(/Follow links to other Google Docs/i)).toBeInTheDocument();
  });
});
