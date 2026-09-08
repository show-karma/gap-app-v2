"use client";

import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import type { Track } from "@/services/tracks";

// Copied verbatim from ProgramFilter's label: this control sits beside it, so
// the two must be pixel-identical. The 11px / 0.06em pair has no equivalent on
// the type or tracking scale, and adding one for a single label would change
// how the shared ProgramFilter renders everywhere.
const LABEL_CLASSNAME =
  // design-check-ignore: DS006 matches the ProgramFilter label beside it
  "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

interface CommunityTrackFilterProps {
  /**
   * The community's tracks. The parent fetches them and decides whether to
   * render this control at all (only when `tracks.length > 0`).
   */
  tracks: Track[];
  selectedTrackId: string | null;
  /** `null` is the "All Tracks" option. */
  onChange: (trackId: string | null) => void;
  /** Input id, defaults to "filter-by-tracks". */
  id?: string;
}

/**
 * Single-select dropdown over a community's tracks, same look as
 * {@link import("./ProgramFilter").ProgramFilter}. Purely presentational: the
 * parent owns the fetch and the selection. Tracks with 0 projects are still
 * listed — the list is the community's track catalog, not a computed "tracks
 * with projects" set.
 */
export const CommunityTrackFilter = ({
  tracks,
  selectedTrackId,
  onChange,
  id = "filter-by-tracks",
}: CommunityTrackFilterProps) => {
  const list = tracks.map((track) => ({ title: track.name, value: track.id }));
  const selectedTrack = list.find((track) => track.value === selectedTrackId);

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[220px] max-w-[400px]">
      <label htmlFor={id} className={LABEL_CLASSNAME}>
        Choose Track
      </label>

      <SearchWithValueDropdown
        id={id}
        list={list}
        onSelectFunction={(value: string) => onChange(value)}
        type="Tracks"
        selected={selectedTrack ? [selectedTrack.title] : []}
        prefixUnselected="All"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        cleanFunction={() => onChange(null)}
      />
    </div>
  );
};
