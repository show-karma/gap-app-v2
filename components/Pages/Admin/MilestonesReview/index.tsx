"use client";

import { Button } from "@/components/Utilities/Button";
import { PAGES } from "@/utilities/pages";
import { ChevronLeftIcon, CheckCircleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchProjectGrantMilestones, updateMilestoneVerification, type MappedMilestone, type ProjectGrantMilestonesResponse } from "@/services/milestones";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { useAccount } from "wagmi";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient } from "@/hooks/useGap";
import { sanitizeObject } from "@/utilities/sanitize";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useWallet } from "@/hooks/useWallet";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";

interface MilestonesReviewPageProps {
  communityId: string;
  projectId: string;
  programId: string;
}

export function MilestonesReviewPage({
  communityId,
  projectId,
  programId,
}: MilestonesReviewPageProps) {
  const [data, setData] = useState<ProjectGrantMilestonesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [verifyingMilestoneId, setVerifyingMilestoneId] = useState<string | null>(null);
  const [verificationComment, setVerificationComment] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { changeStepperStep, setIsStepper } = useStepper();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchProjectGrantMilestones(projectId, programId);
        setData(response);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, programId]);

  const handleVerifyClick = (completionId: string) => {
    setVerifyingMilestoneId(completionId);
    setVerificationComment("");
  };

  const handleCancelVerification = () => {
    setVerifyingMilestoneId(null);
    setVerificationComment("");
  };

  const handleSubmitVerification = async (milestone: MappedMilestone) => {
    if (!address || !data) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!milestone.onChainMilestoneUID) {
      toast.error("Cannot verify milestone without on-chain UID");
      return;
    }

    setIsVerifying(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Switch to correct chain
      const { success, chainId: actualChainId, gapClient } = await ensureCorrectChain({
        targetChainId: data.grant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success || !gapClient) {
        setIsVerifying(false);
        setIsStepper(false);
        return;
      }

      // Get wallet signer
      const { walletClient, error: walletError } = await safeGetWalletClient(actualChainId);
      if (walletError || !walletClient) {
        throw new Error("Failed to connect to wallet", { cause: walletError });
      }

      const walletSigner = await walletClientToSigner(walletClient);

      // Fetch project to get milestone instance (we need the SDK class instance, not just data)
      const fetchedProject = await gapClient.fetch.projectById(data.project.uid);
      if (!fetchedProject) {
        throw new Error("Failed to fetch project data");
      }

      // Find grant and milestone instances using UIDs from the data we already have
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === data.grant.uid.toLowerCase()
      );
      if (!grantInstance) {
        throw new Error("Grant not found");
      }

      const milestoneInstance = grantInstance.milestones?.find(
        (m) => m.uid.toLowerCase() === milestone.onChainMilestoneUID.toLowerCase()
      );

      if (!milestoneInstance) {
        throw new Error("Milestone not found");
      }

      // Track success of each step to ensure we only update DB if both succeed
      let completionConfirmed = false;
      let verificationConfirmed = false;

      // Step 1: Complete milestone if not already completed
      if (!milestoneInstance.completed) {
        const completionData = sanitizeObject({
          reason: milestone.completion?.completionText || "Milestone marked as complete",
          proofOfWork: "",
          completionPercentage: 100,
          type: "completed",
          deliverables: [],
        });

        toast.loading("Completing milestone...", {
          id: `milestone-${milestone.onChainMilestoneUID}`,
        });

        await milestoneInstance
          .complete(walletSigner, completionData, changeStepperStep)
          .then(async (result) => {
            changeStepperStep("indexing");

            // Notify indexer
            const txHash = result?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
                "POST",
                {}
              );
            }

            // Wait for completion to be indexed
            let retries = 1000;
            let isCompleted = false;

            while (retries > 0 && !isCompleted) {
              try {
                const updatedProject = await gapClient.fetch.projectById(data.project.uid);
                const updatedGrant = updatedProject?.grants.find(
                  (g) => g.uid === data.grant.uid
                );
                const updatedMilestone = updatedGrant?.milestones.find(
                  (m: any) => m.uid === milestone.onChainMilestoneUID
                );

                if (updatedMilestone?.completed) {
                  isCompleted = true;
                  completionConfirmed = true; // Mark completion as confirmed on-chain
                  changeStepperStep("indexed");
                  toast.success("Milestone completed successfully!", {
                    id: `milestone-${milestone.onChainMilestoneUID}`,
                  });
                }
              } catch (pollError) {
                console.error("Error polling for completion:", pollError);
              }

              retries -= 1;
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            if (!isCompleted) {
              throw new Error("Completion indexing timed out - please refresh the page to check status");
            }
          })
          .catch((error) => {
            toast.remove(`milestone-${milestone.onChainMilestoneUID}`);
            throw error;
          });
      } else {
        // Milestone is already completed on-chain
        completionConfirmed = true;
      }

      // Step 2: Verify milestone on-chain
      await milestoneInstance
        .verify(
          walletSigner,
          sanitizeObject({
            reason: verificationComment || "",
          }),
          changeStepperStep
        )
        .then(async (res) => {
          changeStepperStep("indexing");

          // Notify indexer about transaction
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
              "POST",
              {}
            );
          }

          // Poll for verification to be indexed
          let retries = 1000;
          let isVerified = false;

          while (retries > 0 && !isVerified) {
            try {
              // Re-fetch project to check if verification is indexed
              const updatedProject = await gapClient.fetch.projectById(data.project.uid);
              const updatedGrant = updatedProject?.grants.find(
                (g) => g.uid === data.grant.uid
              );
              const updatedMilestone = updatedGrant?.milestones.find(
                (m: any) => m.uid === milestone.onChainMilestoneUID
              );

              const alreadyVerified = updatedMilestone?.verified?.find(
                (v: any) => v.attester?.toLowerCase() === address?.toLowerCase()
              );

              if (alreadyVerified) {
                isVerified = true;
                verificationConfirmed = true; // Mark verification as confirmed on-chain
                changeStepperStep("indexed");
              }
            } catch (pollError) {
              console.error("Error polling for verification:", pollError);
            }

            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          if (!isVerified) {
            throw new Error("Verification indexing timed out - please refresh the page to check status");
          }
        });

      // Step 3: Call backend API to update milestone_completions table
      // ONLY if both on-chain operations were confirmed successful
      if (!completionConfirmed || !verificationConfirmed) {
        throw new Error(
          `Cannot update database: ${!completionConfirmed ? "Completion" : "Verification"} was not confirmed on-chain`
        );
      }

      // Step 3: Update database (only if funding application exists)
      if (data.fundingApplication) {
        try {
          await updateMilestoneVerification(
            data.fundingApplication.referenceNumber,
            milestone.milestoneFieldLabel,
            milestone.milestoneTitle,
            verificationComment
          );

          toast.success("Milestone verified successfully!");
        } catch (apiError) {
          console.error("Failed to update verification in database:", apiError);
          toast.error("Verification successful on-chain but failed to update database");
        }
      } else {
        // No funding application - verification only on-chain
        toast.success("Milestone verified successfully on-chain!");
      }

      // Reload data to show updated verification
      const refreshedData = await fetchProjectGrantMilestones(projectId, programId);
      setData(refreshedData);
      setVerifyingMilestoneId(null);
      setVerificationComment("");
    } catch (error: any) {
      console.error("Error verifying milestone:", error);

      // Check if user cancelled
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        toast.error("Verification cancelled");
      } else {
        toast.error("Failed to verify milestone");
        errorManager("Error verifying milestone", error, {
          milestoneUID: milestone.onChainMilestoneUID,
          grantUID: data.grant.uid,
          address,
        });
      }
    } finally {
      setIsVerifying(false);
      setIsStepper(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 dark:bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Error Loading Milestones
          </h3>
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load milestone data"}
          </p>
        </div>
      </div>
    );
  }

  const { project, grant, fundingApplication, mappedMilestones } = data;

  return (
    <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
      {/* Header with Back Button */}
      <div className="w-full flex flex-row items-center justify-between">
        <Link href={PAGES.ADMIN.MILESTONES(communityId)}>
          <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
            <ChevronLeftIcon className="h-5 w-5" />
            Back to Milestones Report
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          {project.details.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Grant: {grant.details.title || `Program ${grant.programId}`}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Review project milestones from both on-chain and database sources
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Milestones */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
              Project Milestones
            </h2>
            <div className="space-y-4">
              {mappedMilestones.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                  <p className="text-lg font-medium">No milestones found</p>
                  <p className="text-sm">This project does not have any milestones yet</p>
                </div>
              ) : (
                mappedMilestones.map((milestone, index) => {
                  const hasCompletion = milestone.completion !== null;
                  const isVerified = milestone.completion?.isVerified || false;

                  // Determine status based on completion data
                  let status = "Not Started";
                  let statusColor = "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";

                  if (hasCompletion) {
                    if (isVerified) {
                      status = "Completed";
                      statusColor = "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
                    } else {
                      status = "Pending Verification";
                      statusColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
                    }
                  }

                  return (
                    <div
                      key={milestone.onChainMilestoneUID || index}
                      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-medium text-black dark:text-white">
                          {milestone.milestoneTitle}
                        </h3>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {milestone.applicationData.description}
                      </p>

                      {milestone.completion && (
                        <>
                          {/* Completion Details Box - Read Only */}
                          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                              Completion Details
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {milestone.completion.completionText}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Submitted: {new Date(milestone.completion.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Verification Section */}
                          {milestone.completion.isVerified && milestone.completion.verificationComment ? (
                            /* Show Verification Box if already verified */
                            <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
                              <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                                Verification
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {milestone.completion.verificationComment}
                              </p>
                              {milestone.completion.verifiedBy && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Verified by: {milestone.completion.verifiedBy.slice(0, 6)}...{milestone.completion.verifiedBy.slice(-4)}
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Show Verify Button if status is Pending Verification and milestone has on-chain UID */
                            hasCompletion && !isVerified && milestone.onChainMilestoneUID && (
                              <div className="mb-3">
                                {verifyingMilestoneId === milestone.completion.id ? (
                                  /* Verification Form */
                                  <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md space-y-2">
                                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                                      Verify Milestone Completion
                                    </p>
                                    <textarea
                                      value={verificationComment}
                                      onChange={(e) => setVerificationComment(e.target.value)}
                                      placeholder="Add verification comment (optional)..."
                                      rows={3}
                                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleSubmitVerification(milestone)}
                                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700"
                                        disabled={isVerifying}
                                        isLoading={isVerifying}
                                      >
                                        Verify
                                      </Button>
                                      <Button
                                        onClick={handleCancelVerification}
                                        className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600"
                                        disabled={isVerifying}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Verify Button */
                                  <Button
                                    onClick={() => handleVerifyClick(milestone.completion!.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Verify Milestone
                                  </Button>
                                )}
                              </div>
                            )
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Due:</span>{" "}
                          {new Date(milestone.applicationData.dueDate).toLocaleDateString()}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Sidebar - Comments & Activity */}
        {fundingApplication && (
          <div className="lg:col-span-1">
            <CommentsAndActivity
              referenceNumber={fundingApplication.referenceNumber}
              statusHistory={fundingApplication.statusHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
}
