/**
 * @file Tests BulkUploadPanel CSV validation feedback.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn(async () => "test-token") },
}));

import { BulkUploadPanel } from "@/src/features/standalone-evaluation/components/BulkUploadPanel";

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const wrapper =
  (qc: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

function makeFile(content: string, name = "apps.csv") {
  return new File([content], name, { type: "text/csv" });
}

describe("BulkUploadPanel", () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = buildClient();
    vi.clearAllMocks();
  });
  afterEach(() => qc.clear());

  it("rejects a CSV with no data rows", async () => {
    const Wrapper = wrapper(qc);
    render(
      <Wrapper>
        <BulkUploadPanel sessionId="s-1" />
      </Wrapper>
    );

    const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const csv = "name,foo\n";
    await userEvent.upload(fileInput, makeFile(csv));

    await waitFor(() =>
      expect(
        screen.getByText(/CSV must include a header row and at least one application/i)
      ).toBeInTheDocument()
    );
  });

  it("accepts a CSV with arbitrary column names", async () => {
    const Wrapper = wrapper(qc);
    render(
      <Wrapper>
        <BulkUploadPanel sessionId="s-1" />
      </Wrapper>
    );

    const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
    const csv =
      "Project name,Abstract\nFoo,This is a long-enough abstract for parsing.\nBar,Another abstract\n";
    await userEvent.upload(fileInput, makeFile(csv));

    await waitFor(() => expect(screen.getByText(/applications detected/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Start bulk evaluation/i })).toBeEnabled();
  });
});
