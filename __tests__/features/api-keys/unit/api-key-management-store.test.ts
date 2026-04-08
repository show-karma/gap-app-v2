// Need to unmock the store since the navbar setup.ts auto-mocks it
vi.unmock("@/store/modals/apiKeyManagement");

// With vi.unmock, the regular import gives the real module
import { useApiKeyManagementModalStore } from "@/store/modals/apiKeyManagement";

describe("useApiKeyManagementModalStore", () => {
  beforeEach(() => {
    // Reset store state
    useApiKeyManagementModalStore.setState({ isModalOpen: false });
  });

  it("should start with modal closed", () => {
    const state = useApiKeyManagementModalStore.getState();
    expect(state.isModalOpen).toBe(false);
  });

  it("should open modal", () => {
    useApiKeyManagementModalStore.getState().openModal();
    expect(useApiKeyManagementModalStore.getState().isModalOpen).toBe(true);
  });

  it("should close modal", () => {
    useApiKeyManagementModalStore.getState().openModal();
    expect(useApiKeyManagementModalStore.getState().isModalOpen).toBe(true);

    useApiKeyManagementModalStore.getState().closeModal();
    expect(useApiKeyManagementModalStore.getState().isModalOpen).toBe(false);
  });
});
