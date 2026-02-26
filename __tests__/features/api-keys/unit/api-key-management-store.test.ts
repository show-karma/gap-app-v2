import { useApiKeyManagementModalStore } from "@/store/modals/apiKeyManagement";

// Need to unmock the store since the navbar setup.ts auto-mocks it
jest.unmock("@/store/modals/apiKeyManagement");

// Re-import the real module after unmocking
const { useApiKeyManagementModalStore: realStore } = jest.requireActual(
  "@/store/modals/apiKeyManagement"
);

describe("useApiKeyManagementModalStore", () => {
  beforeEach(() => {
    // Reset store state
    realStore.setState({ isModalOpen: false });
  });

  it("should start with modal closed", () => {
    const state = realStore.getState();
    expect(state.isModalOpen).toBe(false);
  });

  it("should open modal", () => {
    realStore.getState().openModal();
    expect(realStore.getState().isModalOpen).toBe(true);
  });

  it("should close modal", () => {
    realStore.getState().openModal();
    expect(realStore.getState().isModalOpen).toBe(true);

    realStore.getState().closeModal();
    expect(realStore.getState().isModalOpen).toBe(false);
  });
});
