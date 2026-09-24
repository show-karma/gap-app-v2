"use client";

import { CpuChipIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SimocracyCouncilSim } from "@/services/fundingApplicationIntegrations.service";
import { ReviewerPicker } from "./ReviewerPicker";
import { SimLinkChips } from "./SimLinkChips";
import {
  addressSchema,
  CUSTOM_ADDRESS_VALUE,
  CUSTOM_SIM_VALUE,
  type ReviewerOption,
  simUriSchema,
  truncateMiddle,
} from "./sim-link.shared";

// Admins pick a reviewer (or type an address); reviewers can only link their own.
function resolveAddress(input: {
  canManage: boolean;
  isCustomAddress: boolean;
  address: string;
  selectedReviewer: string;
  viewerAddress?: string;
}): string {
  if (!input.canManage) return input.viewerAddress ?? "";
  return input.isCustomAddress ? input.address : input.selectedReviewer;
}

interface SimLinkFormProps {
  canManage: boolean;
  viewerAddress?: string;
  unlinkedSims: SimocracyCouncilSim[];
  simlessReviewers: ReviewerOption[];
  programReviewerOptions: ReviewerOption[];
  communityReviewerOptions: ReviewerOption[];
  hasReviewerOptions: boolean;
  isLoadingReviewers: boolean;
  addSimLinkAsync: (input: { simUri: string; publicAddress: string }) => Promise<unknown>;
  isAdding: boolean;
}

/**
 * The "add a link" form plus the unlinked-sim / sim-less-reviewer chips that
 * pre-fill it. Owns the draft state so SimLinksCard only lists links.
 */
export const SimLinkForm: FC<SimLinkFormProps> = ({
  canManage,
  viewerAddress,
  unlinkedSims,
  simlessReviewers,
  programReviewerOptions,
  communityReviewerOptions,
  hasReviewerOptions,
  isLoadingReviewers,
  addSimLinkAsync,
  isAdding,
}) => {
  const [selectedSim, setSelectedSim] = useState<string>("");
  const [customSimUri, setCustomSimUri] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isCustom = selectedSim === CUSTOM_SIM_VALUE || (!canManage && unlinkedSims.length === 0);

  const isCustomAddress =
    selectedReviewer === CUSTOM_ADDRESS_VALUE || (!isLoadingReviewers && !hasReviewerOptions);

  const handleAdd = async () => {
    const parsedUri = simUriSchema.safeParse(isCustom ? customSimUri : selectedSim);
    if (!parsedUri.success) {
      setFormError(parsedUri.error.issues[0]?.message ?? "Invalid sim AT-URI");
      return;
    }
    const parsedAddress = addressSchema.safeParse(
      resolveAddress({ canManage, isCustomAddress, address, selectedReviewer, viewerAddress })
    );
    if (!parsedAddress.success) {
      const needsReviewer = canManage && !isCustomAddress && !selectedReviewer;
      setFormError(
        needsReviewer
          ? "Select a reviewer"
          : (parsedAddress.error.issues[0]?.message ?? "Invalid address")
      );
      return;
    }
    setFormError(null);
    try {
      await addSimLinkAsync({ simUri: parsedUri.data, publicAddress: parsedAddress.data });
      resetDraft();
    } catch {
      // SUPPRESSED: the mutation's onError owns the failure toast; the form
      // keeps its values so the user can correct and retry.
    }
  };

  const resetDraft = () => {
    setSelectedSim("");
    setCustomSimUri("");
    if (canManage) {
      setAddress("");
      setSelectedReviewer("");
    }
  };

  return (
    <>
      <SimLinkChips
        canManage={canManage}
        unlinkedSims={unlinkedSims}
        simlessReviewers={simlessReviewers}
        onPickSim={(simUri) => {
          setSelectedSim(simUri);
          if (formError) setFormError(null);
        }}
        onPickReviewer={(publicAddress) => {
          setSelectedReviewer(publicAddress);
          if (formError) setFormError(null);
        }}
      />

      <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Add a link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="space-y-2 sm:w-64">
            <ReviewerPicker
              canManage={canManage}
              viewerAddress={viewerAddress}
              hasReviewerOptions={hasReviewerOptions}
              isLoadingReviewers={isLoadingReviewers}
              programReviewerOptions={programReviewerOptions}
              communityReviewerOptions={communityReviewerOptions}
              selectedReviewer={selectedReviewer}
              onSelectReviewer={(value) => {
                setSelectedReviewer(value);
                if (formError) setFormError(null);
              }}
              isCustomAddress={isCustomAddress}
              address={address}
              onAddressChange={(value) => {
                setAddress(value);
                if (formError) setFormError(null);
              }}
            />
          </div>
          <div className="flex-1 space-y-2">
            {(canManage || unlinkedSims.length > 0) && (
              <Select
                value={selectedSim}
                onValueChange={(value) => {
                  setSelectedSim(value);
                  if (formError) setFormError(null);
                }}
              >
                <SelectTrigger aria-label="Select a sim">
                  <SelectValue
                    placeholder={
                      unlinkedSims.length > 0
                        ? `Select a sim — ${unlinkedSims.length} unlinked`
                        : "Select a sim — all linked"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedSims.map((sim) => (
                    <SelectItem key={sim.simUri} value={sim.simUri}>
                      <span className="flex items-center gap-2">
                        {sim.avatar ? (
                          <ProfilePicture
                            imageURL={sim.avatar}
                            name={sim.simName ?? sim.simUri}
                            size="20"
                            className="h-5 w-5 rounded [image-rendering:pixelated]"
                            alt=""
                          />
                        ) : (
                          <CpuChipIcon className="h-4 w-4 text-gray-400" />
                        )}
                        {sim.simName ?? truncateMiddle(sim.simUri, 16, 8)}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_SIM_VALUE}>Custom AT-URI…</SelectItem>
                </SelectContent>
              </Select>
            )}
            {isCustom && (
              <Input
                type="text"
                value={customSimUri}
                onChange={(event) => {
                  setCustomSimUri(event.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="at://did:plc:…/org.simocracy.sim/…"
                spellCheck={false}
                aria-label="Sim AT-URI"
                className="font-mono"
              />
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={isAdding}
            isLoading={isAdding}
            className="shrink-0"
          >
            Add link
          </Button>
        </div>
        {formError ? (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
            {formError}
          </p>
        ) : (
          !canManage && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              As a reviewer you can only link a sim to your own connected address.
            </p>
          )
        )}
      </div>
    </>
  );
};
