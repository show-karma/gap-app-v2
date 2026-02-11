import { useGrantFormStore } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/store";

describe("useGrantFormStore receivedDate", () => {
  beforeEach(() => {
    useGrantFormStore.getState().resetFormData();
  });

  it("should initialize receivedDate as undefined", () => {
    expect(useGrantFormStore.getState().formData.receivedDate).toBeUndefined();
  });

  it("should update receivedDate through updateFormData", () => {
    const receivedDate = new Date("2024-01-10T00:00:00.000Z");

    useGrantFormStore.getState().updateFormData({ receivedDate });

    expect(useGrantFormStore.getState().formData.receivedDate).toEqual(receivedDate);
  });

  it("should clear receivedDate on resetFormData", () => {
    useGrantFormStore
      .getState()
      .updateFormData({ receivedDate: new Date("2024-01-10T00:00:00.000Z") });

    useGrantFormStore.getState().resetFormData();

    expect(useGrantFormStore.getState().formData.receivedDate).toBeUndefined();
  });
});
