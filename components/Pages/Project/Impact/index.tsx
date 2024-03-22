import { cn } from "@/utilities/tailwind";
import { getFeedHref } from "@/utilities/feed";
import { FC, useEffect, useState } from "react";
import { Project, ProjectImpact } from "@show-karma/karma-gap-sdk";
import { useGap } from "@/hooks";
import { formatDate } from "@/utilities/formatDate";
import { useSearchParams } from "next/navigation";
import { AddImpactScreen } from "./AddImpactScreen";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useOwnerStore, useProjectStore } from "@/store";
import { EmptyImpactScreen } from "./EmptyImpactScreen";
import { TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { MESSAGES } from "@/utilities/messages";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { getWalletClient } from "@wagmi/core";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { useQueryState } from "nuqs";

const headClasses =
  "text-black dark:text-white text-xs font-medium uppercase text-left px-6 py-3";
const cellClasses =
  "py-4 border-t border-t-black dark:border-t-white pr-6 px-6 max-w-[420px] max-sm:min-w-[200px]";

interface ImpactComponentProps {}

export const ImpactComponent: FC<ImpactComponentProps> = () => {
  const { gap } = useGap();
  const project = useProjectStore((state) => state.project);
  const [orderedImpacts, setOrderedImpacts] = useState<ProjectImpact[]>(
    project?.impacts || []
  );

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isAuthorized = isOwner || isProjectOwner;

  useEffect(() => {
    if (!project || !project.impacts || !project.impacts.length) {
      setOrderedImpacts([]);
      return;
    }
    const ordered = project.impacts.sort((a, b) => {
      return b.data.completedAt - a.data.completedAt;
    });
    setOrderedImpacts(ordered);
  }, [project?.impacts]);

  const searchParams = useSearchParams();

  const grantScreen = searchParams?.get("tab");

  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();

  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const revokeImpact = async (impact: ProjectImpact) => {
    if (!address || !project || !impact) return;
    try {
      setLoading({ ...loading, [impact.uid.toLowerCase()]: true });
      if (chain && chain.id !== project.chainID) {
        await switchNetworkAsync?.(project.chainID);
      }
      const walletClient = await getWalletClient({
        chainId: project.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      await impact.revoke(walletSigner as any).then(async () => {
        toast.success(MESSAGES.PROJECT.IMPACT.REMOVE.SUCCESS);
        const filtered = project.impacts.filter(
          (item) => item.uid !== impact.uid
        );
        project.impacts = filtered;
      });
    } catch (error) {
      console.log(error);
      setLoading({ ...loading, [impact.uid.toLowerCase()]: false });
      toast.error(MESSAGES.PROJECT.IMPACT.REMOVE.ERROR);
    } finally {
      setLoading({ ...loading, [impact.uid.toLowerCase()]: false });
    }
  };
  const [, changeTab] = useQueryState("tab");

  if (grantScreen === "add-impact" && isAuthorized) {
    return <AddImpactScreen />;
  }

  if (!orderedImpacts.length) {
    return <EmptyImpactScreen />;
  }

  return (
    <div className="flex-row gap-2 flex">
      <div className="flex flex-3 w-full flex-col overflow-x-auto">
        {isAuthorized ? (
          <div className="flex flex-row-reverse max-sm:flex-row">
            <Button
              onClick={() => changeTab("add-impact")}
              className="bg-black text-white hover:bg-black dark:bg-zinc-800 w-max"
            >
              Add impact
            </Button>
          </div>
        ) : null}
        <table className="overflow-x-auto w-full">
          <thead>
            <tr>
              <th className={cn(headClasses, "pr-8 w-36")}></th>
              <th className={cn(headClasses, "w-20")}></th>
              <th className={cn("", headClasses)}>Work</th>
              <th className={cn("", headClasses)}>Impact</th>
              <th className={cn("", headClasses)}>Proof</th>
              {isAuthorized ? (
                <th className={cn(headClasses, "w-20")}></th>
              ) : null}
            </tr>
          </thead>
          <tbody className="">
            {orderedImpacts.length
              ? orderedImpacts.map((item) => (
                  <tr className="" key={item.uid}>
                    <td className="pr-8 w-max max-sm:pr-4 max-w-max">
                      <p className="w-28 max-w-max text-gray-500 text-sm font-medium ">
                        {formatDate(item.data.completedAt * 1000)}
                      </p>
                    </td>
                    <td className="pr-8 max-sm:pr-4 border-l border-l-zinc-400" />
                    <td
                      className={cn(
                        cellClasses,
                        "text-black dark:text-white text-lg font-semibold"
                      )}
                    >
                      <p>{item.work}</p>
                    </td>
                    <td className={cn(cellClasses)}>
                      <div data-color-mode="light">
                        <MarkdownPreview
                          className="text-base font-normal"
                          components={{
                            a: ({ children, ...props }) => {
                              return (
                                <ExternalLink
                                  className="text-blue-500"
                                  {...props}
                                >
                                  {children}
                                </ExternalLink>
                              );
                            },
                          }}
                          source={item.impact}
                        />
                      </div>
                    </td>
                    <td className={cn(cellClasses)}>
                      <div data-color-mode="light">
                        <MarkdownPreview
                          className="text-base font-normal"
                          components={{
                            a: ({ children, ...props }) => {
                              return (
                                <ExternalLink
                                  className="text-blue-500"
                                  {...props}
                                >
                                  {children}
                                </ExternalLink>
                              );
                            },
                          }}
                          source={item.proof}
                        />
                      </div>
                    </td>
                    {isAuthorized ? (
                      <td className={cn(cellClasses, "px-3")}>
                        <Button
                          type="button"
                          className="bg-transparent hover:bg-transparent hover:opacity-75"
                          disabled={
                            loading[item.uid.toLowerCase()] || !isAuthorized
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
      <div className="flex flex-[1] w-full" />
    </div>
  );
};
