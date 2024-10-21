/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/Utilities/Button";
import { MESSAGES } from "@/utilities/messages";

import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { cn } from "@/utilities/tailwind";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  profile: z
    .string()
    .regex(
      /^https:\/\/explorer\.gitcoin\.co\/#\/round\/(\d+)\/(\d+)\/(\d+)$/,
      MESSAGES.COMMUNITY_FORM.TITLE.MIN
    )
    .min(3, { message: MESSAGES.COMMUNITY_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.COMMUNITY_FORM.TITLE.MAX }),
});

type SchemaType = z.infer<typeof schema>;

type AddExternalIdDialogProps = {
  buttonElement?: {
    text?: string;
    icon?: ReactNode;
    iconSide?: "left" | "right";
    styleClass: string;
  };
  projectUID: string;
  communityUID: string;
};

type GitcoinUrlParams = {
  chainId: number;
  roundId: string;
  applicationId: string;
};

function parseGitcoinUrl(url: string): GitcoinUrlParams {
  const regex =
    /^https:\/\/explorer\.gitcoin\.co\/#\/round\/(\d+)\/(\d+)\/(\d+)$/;
  const match = url.match(regex);

  if (!match) {
    throw new Error("Invalid Gitcoin Explorer URL format");
  }

  const [, chainIdStr, roundId, applicationId] = match;
  const chainId = parseInt(chainIdStr, 10);

  return {
    chainId,
    roundId,
    applicationId,
  };
}

export const AddExternalId: FC<AddExternalIdDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-brand-blue" />,
    iconSide: "left",
    text: "Add External ID",
    styleClass: "",
  },
  projectUID,
  communityUID,
}) => {
  const dataToUpdate = {
    profile: "",
  };
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

  const [isLoading, setIsLoading] = useState(false);
  async function fetchApplicationData(
    chainId: number,
    applicationId: string,
    roundId: string
  ) {
    const url = "https://grants-stack-indexer-v2.gitcoin.co/graphql";

    const payload = {
      operationName: "Application",
      query: `
      query Application($chainId: Int!, $applicationId: String!, $roundId: String!) {
        applications(
          first: 1
          condition: {
            status: APPROVED
            chainId: $chainId
            id: $applicationId
            roundId: $roundId
          }
        ) {
          projectId
        }
      }`,
      variables: {
        chainId,
        applicationId,
        roundId,
      },
    };

    const [response, error] = await fetchData(
      "",
      "POST",
      payload,
      {},
      { "Content-Type": "application/json" },
      false,
      false,
      url
    );

    if (error) {
      throw new Error(error);
    }

    return response.data.applications[0].projectId;
  }

  const onSubmit = async (data: SchemaType) => {
    setIsLoading(true); // Set loading state to true

    try {
      const { chainId, roundId, applicationId } = parseGitcoinUrl(data.profile);

      const externalId = await fetchApplicationData(
        chainId,
        applicationId,
        roundId
      );
      const [request, error] = await fetchData(
        INDEXER.GRANTS.UPDATE_EXTERNAL_ID,
        "PUT",
        {
          projectUID,
          communityUID,
          externalId: externalId,
        },
        {},
        {},
        true
      );
      if (!error) {
        toast.success("External ID added successfully!");
        closeModal();
      } else {
        toast.error("Error adding external ID");
        closeModal();
      }
    } catch (error) {
      console.log(error);
      toast.error("Error adding external ID");
      closeModal();
    } finally {
      data.profile = "";
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className={cn(
          "flex justify-center min-w-max items-center gap-x-1 rounded-md px-3 py-2 text-sm font-semibold text-brand-blue dark:text-zinc-100 hover:opacity-75 dark:hover:bg-primary-900",
          buttonElement.styleClass
        )}
      >
        {buttonElement.iconSide === "left" && buttonElement.icon}
        {buttonElement.text}
        {buttonElement.iconSide === "right" && buttonElement.icon}
      </button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Adding External ID
                  </Dialog.Title>
                  <button
                    type="button"
                    className="top-6 absolute right-6 hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                    onClick={closeModal}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  {
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-zinc-300">
                        Note : Adding an external ID will allow the grant to be
                        linked to the external ID.
                      </p>
                    </div>
                  }

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="w-full px-2 py-4 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="name-input" className={labelStyle}>
                          Gitcoin Profile *
                        </label>
                        <input
                          id="profile-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "https://explorer.gitcoin.co/#/round/42161/25/83"'
                          {...register("profile")}
                        />
                        <p className="text-red-500 text-sm">
                          {errors.profile?.message}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-row justify-end gap-4">
                      <button
                        type="button"
                        className="flex items-center flex-row gap-2 dark:border-white dark:text-zinc-100 justify-center rounded-md border bg-transparent border-gray-200 px-4 py-2 text-md font-medium text-black hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={closeModal}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>

                      <Button
                        type={"submit"}
                        className="flex flex-row gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        isLoading={isLoading}
                      >
                        Add ExternalId
                        <PlusIcon width={20} height={20} color="white" />
                      </Button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
