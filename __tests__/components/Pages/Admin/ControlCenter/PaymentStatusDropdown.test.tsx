import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentStatusDropdown } from "@/components/Pages/Admin/ControlCenter/PaymentStatusDropdown";
import type { MilestonePaymentStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";

// Mock the payout-disbursement hook
const mockMutate = vi.fn();
vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  useUpdateMilestonePaymentStatus: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// Mock Radix dropdown primitives for jsdom
vi.mock("@radix-ui/react-dropdown-menu", () => {
  const React = require("react");
  return {
    Root: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      const [isOpen, setIsOpen] = React.useState(open ?? false);
      const handleOpenChange = (v: boolean) => {
        setIsOpen(v);
        onOpenChange?.(v);
      };
      return (
        <div data-testid="dropdown-root" data-open={isOpen}>
          {React.Children.map(children, (child: React.ReactElement) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child, {
              _isOpen: isOpen,
              _setOpen: handleOpenChange,
            } as Record<string, unknown>);
          })}
        </div>
      );
    },
    Trigger: ({
      children,
      asChild,
      _setOpen,
      ...props
    }: {
      children: React.ReactNode;
      asChild?: boolean;
      _setOpen?: (open: boolean) => void;
    }) => (
      <button {...props} data-testid="dropdown-trigger" onClick={() => _setOpen?.(true)}>
        {children}
      </button>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({
      children,
      _isOpen,
      ...props
    }: {
      children: React.ReactNode;
      _isOpen?: boolean;
      className?: string;
      side?: string;
      align?: string;
    }) =>
      _isOpen ? (
        <div data-testid="dropdown-content" role="menu" {...props}>
          {children}
        </div>
      ) : null,
    Item: ({
      children,
      onSelect,
      disabled,
      ...props
    }: {
      children: React.ReactNode;
      onSelect?: () => void;
      disabled?: boolean;
      className?: string;
    }) => (
      <button
        role="menuitem"
        onClick={() => {
          if (!disabled) onSelect?.();
        }}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    ),
    Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Sub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Label: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <div {...props}>{children}</div>
    ),
    Separator: (props: { className?: string }) => <hr {...props} />,
    ShortcutKeys: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

// Mock Radix dialog for jsdom
vi.mock("@radix-ui/react-dialog", () => {
  const React = require("react");
  return {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div data-testid="dialog-root">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: ({ children, ...props }: { children?: React.ReactNode; className?: string }) => (
      <div {...props}>{children}</div>
    ),
    Content: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <div role="dialog" {...props}>
        {children}
      </div>
    ),
    Title: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <h2 {...props}>{children}</h2>
    ),
    Description: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <p {...props}>{children}</p>
    ),
    Close: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <button {...props}>{children}</button>
    ),
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock Radix tooltip for jsdom
vi.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <span {...props}>{children}</span>
  ),
  Content: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div {...props}>{children}</div>,
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const defaultProps = {
  currentStatus: "unpaid" as MilestonePaymentStatus,
  milestoneLabel: "Milestone 1",
  grantUID: "grant-123",
  communityUID: "community-456",
};

describe("PaymentStatusDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the current payment status as a clickable badge", () => {
    renderWithProviders(<PaymentStatusDropdown {...defaultProps} />);

    const trigger = screen.getByTestId("dropdown-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Unpaid");
  });

  it("should show all status options when clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentStatusDropdown {...defaultProps} />);

    await user.click(screen.getByTestId("dropdown-trigger"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    expect(screen.getByRole("menuitem", { name: /Unpaid/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Pending/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Awaiting sigs/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Disbursed/i })).toBeInTheDocument();
  });

  it("should disable the currently selected status option", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentStatusDropdown {...defaultProps} currentStatus="pending" />);

    await user.click(screen.getByTestId("dropdown-trigger"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const pendingItem = screen.getByRole("menuitem", { name: /Pending/i });
    expect(pendingItem).toBeDisabled();
  });

  it("should call mutation when selecting a new status", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentStatusDropdown {...defaultProps} />);

    await user.click(screen.getByTestId("dropdown-trigger"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("menuitem", { name: /Pending/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        grantUID: "grant-123",
        milestoneLabel: "Milestone 1",
        paymentStatus: "pending",
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("should call onRequestRecordPayment callback for disbursed status (not mutate directly)", async () => {
    const user = userEvent.setup();
    const mockOnRequestRecordPayment = vi.fn();
    renderWithProviders(
      <PaymentStatusDropdown
        {...defaultProps}
        onRequestRecordPayment={mockOnRequestRecordPayment}
      />
    );

    await user.click(screen.getByTestId("dropdown-trigger"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("menuitem", { name: /Disbursed/i }));

    // Should NOT call mutate directly — delegates to onRequestRecordPayment
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockOnRequestRecordPayment).toHaveBeenCalledWith("Milestone 1", "disbursed");
  });

  it("should show confirmation dialog for unpaid status when disbursement exists", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentStatusDropdown {...defaultProps} currentStatus="disbursed" />);

    await user.click(screen.getByTestId("dropdown-trigger"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("menuitem", { name: /Unpaid/i }));

    // Should NOT call mutate directly - should show confirmation first
    expect(mockMutate).not.toHaveBeenCalled();

    // Confirmation dialog should be shown
    await waitFor(() => {
      expect(screen.getByText(/Mark as unpaid/i)).toBeInTheDocument();
    });
  });

  it("should render with disbursed status showing green indicator", () => {
    renderWithProviders(<PaymentStatusDropdown {...defaultProps} currentStatus="disbursed" />);

    const trigger = screen.getByTestId("dropdown-trigger");
    expect(trigger).toHaveTextContent("Disbursed");
  });

  it("should render with awaiting_signatures status", () => {
    renderWithProviders(
      <PaymentStatusDropdown {...defaultProps} currentStatus="awaiting_signatures" />
    );

    const trigger = screen.getByTestId("dropdown-trigger");
    expect(trigger).toHaveTextContent("Awaiting sigs");
  });
});
