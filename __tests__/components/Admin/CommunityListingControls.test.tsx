import { act, fireEvent, render, screen } from "@testing-library/react";
import { CommunityListingControls } from "@/components/Pages/Admin/CommunityListingControls";
import {
  type CommunityConfig,
  useCommunityConfig,
  useCommunityConfigMutation,
} from "@/hooks/useCommunityConfig";
import "@testing-library/jest-dom";

vi.mock("@/hooks/useCommunityConfig", () => ({
  useCommunityConfig: vi.fn(),
  useCommunityConfigMutation: vi.fn(),
}));

const mockUseCommunityConfig = useCommunityConfig as ReturnType<typeof vi.fn>;
const mockUseCommunityConfigMutation = useCommunityConfigMutation as ReturnType<typeof vi.fn>;

const mockMutate = vi.fn();

const setConfig = (config: CommunityConfig | null, isLoading = false) => {
  mockUseCommunityConfig.mockReturnValue({ data: config, isLoading });
};

const setMutation = (overrides: Partial<{ isPending: boolean; isError: boolean }> = {}) => {
  mockUseCommunityConfigMutation.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    ...overrides,
  });
};

const renderControls = (slug = "filecoin", name = "Filecoin") =>
  render(<CommunityListingControls slug={slug} communityName={name} />);

beforeEach(() => {
  vi.clearAllMocks();
  setMutation();
});

describe("CommunityListingControls", () => {
  describe("loading state", () => {
    it("renders skeletons and no controls while the config is loading", () => {
      setConfig(null, true);
      renderControls();

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });
  });

  describe("public default semantics", () => {
    it("treats a null config as public (checkbox checked, rank 0)", () => {
      setConfig(null);
      renderControls();

      expect(screen.getByRole("checkbox")).toBeChecked();
      expect(screen.getByRole("spinbutton")).toHaveValue(0);
    });

    it("treats an unset public field as public", () => {
      setConfig({ rank: 3 });
      renderControls();

      expect(screen.getByRole("checkbox")).toBeChecked();
      expect(screen.getByRole("spinbutton")).toHaveValue(3);
    });

    it("only an explicit false unchecks the box", () => {
      setConfig({ public: false, rank: 7 });
      renderControls();

      expect(screen.getByRole("checkbox")).not.toBeChecked();
      expect(screen.getByRole("spinbutton")).toHaveValue(7);
    });
  });

  describe("public toggle", () => {
    it("saves immediately, carrying the current rank", () => {
      setConfig({ public: true, rank: 4 });
      renderControls();

      fireEvent.click(screen.getByRole("checkbox"));

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        slug: "filecoin",
        config: { public: false, rank: 4 },
      });
    });
  });

  describe("rank input", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("debounces the rank save and sends the new rank with the current public flag", () => {
      setConfig({ public: true, rank: 0 });
      renderControls();

      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "12" } });

      // Nothing fires before the debounce window elapses.
      expect(mockMutate).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        slug: "filecoin",
        config: { public: true, rank: 12 },
      });
    });

    it("does not save when the rank is unchanged from the server value", () => {
      setConfig({ public: true, rank: 5 });
      renderControls();

      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5" } });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("ignores negative rank input", () => {
      setConfig({ public: true, rank: 2 });
      renderControls();

      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "-1" } });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(mockMutate).not.toHaveBeenCalled();
      expect(screen.getByRole("spinbutton")).toHaveValue(2);
    });
  });

  describe("pending state", () => {
    it("disables both controls while a save is in flight", () => {
      setConfig({ public: true, rank: 1 });
      setMutation({ isPending: true });
      renderControls();

      expect(screen.getByRole("checkbox")).toBeDisabled();
      expect(screen.getByRole("spinbutton")).toBeDisabled();
    });
  });

  describe("error state", () => {
    it("surfaces a retry message when the save fails", () => {
      setConfig({ public: true, rank: 1 });
      setMutation({ isError: true });
      renderControls();

      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });
});
