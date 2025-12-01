"use client";
import { XMarkIcon } from "@heroicons/react/24/solid";
import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useGap } from "@/hooks/useGap";
import { useTracksForProgram } from "@/hooks/useTracks";
import { useWallet } from "@/hooks/useWallet";
import { useProjectStore } from "@/store";
import { useGrantStore } from "@/store/grant";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { isFundingProgramGrant } from "@/utilities/funding-programs";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { FundingProgramFields } from "./CompletionRequirements/FundingProgramFields";
import { TrackExplanations } from "./CompletionRequirements/TrackExplanations";

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
  const { data: availableTracks = [] } = useTracksForProgram(programIdWithChain || "");

  // Validation states
  const [validationErrors, setValidationErrors] = useState<{
    pitchDeckLink?: boolean;
    demoVideoLink?: boolean;
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
            const communityId =
              typeof grant.community === "string" ? grant.community : grant.community.uid;

            const response = await gapIndexerApi.communityBySlug(communityId);
            if (response.data) {
              const communityName = response.data.details?.data?.name || "";
              setIsFundingProgram(isFundingProgramGrant(communityName, grantName));
            }
          } catch (error) {
            errorManager("Error fetching community information for funding program check", error, {
              grantUID: grant?.uid,
              communityId:
                typeof grant.community === "string" ? grant.community : grant.community.uid,
            });
            // Safe fallback: Check only by grant name if community fetch fails
            setIsFundingProgram(isFundingProgramGrant(undefined, grantName));
          }
        }
      }
    };

    checkFundingProgram();
  }, [grant?.community, grant?.details?.data?.title, grant]);

  useEffect(() => {
    if (grant?.details?.data?.selectedTrackIds) {
      setTrackExplanations(
        grant.details.data.selectedTrackIds.map((trackId) => ({
          trackUID: trackId,
          explanation: "",
        }))
      );
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
    let actualChainId: number;

    // Step 1: Ensure correct chain
    try {
      const {
        success,
        chainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: grantToComplete.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        toast.error("Please switch to the correct network and try again");
        setIsLoading(false);
        return;
      }

      actualChainId = chainId;
      gapClient = newGapClient;
    } catch (error) {
      errorManager("Failed to switch to correct chain", error, {
        targetChainId: grantToComplete.chainID,
        currentChainId: chain?.id,
      });
      toast.error("Failed to switch networks. Please switch manually in your wallet.");
      setIsLoading(false);
      return;
    }

    // Step 2: Connect wallet
    let walletClient: any = null;
    try {
      const result = await safeGetWalletClient(actualChainId);
      if (result.error || !result.walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: result.error });
      }
      walletClient = result.walletClient;
    } catch (error) {
      errorManager("Wallet connection failed", error, { chainId: actualChainId });
      toast.error("Failed to connect wallet. Please check that your wallet is unlocked.");
      setIsLoading(false);
      return;
    }

    // Step 3: Execute transaction
    try {
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) {
        const errorMsg =
          "Failed to fetch project data. The project may have been deleted or you may not have permission to access it.";
        errorManager("Project not found when completing grant", new Error(errorMsg), {
          projectUID: project?.uid,
          grantUID: grantToComplete.uid,
          address,
        });
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === grantToComplete.uid.toLowerCase()
      );
      if (!grantInstance) {
        const errorMsg = "Grant not found in project. Please refresh the page and try again.";
        errorManager("Grant instance not found in fetched project", new Error(errorMsg), {
          projectUID: project?.uid,
          grantUID: grantToComplete.uid,
          availableGrants: fetchedProject.grants.map((g) => g.uid),
          address,
        });
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }
      const sanitizedGrantComplete = sanitizeObject({
        title: data.title || "",
        text: data.text || "",
        ...(data.pitchDeckLink && { pitchDeckLink: data.pitchDeckLink }),
        ...(data.demoVideoLink && { demoVideoLink: data.demoVideoLink }),
        ...(data.trackExplanations &&
          data.trackExplanations.length > 0 && {
            trackExplanations: data.trackExplanations,
          }),
      });
      await grantInstance
        .complete(walletSigner, sanitizedGrantComplete, changeStepperStep)
        .then(async (res) => {
          const maxRetries = 40; // 60 seconds total (40 * 1.5s)
          let retries = maxRetries;
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
              .catch((err) => {
                errorManager("Error polling for grant completion", err, {
                  grantUID: grantToComplete.uid,
                  retriesRemaining: retries,
                });
                return null;
              });
            const grant = fetchedProject?.grants?.find((g) => g.uid === grantToComplete.uid);
            if (grant?.completed) {
              changeStepperStep("indexed");
              toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
              await refreshProject().then(() => {
                router.push(
                  PAGES.PROJECT.GRANT(
                    project?.details?.slug || (project?.uid as Hex),
                    grant?.uid as Hex
                  )
                );
                router.refresh();
              });
              return; // Exit function on success
            }

            retries -= 1;
            if (retries > 0) {
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }

          // If we get here, polling timed out
          errorManager(
            "Grant completion indexing timed out",
            new Error(`Grant not indexed after ${maxRetries} attempts`),
            { grantUID: grantToComplete.uid, txHash }
          );
          toast.error(
            "Grant completion is taking longer than expected. Please refresh the page in a moment to see if it completed."
          );
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
        if (!firstErrorField) firstErrorField = "pitch-deck-link";
      }
      if (!demoVideoLink || !demoVideoLink.trim()) {
        errors.demoVideoLink = true;
        if (!firstErrorField) firstErrorField = "demo-video-link";
      }

      // Only validate track explanations if tracks were selected
      if (trackExplanations.length > 0) {
        // Check if all selected tracks have explanations
        const missingExplanations = trackExplanations.some(
          (te) => !te.explanation || te.explanation.trim() === ""
        );
        if (missingExplanations) {
          errors.trackExplanations = true;
          if (!firstErrorField) firstErrorField = "track-explanations";
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
              element.scrollIntoView({ behavior: "smooth", block: "center" });
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
              project?.details?.slug || (project?.uid as Hex),
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
                    setValidationErrors((prev) => ({ ...prev, pitchDeckLink: false }));
                  }
                }}
                onDemoVideoChange={(value) => {
                  setDemoVideoLink(value);
                  // Clear error when user starts typing
                  if (validationErrors.demoVideoLink) {
                    setValidationErrors((prev) => ({ ...prev, demoVideoLink: false }));
                  }
                }}
                errors={validationErrors}
              />

              <TrackExplanations
                programId={programIdWithChain}
                trackExplanations={trackExplanations}
                onTrackExplanationsChange={(explanations) => {
                  setTrackExplanations(explanations);
                  // Clear error when all explanations are provided
                  if (
                    explanations.every((te) => te.explanation.trim() !== "") &&
                    validationErrors.trackExplanations
                  ) {
                    setValidationErrors((prev) => ({ ...prev, trackExplanations: false }));
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
