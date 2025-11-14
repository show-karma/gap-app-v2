"use client"
import type React from "react"
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor"
import { useTracksForProgram } from "@/hooks/useTracks"
import type { Track } from "@/services/tracks"
import { TrackSelection } from "../../NewGrant/TrackSelection"

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100"

interface TrackExplanation {
  trackUID: string
  explanation: string
}

interface TrackExplanationsProps {
  programId?: string
  trackExplanations: TrackExplanation[]
  onTrackExplanationsChange: (explanations: TrackExplanation[]) => void
  errors?: {
    trackExplanations?: boolean
  }
}

export const TrackExplanations: React.FC<TrackExplanationsProps> = ({
  programId,
  trackExplanations,
  onTrackExplanationsChange,
  errors = {},
}) => {
  const { data: tracks = [] } = useTracksForProgram(programId as string)

  const selectedTrackIds = trackExplanations.map((te) => te.trackUID)

  const handleTrackSelectionChange = (trackIds: string[]) => {
    // Update track explanations based on selection
    const currentExplanations = new Map(
      trackExplanations.map((te) => [te.trackUID, te.explanation])
    )

    const newExplanations = trackIds.map((trackId) => ({
      trackUID: trackId,
      explanation: currentExplanations.get(trackId) || "",
    }))

    onTrackExplanationsChange(newExplanations)
  }

  const handleExplanationChange = (trackUID: string, explanation: string) => {
    const updated = trackExplanations.map((te) =>
      te.trackUID === trackUID ? { ...te, explanation } : te
    )
    onTrackExplanationsChange(updated)
  }

  const getExplanation = (trackUID: string): string => {
    const trackExplanation = trackExplanations.find((te) => te.trackUID === trackUID)
    return trackExplanation?.explanation || ""
  }

  const getTrackName = (trackId: string): string => {
    const track = tracks.find((t: Track) => t.id === trackId)
    return track?.name || "Track"
  }

  if (!programId || tracks.length === 0) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Track selection - optional */}
      <div id="track-selection">
        <TrackSelection
          programId={programId} // Already formatted as programId_chainId
          selectedTrackIds={selectedTrackIds}
          onTrackSelectionChange={handleTrackSelectionChange}
          disabled={false}
        />
      </div>

      {/* Show explanation fields for selected tracks only if tracks exist */}
      {tracks.length > 0 && selectedTrackIds.length > 0 && (
        <div id="track-explanations" className="space-y-4 mt-4">
          <p className={labelStyle}>
            Explain how your project integrates with each selected track{" "}
            <span className="text-red-500">*</span>
          </p>
          {errors.trackExplanations && (
            <p className="text-xs text-red-500">
              Explanations are required for all selected tracks
            </p>
          )}
          {selectedTrackIds.map((trackId) => {
            const explanation = getExplanation(trackId)
            const hasError = errors.trackExplanations && (!explanation || explanation.trim() === "")

            return (
              <div
                key={trackId}
                className={hasError ? "p-2 rounded-md border-2 border-red-500" : ""}
              >
                <label className="font-medium text-black dark:text-zinc-100 block mb-2">
                  {getTrackName(trackId)} <span className="text-red-500">*</span>
                </label>
                <div className="w-full bg-transparent" data-color-mode="light">
                  <MarkdownEditor
                    value={explanation}
                    onChange={(newValue: string) =>
                      handleExplanationChange(trackId, newValue || "")
                    }
                    placeholderText={`Explain how your project addresses the ${getTrackName(trackId)} track (required)`}
                  />
                </div>
                {hasError && (
                  <p className="text-xs text-red-500 mt-1">This explanation is required</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
