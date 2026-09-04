"use client";
import { useTracksForCommunity } from "@/hooks/useTracks";
import { SearchWithValueDropdown } from "./SearchWithValueDropdown";

// Copied verbatim from ProgramFilter's label: this control sits in the exact
// same slot for one community, so the two must be pixel-identical. The 11px /
// 0.06em pair has no equivalent on the type or tracking scale, and adding one
// for a single label would change how the shared ProgramFilter renders for
// every other community.
const LABEL_CLASSNAME =
  // design-check-ignore: DS006 matches the ProgramFilter label this control replaces
  "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

interface TrackAsProgramFilterProps {
  /** Community UID (not slug) — the tracks list is fetched per-community. */
  communityUid: string;
  selectedTrackId?: string | null;
  onChange: (trackId: string | null) => void;
}

/**
 * Primary explorer dropdown for communities in
 * {@link import("@/utilities/community-flags").TRACKS_AS_PRIMARY_EXPLORER_FACET} —
 * lists the community's Tracks instead of its Programs. Single-select, same
 * look as {@link import("./ProgramFilter").ProgramFilter}; label text stays
 * "Choose Program" to match the tenant's own vocabulary. Tracks with 0
 * projects are still listed — the list is the community's track catalog, not
 * a computed "tracks with projects" set.
 */
export const TrackAsProgramFilter = ({
  communityUid,
  selectedTrackId,
  onChange,
}: TrackAsProgramFilterProps) => {
  const { data, isLoading } = useTracksForCommunity(communityUid);
  const tracks =
    data?.map((track) => ({
      title: track.name,
      value: track.id,
    })) ?? [];
  const selectedTrack = tracks.find((track) => track.value === selectedTrackId);

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[220px] max-w-[400px]">
      <label htmlFor="filter-by-programs" className={LABEL_CLASSNAME}>
        Choose Program
      </label>

      <SearchWithValueDropdown
        id="filter-by-programs"
        list={tracks}
        onSelectFunction={(value: string) => onChange(value)}
        type="Programs"
        selected={selectedTrack ? [selectedTrack.title] : []}
        prefixUnselected="All"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        isLoading={isLoading}
        cleanFunction={() => onChange(null)}
      />
    </div>
  );
};
