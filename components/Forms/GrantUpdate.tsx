/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { GrantUpdate } from "@show-karma/karma-gap-sdk";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { FC } from "react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { sanitizeObject } from "@/utilities/sanitize";
import { useGrantStore } from "@/store/grant";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const updateSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.GRANT.UPDATE.FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.GRANT.UPDATE.FORM.TITLE.MAX }),
  description: z
    .string()
    .min(3, { message: MESSAGES.GRANT.UPDATE.FORM.DESCRIPTION }),
  proofOfWork: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
});

const labelStyleDefault = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyleDefault =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

type UpdateType = z.infer<typeof updateSchema>;

interface GrantUpdateFormProps {
  grant: IGrantResponse;
  labelStyleProps?: string;
  inputStyleProps?: string;
  afterSubmit?: () => void;
}

export const GrantUpdateForm: FC<GrantUpdateFormProps> = ({
  grant,
  labelStyleProps = labelStyleDefault,
  inputStyleProps = inputStyleDefault,
  afterSubmit,
}) => {
  const labelStyle = cn(labelStyleDefault, labelStyleProps);
  const inputStyle = cn(inputStyleDefault, inputStyleProps);
  const { setGrant } = useGrantStore((state) => state);

  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [noProofCheckbox, setNoProofCheckbox] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<UpdateType>({
    resolver: zodResolver(updateSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<UpdateType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    await createGrantUpdate(grant, data).finally(() => {
      setIsLoading(false);
    });
  };

  const { changeStepperStep, setIsStepper } = useStepper();

  const { gap } = useGap();

  const router = useRouter();

  const createGrantUpdate = async (
    grantToUpdate: IGrantResponse,
    data: UpdateType
  ) => {
    let gapClient = gap;
    if (!address || !project) return;
    try {
      if (chain?.id !== grantToUpdate.chainID) {
        await switchChainAsync?.({ chainId: grantToUpdate.chainID });
        gapClient = getGapClient(grantToUpdate.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: grantToUpdate.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const sanitizedGrantUpdate = sanitizeObject({
        text: data.description,
        title: data.title,
        proofOfWork: data.proofOfWork,
        type: "grant-update",
      });
      const grantUpdate = new GrantUpdate({
        data: sanitizedGrantUpdate,
        recipient: grantToUpdate.recipient,
        refUID: grantToUpdate.uid,
        schema: gapClient.findSchema("GrantDetails"),
      });

      await grantUpdate
        .attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grantToUpdate.chainID),
              "POST",
              {}
            );
          }
          changeStepperStep("indexing");
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const attestUID = grantUpdate.uid;
                const updatedGrant = fetchedProject?.grants.find(
                  (g) => g.uid === grantToUpdate.uid
                );

                const alreadyExists = updatedGrant?.updates.find(
                  (u: any) => u.uid === attestUID
                );
                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  afterSubmit?.();
                  toast.success(MESSAGES.GRANT.GRANT_UPDATE.SUCCESS);
                  router.push(
                    PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                      project.uid,
                      grantToUpdate.uid,
                      "milestones-and-updates"
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
      console.log(error);
      toast.error(MESSAGES.GRANT.GRANT_UPDATE.ERROR);
      errorManager(
        `Error creating grant update for grant ${grantToUpdate.uid} from project ${project.uid}`,
        error,
        {
          grantUID: grantToUpdate.uid,
          projectUID: project.uid,
          address: address,
          data: {
            text: data.description,
            title: data.title,
            proofOfWork: data.proofOfWork,
            type: "grant-update",
          },
        }
      );
    } finally {
      setIsStepper(false);
    }
  };

  return (
    <div className="flex flex-1">
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
            placeholder="Ex: Backend dev work complete"
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
              value={watch("description") || ""}
              onChange={(newValue: string) => {
                setValue("description", newValue || "", {
                  shouldValidate: true,
                });
              }}
              placeholderText="To share updates on the progress of this grant, please add the details here."
            />
          </div>
        </div>
        <div className="flex w-full flex-col">
          <label htmlFor="update-proof-of-work" className={labelStyle}>
            Output of your work *
          </label>
          <p className="text-sm text-gray-500">
            Provide a link that demonstrates your work. This could be a link to
            a tweet announcement, a dashboard, a Google Doc, a blog post, a
            video, or any other resource that highlights the progress or result
            of your work
          </p>
          <div className="flex flex-row gap-2 items-center py-2">
            <input
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
            <p className="text-base text-zinc-900 dark:text-zinc-100">{`I don't have any output to show for this milestone`}</p>
          </div>
          <input
            id="update-proof-of-work"
            className={cn(inputStyle, "disabled:opacity-50")}
            disabled={!!noProofCheckbox}
            placeholder="Add links to charts, videos, dashboards etc. that evaluators can verify your work"
            {...register("proofOfWork")}
          />
          <p className="text-base text-red-400">
            {errors.proofOfWork?.message}
          </p>
        </div>
        <div className="flex w-full flex-row-reverse">
          <Button
            type="submit"
            className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
            disabled={
              isSubmitting ||
              !isValid ||
              (!noProofCheckbox && !watch("proofOfWork"))
            }
            isLoading={isSubmitting || isLoading}
          >
            Post update
          </Button>
        </div>
      </form>
    </div>
  );
};
