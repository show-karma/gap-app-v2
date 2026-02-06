import { useState } from "react";
import { useAccount } from "wagmi";
import type { SignerOrProvider } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { getProjectMemberRoles } from "@/utilities/getProjectMemberRoles";
import { INDEXER } from "@/utilities/indexer";
import { queryClient } from "@/utilities/query-client";
import { retryUntilConditionMet } from "@/utilities/retries";
import { getProjectById } from "@/utilities/sdk";

type RoleAction = "promote" | "demote";

const ACTION_CONFIG = {
  promote: {
    loadingMessage: "Promoting member to admin...",
    successMessage: "Member promoted successfully",
    errorMessage: (addr: string) => `Failed to promote member ${addr}.`,
    errorLabel: "Error promoting member",
    checkCondition: (role: string | undefined) => role === "Admin",
  },
  demote: {
    loadingMessage: "Removing admin role...",
    successMessage: "Member removed as admin successfully",
    errorMessage: (addr: string) => `Failed to remove member ${addr} as admin.`,
    errorLabel: "Error removing member as admin",
    checkCondition: (role: string | undefined) => role !== "Admin",
  },
} as const;

export function useMemberRoleChange(action: RoleAction) {
  const [isLoading, setIsLoading] = useState(false);
  const { address, chain } = useAccount();
  const { project } = useProjectStore();
  const { startAttestation, showSuccess, showError, changeStepperStep, setIsStepper } =
    useAttestationToast();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const config = ACTION_CONFIG[action];

  const execute = async (memberAddress: string, onSuccess?: () => void) => {
    if (!address || !project) return;
    try {
      setIsLoading(true);
      startAttestation(config.loadingMessage);

      const setup = await setupChainAndWallet({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsLoading(false);
        return;
      }

      const { walletSigner, gapClient } = setup;
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) throw new Error("Project not found");

      const member = fetchedProject.members.find(
        (item) => item.recipient.toLowerCase() === memberAddress.toLowerCase()
      );
      if (!member) throw new Error("Member not found");

      const projectInstance = await gapClient.fetch.projectById(project.uid);

      const res =
        action === "promote"
          ? await projectInstance.addAdmin(
              walletSigner as SignerOrProvider,
              memberAddress.toLowerCase(),
              changeStepperStep
            )
          : await projectInstance.removeAdmin(
              walletSigner as SignerOrProvider,
              memberAddress.toLowerCase(),
              changeStepperStep
            );

      changeStepperStep("indexing");
      const txHash = res?.tx[0]?.hash;
      if (txHash) {
        await fetchData(
          INDEXER.ATTESTATION_LISTENER(txHash, projectInstance.chainID),
          "POST",
          {}
        );
      }

      // Invalidate member roles cache immediately so UI starts refetching while polling continues
      await queryClient.invalidateQueries({
        queryKey: ["memberRoles", project.uid],
      });
      // Fire-and-forget early project refresh with explicit error handling
      refreshProject().catch((err) => {
        errorManager("Early project refresh failed", err);
      });

      await retryUntilConditionMet(
        async () => {
          const memberRoles = await getProjectMemberRoles(project, projectInstance);
          return config.checkCondition(memberRoles[memberAddress.toLowerCase()]);
        },
        () => {
          changeStepperStep("indexed");
        }
      );

      showSuccess(config.successMessage);
      onSuccess?.();

      // Final invalidation to ensure fresh data after confirmation
      await refreshProject();
      await queryClient.invalidateQueries({
        queryKey: ["memberRoles", project.uid],
      });
    } catch (error) {
      showError(config.errorMessage(memberAddress));
      errorManager(
        config.errorLabel,
        error,
        {
          address,
          memberAddress,
          projectUid: project?.uid,
        },
        {
          error: config.errorMessage(memberAddress),
        }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  return { execute, isLoading };
}
