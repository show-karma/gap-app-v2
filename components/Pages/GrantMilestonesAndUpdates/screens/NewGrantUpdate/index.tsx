/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useProjectStore } from "@/store";
import { MESSAGES, PAGES, useSigner } from "@/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Grant } from "@show-karma/karma-gap-sdk";
import Link from "next/link";
import { useRouter } from "next/router";
import type { FC } from "react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
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
  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
  });
  const [description, setDescription] = useState("");

  const router = useRouter();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const signer = useSigner();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);

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

  const createGrantUpdate = async (
    grantToUpdate: Grant,
    { title, text }: { title: string; text: string }
  ) => {
    if (!address || !project) return;
    try {
      if (chain && chain.id !== grantToUpdate.chainID) {
        await switchChainAsync?.({ chainId: grantToUpdate.chainID });
      }
      await grantToUpdate
        .attestUpdate(signer as any, {
          text,
          title,
        })
        .then(async () => {
          toast.success(MESSAGES.GRANT.GRANT_UPDATE.SUCCESS);
          await refreshProject().then(() => {
            router.push(
              PAGES.PROJECT.TABS.SELECTED_TAB(
                project.uid,
                grantToUpdate.uid,
                "milestones-and-updates"
              )
            );
          });
        });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.GRANT.GRANT_UPDATE.ERROR);
    }
  };

  return (
    <div className="flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-white dark:bg-zinc-900 px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Post a grant update
          </h4>
          <Link
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
            href={PAGES.PROJECT.TABS.SELECTED_TAB(
              project?.uid || "",
              grant.uid,
              "milestones-and-updates"
            )}
          >
            <img src="/icons/close.svg" alt="Close" className="h-5 w-5 " />
          </Link>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-4"
        >
          <div className="flex w-full flex-col">
            <label htmlFor="update-title" className={labelStyle}>
              Title
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
              Description
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
