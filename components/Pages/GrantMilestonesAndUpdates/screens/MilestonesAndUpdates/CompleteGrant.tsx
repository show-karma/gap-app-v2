"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useGrantStore } from "@/store/grant";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Hex } from "viem";
import { useAccount } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { isFundingProgramGrant } from "@/constants/funding-programs";
import { FundingProgramFields } from "./CompletionRequirements/FundingProgramFields";
import { TrackExplanations } from "./CompletionRequirements/TrackExplanations";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { useTracksForProgram } from "@/hooks/useTracks";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

export const GrantCompletion: FC = () => {
  const { grant } = useGrantStore();
  const { project } = useProjectStore();
  const [description, setDescription] = useState("");
  const [pitchDeckLink, setPitchDeckLink] = useState("");
  const [demoVideoLink, setDemoVideoLink] = useState("");
  const [trackExplanations, setTrackExplanations] = useState<
    Array<{ trackUID: string; explanation: string }>
  >([]);
  const [isFundingProgram, setIsFundingProgram] = useState(false);

  // Get tracks for the program to check if they exist
  const programIdWithChain = grant?.details?.data?.programId;
  const { data: availableTracks = [] } = useTracksForProgram(programIdWithChain || '');

  // Validation states
  const [validationErrors, setValidationErrors] = useState<{
    pitchDeckLink?: boolean;
    demoVideoLink?: boolean;
    tracks?: boolean;
    trackExplanations?: boolean;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();

  // Check if grant is from a funding program (by community or grant name)
  useEffect(() => {
    const checkFundingProgram = async () => {
      if (grant) {
        // First check by grant name
        const grantName = grant?.details?.data?.title || "";
        if (isFundingProgramGrant(undefined, grantName)) {
          setIsFundingProgram(false);
          return;
        }

        // Then check by community if available
        if (grant?.community) {
          try {
            // Handle both string and object community
            const communityId = typeof grant.community === 'string'
              ? grant.community
              : grant.community.uid;

            const response = await gapIndexerApi.communityBySlug(communityId);
            if (response.data) {
              const communityName = response.data.details?.data?.name || "";
              setIsFundingProgram(isFundingProgramGrant(communityName, grantName));
            }
          } catch (error) {
            console.error("Error fetching community:", error);
          }
        }
      }
    };

    checkFundingProgram();
  }, [grant?.community, grant?.details?.data?.title]);

  useEffect(() => {
    if (grant?.details?.data?.selectedTrackIds) {
      setTrackExplanations(grant.details.data.selectedTrackIds.map(trackId => ({
        trackUID: trackId,
        explanation: ""
      })));
    }
  }, [grant?.details?.data?.selectedTrackIds]);

  const markGrantAsComplete = async (
    grantToComplete: IGrantResponse,
    data: {
      text?: string;
      title?: string;
      pitchDeckLink?: string;
      demoVideoLink?: string;
      trackExplanations?: Array<{ trackUID: string; explanation: string }>;
    }
  ) => {
    let gapClient = gap;
    try {
      if (
        !checkNetworkIsValid(chain?.id) ||
        chain?.id !== grantToComplete.chainID
      ) {
        await switchChainAsync?.({ chainId: grantToComplete.chainID });
        gapClient = getGapClient(grantToComplete.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(
        grantToComplete.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) return;
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === grantToComplete.uid.toLowerCase()
      );
      if (!grantInstance) return;
      const sanitizedGrantComplete = sanitizeObject({
        title: data.title || "",
        text: data.text || "",
        ...(data.pitchDeckLink && { pitchDeckLink: data.pitchDeckLink }),
        ...(data.demoVideoLink && { demoVideoLink: data.demoVideoLink }),
        ...(data.trackExplanations && data.trackExplanations.length > 0 && {
          trackExplanations: data.trackExplanations
        }),
      });
      await grantInstance
        .complete(walletSigner, sanitizedGrantComplete, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grant?.chainID as number),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(project?.uid as Hex)
              .catch(() => null);
            const grant = fetchedProject?.grants?.find(
              (g) => g.uid === grantToComplete.uid
            );
            if (grant && grant.completed) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
              await refreshProject().then(() => {
                router.push(
                  PAGES.PROJECT.GRANT(
                    project?.details?.data.slug || (project?.uid as Hex),
                    grant?.uid as Hex
                  )
                );
                router.refresh();
              });
            }
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        });
    } catch (error: any) {
      errorManager(
        MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR,
        error,
        { grantUID: grant?.uid, address },
        { error: MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR }
      );
    } finally {
      setIsStepper(false);
    }
  };

  const onSubmit = async () => {
    // Clear previous validation errors
    setValidationErrors({});

    // Validation for funding programs
    if (isFundingProgram) {
      const errors: typeof validationErrors = {};
      let firstErrorField: string | null = null;

      if (!pitchDeckLink || !pitchDeckLink.trim()) {
        errors.pitchDeckLink = true;
        if (!firstErrorField) firstErrorField = 'pitch-deck-link';
      }
      if (!demoVideoLink || !demoVideoLink.trim()) {
        errors.demoVideoLink = true;
        if (!firstErrorField) firstErrorField = 'demo-video-link';
      }

      // Only validate tracks if there are tracks available for the program
      if (availableTracks.length > 0) {
        if (trackExplanations.length === 0) {
          errors.tracks = true;
          if (!firstErrorField) firstErrorField = 'track-selection';
        }
        // Check if all selected tracks have explanations
        const missingExplanations = trackExplanations.some(te => !te.explanation || te.explanation.trim() === '');
        if (missingExplanations) {
          errors.trackExplanations = true;
          if (!firstErrorField) firstErrorField = 'track-explanations';
        }
      }

      // If there are errors, set them and scroll to first error
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);

        // Scroll to first error field
        if (firstErrorField) {
          setTimeout(() => {
            const element = firstErrorField ? document.getElementById(firstErrorField) : null;
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Try to focus if it's an input
              if (element instanceof HTMLInputElement) {
                element.focus();
              }
            }
          }, 100);
        }
        return;
      }
    }

    setIsLoading(true);
    await markGrantAsComplete(grant as IGrantResponse, {
      text: description,
      ...(isFundingProgram && {
        pitchDeckLink,
        demoVideoLink,
        trackExplanations,
      }),
    }).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <div className="mt-9 flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-800 px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Grant completion summary
          </h4>
          <Link
            href={PAGES.PROJECT.GRANT(
              project?.details?.data.slug || (project?.uid as Hex),
              grant?.uid as Hex
            )}
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
          >
            <XMarkIcon className="h-6 w-6 " />
          </Link>
        </div>
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="completion-description" className={labelStyle}>
              Description (optional)
            </label>
            <div className="w-full bg-transparent" data-color-mode="light">
              <MarkdownEditor
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
                placeholderText="Summarize your grant work, your experience working on the grant and the potential impact it will have."
              />
            </div>
          </div>

          {isFundingProgram && (
            <>
              <FundingProgramFields
                pitchDeckLink={pitchDeckLink}
                demoVideoLink={demoVideoLink}
                onPitchDeckChange={(value) => {
                  setPitchDeckLink(value);
                  // Clear error when user starts typing
                  if (validationErrors.pitchDeckLink) {
                    setValidationErrors(prev => ({ ...prev, pitchDeckLink: false }));
                  }
                }}
                onDemoVideoChange={(value) => {
                  setDemoVideoLink(value);
                  // Clear error when user starts typing
                  if (validationErrors.demoVideoLink) {
                    setValidationErrors(prev => ({ ...prev, demoVideoLink: false }));
                  }
                }}
                errors={validationErrors}
              />

              <TrackExplanations
                programId={programIdWithChain}
                trackExplanations={trackExplanations}
                onTrackExplanationsChange={(explanations) => {
                  setTrackExplanations(explanations);
                  // Clear errors when user makes changes
                  if (explanations.length > 0 && validationErrors.tracks) {
                    setValidationErrors(prev => ({ ...prev, tracks: false }));
                  }
                  if (explanations.every(te => te.explanation.trim() !== '') && validationErrors.trackExplanations) {
                    setValidationErrors(prev => ({ ...prev, trackExplanations: false }));
                  }
                }}
                errors={validationErrors}
              />
            </>
          )}

          <div className="flex w-full flex-row-reverse">
            <Button
              onClick={() => onSubmit()}
              className="flex w-max flex-row bg-[#17B26A] text-white hover:bg-[#17B26A]"
              disabled={isLoading}
              isLoading={isLoading}
            >
              Mark grant as complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
