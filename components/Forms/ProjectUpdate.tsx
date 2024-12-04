/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { config } from "@/utilities/wagmi/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectUpdate } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import { sanitizeObject } from "@/utilities/sanitize";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const updateSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MAX }),
  text: z.string().min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TEXT }),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

type UpdateType = z.infer<typeof updateSchema>;

interface ProjectUpdateFormProps {
  afterSubmit?: () => void;
}

export const ProjectUpdateForm: FC<ProjectUpdateFormProps> = ({
  afterSubmit,
}) => {
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
    setValue,
  } = useForm<UpdateType>({
    resolver: zodResolver(updateSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);

  const { changeStepperStep, setIsStepper } = useStepper();

  const { gap } = useGap();
  const router = useRouter();

  const createProjectUpdate = async ({ title, text }: UpdateType) => {
    let gapClient = gap;
    if (!address || !project) return;
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const projectUpdate = new ProjectUpdate({
        data: sanitizeObject({
          text,
          title,
          type: "project-update",
        }),
        recipient: project.recipient,
        refUID: project.uid,
        schema: gapClient.findSchema("ProjectUpdate"),
      });

      await projectUpdate
        .attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, projectUpdate.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const attestUID = projectUpdate.uid;
                const alreadyExists = fetchedProject?.updates.find(
                  (g) => g.uid === attestUID
                );

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_UPDATE_FORM.SUCCESS);
                  afterSubmit?.();
                  router.push(
                    PAGES.PROJECT.UPDATES(
                      project?.details?.data.slug || project.uid
                    )
                  );
                  router.refresh();
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
        `Error of user ${address} creating project update for project ${project?.uid}`,
        error,
        {
          projectUID: project?.uid,
          address: address,
          data: { title, text },
        }
      );
      console.log(error);
      toast.error(MESSAGES.PROJECT_UPDATE_FORM.ERROR);
    } finally {
      setIsStepper(false);
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<UpdateType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    await createProjectUpdate(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
    >
      <div className="flex w-full flex-col">
        <label htmlFor="update-title" className={labelStyle}>
          Title *
        </label>
        <input
          id="update-title"
          className={inputStyle}
          placeholder="Ex: Version 2.0 launch"
          {...register("title")}
        />
        <p className="text-base text-red-400">{errors.title?.message}</p>
      </div>

      <div className="flex w-full gap-2 flex-col">
        <label htmlFor="update-description" className={labelStyle}>
          Description *
        </label>
        <div className="w-full bg-transparent" data-color-mode="light">
          <MarkdownEditor
            className="bg-transparent"
            value={watch("text")}
            onChange={(newValue: string) =>
              setValue("text", newValue, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              })
            }
            placeholderText="To share updates on the progress of this project, please add the details here."
          />
        </div>
      </div>
      <div className="flex w-full flex-row-reverse">
        <Button
          type="submit"
          className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
          disabled={isSubmitting || !isValid}
          isLoading={isSubmitting || isLoading}
        >
          Post update
        </Button>
      </div>
    </form>
  );
};
