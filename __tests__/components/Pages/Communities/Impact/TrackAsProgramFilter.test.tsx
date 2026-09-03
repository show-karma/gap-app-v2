import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrackAsProgramFilter } from "@/components/Pages/Communities/Impact/TrackAsProgramFilter";
import { useTracksForCommunity } from "@/hooks/useTracks";
import type { Track } from "@/services/tracks";

vi.mock("@/hooks/useTracks", () => ({
  useTracksForCommunity: vi.fn(),
}));

const mockUseTracksForCommunity = useTracksForCommunity as unknown as ReturnType<typeof vi.fn>;

const makeTrack = (overrides: Partial<Track>): Track => ({
  id: "track-1",
  name: "Kernel",
  communityUID: "0xcommunity",
  isArchived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("TrackAsProgramFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the 'Choose Program' label", () => {
    mockUseTracksForCommunity.mockReturnValue({ data: [], isLoading: false });

    render(
      <TrackAsProgramFilter communityUid="0xcommunity" selectedTrackId={null} onChange={vi.fn()} />
    );

    expect(screen.getByText("Choose Program")).toBeInTheDocument();
  });

  it("lists every track returned for the community, including ones with 0 projects", () => {
    mockUseTracksForCommunity.mockReturnValue({
      data: [
        makeTrack({ id: "track-kernel", name: "Kernel" }),
        makeTrack({ id: "track-rd", name: "R&D" }),
        makeTrack({ id: "track-rev", name: "Revenue Development" }),
      ],
      isLoading: false,
    });

    render(
      <TrackAsProgramFilter communityUid="0xcommunity" selectedTrackId={null} onChange={vi.fn()} />
    );

    expect(useTracksForCommunity).toHaveBeenCalledWith("0xcommunity");
    expect(screen.getByText("All Programs")).toBeInTheDocument();
  });

  it("calls onChange with the selected track id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockUseTracksForCommunity.mockReturnValue({
      data: [makeTrack({ id: "track-kernel", name: "Kernel" })],
      isLoading: false,
    });

    render(
      <TrackAsProgramFilter communityUid="0xcommunity" selectedTrackId={null} onChange={onChange} />
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Kernel"));

    expect(onChange).toHaveBeenCalledWith("track-kernel");
  });

  it("shows the selected track's name", () => {
    mockUseTracksForCommunity.mockReturnValue({
      data: [makeTrack({ id: "track-kernel", name: "Kernel" })],
      isLoading: false,
    });

    render(
      <TrackAsProgramFilter
        communityUid="0xcommunity"
        selectedTrackId="track-kernel"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Kernel")).toBeInTheDocument();
  });
});
