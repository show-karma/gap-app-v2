import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EfpFollowingSuggestions } from "@/components/EFP/EfpFollowingSuggestions";

const mockCopy = vi.fn();
const mockOnRequestConnect = vi.fn();
const mockPopulateViewerFollowing = vi.fn();

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy],
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector) =>
    selector({
      project: {
        owner: "0x1111111111111111111111111111111111111111",
        members: [{ address: "0x2222222222222222222222222222222222222222" }],
      },
    })
  ),
}));

vi.mock("@/store/efp", () => ({
  useEFP: vi.fn((selector) =>
    selector({
      viewerFollowing: [],
      isFetchingFollowing: false,
      followingError: false,
      populateViewerFollowing: mockPopulateViewerFollowing,
    })
  ),
}));

vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

import { useAuth } from "@/hooks/useAuth";
import { useEFP } from "@/store/efp";

const SUGGESTION_ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const defaultEfpState = {
  viewerFollowing: [] as [],
  isFetchingFollowing: false,
  followingError: false,
  populateViewerFollowing: mockPopulateViewerFollowing,
};

describe("EfpFollowingSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      authenticated: true,
      address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    } as ReturnType<typeof useAuth>);
    vi.mocked(useEFP).mockImplementation((selector) => selector(defaultEfpState));
  });

  describe("disconnected", () => {
    it("shows connect wallet hint and calls onRequestConnect", () => {
      vi.mocked(useAuth).mockReturnValue({
        authenticated: false,
        address: undefined,
      } as ReturnType<typeof useAuth>);

      render(<EfpFollowingSuggestions onRequestConnect={mockOnRequestConnect} />);

      expect(screen.getByText(/Connect your wallet/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Connect wallet/i }));
      expect(mockOnRequestConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("loading", () => {
    it("shows skeleton while fetching", () => {
      vi.mocked(useEFP).mockImplementation((selector) =>
        selector({
          viewerFollowing: null,
          isFetchingFollowing: true,
          followingError: false,
          populateViewerFollowing: mockPopulateViewerFollowing,
        })
      );

      render(<EfpFollowingSuggestions />);

      expect(screen.getByTestId("efp-following-suggestions")).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("shows retry on error", () => {
      vi.mocked(useEFP).mockImplementation((selector) =>
        selector({
          viewerFollowing: null,
          isFetchingFollowing: false,
          followingError: true,
          populateViewerFollowing: mockPopulateViewerFollowing,
        })
      );

      render(<EfpFollowingSuggestions />);

      fireEvent.click(screen.getByTestId("efp-following-retry"));
      expect(mockPopulateViewerFollowing).toHaveBeenCalledWith(
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      );
    });
  });

  describe("success", () => {
    it("filters team addresses and copies suggestion address", () => {
      vi.mocked(useEFP).mockImplementation((selector) =>
        selector({
          viewerFollowing: [
            {
              version: 1,
              record_type: "address",
              data: "0x1111111111111111111111111111111111111111",
              address: "0x1111111111111111111111111111111111111111",
              tags: [],
            },
            {
              version: 1,
              record_type: "address",
              data: SUGGESTION_ADDR,
              address: SUGGESTION_ADDR,
              tags: [],
            },
          ],
          isFetchingFollowing: false,
          followingError: false,
          populateViewerFollowing: mockPopulateViewerFollowing,
        })
      );

      render(<EfpFollowingSuggestions />);

      expect(screen.getAllByTestId("efp-following-suggestion-row")).toHaveLength(1);

      fireEvent.click(screen.getByLabelText(`Copy ${SUGGESTION_ADDR}`));
      expect(mockCopy).toHaveBeenCalledWith(SUGGESTION_ADDR);
    });
  });

  describe("empty", () => {
    it("shows empty message when no suggestions", () => {
      render(<EfpFollowingSuggestions />);

      expect(screen.getByText(/No new suggestions/i)).toBeInTheDocument();
    });
  });
});
