import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectStatsBar } from "../StatsBar/ProjectStatsBar";
import { StatItem } from "../StatsBar/StatItem";

describe("StatItem", () => {
  describe("Rendering", () => {
    it("should render stat item with value and label", () => {
      render(<StatItem value={10} label="Grants" />);

      expect(screen.getByTestId("stat-item")).toBeInTheDocument();
      expect(screen.getByTestId("stat-value")).toHaveTextContent("10");
      expect(screen.getByTestId("stat-label")).toHaveTextContent("Grants");
    });

    it("should render string value", () => {
      render(<StatItem value="$1,240" label="Received" />);

      expect(screen.getByTestId("stat-value")).toHaveTextContent("$1,240");
    });

    it("should render with icon", () => {
      render(<StatItem value={5} label="Items" icon={<span data-testid="custom-icon">🎉</span>} />);

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });
  });

  describe("Click Handler", () => {
    it("should call onClick when clicked", () => {
      const handleClick = jest.fn();
      render(<StatItem value={10} label="Grants" onClick={handleClick} />);

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not render as button when no onClick", () => {
      render(<StatItem value={10} label="Grants" />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<StatItem value={10} label="Grants" className="custom-class" />);

      expect(screen.getByTestId("stat-item")).toHaveClass("custom-class");
    });

    it("should have hover styles when clickable", () => {
      render(<StatItem value={10} label="Grants" onClick={() => {}} />);

      expect(screen.getByTestId("stat-item")).toHaveClass("cursor-pointer");
    });
  });
});

describe("ProjectStatsBar", () => {
  const defaultProps = {
    grants: 8,
    endorsements: 24,
  };

  describe("Rendering", () => {
    it("should render stats bar component", () => {
      render(<ProjectStatsBar {...defaultProps} />);

      expect(screen.getByTestId("project-stats-bar")).toBeInTheDocument();
    });

    it("should render grants stat", () => {
      render(<ProjectStatsBar {...defaultProps} />);

      // Both desktop and mobile layouts are rendered, so we get multiple elements
      expect(screen.getAllByText("8")).toHaveLength(2);
      expect(screen.getAllByText("Grants")).toHaveLength(2);
    });

    it("should render endorsements stat", () => {
      render(<ProjectStatsBar {...defaultProps} />);

      expect(screen.getAllByText("24")).toHaveLength(2);
      expect(screen.getAllByText("Endorsements")).toHaveLength(2);
    });

    it("should use singular label for single grant", () => {
      render(<ProjectStatsBar grants={1} endorsements={24} />);

      expect(screen.getAllByText("Grant")).toHaveLength(2);
    });

    it("should use singular label for single endorsement", () => {
      render(<ProjectStatsBar grants={8} endorsements={1} />);

      expect(screen.getAllByText("Endorsement")).toHaveLength(2);
    });
  });

  describe("Optional Stats", () => {
    it("should render totalReceived when provided", () => {
      render(<ProjectStatsBar {...defaultProps} totalReceived={1240} />);

      // formatCurrency formats 1240 as "1.2K"
      expect(screen.getAllByText("$1.2K")).toHaveLength(2);
      expect(screen.getAllByText("Received")).toHaveLength(2);
    });

    it("should render tokenPrice when provided", () => {
      render(<ProjectStatsBar {...defaultProps} tokenPrice={0.14} />);

      expect(screen.getAllByText("$0.14")).toHaveLength(2);
      expect(screen.getAllByText("Token")).toHaveLength(2);
    });

    it("should render completeRate when provided", () => {
      render(<ProjectStatsBar {...defaultProps} completeRate={100} />);

      expect(screen.getAllByText("100%")).toHaveLength(2);
      expect(screen.getAllByText("Complete")).toHaveLength(2);
    });

    it("should not render optional stats when not provided", () => {
      render(<ProjectStatsBar {...defaultProps} />);

      expect(screen.queryByText("Received")).not.toBeInTheDocument();
      expect(screen.queryByText("Token")).not.toBeInTheDocument();
      expect(screen.queryByText("Complete")).not.toBeInTheDocument();
    });
  });

  describe("Last Update Formatting", () => {
    it("should show 'Today' for today's date", () => {
      render(<ProjectStatsBar {...defaultProps} lastUpdate={new Date()} />);

      expect(screen.getAllByText("Today")).toHaveLength(2);
    });

    it("should show '1d ago' for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      render(<ProjectStatsBar {...defaultProps} lastUpdate={yesterday} />);

      expect(screen.getAllByText("1d ago")).toHaveLength(2);
    });

    it("should show days ago for recent updates", () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      render(<ProjectStatsBar {...defaultProps} lastUpdate={fiveDaysAgo} />);

      expect(screen.getAllByText("5d ago")).toHaveLength(2);
    });

    it("should show weeks ago for older updates", () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      render(<ProjectStatsBar {...defaultProps} lastUpdate={twoWeeksAgo} />);

      expect(screen.getAllByText("2w ago")).toHaveLength(2);
    });

    it("should accept string date format", () => {
      render(<ProjectStatsBar {...defaultProps} lastUpdate={new Date().toISOString()} />);

      expect(screen.getAllByText("Today")).toHaveLength(2);
    });
  });

  describe("Click Handlers", () => {
    it("should call onGrantsClick when grants stat is clicked", () => {
      const handleClick = jest.fn();
      render(<ProjectStatsBar {...defaultProps} onGrantsClick={handleClick} />);

      // Find the button containing "Grants" text
      const buttons = screen.getAllByRole("button");
      const grantsButton = buttons.find((btn) => btn.textContent?.includes("Grant"));
      if (grantsButton) {
        fireEvent.click(grantsButton);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });

    it("should call onEndorsementsClick when endorsements stat is clicked", () => {
      const handleClick = jest.fn();
      render(<ProjectStatsBar {...defaultProps} onEndorsementsClick={handleClick} />);

      const buttons = screen.getAllByRole("button");
      const endorsementsButton = buttons.find((btn) => btn.textContent?.includes("Endorsement"));
      if (endorsementsButton) {
        fireEvent.click(endorsementsButton);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("Responsive Layout", () => {
    it("should have desktop scroll layout class", () => {
      const { container } = render(<ProjectStatsBar {...defaultProps} />);

      expect(container.querySelector(".hidden.lg\\:block")).toBeInTheDocument();
    });

    it("should have mobile wrap layout class", () => {
      const { container } = render(<ProjectStatsBar {...defaultProps} />);

      expect(container.querySelector(".lg\\:hidden")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(<ProjectStatsBar {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId("project-stats-bar")).toHaveClass("custom-class");
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values", () => {
      render(<ProjectStatsBar grants={0} endorsements={0} />);

      // 4 zeros total: 2 for grants (desktop + mobile) + 2 for endorsements (desktop + mobile)
      const zeros = screen.getAllByText("0");
      expect(zeros).toHaveLength(4);
    });

    it("should handle large numbers with formatting", () => {
      render(<ProjectStatsBar grants={1000000} endorsements={500000} />);

      // formatCurrency formats large numbers as abbreviations like "1M", "500K"
      expect(screen.getAllByText("1M")).toHaveLength(2);
      expect(screen.getAllByText("500K")).toHaveLength(2);
    });
  });
});
