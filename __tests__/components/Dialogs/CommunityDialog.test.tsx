import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";

// Mock Headless UI Dialog components
vi.mock("@headlessui/react", () => {
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
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionRoot.displayName = "Transition";

  const MockTransitionChild = ({ children, as, ...props }: any) => {
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionChild.displayName = "Transition.Child";

  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

// Mock react-hot-toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

// Mock Heroicons
vi.mock("@heroicons/react/24/solid", () => ({
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  ChevronRightIcon: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

// Mock fetchData
const mockFetchData = vi.fn();
vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: (...args: any[]) => mockFetchData(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, login: vi.fn() }),
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
  gapSupportedNetworks: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
  ],
}));

vi.mock("@/utilities/messages", () => ({
  MESSAGES: {
    COMMUNITY_FORM: {
      TITLE: { MIN: "Too short", MAX: "Too long" },
      SLUG: "Slug required",
      IMAGE_URL: "Image URL required",
    },
  },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      V2: {
        SLUG_CHECK: (slug: string) => `/v2/communities/slug-check/${slug}`,
      },
    },
  },
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, isLoading, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

describe("CommunityDialog", () => {
  const mockRefreshCommunities = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: slug is available, API returns success with slug
    mockFetchData.mockImplementation((url: string) => {
      if (url.includes("slug-check")) {
        return Promise.resolve([{ available: true }, null, null, 200]);
      }
      return Promise.resolve([{ uid: "0xnew", slug: "test-slug", chainID: 10 }, null, null, 201]);
    });
  });

  describe("Rendering", () => {
    it("should render trigger button with default text", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      expect(screen.getByText("New Community")).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should open dialog when trigger button is clicked", async () => {
      const user = userEvent.setup();
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should display form fields", async () => {
      const user = userEvent.setup();
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      expect(screen.getByPlaceholderText('e.g. "My awesome Community"')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. "grant-portal"')).toBeInTheDocument();
    });

    it("should close dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));
      await user.click(screen.getByText("Cancel"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Success flow", () => {
    it("should call API and show success toast", async () => {
      const user = userEvent.setup();
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      await user.clear(screen.getByPlaceholderText('e.g. "My awesome Community"'));

      await user.type(screen.getByPlaceholderText('e.g. "My awesome Community"'), "Test Community");
      await user.clear(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'));

      await user.type(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'),
        "https://img.com/a.png"
      );
      await user.clear(screen.getByPlaceholderText('e.g. "grant-portal"'));

      await user.type(screen.getByPlaceholderText('e.g. "grant-portal"'), "test-slug");

      await user.click(screen.getByText("Create Community"));

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
      const user = userEvent.setup();
      mockFetchData.mockImplementation((url: string) => {
        if (url.includes("slug-check")) {
          return Promise.resolve([{ available: true }, null, null, 200]);
        }
        return Promise.resolve([null, "Server error", null, 500]);
      });

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      await user.clear(screen.getByPlaceholderText('e.g. "My awesome Community"'));

      await user.type(screen.getByPlaceholderText('e.g. "My awesome Community"'), "Test");
      await user.clear(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'));

      await user.type(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'),
        "https://img.com/a.png"
      );
      await user.clear(screen.getByPlaceholderText('e.g. "grant-portal"'));

      await user.type(screen.getByPlaceholderText('e.g. "grant-portal"'), "test-slug");

      await user.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Failed to create community. Please try again."
        );
      });
    });

    it("should show community limit toast on 403", async () => {
      const user = userEvent.setup();
      mockFetchData.mockImplementation((url: string) => {
        if (url.includes("slug-check")) {
          return Promise.resolve([{ available: true }, null, null, 200]);
        }
        return Promise.resolve([null, "Community limit reached", null, 403]);
      });

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      await user.clear(screen.getByPlaceholderText('e.g. "My awesome Community"'));

      await user.type(screen.getByPlaceholderText('e.g. "My awesome Community"'), "Test");
      await user.clear(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'));

      await user.type(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'),
        "https://img.com/a.png"
      );
      await user.clear(screen.getByPlaceholderText('e.g. "grant-portal"'));

      await user.type(screen.getByPlaceholderText('e.g. "grant-portal"'), "test-slug");

      await user.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "You've reached the free tier limit of 1 community. Contact us to upgrade.",
          { duration: 10000 }
        );
      });
    });

    it("should show slug exists toast", async () => {
      const user = userEvent.setup();
      mockFetchData.mockImplementation((url: string) => {
        if (url.includes("slug-check")) {
          return Promise.resolve([{ available: true }, null, null, 200]);
        }
        return Promise.resolve([null, 'Community with slug "test" already exists', null, 409]);
      });

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      await user.clear(screen.getByPlaceholderText('e.g. "My awesome Community"'));

      await user.type(screen.getByPlaceholderText('e.g. "My awesome Community"'), "Test");
      await user.clear(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'));

      await user.type(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'),
        "https://img.com/a.png"
      );
      await user.clear(screen.getByPlaceholderText('e.g. "grant-portal"'));

      await user.type(screen.getByPlaceholderText('e.g. "grant-portal"'), "test");

      await user.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "A community with this slug already exists. Please choose a different slug."
        );
      });
    });

    it("should show error toast when response has no slug", async () => {
      const user = userEvent.setup();
      mockFetchData.mockImplementation((url: string) => {
        if (url.includes("slug-check")) {
          return Promise.resolve([{ available: true }, null, null, 200]);
        }
        return Promise.resolve([{ uid: "0xnew", chainID: 10 }, null, null, 201]);
      });

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      await user.clear(screen.getByPlaceholderText('e.g. "My awesome Community"'));

      await user.type(screen.getByPlaceholderText('e.g. "My awesome Community"'), "Test");
      await user.clear(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'));

      await user.type(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'),
        "https://img.com/a.png"
      );
      await user.clear(screen.getByPlaceholderText('e.g. "grant-portal"'));

      await user.type(screen.getByPlaceholderText('e.g. "grant-portal"'), "test-slug");

      await user.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Community created but could not determine its URL. Check your dashboard."
        );
      });
    });
  });

  describe("Form data preservation on error", () => {
    it("should preserve form data when API call fails", async () => {
      const user = userEvent.setup();
      mockFetchData.mockImplementation((url: string) => {
        if (url.includes("slug-check")) {
          return Promise.resolve([{ available: true }, null, null, 200]);
        }
        return Promise.reject(new Error("Network error"));
      });

      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      const nameInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      await user.clear(nameInput);

      await user.type(nameInput, "Test Community");
      await user.clear(screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'));

      await user.type(
        screen.getByPlaceholderText('e.g. "https://example.com/image.jpg"'),
        "https://example.com/logo.png"
      );
      await user.clear(screen.getByPlaceholderText('e.g. "grant-portal"'));

      await user.type(screen.getByPlaceholderText('e.g. "grant-portal"'), "test-community");

      await user.click(screen.getByText("Create Community"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Failed to create community. Please try again."
        );
      });

      // Modal should still be visible with preserved data
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(nameInput.value).toBe("Test Community");
    });
  });

  describe("Form reset", () => {
    it("should reset form when reopened after cancel", async () => {
      const user = userEvent.setup();
      render(<CommunityDialog refreshCommunities={mockRefreshCommunities} />);
      await user.click(screen.getByText("New Community"));

      const nameInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      await user.clear(nameInput);

      await user.type(nameInput, "Some Name");

      await user.click(screen.getByText("Cancel"));
      await user.click(screen.getByText("New Community"));

      const freshInput = screen.getByPlaceholderText(
        'e.g. "My awesome Community"'
      ) as HTMLInputElement;
      expect(freshInput.value).toBe("");
    });
  });
});
