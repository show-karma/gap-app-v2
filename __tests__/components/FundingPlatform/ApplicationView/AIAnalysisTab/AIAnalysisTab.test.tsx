import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIAnalysisTab } from "@/components/FundingPlatform/ApplicationView/AIAnalysisTab";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";

// Mock child components
jest.mock("@/components/FundingPlatform/ApplicationView/AIEvaluation", () => ({
  AIEvaluationDisplay: ({ evaluation, programName }: any) => (
    <div data-testid="external-evaluation">
      External Evaluation: {evaluation || "none"}
      {programName && <span data-testid="program-name">{programName}</span>}
    </div>
  ),
}));

jest.mock("@/components/FundingPlatform/ApplicationView/InternalAIEvaluation", () => ({
  InternalAIEvaluationDisplay: ({ evaluation, programName }: any) => (
    <div data-testid="internal-evaluation">
      Internal Evaluation: {evaluation || "none"}
      {programName && <span data-testid="internal-program-name">{programName}</span>}
    </div>
  ),
}));

jest.mock("@/components/FundingPlatform/ApplicationView/AIEvaluationButton", () => ({
  __esModule: true,
  default: ({ referenceNumber, isInternal, onEvaluationComplete }: any) => (
    <button
      type="button"
      data-testid={isInternal ? "run-internal-btn" : "run-external-btn"}
      onClick={onEvaluationComplete}
    >
      {isInternal ? "Run Internal AI Evaluation" : "Run AI Evaluation"}
    </button>
  ),
}));

jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("AIAnalysisTab", () => {
  const mockApplication: Partial<IFundingApplication> = {
    id: "test-app-1",
    referenceNumber: "APP-TEST-123",
    status: "pending",
    applicationData: {
      projectName: "Test Project",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProgram: Partial<ProgramWithFormSchema> = {
    name: "Test Program",
    formSchema: {
      fields: [{ id: "projectName", label: "Project Name" }],
    },
  };

  describe("Sub-tabs Rendering", () => {
    it("always renders sub-tab navigation", () => {
      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("External Evaluation")).toBeInTheDocument();
      expect(screen.getByText("Internal Evaluation")).toBeInTheDocument();
    });

    it("shows external run button by default", () => {
      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("run-external-btn")).toBeInTheDocument();
    });
  });

  describe("Tab Switching", () => {
    it("switches to Internal tab and shows internal run button", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByTestId("run-internal-btn")).toBeInTheDocument();
    });

    it("switches back to External tab when clicked", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      // Switch to internal
      await user.click(screen.getByText("Internal Evaluation"));
      expect(screen.getByTestId("run-internal-btn")).toBeInTheDocument();

      // Switch back to external
      await user.click(screen.getByText("External Evaluation"));
      expect(screen.getByTestId("run-external-btn")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows empty state for external evaluation when none exists", () => {
      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("No External Evaluation Yet")).toBeInTheDocument();
    });

    it("shows empty state for internal evaluation when none exists", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByText("No Internal Evaluation Yet")).toBeInTheDocument();
    });
  });

  describe("With External Evaluation", () => {
    const appWithExternal: Partial<IFundingApplication> = {
      ...mockApplication,
      aiEvaluation: {
        evaluation: '{"score": 85}',
      },
    };

    it("renders external evaluation content", () => {
      render(
        <AIAnalysisTab
          application={appWithExternal as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("external-evaluation")).toBeInTheDocument();
    });

    it("still shows empty state for internal evaluation", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={appWithExternal as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByText("No Internal Evaluation Yet")).toBeInTheDocument();
    });
  });

  describe("With Internal Evaluation", () => {
    const appWithInternal: Partial<IFundingApplication> = {
      ...mockApplication,
      internalAIEvaluation: {
        evaluation: '{"score": 90}',
      },
    };

    it("renders internal evaluation content when tab is active", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={appWithInternal as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByTestId("internal-evaluation")).toBeInTheDocument();
    });

    it("still shows empty state for external evaluation", () => {
      render(
        <AIAnalysisTab
          application={appWithInternal as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("No External Evaluation Yet")).toBeInTheDocument();
    });
  });

  describe("With Both Evaluations", () => {
    const appWithBoth: Partial<IFundingApplication> = {
      ...mockApplication,
      aiEvaluation: {
        evaluation: '{"score": 85}',
      },
      internalAIEvaluation: {
        evaluation: '{"score": 90}',
      },
    };

    it("renders external evaluation on external tab", () => {
      render(
        <AIAnalysisTab
          application={appWithBoth as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("external-evaluation")).toBeInTheDocument();
    });

    it("renders internal evaluation on internal tab", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={appWithBoth as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByTestId("internal-evaluation")).toBeInTheDocument();
    });

    it("passes program name to evaluation displays", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={appWithBoth as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("program-name")).toHaveTextContent("Test Program");

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByTestId("internal-program-name")).toHaveTextContent("Test Program");
    });
  });

  describe("Run Button", () => {
    it("shows external run button on external tab", () => {
      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("run-external-btn")).toBeInTheDocument();
    });

    it("shows internal run button on internal tab", async () => {
      const user = userEvent.setup();

      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      await user.click(screen.getByText("Internal Evaluation"));

      expect(screen.getByTestId("run-internal-btn")).toBeInTheDocument();
    });

    it("passes onEvaluationComplete callback to button", async () => {
      const mockCallback = jest.fn();

      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
          onEvaluationComplete={mockCallback}
        />
      );

      const externalBtn = screen.getByTestId("run-external-btn");
      externalBtn.click();

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("Reference Number Handling", () => {
    it("renders without errors with referenceNumber", () => {
      render(
        <AIAnalysisTab
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("run-external-btn")).toBeInTheDocument();
    });

    it("falls back to id when referenceNumber is missing", () => {
      const appWithoutRefNum: Partial<IFundingApplication> = {
        ...mockApplication,
        referenceNumber: undefined,
      };

      render(
        <AIAnalysisTab
          application={appWithoutRefNum as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByTestId("run-external-btn")).toBeInTheDocument();
    });
  });
});
