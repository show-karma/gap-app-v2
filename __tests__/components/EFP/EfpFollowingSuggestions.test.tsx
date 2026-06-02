import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EfpFollowingSuggestions } from "@/components/EFP/EfpFollowingSuggestions";

const mockPopulateViewerFollowing = vi.fn();
const mockCopy = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    authenticated: true,
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  })),
}));

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy],
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({
      project: {
        owner: "0x1111111111111111111111111111111111111111",
        members: [{ address: "0x2222222222222222222222222222222222222222" }],
      },
    })
  ),
}));

const mockEfpFollowingState = {
  viewerFollowing: [
    {
      version: 1,
      record_type: "address" as const,
      data: "0x3333333333333333333333333333333333333333",
      address: "0x3333333333333333333333333333333333333333",
      tags: [],
    },
  ],
  isFetchingFollowing: false,
  followingError: false,
  populateViewerFollowing: mockPopulateViewerFollowing,
};

vi.mock("@/store/efp", () => ({
  useEFP: vi.fn((selector: (s: unknown) => unknown) => selector(mockEfpFollowingState)),
}));

vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

describe("EfpFollowingSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders suggestion rows for follows not on the team", () => {
    render(<EfpFollowingSuggestions />);

    expect(screen.getByTestId("efp-following-suggestions")).toBeInTheDocument();
    expect(screen.getByTestId("efp-following-suggestion-row")).toBeInTheDocument();
  });

  it("copies address when copy button is clicked", () => {
    render(<EfpFollowingSuggestions />);

    fireEvent.click(screen.getByLabelText(/Copy 0x3333/i));

    expect(mockCopy).toHaveBeenCalledWith("0x3333333333333333333333333333333333333333");
  });
});
