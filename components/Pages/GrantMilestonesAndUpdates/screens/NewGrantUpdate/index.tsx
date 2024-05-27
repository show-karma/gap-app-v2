/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/txStepper";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { GrantUpdate, type Grant } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { useRouter } from "next/router";
import { useQueryState } from "nuqs";
import type { FC } from "react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(3, { message: MESSAGES.GRANT.UPDATE.FORM.TITLE }),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

type UpdateType = z.infer<typeof updateSchema>;

interface NewGrantUpdateProps {
  grant: Grant;
}

export const NewGrantUpdate: FC<NewGrantUpdateProps> = ({ grant }) => {
  const [description, setDescription] = useState("");

  const router = useRouter();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, changeTab] = useQueryState("tab");
  const {
    register,
    handleSubmit,
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
    await createGrantUpdate(grant, {
      title: data.title,
      text: description,
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const isDescriptionValid = !!description.length;

  const { changeStepperStep, setIsStepper } = useStepper();

  const createGrantUpdate = async (
    grantToUpdate: Grant,
    { title, text }: { title: string; text: string }
  ) => {
    if (!address || !project) return;
    try {
      if (chain && chain.id !== grantToUpdate.chainID) {
        await switchNetworkAsync?.(grantToUpdate.chainID);
      }
      const walletClient = await getWalletClient({
        chainId: grantToUpdate.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const grantUpdate = new GrantUpdate({
        data: {
          text,
          title,
          type: "grant-update",
        },
        recipient: grantToUpdate.recipient,
        refUID: grantToUpdate.uid,
        schema: grantToUpdate.schema.gap.findSchema("GrantDetails"),
      });

      await grantUpdate
        .attest(walletSigner as any, changeStepperStep)
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const attestUID = grantUpdate.uid;
                const updatedGrant = fetchedProject?.grants.find(
                  (g) => g.uid === grantToUpdate.uid
                );

                const alreadyExists = updatedGrant?.updates.find(
                  (u) => u.uid === attestUID
                );
                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.GRANT.GRANT_UPDATE.SUCCESS);
                  changeTab("milestones-and-updates");
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
    } finally {
      setIsStepper(false);
    }
  };

  return (
    <div className="flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900  px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Post a grant update
          </h4>
          <button
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
            onClick={() => {
              changeTab("milestones-and-updates");
            }}
          >
            <img src="/icons/close.svg" alt="Close" className="h-5 w-5 " />
          </button>
        </div>
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
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
                placeholderText="To share updates on the progress of this grant, please add the details here."
              />
            </div>
          </div>
          <div className="flex w-full flex-row-reverse">
            <Button
              type="submit"
              className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
              disabled={
                isSubmitting ||
                !isValid ||
                !isDescriptionValid ||
                !description.length
              }
              isLoading={isSubmitting || isLoading}
            >
              Post update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
