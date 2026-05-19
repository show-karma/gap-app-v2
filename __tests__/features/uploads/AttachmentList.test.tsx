/**
 * @file Tests for AttachmentList component.
 *
 * The critical path is the authenticated download: clicking the download
 * button should trigger an axios GET with the blob response type, create
 * a blob URL, and revoke the URL after the download completes.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mock createAuthenticatedApiClient ───────────────────────────────────────
// Use vi.hoisted so the factory can reference the mock variable safely.
const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({
    get: mockGet,
  }),
}));

import type { AIAgentUploadSummary } from "@/lib/ai-agent-client";
// ─── Import component AFTER mocks ────────────────────────────────────────────
import { AttachmentList } from "@/src/features/uploads/AttachmentList";

const files: AIAgentUploadSummary[] = [
  {
    sha256: "a".repeat(64),
    filename: "report.pdf",
    mime: "application/pdf",
    size: 2048,
  },
];

const downloadUrl = (sha256: string) => `/api/v2/hermes/files/${sha256}`;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AttachmentList", () => {
  it("renders empty label when files list is empty", () => {
    render(<AttachmentList files={[]} downloadUrl={downloadUrl} emptyLabel="No files yet" />);
    expect(screen.getByText("No files yet")).toBeInTheDocument();
  });

  it("renders the file name and download button for each file", () => {
    render(<AttachmentList files={files} downloadUrl={downloadUrl} />);
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download report\.pdf/i })).toBeInTheDocument();
  });

  it("download click triggers authenticated GET and creates a blob URL", async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(["pdf-content"], { type: "application/pdf" });
    mockGet.mockResolvedValue({ data: mockBlob });

    const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
    const mockRevokeObjectURL = vi.fn();
    const anchorClickSpy = vi.fn();

    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Intercept only the anchor click to avoid breaking jsdom's document.body
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string, ...args) => {
      const el = realCreateElement(tag, ...(args as []));
      if (tag === "a") {
        el.click = anchorClickSpy;
      }
      return el;
    });

    render(<AttachmentList files={files} downloadUrl={downloadUrl} />);

    const downloadBtn = screen.getByRole("button", { name: /download report\.pdf/i });
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        downloadUrl("a".repeat(64)),
        expect.objectContaining({ responseType: "blob" })
      );
    });

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(anchorClickSpy).toHaveBeenCalled();
    });

    // The revoke is deferred via setTimeout(100ms); wait for it in real timer land
    await waitFor(
      () => {
        expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
      },
      { timeout: 500 }
    );
  });

  it("renders delete button when onDelete is provided and calls it on click", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<AttachmentList files={files} downloadUrl={downloadUrl} onDelete={onDelete} />);

    const deleteBtn = screen.getByRole("button", { name: /remove report\.pdf/i });
    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith("a".repeat(64));
  });
});
