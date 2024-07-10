/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { shortAddress } from "@/utilities/shortAddress";
import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import toast from "react-hot-toast";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Project } from "@show-karma/karma-gap-sdk";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  name: z.string().optional(),
  email: z
    .string()
    .email({
      message: "Invalid email address. Please enter a valid email address.",
    })
    .min(3, { message: MESSAGES.PROJECT.SUBSCRIPTION.EMAIL }),
});

type SchemaType = z.infer<typeof schema>;

interface ProjectSubscriptionDialogProps {
  project: IProjectResponse;
}

export const ProjectSubscriptionDialog: FC<ProjectSubscriptionDialogProps> = ({
  project,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  let [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  const onSubmit = async (data: SchemaType) => {
    try {
      setIsLoading(true);
      const [res, error] = await fetchData(
        INDEXER.PROJECT.SUBSCRIBE(project?.uid as `0x${string}`),
        "POST",
        data
      );
      if (error) throw error;
      toast.success(
        `You have successfully subscribed to ${
          project?.details?.data?.title || "this project"
        }.`
      );
      closeModal();
    } catch (error: any) {
      console.log(error);
      const isAlreadySubscribed = error?.includes("422");
      if (isAlreadySubscribed) {
        setError("email", {
          type: "manual",
          message: `You have already subscribed to this project.`,
        });
      } else {
        toast.error(
          `There was an error subscribing to ${
            project?.details?.data?.title || "this project"
          }.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={0.5}>
          <Tooltip.Trigger
            onClick={openModal}
            className={
              "flex justify-center items-center w-full gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900"
            }
          >
            Get Updates
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="TooltipContent bg-[#101828] rounded-lg text-white p-3 max-w-[360px]"
              sideOffset={5}
              side="bottom"
            >
              <p className="text-xs font-normal mt-1">
                Receive monthly updates from{" "}
                <b>
                  {project?.details?.data?.title ||
                    (project?.uid
                      ? shortAddress(project?.uid as string)
                      : "this project")}
                </b>{" "}
              </p>
              <Tooltip.Arrow className="TooltipArrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-normal leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Receive monthly updates from{" "}
                    <b>
                      {project?.details?.data?.title ||
                        (project?.uid
                          ? shortAddress(project?.uid as string)
                          : "this project")}
                    </b>{" "}
                  </Dialog.Title>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col w-full px-2 py-4 gap-1 sm:px-0 mt-4">
                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="name-input" className={labelStyle}>
                          Name (Optional)
                        </label>
                        <input
                          id="name-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "Jonny Craig"'
                          {...register("name")}
                        />
                        <p className="text-red-500">{errors.name?.message}</p>
                      </div>

                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="email-input" className={labelStyle}>
                          E-mail *
                        </label>
                        <input
                          id="email-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "my.email@gmail.com"'
                          {...register("email")}
                        />
                        <p className="text-red-500">{errors.email?.message}</p>
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
                        className="flex flex-row gap-2 items-center justify-center rounded-md border border-transparent bg-primary-500 px-6 py-2 text-md font-medium text-white hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        isLoading={isLoading}
                        disabled={isLoading}
                      >
                        Get Updates
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
