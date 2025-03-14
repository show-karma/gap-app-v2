import React from "react";
import { StepBlock } from "../StepBlock";
import { Button } from "@/components/Utilities/Button";
import { useGrantFormStore } from "../store";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import { Milestone } from "../Milestone";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/auth";
import { useAccount } from "wagmi";
import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks";
import { sanitizeObject } from "@/utilities/sanitize";
import {
  Grant,
  GrantDetails,
  Milestone as MilestoneSDK,
  nullRef,
} from "@show-karma/karma-gap-sdk";
import { Hex } from "viem";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getGapClient } from "@/hooks";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { MESSAGES } from "@/utilities/messages";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

export const MilestonesScreen: React.FC = () => {
  const {
    setCurrentStep,
    flowType,
    formData,
    milestonesForms,
    createMilestone,
    saveMilestone,
    clearMilestonesForms,
    setFormPriorities,
    updateFormData,
    resetFormData,
    setFlowType,
  } = useGrantFormStore();
  const selectedProject = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();
  const { address, isConnected, connector, chain } = useAccount();
  const { isAuth } = useAuthStore();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  const handleBack = () => {
    setCurrentStep(3);
  };

  const handleCancel = () => {
    if (!selectedProject) return;
    router.push(
      PAGES.PROJECT.GRANTS(
        selectedProject.details?.data?.slug || selectedProject?.uid
      )
    );
  };

  // Check if all milestones are valid
  const allMilestonesValidated = milestonesForms.every(
    (milestone) => milestone.isValid === true
  );

  const saveAllMilestones = () => {
    milestonesForms.forEach((milestone, index) => {
      const { data, isValid } = milestone;
      if (isValid) {
        saveMilestone(data, index);
      }
    });
  };

  const createNewGrant = async () => {
    if (!address || !selectedProject || !gap) return;

    try {
      if (!isConnected || !isAuth) return;

      // Get community network ID
      const communityNetworkId = chain?.id || 1; // Default to Ethereum mainnet

      // Check if we need to switch chains
      const chainId = await connector?.getChainId();
      if (!checkNetworkIsValid(chainId) || chainId !== communityNetworkId) {
        toast.error("Please switch to the correct network");
        return;
      }

      // Save all milestones
      saveAllMilestones();

      // Get milestone data
      const milestonesData = milestonesForms.map((item) => item.data);

      // Create grant data
      const newGrantData = {
        title: formData.title || "",
        description: formData.description || "",
        linkToProposal: formData.linkToProposal || "",
        proofOfWorkGrantUpdate: formData.proofOfWorkGrantUpdate || "",
        amount: formData.amount || "",
        milestones: milestonesData,
        community: formData.community || "",
        recipient: formData.recipient || address,
        startDate: formData.startDate
          ? formData.startDate.getTime() / 1000
          : undefined,
        programId: formData.programId,
        fundUsage: formData.fundUsage,
        questions: formData.questions || [],
      };

      console.log("Form data from store:", formData);
      console.log("New grant data being sent:", newGrantData);

      // Get GAP client
      const gapClient = getGapClient(communityNetworkId);

      // Create grant instance
      const grant = new Grant({
        data: {
          communityUID: newGrantData.community,
        },
        refUID: selectedProject.uid,
        schema: gapClient.findSchema("Grant"),
        recipient: (newGrantData.recipient as Hex) || address,
        uid: nullRef,
      });

      // Create grant details
      const sanitizedDetails = sanitizeObject({
        ...newGrantData,
        amount: newGrantData.amount || "",
        proposalURL: newGrantData.linkToProposal,
        assetAndChainId: ["0x0", 1],
        payoutAddress: address,
        questions: newGrantData.questions,
      });

      grant.details = new GrantDetails({
        data: sanitizedDetails,
        refUID: grant.uid,
        schema: gapClient.findSchema("GrantDetails"),
        recipient: grant.recipient,
        uid: nullRef,
      });

      // Create milestones
      grant.milestones =
        newGrantData.milestones.length > 0
          ? newGrantData.milestones.map((milestone) => {
              const sanitizedMilestone = sanitizeObject({
                title: milestone.title,
                description: milestone.description,
                endsAt: milestone.endsAt,
                startsAt: milestone.startsAt,
                priority: milestone.priority,
              });

              return new MilestoneSDK({
                data: sanitizedMilestone,
                refUID: grant.uid,
                schema: gapClient.findSchema("Milestone"),
                recipient: grant.recipient,
                uid: nullRef,
              });
            })
          : [];

      // Get wallet client
      const { walletClient, error } = await safeGetWalletClient(
        communityNetworkId
      );
      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      // Get wallet signer
      const walletSigner = await walletClientToSigner(walletClient);

      // Attest grant
      setIsStepper(true);
      await grant
        .attest(walletSigner as any, selectedProject.chainID, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          const txHash = res?.tx[0]?.hash;

          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grant.chainID),
              "POST",
              {}
            );
          }

          while (retries > 0) {
            fetchedProject = await gapClient.fetch
              .projectById(selectedProject.uid as Hex)
              .catch(() => null);

            if (
              fetchedProject?.grants?.find(
                (oldGrant) => oldGrant.uid === grant.uid
              )
            ) {
              clearMilestonesForms();
              retries = 0;
              toast.success(
                flowType === "grant"
                  ? MESSAGES.GRANT.CREATE.SUCCESS
                  : "Successfully applied to funding program!"
              );
              changeStepperStep("indexed");

              // Reset form data and go back to step 1 for a new grant
              resetFormData();
              clearMilestonesForms();
              setFormPriorities([]);
              setCurrentStep(1);
              setFlowType("grant"); // Reset to default flow type

              // Redirect to grants page instead of specific grant
              router.push(
                PAGES.PROJECT.GRANT(
                  selectedProject.details?.data.slug || selectedProject.uid,
                  grant.uid
                )
              );
              router.refresh();
              await refreshProject();
            }

            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      console.log(error);
      toast.error(
        flowType === "grant"
          ? MESSAGES.GRANT.CREATE.ERROR
          : "Error applying to funding program"
      );
      errorManager(
        `Error creating ${flowType} to project ${selectedProject?.uid}`,
        error
      );
    } finally {
      setIsStepper(false);
    }
  };

  return (
    <StepBlock currentStep={4} totalSteps={4} flowType={flowType}>
      <div className="flex flex-col w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
            Create milestones for your{" "}
            {flowType === "grant" ? "grant" : "funding program"}
          </h3>

          <Button
            onClick={createMilestone}
            className="flex items-center gap-2 bg-blue-500 dark:bg-blue-900 text-white px-4 py-2 rounded-md hover:opacity-90"
          >
            <PlusIcon className="h-4 w-4" />
            Add milestone
          </Button>
        </div>

        <div className="w-full mb-10">
          {milestonesForms.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                No milestones yet. Click &quot;Add milestone&quot; to create one
                or proceed without milestones.
              </p>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center justify-center gap-8">
              {milestonesForms.map((milestone, index) => (
                <Milestone
                  currentMilestone={milestone.data}
                  key={index}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between w-full">
          <div>
            <Button
              onClick={handleCancel}
              className="border dark:border-blue-300 dark:text-blue-400 border-blue-500 bg-transparent text-base px-6 font-bold text-blue-800 hover:bg-transparent hover:opacity-75"
            >
              Cancel
            </Button>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleBack}
              className="border dark:border-blue-300 dark:text-blue-400 border-blue-500 bg-transparent text-base px-6 font-bold text-blue-800 hover:bg-transparent hover:opacity-75"
            >
              Back
            </Button>
            <Button
              onClick={createNewGrant}
              className="flex items-center justify-start gap-3 rounded bg-blue-500 dark:bg-blue-900 px-6 text-base font-bold text-white hover:bg-blue-500 hover:opacity-75"
              disabled={!allMilestonesValidated}
            >
              {flowType === "grant" ? "Create grant" : "Apply"}
            </Button>
          </div>
        </div>
      </div>
    </StepBlock>
  );
};
