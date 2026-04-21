import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MilestonesSection,
  type MilestonesSectionProps,
} from "@/components/Pages/Admin/ControlCenter/MilestonesSection";
import type { ProjectDetailsSidebarGrant } from "@/components/Pages/Admin/ControlCenter/ProjectDetailsSidebar";
import {
  type CommunityPayoutInvoiceInfo,
  MilestoneLifecycleStatus,
} from "@/src/features/payout-disbursement";

// Mock heavy dependencies
const { captureFileUploadProps } = vi.hoisted(() => ({
  captureFileUploadProps: vi.fn(),
}));

vi.mock("@/components/Utilities/FileUpload", () => ({
  FileUpload: (props: Record<string, unknown>) => {
    captureFileUploadProps(props);
    return <div data-testid="file-upload">FileUpload</div>;
  },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      MILESTONE_INVOICES: {
        PRESIGNED_URL: () => "/mock-presigned-url",
        UPDATE_PAYMENT_STATUS: () => "/mock-update-payment-status",
      },
    },
  },
}));

vi.mock("@/src/features/payout-disbursement", async () => {
  const actual = await vi.importActual<typeof import("@/src/features/payout-disbursement")>(
    "@/src/features/payout-disbursement"
  );
  return {
    ...actual,
    getInvoiceDownloadUrl: vi.fn().mockResolvedValue("https://s3.example.com/invoice.pdf"),
    formatDisplayAmount: (amount: string) => amount,
    useUpdateMilestonePaymentStatus: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock("@/components/Pages/Admin/ControlCenter/PaymentStatusDropdown", () => ({
  PaymentStatusDropdown: ({ status }: { status: string }) => (
    <span data-testid="payment-status-dropdown">{status}</span>
  ),
}));

function createMockInvoice(
  overrides: Partial<CommunityPayoutInvoiceInfo> = {}
): CommunityPayoutInvoiceInfo {
  return {
    milestoneLabel: "Untitled milestone",
    milestoneUID: null,
    milestoneStatus: MilestoneLifecycleStatus.PENDING,
    milestoneStatusUpdatedAt: null,
    milestoneDueDate: null,
    paymentStatus: "unpaid",
    paymentStatusDate: null,
    allocatedAmount: null,
    invoiceReceivedAt: null,
    invoiceReceivedBy: null,
    invoiceFileKey: null,
    ...overrides,
  };
}

describe("MilestonesSection", () => {
  const mockGrant: ProjectDetailsSidebarGrant = {
    grantUid: "grant-1",
    projectUid: "project-1",
    projectName: "Test Project",
    projectSlug: "test-project",
    grantName: "Test Grant",
    grantProgramId: "program-1",
    grantChainId: 10,
    projectChainId: 10,
    currency: "USDC",
  } as unknown as ProjectDetailsSidebarGrant;

  const defaultProps: MilestonesSectionProps = {
    grant: mockGrant,
    communityUID: "community-1",
    milestoneInvoices: [],
    invoiceRequired: false,
    canEditInvoices: true,
    milestoneEdits: {},
    pendingFiles: {},
    allocationByUID: new Map(),
    todayLocal: "2026-03-31",
    getMilestoneKey: (_inv: CommunityPayoutInvoiceInfo, idx: number) => `key-${idx}`,
    getInvoiceReceivedDate: () => null,
    handleInvoiceReceivedDateChange: vi.fn(),
    onFileUploaded: vi.fn(),
    removedFiles: new Set(),
    onFileRemoved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prepend milestone index numbering to milestone labels", () => {
    const invoices = [
      createMockInvoice({ milestoneLabel: "Design phase", milestoneUID: "ms-1" }),
      createMockInvoice({ milestoneLabel: "Build prototype", milestoneUID: "ms-2" }),
      createMockInvoice({ milestoneLabel: "Final delivery", milestoneUID: "ms-3" }),
    ];

    render(<MilestonesSection {...defaultProps} milestoneInvoices={invoices} />);

    expect(screen.getByText("Milestone 1: Design phase")).toBeInTheDocument();
    expect(screen.getByText("Milestone 2: Build prototype")).toBeInTheDocument();
    expect(screen.getByText("Milestone 3: Final delivery")).toBeInTheDocument();
  });

  it("should not double-prefix labels that already have milestone numbering", () => {
    const invoices = [
      createMockInvoice({ milestoneLabel: "Milestone 1: Design", milestoneUID: "ms-1" }),
    ];

    render(<MilestonesSection {...defaultProps} milestoneInvoices={invoices} />);

    expect(screen.getByText("Milestone 1: Design")).toBeInTheDocument();
    expect(screen.queryByText("Milestone 1: Milestone 1: Design")).not.toBeInTheDocument();
  });

  it("should show empty state when no milestones", () => {
    render(<MilestonesSection {...defaultProps} milestoneInvoices={[]} />);

    expect(screen.getByText("No milestones configured yet.")).toBeInTheDocument();
  });

  it("should include grantUID in presigned URL payload when Attach file modal opens", async () => {
    const invoice = createMockInvoice({
      milestoneLabel: "Delivery",
      milestoneUID: "ms-1",
    });

    render(
      <MilestonesSection {...defaultProps} invoiceRequired={true} milestoneInvoices={[invoice]} />
    );

    await userEvent.click(screen.getByRole("button", { name: /attach file/i }));

    expect(captureFileUploadProps).toHaveBeenCalled();
    const props = captureFileUploadProps.mock.calls.at(-1)?.[0] as {
      presignedUrlPayload?: (file: File) => Record<string, unknown>;
    };

    expect(props.presignedUrlPayload).toBeTypeOf("function");

    const mockFile = new File(["pdf content"], "invoice.pdf", { type: "application/pdf" });
    const payload = props.presignedUrlPayload?.(mockFile);

    expect(payload).toEqual({
      grantUID: "grant-1",
      fileName: "invoice.pdf",
      fileType: "application/pdf",
      fileSize: mockFile.size,
    });
  });

  it("should hide Attach file button when canEditInvoices is false", () => {
    const invoice = createMockInvoice({ milestoneLabel: "Delivery", milestoneUID: "ms-1" });

    render(
      <MilestonesSection
        {...defaultProps}
        invoiceRequired={true}
        canEditInvoices={false}
        milestoneInvoices={[invoice]}
      />
    );

    expect(screen.queryByRole("button", { name: /attach file/i })).not.toBeInTheDocument();
  });

  it("should hide Remove invoice button when canEditInvoices is false but still show View invoice", async () => {
    const invoice = createMockInvoice({
      milestoneLabel: "Delivery",
      milestoneUID: "ms-1",
      invoiceFileKey: "logos/invoices/grant-1/1700000000000.pdf",
    });

    render(
      <MilestonesSection
        {...defaultProps}
        invoiceRequired={true}
        canEditInvoices={false}
        milestoneInvoices={[invoice]}
      />
    );

    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove invoice file/i })).not.toBeInTheDocument();
  });

  it("should render received date as read-only text when canEditInvoices is false", () => {
    const invoice = createMockInvoice({
      milestoneLabel: "Delivery",
      milestoneUID: "ms-1",
      invoiceReceivedAt: "2026-04-01T00:00:00.000Z",
    });

    render(
      <MilestonesSection
        {...defaultProps}
        invoiceRequired={true}
        canEditInvoices={false}
        milestoneInvoices={[invoice]}
        getInvoiceReceivedDate={() => "2026-04-01"}
      />
    );

    // Date picker input is absent
    const dateInputs = screen
      .queryAllByLabelText(/invoice received date/i)
      .filter((el) => el.tagName === "INPUT");
    expect(dateInputs).toHaveLength(0);
  });

  it("should show Attach file button when canEditInvoices is true", () => {
    const invoice = createMockInvoice({ milestoneLabel: "Delivery", milestoneUID: "ms-1" });

    render(
      <MilestonesSection
        {...defaultProps}
        invoiceRequired={true}
        canEditInvoices={true}
        milestoneInvoices={[invoice]}
      />
    );

    expect(screen.getByRole("button", { name: /attach file/i })).toBeInTheDocument();
  });

  it("should call getInvoiceDownloadUrl with grantUid when View invoice is clicked", async () => {
    const { getInvoiceDownloadUrl } = await import("@/src/features/payout-disbursement");
    const mockDownload = vi.mocked(getInvoiceDownloadUrl);

    const invoice = createMockInvoice({
      milestoneLabel: "Delivery",
      milestoneUID: "ms-1",
      invoiceFileKey: "logos/invoices/grant-1/1700000000000.pdf",
    });

    render(
      <MilestonesSection {...defaultProps} invoiceRequired={true} milestoneInvoices={[invoice]} />
    );

    await userEvent.click(screen.getByRole("button", { name: /view invoice/i }));

    expect(mockDownload).toHaveBeenCalledWith(
      "grant-1",
      "logos/invoices/grant-1/1700000000000.pdf"
    );
  });
});
