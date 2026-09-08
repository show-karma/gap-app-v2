import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityTrackFilter } from "@/components/Pages/Communities/Impact/CommunityTrackFilter";
import type { Track } from "@/services/tracks";

const makeTrack = (overrides: Partial<Track>): Track => ({
  id: "track-1",
  name: "Kernel",
  communityUID: "0xcommunity",
  isArchived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const tracks = [
  makeTrack({ id: "track-kernel", name: "Kernel" }),
  makeTrack({ id: "track-rd", name: "R&D" }),
  makeTrack({ id: "track-rev", name: "Revenue Development" }),
];

describe("CommunityTrackFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // "Choose Program" over a list of tracks is the confusion this whole feature
  // exists to undo, so the label is worth asserting on its own.
  it("labels itself 'Choose Track', not 'Choose Program'", () => {
    render(<CommunityTrackFilter tracks={tracks} selectedTrackId={null} onChange={vi.fn()} />);

    expect(screen.getByText("Choose Track")).toBeInTheDocument();
    expect(screen.queryByText("Choose Program")).not.toBeInTheDocument();
  });

  it("reads 'All Tracks' when nothing is selected", () => {
    render(<CommunityTrackFilter tracks={tracks} selectedTrackId={null} onChange={vi.fn()} />);

    expect(screen.getByText("All Tracks")).toBeInTheDocument();
  });

  it("lists every track it is given, including ones with 0 projects", async () => {
    const user = userEvent.setup();
    render(<CommunityTrackFilter tracks={tracks} selectedTrackId={null} onChange={vi.fn()} />);

    await user.click(screen.getByLabelText("Choose Track"));

    expect(await screen.findByRole("button", { name: "Kernel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R&D" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revenue Development" })).toBeInTheDocument();
  });

  it("calls onChange with the selected track id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CommunityTrackFilter tracks={tracks} selectedTrackId={null} onChange={onChange} />);

    await user.click(screen.getByLabelText("Choose Track"));
    await user.click(await screen.findByRole("button", { name: "Kernel" }));

    expect(onChange).toHaveBeenCalledWith("track-kernel");
  });

  // null is the contract's "All Tracks", and the parent turns it back into "".
  it("calls onChange with null when 'All Tracks' is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CommunityTrackFilter tracks={tracks} selectedTrackId="track-kernel" onChange={onChange} />
    );

    await user.click(screen.getByLabelText("Choose Track"));
    await user.click(await screen.findByRole("button", { name: "All Tracks" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the selected track's name on the trigger", () => {
    render(<CommunityTrackFilter tracks={tracks} selectedTrackId="track-rd" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Choose Track")).toHaveTextContent("R&D");
  });

  // The parent gates rendering on tracks.length > 0 and passes an id per slot,
  // so the label stays wired to its own control when both dropdowns are up.
  it("uses the id it is given so the label targets the right control", () => {
    render(
      <CommunityTrackFilter
        tracks={tracks}
        selectedTrackId={null}
        onChange={vi.fn()}
        id="custom-track-filter"
      />
    );

    expect(screen.getByLabelText("Choose Track")).toHaveAttribute("id", "custom-track-filter");
  });
});
