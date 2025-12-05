import { render, screen } from "@testing-library/react";
import { ApplicationDataView } from "@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";

// Mock MarkdownPreview
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <div data-testid="markdown">{source}</div>,
}));

// Mock formatDate
jest.mock("@/utilities/formatDate", () => ({
  formatDate: (date: Date) => date.toISOString().split("T")[0],
}));

describe("ApplicationDataView", () => {
  const mockApplication: Partial<IFundingApplication> = {
    id: "test-app-1",
    referenceNumber: "APP-TEST-123",
    status: "pending",
    applicationData: {
      projectName: "Test Project",
      description: "This is a test description",
      teamSize: "5-10",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProgram: Partial<ProgramWithFormSchema> = {
    formSchema: {
      fields: [
        { id: "projectName", label: "Project Name", type: "text" },
        { id: "description", label: "Project Description", type: "textarea" },
        { id: "teamSize", label: "Team Size", type: "select" },
      ],
    },
  };

  describe("Rendering", () => {
    it("renders application data fields", () => {
      render(
        <ApplicationDataView
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Project Name")).toBeInTheDocument();
      expect(screen.getByText("Project Description")).toBeInTheDocument();
      expect(screen.getByText("Team Size")).toBeInTheDocument();
    });

    it("uses field labels from program schema", () => {
      render(
        <ApplicationDataView
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Project Name")).toBeInTheDocument();
      expect(screen.getByText("Project Description")).toBeInTheDocument();
    });

    it("falls back to key name when no label is provided", () => {
      const appWithUnknownField: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: {
          unknown_field: "Some value",
        },
      };

      render(
        <ApplicationDataView
          application={appWithUnknownField as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("unknown field")).toBeInTheDocument();
    });

    it("renders field values", () => {
      render(
        <ApplicationDataView
          application={mockApplication as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByText("5-10")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no application data", () => {
      const emptyApp: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: {},
      };

      render(
        <ApplicationDataView
          application={emptyApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("No application data available")).toBeInTheDocument();
    });

    it("shows empty state when applicationData is undefined", () => {
      const noDataApp: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: undefined,
      };

      render(
        <ApplicationDataView
          application={noDataApp as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("No application data available")).toBeInTheDocument();
    });
  });

  describe("Field Types", () => {
    it("renders array values as tags", () => {
      const appWithArray: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: {
          tags: ["Tag1", "Tag2", "Tag3"],
        },
      };

      render(
        <ApplicationDataView
          application={appWithArray as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Tag1")).toBeInTheDocument();
      expect(screen.getByText("Tag2")).toBeInTheDocument();
      expect(screen.getByText("Tag3")).toBeInTheDocument();
    });

    it("renders boolean values as Yes/No", () => {
      const appWithBoolean: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: {
          isPublic: true,
          isPrivate: false,
        },
      };

      render(
        <ApplicationDataView
          application={appWithBoolean as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("renders milestones with special formatting", () => {
      const appWithMilestones: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: {
          milestones: [
            { title: "Milestone 1", description: "First milestone", dueDate: "2025-03-01" },
            { title: "Milestone 2", description: "Second milestone" },
          ],
        },
      };

      render(
        <ApplicationDataView
          application={appWithMilestones as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
      expect(screen.getByText("Milestone 2")).toBeInTheDocument();
    });

    it("renders objects as JSON", () => {
      const appWithObject: Partial<IFundingApplication> = {
        ...mockApplication,
        applicationData: {
          metadata: { key: "value" },
        },
      };

      render(
        <ApplicationDataView
          application={appWithObject as IFundingApplication}
          program={mockProgram as ProgramWithFormSchema}
        />
      );

      // JSON.stringify output
      expect(screen.getByText(/key/)).toBeInTheDocument();
      expect(screen.getByText(/value/)).toBeInTheDocument();
    });
  });

  describe("Without Program Schema", () => {
    it("renders without program schema using key names", () => {
      render(
        <ApplicationDataView
          application={mockApplication as IFundingApplication}
          program={undefined}
        />
      );

      // Should fall back to formatted key names
      expect(screen.getByText("projectName")).toBeInTheDocument();
    });
  });
});
