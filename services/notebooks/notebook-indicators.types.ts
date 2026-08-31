export const NOTEBOOK_TIME_RANGE_PRESETS = ["30d", "90d", "12m", "all"] as const;

export type NotebookTimeRangePreset = (typeof NOTEBOOK_TIME_RANGE_PRESETS)[number];

export interface NotebookIndicatorOption {
  id: string;
  label: string;
  description: string;
  unit: string;
  kernelId: string | null;
  /** Owning community, or null when the indicator belongs to no one. */
  communityUID: string | null;
  syncType: "auto" | "manual" | null;
}

/**
 * Whether the BUILDER may offer this indicator, without knowing the
 * community's chain variants.
 *
 * DELIBERATELY NARROWER THAN THE SERVER RULE, and the difference is the whole
 * comment. The indexer decides ownership against every chain variant of the
 * logical community, resolved by the same authorizer that grants admin. The
 * browser has only a single `community.uid` — comparing against that alone
 * would reject an admin selecting an indicator owned by their own community on
 * another chain, which is precisely the drift resolving variants exists to
 * prevent.
 *
 * So rather than implement the rule wrongly, the picker offers only what is
 * decidable without variants: kernel indicators (network-wide) and unowned
 * ones (global). The server stays authoritative and would accept more.
 *
 * KNOWN GAP: a community that OWNS indicators will not be offered its own.
 * Filecoin owns none today, so nothing is currently withheld. Closing it needs
 * either a community-scoped catalogue endpoint or the variant set exposed to
 * the client — neither invented here.
 */
export function isIndicatorOfferableWithoutVariants(
  indicator: Pick<NotebookIndicatorOption, "kernelId" | "communityUID">
): boolean {
  return Boolean(indicator.kernelId) || !indicator.communityUID;
}

export interface NotebookIndicatorCatalog {
  total: number;
  indicators: NotebookIndicatorOption[];
}

export interface NotebookTimeSeriesPoint {
  /** UTC day represented by the datapoint's endDate. */
  date: string;
  value: number;
}

export interface NotebookIndicatorSeries {
  indicator: Omit<NotebookIndicatorOption, "syncType">;
  preset: NotebookTimeRangePreset;
  points: NotebookTimeSeriesPoint[];
  /** Latest valid point before preset filtering; supports an honest empty-window state. */
  latestPoint: NotebookTimeSeriesPoint | null;
  receivedPointCount: number;
  /** Empty, null, or non-finite numeric values excluded from the chart. */
  discardedPointCount: number;
  /** Valid older corrections replaced by a later-updated row for the same day. */
  supersededPointCount: number;
}
