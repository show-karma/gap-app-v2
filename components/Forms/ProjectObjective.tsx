"use client";
import { MESSAGES } from "@/utilities/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";
import { Button } from "../Utilities/Button";
import { errorManager } from "../Utilities/errorManager";
import { useAccount, useSwitchChain } from "wagmi";
import { useProjectStore } from "@/store";
import { getGapClient, useGap } from "@/hooks";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";

import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useStepper } from "@/store/modals/txStepper";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import toast from "react-hot-toast";
import { useState } from "react";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useParams, useRouter } from "next/navigation";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import { useQuery } from "@tanstack/react-query";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

const objectiveSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_OBJECTIVE_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.PROJECT_OBJECTIVE_FORM.TITLE.MAX }),
  text: z.string().min(3, { message: MESSAGES.PROJECT_OBJECTIVE_FORM.TEXT }),
});

type ObjectiveType = z.infer<typeof objectiveSchema>;

const labelStyle = "text-sm font-bold";
const inputStyle =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white";

interface ProjectObjectiveFormProps {
  previousObjective?: IProjectMilestoneResponse;
  stateHandler?: (state: boolean) => void;
}

export const ProjectObjectiveForm = ({
  previousObjective,
  stateHandler,
}: ProjectObjectiveFormProps) => {
  const { address, chain } = useAccount();
  const { project } = useProjectStore();
  const { switchChainAsync } = useSwitchChain();
  const params = useParams();
  const projectId = params.projectId as string;

  const isEditing = !!previousObjective;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ObjectiveType>({
    resolver: zodResolver(objectiveSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      title: previousObjective?.data.title,
      text: previousObjective?.data.text,
    },
  });

  const { gap } = useGap();
  const [isLoading, setIsLoading] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const createObjective = async (data: ObjectiveType) => {
    if (!gap) return;
    let gapClient = gap;
    setIsLoading(true);
    try {
      if (chain?.id != project?.chainID) {
        console.log("Switching chain");
        await switchChainAsync?.({ chainId: project?.chainID as number });
        gapClient = getGapClient(project?.chainID as number);
      }
      const newObjective = new ProjectMilestone({
        data: sanitizeObject({
          title: data.title,
          text: data.text,
          type: "project-milestone",
        }),
        schema: gapClient.findSchema("ProjectMilestone"),
        refUID: project?.uid,
        recipient: address || "0x00",
      });

      const { walletClient, error } = await safeGetWalletClient(
        project?.chainID as number
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.text),
      };
      await newObjective
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          let fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project?.chainID as number),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(
                newObjective.uid,
                project?.chainID as number
              ),
              "POST",
              {}
            );
          }
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            await getProjectObjectives(projectId)
              .then(async (fetchedObjectives) => {
                const attestUID = newObjective.uid;
                const alreadyExists = fetchedObjectives.find(
                  (m) => m.uid === attestUID
                );

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.SUCCESS);
                  await refetch();
                  stateHandler?.(false);
                }
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              });
          }
        });
    } catch (error) {
      errorManager(MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR, error, {
        data,
        address,
        project: project?.uid,
      });
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const updateObjective = async (data: ObjectiveType) => {
    if (!gap) return;
    let gapClient = gap;
    setIsLoading(true);
    try {
      if (chain?.id != project?.chainID) {
        await switchChainAsync?.({ chainId: project?.chainID as number });
        gapClient = getGapClient(project?.chainID as number);
      }

      const { walletClient, error } = await safeGetWalletClient(
        project?.chainID as number
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.text),
      };
      const fetchedMilestones = await gapIndexerApi
        .projectMilestones(projectId)
        .then((res) => res.data);
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(
        fetchedMilestones,
        gapClient?.network
      );
      const objectiveInstance = objectivesInstances.find(
        (item) =>
          item.uid.toLowerCase() === previousObjective?.uid.toLowerCase()
      );
      if (!objectiveInstance) return;
      objectiveInstance.setValues(sanitizedData);
      await objectiveInstance
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          let fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project?.chainID as number),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(
                objectiveInstance.uid,
                project?.chainID as number
              ),
              "POST",
              {}
            );
          }
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            await getProjectObjectives(projectId)
              .then(async (fetchedObjectives) => {
                const attestUID = objectiveInstance.uid;
                const alreadyExists = fetchedObjectives.find(
                  (m) => m.uid === attestUID
                );

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.SUCCESS);
                  await refetch();
                  stateHandler?.(false);
                }
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              });
          }
        });
    } catch (error) {
      errorManager(MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR, error, {
        data,
        address,
        project: project?.uid,
      });
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const onSubmit: SubmitHandler<ObjectiveType> = async (data) => {
    if (isEditing) {
      updateObjective(data);
    } else {
      createObjective(data);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-[#D0D5DD] dark:border-zinc-400 rounded-xl p-6 gap-3 flex flex-col items-start justify-start"
    >
      <div className="flex flex-col gap-2 w-full items-start justify-start">
        <div className="flex flex-row gap-3 items-center justify-between w-full">
          <div className="flex flex-row gap-3 justify-between items-center w-full">
            <input
              id="name-input"
              type="text"
              className={cn(
                inputStyle,
                "text-xl py-1 font-bold text-[#101828] dark:text-zinc-100 pl-4 border-l-4 rounded-sm w-full"
              )}
              style={{
                borderLeftColor: previousObjective?.completed
                  ? "#2ED3B7"
                  : "#FDB022",
              }}
              placeholder="Enter a concise and descriptive project title"
              {...register("title")}
            />
          </div>
          <button onClick={() => stateHandler?.(false)}>
            <XMarkIcon className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          </button>
        </div>
        <p className="text-sm text-red-500">{errors.title?.message}</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="w-full" data-color-mode="light">
          <MarkdownEditor
            placeholderText="Provide a clear and detailed description of this objective"
            value={watch("text") || ""}
            onChange={(newValue: string) => {
              setValue("text", newValue || "", {
                shouldValidate: true,
              });
            }}
          />
        </div>
        <p className="text-sm text-red-500">{errors.text?.message}</p>
      </div>

      <Button
        className="w-full max-w-max bg-brand-blue text-white text-sm px-3 py-2"
        type="submit"
        disabled={!isValid || isLoading}
        isLoading={isLoading}
      >
        {previousObjective ? "Update Objective" : "Create Objective"}
      </Button>
    </form>
  );
};
