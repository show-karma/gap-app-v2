import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { FundingContentWrapper } from "../FundingContentWrapper";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project" }),
}));

vi.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: vi.fn(),
}));

vi.mock("@/components/Pages/Project/v2/Skeletons/FundingContentSkeleton", () => ({
  FundingContentSkeleton: () => <div data-testid="funding-skeleton" />,
}));

vi.mock("../../FundingPage/FundingContent", () => ({
  FundingContent: ({ project }: { project: { uid: string } }) => (
    <div data-testid="funding-content">{project.uid}</div>
  ),
}));

const useProjectProfileMock = vi.mocked(useProjectProfile);

function setup(overrides: Partial<ReturnType<typeof useProjectProfile>>) {
  useProjectProfileMock.mockReturnValue({
    project: null,
    isProjectLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProjectProfile>);
  useProjectProfileMock.mockReturnValueOnce({
    project: null,
    isProjectLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useProjectProfile>);
}

describe("FundingContentWrapper", () => {
  it("renders the loading skeleton while the project is loading", () => {
    setup({ isProjectLoading: true });
    render(<FundingContentWrapper />);
    expect(screen.getByTestId("funding-skeleton")).toBeInTheDocument();
  });

  it("renders an error state with a retry CTA when the project fetch fails (DEV-236)", () => {
    const refetch = vi.fn();
    setup({ isError: true, refetch });

    render(<FundingContentWrapper />);

    expect(screen.getByText(/couldn't load funding details/i)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryButton);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders an error state when the project is missing (404 after load)", () => {
    setup({ project: null, isProjectLoading: false, isError: false });
    render(<FundingContentWrapper />);
    expect(screen.getByText(/couldn't load funding details/i)).toBeInTheDocument();
  });

  it("renders the funding content when the project is loaded", () => {
    setup({
      project: { uid: "0x123", details: { title: "P" } } as any,
      isProjectLoading: false,
      isError: false,
    });

    render(<FundingContentWrapper />);
    expect(screen.getByTestId("funding-content")).toHaveTextContent("0x123");
  });
});
