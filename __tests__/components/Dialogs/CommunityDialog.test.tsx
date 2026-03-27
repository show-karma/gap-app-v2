import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";

jest.mock("@headlessui/react", () => {
  const React = require("react");

  const TRANSITION_PROPS = [
    "appear",
    "show",
    "enter",
    "enterFrom",
    "enterTo",
    "leave",
    "leaveFrom",
    "leaveTo",
    "entered",
    "beforeEnter",
    "afterEnter",
    "beforeLeave",
    "afterLeave",
  ];

  const MockDialog = ({ children, onClose, ...props }: any) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  );
  MockDialog.Title = ({ children, as, ...props }: any) => {
    const Component = as || "h3";
    return <Component {...props}>{children}</Component>;
  };

  const MockTransitionRoot = ({ show, children, as, ...props }: any) => {
    if (!show) return null;
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) acc[key] = props[key];
      return acc;
    }, {} as any);
    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionRoot.Child = ({ children, ...props }: any) => {
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) acc[key] = props[key];
      return acc;
    }, {} as any);
    return <div {...filteredProps}>{children}</div>;
  };

  return { Dialog: MockDialog, Transition: MockTransitionRoot, Fragment: React.Fragment };
});

jest.mock("@heroicons/react/24/solid", () => ({
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  ChevronRightIcon: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

const mockFetchData = jest.fn();
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: (...args: any[]) => mockFetchData(...args),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, login: jest.fn() }),
}));

jest.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
  gapSupportedNetworks: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
}));

jest.mock("@/utilities/messages", () => ({
  MESSAGES: {
    COMMUNITY_FORM: {
      TITLE: { MIN: "Min 3 chars", MAX: "Max 50 chars" },
      SLUG: "Min 3 chars",
      IMAGE_URL: "Required",
    },
  },
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));
jest.mock("@/components/Utilities/errorManager", () => ({ errorManager: jest.fn() }));
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));

describe("CommunityDialog", () => {
  const mockRefreshCommunities = jest.fn().mockResolvedValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchData.mockResolvedValue([{ uid: "0xnew", chainID: 10 }, null, null, 201]);
  });

  describe("Rendering", () => {
    it("should render trigger button", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      expect(screen.getByText("New Community")).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should open dialog on click", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should display form fields", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));
      expect(screen.getByPlaceholderText('e.g. "My awesome Community"')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. "grant-portal"')).toBeInTheDocument();
    });

    it("should close dialog on cancel", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Success flow", () => {
    it("should call API and show success toast", async () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));

      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test Community" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test-slug" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          "/v2/communities",
          "POST",
          expect.objectContaining({ name: "Test Community", slug: "test-slug" }),
          {},
          {},
          true
        );
      });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Community created successfully!");
      });
    });
  });

  describe("Error handling", () => {
    it("should show error toast on API failure", async () => {
      mockFetchData.mockResolvedValue([null, "Server error", null, 500]);

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));

      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test-slug" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Failed to create community. Please try again."
        );
      });
    });

    it("should show community limit toast on 403", async () => {
      mockFetchData.mockResolvedValue([null, "Community limit reached", null, 403]);

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));

      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test-slug" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "You've reached the free tier limit of 1 community. Contact us to upgrade.",
          { duration: 10000 }
        );
      });
    });

    it("should show slug exists toast", async () => {
      mockFetchData.mockResolvedValue([
        null,
        'Community with slug "test" already exists',
        null,
        409,
      ]);

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));

      fireEvent.change(screen.getByPlaceholderText('e.g. "My awesome Community"'), {
        target: { value: "Test" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'), {
        target: { value: "https://img.com/a.png" },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. "grant-portal"'), {
        target: { value: "test" },
      });

      fireEvent.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "A community with this slug already exists. Please choose a different slug."
        );
      });
    });
  });

  describe("Form reset", () => {
    it("should reset form when reopened after cancel", async () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      fireEvent.click(screen.getByText("New Community"));

      const nameInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Some Name" } });

      fireEvent.click(screen.getByText("Cancel"));
      fireEvent.click(screen.getByText("New Community"));

      const freshInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      expect(freshInput.value).toBe("");
    });
  });
});
