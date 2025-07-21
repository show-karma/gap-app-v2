"use client";
import { Button } from "@/components/ui/button";
import { errorManager } from "@/lib/utils/error-manager";
import { ExternalLink } from "@/components/ui/external-link";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/features/projects/lib/store";
import { useOwnerStore } from "@/features/contract-owner/lib/owner";
import { useStepper } from "@/features/modals/lib/stores/txStepper";
import { walletClientToSigner } from "@/lib/web3/eas-wagmi-utils";
import { fetchData } from "@/lib/utils/fetch-data";
import { formatDate } from "@/lib/format/date";
import { INDEXER } from "@/services/indexer";
import { MESSAGES } from "@/config/messages";
import { ReadMore } from "@/components/ui/read-more";
import { retryUntilConditionMet } from "@/lib/utils/retries";
import { getProjectById } from "@/features/projects/api/sdk";
import { cn } from "@/lib/utils/cn";
import { config } from "@/lib/web3/wagmi/config";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IProjectImpact } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import { safeGetWalletClient } from "@/lib/utils/wallet-helpers";
import { useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { AddImpactScreen } from "./AddImpactScreen";
import { EmptyImpactScreen } from "./EmptyImpactScreen";
import { ImpactVerifications } from "./ImpactVerifications";
import { OSOMetrics } from "./OSOMetrics";
import { useWallet } from "@/features/auth/hooks/use-wallet";
import { OutputsAndOutcomes } from "./OutputsAndOutcomes";
import { TabContent, Tabs, TabTrigger } from "@/components/ui/tabs";

const headClasses =
  "text-black dark:text-white text-xs font-medium uppercase text-left px-6 py-3 font-body";
const cellClasses =
  "py-4 border-t border-t-black dark:border-t-white pr-6 px-6 max-w-[420px] max-sm:min-w-[200px]";

interface ImpactComponentProps {}

export const ImpactComponent: FC<ImpactComponentProps> = () => {
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const [orderedImpacts, setOrderedImpacts] = useState<IProjectImpact[]>(
    project?.impacts || []
  );

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  useEffect(() => {
    if (!project || !project.impacts || !project.impacts.length) {
      setOrderedImpacts([]);
      return;
    }
    const ordered = project.impacts.sort((a, b) => {
      return b.data.completedAt - a.data.completedAt;
    });
    setOrderedImpacts(ordered);
  }, [project?.impacts, project]);

  const searchParams = useSearchParams();

  const grantScreen = searchParams?.get("tab");

  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isOnChainAuthorized = isProjectOwner || isOwner;

  const revokeImpact = async (impact: IProjectImpact) => {
    if (!address || !project || !impact) return;
    let gapClient = gap;
    try {
      setLoading({ ...loading, [impact.uid.toLowerCase()]: true });
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(
        project.chainID
      );

      if (error) {
        toast.error(error);
        setLoading({ ...loading, [impact.uid.toLowerCase()]: false });
        return;
      }

      if (!walletClient) {
        setLoading({ ...loading, [impact.uid.toLowerCase()]: false });
        return;
      }

      const walletSigner = await walletClientToSigner(walletClient);

      const fetchedProject = await getProjectById(project.uid);
      const instanceImpact = fetchedProject?.impacts?.find(
        (imp) => imp.uid === impact.uid
      );
      if (!instanceImpact) return;

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();
            const stillExists = !!fetchedProject?.impacts?.find(
              (imp) => imp.uid === impact.uid
            );
            return !stillExists;
          },
          () => {
            callbackFn?.();
          }
        );
      };

      if (!isOnChainAuthorized) {
        const toastLoading = toast.loading(
          MESSAGES.PROJECT.IMPACT.REMOVE.LOADING
        );
        await fetchData(
          INDEXER.PROJECT.REVOKE_ATTESTATION(
            instanceImpact?.uid as `0x${string}`,
            instanceImpact.chainID
          ),
          "POST",
          {}
        )
          .then(async () => {
            checkIfAttestationExists()
              .then(() => {
                toast.success(MESSAGES.PROJECT.IMPACT.REMOVE.SUCCESS, {
                  id: toastLoading,
                });
              })
              .catch(() => {
                toast.dismiss(toastLoading);
              });
          })
          .catch(() => {
            toast.dismiss(toastLoading);
          });
      } else {
        await instanceImpact
          .revoke(walletSigner as any, changeStepperStep)
          .then(async (res) => {
            const txHash = res?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, instanceImpact.chainID),
                "POST",
                {}
              );
            }

            await checkIfAttestationExists(() => {
              changeStepperStep("indexed");
            }).then(() => {
              toast.success(MESSAGES.PROJECT.IMPACT.REMOVE.SUCCESS);
            });
          });
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.PROJECT.IMPACT.REMOVE.ERROR,
        error,
        {
          projectUID: project?.uid,
          address,
        },
        { error: MESSAGES.PROJECT.IMPACT.REMOVE.ERROR }
      );
      setLoading({ ...loading, [impact.uid.toLowerCase()]: false });
    } finally {
      setLoading({ ...loading, [impact.uid.toLowerCase()]: false });
      setIsStepper(false);
    }
  };
  const [, changeTab] = useQueryState("tab");

  if (grantScreen === "add-impact" && isAuthorized) {
    return <AddImpactScreen />;
  }

  return (
    <section>
      <Tabs defaultTab="outputs">
        <div className="flex flex-row gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md mb-6">
          <TabTrigger value="outputs">Activities & Outputs</TabTrigger>
          {orderedImpacts.length > 0 && (
            <TabTrigger value="impact">Project Impact</TabTrigger>
          )}
          <TabTrigger value="oso">OSO Metrics</TabTrigger>
        </div>

        <TabContent value="outputs">
          <div className="flex flex-col gap-4">
            <OutputsAndOutcomes />
          </div>
        </TabContent>

        {orderedImpacts.length > 0 && (
          <TabContent value="impact">
            <div className="flex flex-col gap-4">
              <div className="flex w-full flex-col overflow-x-auto">
                <table className="overflow-x-auto w-full">
                  <thead>
                    <tr>
                      <th className={cn(headClasses, "pr-8 w-36")}></th>
                      <th className={cn(headClasses, "w-20")}></th>
                      <th className={cn("", headClasses)}>Work</th>
                      <th className={cn("", headClasses)}>Impact</th>
                      <th className={cn("", headClasses)}>Proof</th>
                      <th className={cn("", headClasses)}>Verifications</th>
                      {isAuthorized ? (
                        <th className={cn(headClasses, "w-20")}></th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="">
                    {orderedImpacts.length
                      ? orderedImpacts.map((item) => (
                          <tr className="" key={item.uid}>
                            <td className="pr-2">
                              <p className="w-36 max-w-max text-gray-500 text-sm font-medium ">
                                {item.data?.startedAt
                                  ? formatDate(item.data?.startedAt * 1000)
                                  : "N/A"}
                                {" → "}
                                {formatDate(item.data?.completedAt * 1000)}
                              </p>
                            </td>
                            <td className="pr-2 max-sm:pr-2 border-l border-l-zinc-400" />
                            <td
                              className={cn(
                                cellClasses,
                                "text-black dark:text-white text-lg font-semibold align-top"
                              )}
                            >
                              <div data-color-mode="light">
                                <ReadMore
                                  readLessText="View less"
                                  readMoreText="View more"
                                  side="left"
                                  words={200}
                                  markdownComponents={{
                                    a: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink
                                          className="text-blue-500"
                                          href={props.href || ""}
                                          {...props}
                                        >
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                  }}
                                  markdownClass="text-black dark:text-white text-lg font-semibold "
                                >
                                  {item.data?.work}
                                </ReadMore>
                              </div>
                            </td>
                            <td className={cn(cellClasses, "align-top")}>
                              <div data-color-mode="light">
                                <ReadMore
                                  readLessText="View less"
                                  readMoreText="View more"
                                  side="left"
                                  words={200}
                                  markdownClass="text-base font-normal"
                                  markdownComponents={{
                                    a: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink
                                          className="text-blue-500"
                                          href={props.href || ""}
                                          {...props}
                                        >
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                  }}
                                >
                                  {item.data?.impact}
                                </ReadMore>
                              </div>
                            </td>
                            <td className={cn(cellClasses, "align-top")}>
                              <div data-color-mode="light">
                                <ReadMore
                                  readLessText="View less"
                                  readMoreText="View more"
                                  side="left"
                                  words={200}
                                  markdownClass="text-base font-normal"
                                  markdownComponents={{
                                    a: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink
                                          className="text-blue-500"
                                          href={props.href || ""}
                                          {...props}
                                        >
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                  }}
                                >
                                  {item.data?.proof}
                                </ReadMore>
                              </div>
                            </td>
                            <td className={cn(cellClasses, "px-3 align-top")}>
                              <ImpactVerifications impact={item} />
                            </td>
                            {isAuthorized ? (
                              <td className={cn(cellClasses, "px-3 align-top")}>
                                <Button
                                  type="button"
                                  className="bg-transparent hover:bg-transparent hover:opacity-75"
                                  disabled={
                                    loading[item.uid.toLowerCase()] ||
                                    !isAuthorized
                                  }
                                  onClick={() => revokeImpact(item)}
                                >
                                  <TrashIcon className="text-red-500 w-6 h-6" />
                                </Button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
          </TabContent>
        )}

        <TabContent value="oso">
          <div className="flex flex-col gap-8">
            {(project as any)?.external?.oso?.length ? (
              <OSOMetrics osoSlugs={(project as any)?.external?.oso} />
            ) : null}
          </div>
        </TabContent>
      </Tabs>
    </section>
  );
};
