import { StepBlock } from "../StepBlock";
import { Button } from "@/components/Utilities/Button";
import { useGrantFormStore } from "../store";
import { usePathname, useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import { Milestone } from "../Milestone";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/auth";
import { useAccount } from "wagmi";
import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { sanitizeObject } from "@/utilities/sanitize";
import {
  Grant,
  GrantDetails,
  Milestone as MilestoneSDK,
  nullRef,
} from "@show-karma/karma-gap-sdk";
import { Hex } from "viem";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getGapClient } from "@/hooks/useGap";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { MESSAGES } from "@/utilities/messages";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { CancelButton } from "./buttons/CancelButton";
import { NextButton } from "./buttons/NextButton";
import { useWallet } from "@/hooks/useWallet";

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
    communityNetworkId,
  } = useGrantFormStore();
  const { switchChainAsync } = useWallet();
  const selectedProject = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();
  const { address, isConnected, connector, chain } = useAccount();
  const { isAuth } = useAuthStore();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  const pathname = usePathname();
  const isEditing = pathname.includes("edit");

  const handleBack = () => {
    if (flowType === "program") {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
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
      let gapClient = gap;
      if (!isConnected || !isAuth) return;

      // Check if we need to switch chains
      const chainId = await connector?.getChainId();
      if (!checkNetworkIsValid(chainId) || chainId !== communityNetworkId) {
        await switchChainAsync?.({ chainId: communityNetworkId });
        gapClient = getGapClient(communityNetworkId);
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
        amount: formData.amount || "",
        milestones: milestonesData,
        community: formData.community || "",
        recipient: formData.recipient || address,
        startDate: formData.startDate
          ? formData.startDate.getTime() / 1000
          : undefined,
        programId: formData.programId,
        questions: formData.questions || [],
        selectedTrackIds: formData.selectedTrackIds || [],
      };

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
        description:
          newGrantData.description ||
          (flowType === "program"
            ? `I am applying to participate in the ${newGrantData.title}`
            : ""),
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
              if (
                flowType === "program" &&
                newGrantData.selectedTrackIds &&
                newGrantData.selectedTrackIds.length > 0 &&
                newGrantData.programId
              ) {
                try {
                  const programIdParts = newGrantData.programId.split("_");
                  const programId = programIdParts[0];
                  const chainID = parseInt(
                    programIdParts[1] || communityNetworkId.toString()
                  );

                  await fetchData(
                    INDEXER.PROJECTS.TRACKS(selectedProject.uid),
                    "POST",
                    {
                      trackIds: newGrantData.selectedTrackIds,
                      programId,
                    }
                  );
                } catch (trackError) {
                  console.error(
                    "Error assigning tracks to project:",
                    trackError
                  );
                }
              }

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
      errorManager(
        MESSAGES.GRANT.CREATE.ERROR(formData.title),
        error,
        {
          flowType: flowType,
          projectUID: selectedProject.uid,
          address,
        },
        {
          error:
            flowType === "grant"
              ? MESSAGES.GRANT.CREATE.ERROR(formData.title)
              : "Error applying to funding program",
        }
      );
    } finally {
      setIsStepper(false);
    }
  };

  return (
    <StepBlock currentStep={4}>
      <div className="flex flex-col w-full mx-auto">
        <div className="flex justify-between items-center mb-6 max-md:flex-col max-md:gap-2">
          <h3 className="text-xl font-semibold">
            {flowType === "grant"
              ? "Create milestones for your grant"
              : "Create milestones for your funding program"}
          </h3>

          <Button
            onClick={createMilestone}
            className="flex items-center gap-2 text-brand-blue bg-indigo-50 dark:bg-indigo-900 dark:text-indigo-50 hover:bg-indigo-50 hover:dark:bg-indigo-900 px-4 py-2 rounded-md hover:opacity-90"
          >
            Add Milestones
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-full mb-10">
          {milestonesForms.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Set your goals by adding milestones you plan to accomplish.
                There&apos;s no limit—add as many as you need to track your
                progress effectively!
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

        <div className="flex justify-between w-full max-md:flex-col max-md:gap-2">
          <CancelButton
            onClick={handleCancel}
            text="Cancel"
            className="max-md:px-5 max-md:items-center max-md:justify-center max-md:flex-col max-md:w-full"
          />

          <div className="flex gap-4 max-md:flex-col max-md:gap-2">
            <CancelButton
              onClick={handleBack}
              text="Back"
              className="max-md:px-5 max-md:items-center max-md:justify-center max-md:flex-col max-md:w-full"
            />
            <NextButton
              onClick={createNewGrant}
              disabled={!allMilestonesValidated}
              text={
                flowType === "grant"
                  ? isEditing
                    ? "Update grant"
                    : "Create grant"
                  : "Apply"
              }
              className="max-md:px-5 max-md:items-center max-md:justify-center max-md:flex-col max-md:w-full"
            />
          </div>
        </div>
      </div>
    </StepBlock>
  );
};
