"use client";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { getProjectById } from "@/utilities/sdk";
import { config } from "@/utilities/wagmi/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import { useState } from "react";
import { Button } from "../Utilities/Button";
import { cn } from "@/utilities/tailwind";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";
import { sanitizeInput } from "@/utilities/sanitize";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { PAGES } from "@/utilities/pages";
import { useWallet } from "@/hooks/useWallet";

const schema = z.object({
  description: z.string().optional(),
  proofOfWork: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
});
type SchemaType = z.infer<typeof schema>;

const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const inputStyle =
  "bg-white border border-gray-300 rounded-md p-2 dark:bg-zinc-900 max-lg:text-sm";

interface ProjectObjectiveCompletionFormProps {
  objectiveUID: string;
  handleCompleting: (isCompleting: boolean) => void;
}

export const ProjectObjectiveCompletionForm = ({
  objectiveUID,
  handleCompleting,
}: ProjectObjectiveCompletionFormProps) => {
  const project = useProjectStore((state) => state.project);
  const [isCompleting, setIsCompleting] = useState(false);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { chain, address, switchChainAsync } = useWallet();
  const projectId = useParams().projectId as string;
  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [noProofCheckbox, setNoProofCheckbox] = useState(false);
  const router = useRouter();

  const { refetch } = useAllMilestones(projectId as string);

  const onSubmit = async (data: SchemaType) => {
    if (!address || !project) return;
    let gapClient = gap;
    setIsCompleting(true);
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(
        project.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) return;
      const fetchedMilestones = await gapIndexerApi
        .projectMilestones(projectId)
        .then((res) => res.data);
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(
        fetchedMilestones,
        gapClient?.network
      );
      const objectiveInstance = objectivesInstances.find(
        (item) => item.uid.toLowerCase() === objectiveUID.toLowerCase()
      );
      if (!objectiveInstance) return;
      await objectiveInstance
        .complete(
          walletSigner,
          {
            proofOfWork: sanitizeInput(data.proofOfWork),
            reason: sanitizeInput(data.description),
            type: `project-milestone-completed`,
          },
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedObjectives = await getProjectObjectives(projectId);
            const isCompleted = fetchedObjectives.find(
              (item) => item.uid.toLowerCase() === objectiveUID.toLowerCase()
            )?.completed;

            if (isCompleted) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.SUCCESS);
              await refetch();
              handleCompleting(false);
              router.push(
                PAGES.PROJECT.UPDATES(
                  project?.details?.data.slug || project?.uid || ""
                )
              );
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      console.log(error);
      errorManager(
        `Error completing milestone ${objectiveUID}`,
        error,
        {
          project: projectId,
          objective: objectiveUID,
          address,
        },
        {
          error: MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.ERROR,
        }
      );
      setIsStepper(false);
    } finally {
      setIsCompleting(false);
      setIsStepper(false);
    }
  };
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
    >
      <div className="flex w-full flex-col items-start gap-2">
        <div
          className="flex w-full flex-col items-start gap-2"
          data-color-mode="light"
        >
          <label className={labelStyle}>Description (optional)</label>
          <div className="w-full" data-color-mode="light">
            <MarkdownEditor
              value={watch("description") || ""}
              onChange={(newValue: string) => {
                setValue("description", newValue || "", {
                  shouldValidate: true,
                });
              }}
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <label htmlFor="proofOfWork-input" className={labelStyle}>
            Output of your work *
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-lg:text-xs">
            Provide a link that demonstrates your work. This could be a link to
            a tweet announcement, a dashboard, a Google Doc, a blog post, a
            video, or any other resource that highlights the progress or result
            of your work
          </p>
          <div className="flex flex-row gap-2 items-center py-2">
            <input
              id="noProofCheckbox"
              type="checkbox"
              className="rounded-sm w-5 h-5 bg-white fill-black"
              checked={noProofCheckbox}
              onChange={() => {
                setNoProofCheckbox((oldValue) => !oldValue);
                setValue("proofOfWork", "", {
                  shouldValidate: true,
                });
              }}
            />
            <label
              htmlFor="noProofCheckbox"
              className="text-base text-zinc-900 dark:text-zinc-100 max-lg:text-xs"
            >{`I don't have any output to show for this milestone`}</label>
          </div>
          <input
            id="proofOfWork-input"
            placeholder="Add links to charts, videos, dashboards etc. that evaluators can verify your work"
            type="text"
            className={cn(inputStyle, "disabled:opacity-50")}
            disabled={noProofCheckbox}
            {...register("proofOfWork")}
          />
          <p className="text-red-500">{errors.proofOfWork?.message}</p>
        </div>
      </div>
      <div className="flex flex-row gap-4 justify-end">
        <Button
          disabled={isCompleting}
          className="w-full max-w-max text-zinc-900 bg-transparent text-sm px-3 py-2  border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900 max-lg:text-xs"
          onClick={() => handleCompleting(false)}
        >
          Cancel
        </Button>
        <Button
          className="w-full max-w-max bg-brand-blue text-white text-sm px-3 py-2 max-lg:text-xs"
          type="submit"
          disabled={
            !isValid ||
            isCompleting ||
            (!noProofCheckbox && !watch("proofOfWork"))
          }
          isLoading={isCompleting}
        >
          Complete
        </Button>
      </div>
    </form>
  );
};
