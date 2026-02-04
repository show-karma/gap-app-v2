import type { OnboardingData } from "@/components/Pages/OnboardingAssistant/types";
import { useOnboardingAssistantModalStore } from "@/store/modals/onboardingAssistant";
import { useOnboardingAssistantDataStore } from "@/store/onboardingAssistantData";

describe("useOnboardingAssistantModalStore", () => {
  beforeEach(() => {
    useOnboardingAssistantModalStore.setState({
      isOnboardingAssistantOpen: false,
    });
  });

  it("should initialize as closed", () => {
    const state = useOnboardingAssistantModalStore.getState();
    expect(state.isOnboardingAssistantOpen).toBe(false);
  });

  it("should open the assistant", () => {
    const { openOnboardingAssistant } = useOnboardingAssistantModalStore.getState();
    openOnboardingAssistant();
    expect(useOnboardingAssistantModalStore.getState().isOnboardingAssistantOpen).toBe(true);
  });

  it("should close the assistant", () => {
    const store = useOnboardingAssistantModalStore.getState();
    store.openOnboardingAssistant();
    expect(useOnboardingAssistantModalStore.getState().isOnboardingAssistantOpen).toBe(true);

    store.closeOnboardingAssistant();
    expect(useOnboardingAssistantModalStore.getState().isOnboardingAssistantOpen).toBe(false);
  });

  it("should set open state directly", () => {
    const { setIsOnboardingAssistantOpen } = useOnboardingAssistantModalStore.getState();
    setIsOnboardingAssistantOpen(true);
    expect(useOnboardingAssistantModalStore.getState().isOnboardingAssistantOpen).toBe(true);

    setIsOnboardingAssistantOpen(false);
    expect(useOnboardingAssistantModalStore.getState().isOnboardingAssistantOpen).toBe(false);
  });
});

describe("useOnboardingAssistantDataStore", () => {
  const testData: OnboardingData = {
    type: "onboarding_data",
    project: {
      title: "Test Project",
      description: "A test description",
      problem: "A test problem",
      solution: "A test solution",
      missionSummary: "Test mission",
    },
    grants: [
      {
        title: "Test Grant",
        amount: "$10,000",
        community: "Test Community",
        milestones: [{ title: "Milestone 1", description: "First milestone" }],
      },
    ],
  };

  beforeEach(() => {
    useOnboardingAssistantDataStore.setState({ extractedData: null });
  });

  it("should initialize with null data", () => {
    const state = useOnboardingAssistantDataStore.getState();
    expect(state.extractedData).toBeNull();
  });

  it("should set extracted data", () => {
    const { setExtractedData } = useOnboardingAssistantDataStore.getState();
    setExtractedData(testData);

    const state = useOnboardingAssistantDataStore.getState();
    expect(state.extractedData).toEqual(testData);
    expect(state.extractedData?.project.title).toBe("Test Project");
  });

  it("should clear data", () => {
    const store = useOnboardingAssistantDataStore.getState();
    store.setExtractedData(testData);
    expect(useOnboardingAssistantDataStore.getState().extractedData).not.toBeNull();

    store.clearData();
    expect(useOnboardingAssistantDataStore.getState().extractedData).toBeNull();
  });

  it("should overwrite existing data", () => {
    const store = useOnboardingAssistantDataStore.getState();
    store.setExtractedData(testData);

    const newData: OnboardingData = {
      ...testData,
      project: { ...testData.project, title: "Updated Project" },
    };
    store.setExtractedData(newData);

    expect(useOnboardingAssistantDataStore.getState().extractedData?.project.title).toBe(
      "Updated Project"
    );
  });
});
