import { render, screen } from "@testing-library/react";
import { ChartSkeleton, DonutChartSkeleton } from "@/components/Utilities/ChartSkeleton";
import "@testing-library/jest-dom";

describe("ChartSkeleton", () => {
  describe("Default Rendering", () => {
    it("should render with default test id", () => {
      render(<ChartSkeleton />);

      expect(screen.getByTestId("chart-skeleton")).toBeInTheDocument();
    });

    it("should render chart area with default height", () => {
      const { container } = render(<ChartSkeleton />);

      const chartArea = container.querySelector(".h-52");
      expect(chartArea).toBeInTheDocument();
    });

    it("should render with full width by default", () => {
      const { container } = render(<ChartSkeleton />);

      const wrapper = container.querySelector(".w-full");
      expect(wrapper).toBeInTheDocument();
    });

    it("should render Y-axis placeholders", () => {
      const { container } = render(<ChartSkeleton />);

      // Y-axis container should exist with multiple skeleton elements
      const yAxisSkeletons = container.querySelectorAll(".absolute.left-0 .animate-pulse");
      expect(yAxisSkeletons.length).toBe(5);
    });

    it("should render X-axis placeholders", () => {
      const { container } = render(<ChartSkeleton />);

      // X-axis container should exist
      const xAxisContainer = container.querySelector(".bottom-0.h-6");
      expect(xAxisContainer).toBeInTheDocument();
    });

    it("should render chart bars", () => {
      const { container } = render(<ChartSkeleton />);

      // Should render 12 animated bars
      const bars = container.querySelectorAll(".flex-1.bg-gray-200");
      expect(bars.length).toBe(12);
    });

    it("should not show title by default", () => {
      render(<ChartSkeleton />);

      // Title skeleton would have h-5 w-40 classes
      const { container } = render(<ChartSkeleton />);
      const directChildren = container.firstChild?.childNodes;
      // First child should not be a title skeleton (starts with chart area)
      expect(directChildren?.length).toBe(1); // Only chart area, no title
    });

    it("should not show legend by default", () => {
      const { container } = render(<ChartSkeleton />);

      // Legend items would have flex items-center gap-1.5
      const legendContainer = container.querySelector(".flex.flex-wrap.gap-2");
      expect(legendContainer).not.toBeInTheDocument();
    });
  });

  describe("Custom Dimensions", () => {
    it("should apply custom height", () => {
      const { container } = render(<ChartSkeleton height="h-72" />);

      const chartArea = container.querySelector(".h-72");
      expect(chartArea).toBeInTheDocument();
    });

    it("should apply custom width", () => {
      const { container } = render(<ChartSkeleton width="w-96" />);

      const wrapper = container.querySelector(".w-96");
      expect(wrapper).toBeInTheDocument();
    });

    it("should apply both custom height and width", () => {
      const { container } = render(<ChartSkeleton height="h-80" width="w-[500px]" />);

      const wrapper = container.querySelector(".w-\\[500px\\]");
      expect(wrapper).toBeInTheDocument();

      const chartArea = container.querySelector(".h-80");
      expect(chartArea).toBeInTheDocument();
    });
  });

  describe("Title Option", () => {
    it("should show title when showTitle is true", () => {
      const { container } = render(<ChartSkeleton showTitle />);

      // Title has specific height and width classes
      const titleSkeleton = container.querySelector(".h-5.w-40");
      expect(titleSkeleton).toBeInTheDocument();
    });

    it("should not show title when showTitle is false", () => {
      const { container } = render(<ChartSkeleton showTitle={false} />);

      const titleSkeleton = container.querySelector(".h-5.w-40");
      expect(titleSkeleton).not.toBeInTheDocument();
    });
  });

  describe("Legend Option", () => {
    it("should show legend when showLegend is true", () => {
      const { container } = render(<ChartSkeleton showLegend />);

      const legendContainer = container.querySelector(".flex.flex-wrap.gap-2");
      expect(legendContainer).toBeInTheDocument();
    });

    it("should show 3 legend items by default", () => {
      const { container } = render(<ChartSkeleton showLegend />);

      const legendItems = container.querySelectorAll(".flex.items-center.gap-1\\.5");
      expect(legendItems.length).toBe(3);
    });

    it("should show custom number of legend items", () => {
      const { container } = render(<ChartSkeleton showLegend legendCount={5} />);

      const legendItems = container.querySelectorAll(".flex.items-center.gap-1\\.5");
      expect(legendItems.length).toBe(5);
    });

    it("should show 1 legend item when legendCount is 1", () => {
      const { container } = render(<ChartSkeleton showLegend legendCount={1} />);

      const legendItems = container.querySelectorAll(".flex.items-center.gap-1\\.5");
      expect(legendItems.length).toBe(1);
    });
  });

  describe("Custom Test ID", () => {
    it("should apply custom test id", () => {
      render(<ChartSkeleton data-testid="custom-chart-skeleton" />);

      expect(screen.getByTestId("custom-chart-skeleton")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should apply additional className", () => {
      const { container } = render(<ChartSkeleton className="mt-4 mb-8" />);

      const wrapper = container.querySelector(".mt-4.mb-8");
      expect(wrapper).toBeInTheDocument();
    });

    it("should merge className with default classes", () => {
      const { container } = render(<ChartSkeleton className="border border-gray-200" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "flex-col", "gap-4", "border", "border-gray-200");
    });
  });

  describe("Animation", () => {
    it("should have animate-pulse on chart bars", () => {
      const { container } = render(<ChartSkeleton />);

      const animatedBars = container.querySelectorAll(".animate-pulse");
      expect(animatedBars.length).toBeGreaterThan(0);
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes on chart area", () => {
      const { container } = render(<ChartSkeleton />);

      const chartArea = container.querySelector(".dark\\:bg-zinc-800");
      expect(chartArea).toBeInTheDocument();
    });

    it("should have dark mode classes on chart bars", () => {
      const { container } = render(<ChartSkeleton />);

      const darkBars = container.querySelectorAll(".dark\\:bg-zinc-700");
      expect(darkBars.length).toBe(12);
    });
  });

  describe("Combinations", () => {
    it("should render with title and legend", () => {
      const { container } = render(<ChartSkeleton showTitle showLegend />);

      const titleSkeleton = container.querySelector(".h-5.w-40");
      expect(titleSkeleton).toBeInTheDocument();

      const legendContainer = container.querySelector(".flex.flex-wrap.gap-2");
      expect(legendContainer).toBeInTheDocument();
    });

    it("should render with all options", () => {
      const { container } = render(
        <ChartSkeleton
          height="h-96"
          width="w-full"
          showTitle
          showLegend
          legendCount={4}
          className="p-4"
          data-testid="full-chart-skeleton"
        />
      );

      expect(screen.getByTestId("full-chart-skeleton")).toBeInTheDocument();

      const chartArea = container.querySelector(".h-96");
      expect(chartArea).toBeInTheDocument();

      const titleSkeleton = container.querySelector(".h-5.w-40");
      expect(titleSkeleton).toBeInTheDocument();

      const legendItems = container.querySelectorAll(".flex.items-center.gap-1\\.5");
      expect(legendItems.length).toBe(4);

      const wrapper = container.querySelector(".p-4");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Structure", () => {
    it("should have flex column layout", () => {
      const { container } = render(<ChartSkeleton />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "flex-col", "gap-4");
    });

    it("should have relative positioning on chart area", () => {
      const { container } = render(<ChartSkeleton />);

      const chartArea = container.querySelector(".relative.rounded-lg");
      expect(chartArea).toBeInTheDocument();
    });
  });
});

describe("DonutChartSkeleton", () => {
  describe("Default Rendering", () => {
    it("should render with default test id", () => {
      render(<DonutChartSkeleton />);

      expect(screen.getByTestId("donut-chart-skeleton")).toBeInTheDocument();
    });

    it("should render with default height", () => {
      const { container } = render(<DonutChartSkeleton />);

      const wrapper = container.querySelector(".h-40");
      expect(wrapper).toBeInTheDocument();
    });

    it("should render outer ring", () => {
      const { container } = render(<DonutChartSkeleton />);

      const outerRing = container.querySelector(".w-32.h-32.rounded-full");
      expect(outerRing).toBeInTheDocument();
    });

    it("should render inner hole", () => {
      const { container } = render(<DonutChartSkeleton />);

      const innerHole = container.querySelector(".w-16.h-16.rounded-full");
      expect(innerHole).toBeInTheDocument();
    });

    it("should have animate-pulse on outer ring", () => {
      const { container } = render(<DonutChartSkeleton />);

      const animatedRing = container.querySelector(".w-32.h-32.animate-pulse");
      expect(animatedRing).toBeInTheDocument();
    });
  });

  describe("Custom Height", () => {
    it("should apply custom height", () => {
      const { container } = render(<DonutChartSkeleton height="h-56" />);

      const wrapper = container.querySelector(".h-56");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should apply additional className", () => {
      const { container } = render(<DonutChartSkeleton className="mt-4" />);

      const wrapper = container.querySelector(".mt-4");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Custom Test ID", () => {
    it("should apply custom test id", () => {
      render(<DonutChartSkeleton data-testid="custom-donut-skeleton" />);

      expect(screen.getByTestId("custom-donut-skeleton")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes on outer ring", () => {
      const { container } = render(<DonutChartSkeleton />);

      const outerRing = container.querySelector(".dark\\:bg-zinc-700");
      expect(outerRing).toBeInTheDocument();
    });

    it("should have dark mode classes on inner hole", () => {
      const { container } = render(<DonutChartSkeleton />);

      const innerHole = container.querySelector(".dark\\:bg-zinc-800");
      expect(innerHole).toBeInTheDocument();
    });
  });

  describe("Structure", () => {
    it("should center the donut chart", () => {
      const { container } = render(<DonutChartSkeleton />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });

    it("should have relative positioning for inner elements", () => {
      const { container } = render(<DonutChartSkeleton />);

      const relativeContainer = container.querySelector(".relative");
      expect(relativeContainer).toBeInTheDocument();
    });
  });
});
