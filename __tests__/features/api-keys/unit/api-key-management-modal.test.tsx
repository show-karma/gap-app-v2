import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ApiKeyManagementModal } from "@/src/features/api-keys/components/api-key-management-modal";

// Mock stores
const mockCloseModal = jest.fn();
let mockIsModalOpen = true;

jest.mock("@/store/modals/apiKeyManagement", () => ({
  useApiKeyManagementModalStore: jest.fn(() => ({
    isModalOpen: mockIsModalOpen,
    openModal: jest.fn(),
    closeModal: mockCloseModal,
  })),
}));

jest.mock("@/src/components/navbar/navbar-permissions-context", () => ({
  useNavbarPermissions: jest.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isLoggedIn: true,
    ready: true,
  })),
}));

// Mock hooks
const mockCreateKey = jest.fn();
const mockRevokeKey = jest.fn();
let mockApiKeyData: any = { apiKey: null };
let mockIsLoadingKey = false;
let mockIsCreating = false;
let mockIsRevoking = false;

jest.mock("@/src/features/api-keys/hooks/use-api-key", () => ({
  useApiKey: jest.fn(() => ({
    data: mockApiKeyData,
    isLoading: mockIsLoadingKey,
  })),
  useCreateApiKey: jest.fn((options?: any) => ({
    mutate: (name?: string) => {
      mockCreateKey(name);
      // Simulate success callback
      if (options?.onSuccess) {
        options.onSuccess({
          key: "karma_testkey123456789012345678",
          keyHint: "...5678",
          name: name || "Default",
          createdAt: "2026-02-22T00:00:00.000Z",
        });
      }
    },
    isPending: mockIsCreating,
  })),
  useRevokeApiKey: jest.fn((options?: any) => ({
    mutate: () => {
      mockRevokeKey();
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    isPending: mockIsRevoking,
  })),
}));

jest.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const renderModal = () => {
  const Wrapper = createWrapper();
  return render(React.createElement(Wrapper, null, React.createElement(ApiKeyManagementModal)));
};

describe("ApiKeyManagementModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsModalOpen = true;
    mockApiKeyData = { apiKey: null };
    mockIsLoadingKey = false;
    mockIsCreating = false;
    mockIsRevoking = false;
  });

  describe("Loading state", () => {
    it("shows loading spinner when fetching key data", () => {
      mockIsLoadingKey = true;
      renderModal();

      expect(screen.getByText("API Key")).toBeInTheDocument();
    });
  });

  describe("No key state", () => {
    it("shows generate form when no key exists", () => {
      renderModal();

      expect(screen.getByText("Generate API Key")).toBeInTheDocument();
      expect(screen.getByLabelText("Key name")).toBeInTheDocument();
      expect(screen.getByText(/You don't have an API key yet/i)).toBeInTheDocument();
    });

    it("allows entering key name", async () => {
      const user = userEvent.setup();
      renderModal();

      const input = screen.getByLabelText("Key name");
      await user.type(input, "My Agent");

      expect(input).toHaveValue("My Agent");
    });

    it("calls create mutation on generate click", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText("Generate API Key"));

      expect(mockCreateKey).toHaveBeenCalled();
    });
  });

  describe("Key created state", () => {
    it("shows created key after generation", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText("Generate API Key"));

      await waitFor(() => {
        expect(screen.getByText("API Key Created")).toBeInTheDocument();
      });
      expect(screen.getByText("karma_testkey123456789012345678")).toBeInTheDocument();
      expect(screen.getByText(/Copy your API key now/i)).toBeInTheDocument();
    });

    it("shows copy and done buttons", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText("Generate API Key"));

      await waitFor(() => {
        expect(screen.getByText("Copy to Clipboard")).toBeInTheDocument();
        expect(screen.getByText("I've Saved It")).toBeInTheDocument();
      });
    });

    it("shows usage example with x-api-key header", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText("Generate API Key"));

      await waitFor(() => {
        expect(screen.getByText("x-api-key")).toBeInTheDocument();
      });
    });
  });

  describe("Active key state", () => {
    it("shows existing key info", () => {
      mockApiKeyData = {
        apiKey: {
          keyHint: "...abcd",
          name: "My Key",
          isActive: true,
          createdAt: "2026-02-22T00:00:00.000Z",
          lastUsedAt: null,
        },
      };
      renderModal();

      expect(screen.getByText("My Key")).toBeInTheDocument();
      expect(screen.getByText("karma_...abcd")).toBeInTheDocument();
      expect(screen.getByText("Never")).toBeInTheDocument();
      expect(screen.getByText("Regenerate Key")).toBeInTheDocument();
      expect(screen.getByText("Revoke Key")).toBeInTheDocument();
    });

    it("shows last used date when available", () => {
      mockApiKeyData = {
        apiKey: {
          keyHint: "...abcd",
          name: "My Key",
          isActive: true,
          createdAt: "2026-01-15T00:00:00.000Z",
          lastUsedAt: "2026-02-22T12:00:00.000Z",
        },
      };
      renderModal();

      expect(screen.getByText("Feb 22, 2026")).toBeInTheDocument();
      expect(screen.queryByText("Never")).not.toBeInTheDocument();
    });

    it("calls regenerate on regenerate click", async () => {
      const user = userEvent.setup();
      mockApiKeyData = {
        apiKey: {
          keyHint: "...abcd",
          name: "My Key",
          isActive: true,
          createdAt: "2026-02-22T00:00:00.000Z",
          lastUsedAt: null,
        },
      };
      renderModal();

      await user.click(screen.getByText("Regenerate Key"));

      expect(mockCreateKey).toHaveBeenCalled();
    });
  });

  describe("Revoke confirmation", () => {
    it("shows revoke confirmation dialog", async () => {
      const user = userEvent.setup();
      mockApiKeyData = {
        apiKey: {
          keyHint: "...abcd",
          name: "My Key",
          isActive: true,
          createdAt: "2026-02-22T00:00:00.000Z",
          lastUsedAt: null,
        },
      };
      renderModal();

      await user.click(screen.getByText("Revoke Key"));

      await waitFor(() => {
        expect(screen.getByText("Revoke API Key?")).toBeInTheDocument();
        expect(screen.getByText(/immediately invalidate/i)).toBeInTheDocument();
      });
    });

    it("cancels revoke on cancel click", async () => {
      const user = userEvent.setup();
      mockApiKeyData = {
        apiKey: {
          keyHint: "...abcd",
          name: "My Key",
          isActive: true,
          createdAt: "2026-02-22T00:00:00.000Z",
          lastUsedAt: null,
        },
      };
      renderModal();

      await user.click(screen.getByText("Revoke Key"));
      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.getByText("Regenerate Key")).toBeInTheDocument();
      });
    });

    it("calls revoke on confirm", async () => {
      const user = userEvent.setup();
      mockApiKeyData = {
        apiKey: {
          keyHint: "...abcd",
          name: "My Key",
          isActive: true,
          createdAt: "2026-02-22T00:00:00.000Z",
          lastUsedAt: null,
        },
      };
      renderModal();

      await user.click(screen.getByText("Revoke Key"));
      await waitFor(() => {
        expect(screen.getByText("Revoke")).toBeInTheDocument();
      });

      // Click the "Revoke" button (not "Revoke Key" which is in the active state)
      const revokeButtons = screen.getAllByRole("button", { name: /revoke/i });
      const confirmButton = revokeButtons.find((btn) => btn.textContent === "Revoke");
      if (confirmButton) {
        await user.click(confirmButton);
      }

      expect(mockRevokeKey).toHaveBeenCalled();
    });
  });

  describe("Modal closed state", () => {
    it("does not render content when modal is closed", () => {
      mockIsModalOpen = false;
      renderModal();

      expect(screen.queryByText("API Key")).not.toBeInTheDocument();
    });
  });
});
