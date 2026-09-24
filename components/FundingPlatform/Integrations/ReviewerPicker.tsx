"use client";

import type { FC } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shortAddress } from "@/utilities/shortAddress";
import { CUSTOM_ADDRESS_VALUE, type ReviewerOption } from "./sim-link.shared";

interface ReviewerPickerProps {
  canManage: boolean;
  viewerAddress?: string;
  hasReviewerOptions: boolean;
  isLoadingReviewers: boolean;
  programReviewerOptions: ReviewerOption[];
  communityReviewerOptions: ReviewerOption[];
  selectedReviewer: string;
  onSelectReviewer: (value: string) => void;
  isCustomAddress: boolean;
  address: string;
  onAddressChange: (value: string) => void;
}

/** Admins pick a reviewer (or type an address); a plain reviewer sees their own address, locked. */
export const ReviewerPicker: FC<ReviewerPickerProps> = ({
  canManage,
  viewerAddress,
  hasReviewerOptions,
  isLoadingReviewers,
  programReviewerOptions,
  communityReviewerOptions,
  selectedReviewer,
  onSelectReviewer,
  isCustomAddress,
  address,
  onAddressChange,
}) => (
  <>
    {canManage ? (
      <>
        {(hasReviewerOptions || isLoadingReviewers) && (
          <Select
            value={selectedReviewer}
            onValueChange={onSelectReviewer}
            disabled={isLoadingReviewers && !hasReviewerOptions}
          >
            <SelectTrigger aria-label="Select a reviewer">
              <SelectValue
                placeholder={
                  isLoadingReviewers && !hasReviewerOptions
                    ? "Loading reviewers…"
                    : "Select a reviewer"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {programReviewerOptions.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Program reviewers</SelectLabel>
                  {programReviewerOptions.map((reviewer) => (
                    <SelectItem key={reviewer.publicAddress} value={reviewer.publicAddress}>
                      <span className="flex items-center gap-2">
                        <span className="truncate">{reviewer.name || reviewer.email}</span>
                        <span className="shrink-0 font-mono text-xs text-gray-400">
                          {shortAddress(reviewer.publicAddress)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {communityReviewerOptions.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Community reviewers</SelectLabel>
                  {communityReviewerOptions.map((reviewer) => (
                    <SelectItem key={reviewer.publicAddress} value={reviewer.publicAddress}>
                      <span className="flex items-center gap-2">
                        <span className="truncate">{reviewer.name || reviewer.email}</span>
                        <span className="shrink-0 font-mono text-xs text-gray-400">
                          {shortAddress(reviewer.publicAddress)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              <SelectItem value={CUSTOM_ADDRESS_VALUE}>Custom address…</SelectItem>
            </SelectContent>
          </Select>
        )}
        {isCustomAddress && (
          <Input
            type="text"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="0x…"
            spellCheck={false}
            aria-label="Reviewer address"
            className="font-mono"
          />
        )}
      </>
    ) : (
      <Input
        type="text"
        value={viewerAddress ?? ""}
        disabled
        placeholder="0x…"
        spellCheck={false}
        aria-label="Reviewer address"
        title="Reviewers can only link sims to their own address"
        className="font-mono"
      />
    )}
  </>
);
