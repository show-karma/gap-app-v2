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
import { getWalletClient } from "@wagmi/core";
import { config } from "@/utilities/wagmi/config";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useStepper } from "@/store/modals/txStepper";
import { sanitizeInput } from "@/utilities/sanitize";
import toast from "react-hot-toast";
import { useState } from "react";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useParams, useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";

const objectiveSchema = z.object({
  title: z.string().min(3, { message: MESSAGES.PROJECT_OBJECTIVE_FORM.TITLE }),
  text: z.string().min(3, { message: MESSAGES.PROJECT_OBJECTIVE_FORM.TEXT }),
});

type ObjectiveType = z.infer<typeof objectiveSchema>;

const labelStyle = "text-sm font-bold";
const inputStyle =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white";

export const ProjectObjectiveForm = () => {
  const { address, chain } = useAccount();
  const { project, refreshProject } = useProjectStore();
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

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
    defaultValues: {},
  });

  const { gap } = useGap();
  const [isLoading, setIsLoading] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();

  const onSubmit: SubmitHandler<ObjectiveType> = async (data) => {
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
        data: {
          title: data.title,
          text: data.text,
          type: "project-milestone",
        },
        schema: gapClient.findSchema("ProjectMilestone"),
        refUID: project?.uid,
        recipient: address || "0x00",
      });
      const walletClient = await getWalletClient(config, {
        chainId: project?.chainID as number,
      });
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
                  router.push(PAGES.PROJECT.ROADMAP.ROOT(projectId as string));
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.SUCCESS);
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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col md:flex-row gap-8 w-full"
    >
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2">
          <label htmlFor="name-input" className={labelStyle}>
            Title *
          </label>
          <input
            id="name-input"
            type="text"
            className={inputStyle}
            placeholder="Enter a concise and descriptive project title"
            {...register("title")}
          />
          <p className="text-sm text-red-500">{errors.title?.message}</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <label htmlFor="description-input" className={labelStyle}>
            Description *
          </label>
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
          className="w-full max-w-max bg-brand-blue text-white text-base px-4 py-3"
          type="submit"
          disabled={!isValid || isLoading}
          isLoading={isLoading}
        >
          Create Objective
        </Button>
      </div>
    </form>
  );
};
