"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { Button } from "../Utilities/Button";
import { errorManager } from "../Utilities/errorManager";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";

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
  const { switchChainAsync } = useWallet();
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

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

  const { refetch } = useProjectUpdates(projectId as string);

  const createObjective = async (data: ObjectiveType) => {
    if (!gap) return;
    let gapClient = gap;
    setIsLoading(true);
    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: project?.chainID as number,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;
      const newObjective = new ProjectMilestone({
        data: sanitizeObject({
          title: data.title,
          text: data.text,
          type: "project-milestone",
        }),
        schema: gapClient.findSchema("ProjectMilestone"),
        refUID: project?.uid,
        recipient: (address || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      });

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

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
          const _fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project?.chainID as number),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(newObjective.uid, project?.chainID as number),
              "POST",
              {}
            );
          }
          let retries = 5;
          changeStepperStep("indexing");
          while (retries > 0) {
            await getProjectObjectives(projectId)
              .then(async (fetchedObjectives) => {
                const attestUID = newObjective.uid;
                const alreadyExists = fetchedObjectives.find((m) => m.uid === attestUID);

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.SUCCESS);
                  await refetch();
                  stateHandler?.(false);
                  router.push(PAGES.PROJECT.UPDATES(project?.details?.slug || project?.uid || ""));
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
      errorManager(
        MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR,
        error,
        {
          data,
          address,
          project: project?.uid,
        },
        {
          error: MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR,
        }
      );
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
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: project?.chainID as number,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.text),
      };
      const fetchedMilestones = await getProjectObjectives(projectId);
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(fetchedMilestones, gapClient?.network);
      const objectiveInstance = objectivesInstances.find(
        (item) => item.uid.toLowerCase() === previousObjective?.uid.toLowerCase()
      );
      if (!objectiveInstance) return;
      objectiveInstance.setValues(sanitizedData);
      await objectiveInstance
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          const _fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project?.chainID as number),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(objectiveInstance.uid, project?.chainID as number),
              "POST",
              {}
            );
          }
          let retries = 5;
          changeStepperStep("indexing");
          while (retries > 0) {
            await getProjectObjectives(projectId)
              .then(async (fetchedObjectives) => {
                const attestUID = objectiveInstance.uid;
                const alreadyExists = fetchedObjectives.find((m) => m.uid === attestUID);

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
      errorManager(
        MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR,
        error,
        {
          data,
          address,
          project: project?.uid,
        },
        {
          error: MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR,
        }
      );
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
      className="space-y-4 w-full py-4 px-0 rounded-2xl max-md:px-0"
    >
      <div className="flex flex-col gap-4 items-start justify-start w-full">
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <label htmlFor="title" className={labelStyle}>
            Milestone Title
          </label>
          <input
            type="text"
            id="title"
            className={`${inputStyle} ${
              errors.title
                ? "border-red-500 dark:border-red-500 text-red-500 dark:text-red-500"
                : ""
            }`}
            placeholder={MESSAGES.PROJECT_OBJECTIVE_FORM.TITLE.MIN}
            {...register("title")}
          />
          {errors.title && <p className="text-red-500">{errors.title.message}</p>}
        </div>
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <label htmlFor="text" className={labelStyle}>
            Milestone Description
          </label>
          <MarkdownEditor
            placeholderText={MESSAGES.PROJECT_OBJECTIVE_FORM.TEXT}
            value={watch("text") || ""}
            onChange={(newValue: string) => {
              setValue("text", newValue || "", {
                shouldValidate: true,
              });
            }}
            className={errors.text ? "border border-red-500" : ""}
          />
          {errors.text && <p className="text-red-500">{errors.text.message}</p>}
        </div>
      </div>
      <div className="flex flex-row gap-2 items-center justify-end pt-2">
        <Button
          onClick={(e) => {
            e.preventDefault();
            stateHandler?.(false);
          }}
          className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
          type="button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          className={`px-4 py-2 bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50 ${
            !isValid || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isValid || isLoading}
        >
          {isEditing ? "Edit Milestone" : "Create Milestone"}
        </Button>
      </div>
    </form>
  );
};
