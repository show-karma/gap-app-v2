/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";
import { useAdminTransferOwnershipModalStore } from "@/store/modals/adminTransferOwnership";
import fetchData from "@/utilities/fetchData";
import { sanitizeInput } from "@/utilities/sanitize";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, Fragment, ReactNode, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { z } from "zod";
import { Button } from "../Utilities/Button";
import { errorManager } from "../Utilities/errorManager";

type AdminTransferOwnershipProps = {
  buttonElement?: {
    text: string;
    icon: ReactNode;
    styleClass: string;
  } | null;
};

const schema = z.object({
  newOwner: z
    .string()
    .min(1, { message: "Address is required" })
    .refine((value) => isAddress(value), {
      message: "Invalid address. Address should be a valid Ethereum address.",
    }),
});

type FormData = z.infer<typeof schema>;

const inputStyle =
  "rounded border border-zinc-300 dark:bg-zinc-800 px-2 py-1 text-black dark:text-white w-full";
const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

export const AdminTransferOwnershipDialog: FC<AdminTransferOwnershipProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-primary-600" />,
    text: "Request Transfer Ownership",
    styleClass:
      "flex items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
  },
}) => {
  const {
    isAdminTransferOwnershipModalOpen: isOpen,
    openAdminTransferOwnershipModal: openModal,
    closeAdminTransferOwnershipModal: closeModal,
  } = useAdminTransferOwnershipModalStore();

  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    if (!project) return;
    try {
      const sanitizedAddress = sanitizeInput(data.newOwner);

      const [_, error] = await fetchData(
        `/attestations/transfer-ownership/${project.uid}/${project.chainID}/${sanitizedAddress}`,
        "POST",
        {}
      );

      if (error) {
        toast.error(error);
        return;
      }

      await refreshProject();
      toast.success("Transfer ownership request submitted successfully");
      closeModal();
    } catch (error: any) {
      toast.error("Something went wrong. Please try again later.");
      errorManager(
        `Error requesting ownership transfer from ${project.recipient} to ${data.newOwner}`,
        error,
        {
          project: project?.details?.data?.slug || project?.uid,
          oldOwner: project?.recipient,
          newOwner: data.newOwner,
        }
      );
      console.error(error);
    }
  };

  return (
    <>
      {buttonElement ? (
        <Button
          disabled={!isProjectAdmin}
          onClick={openModal}
          className={buttonElement.styleClass}
        >
          {buttonElement.icon}
          {buttonElement.text}
        </Button>
      ) : null}
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Transfer Project Ownership
                  </Dialog.Title>
                  <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="newOwner" className={labelStyle}>
                        New Owner Address
                      </label>
                      <input
                        className={inputStyle}
                        type="text"
                        id="newOwner"
                        {...register("newOwner")}
                      />
                      {errors.newOwner && (
                        <p className="text-red-500 text-sm">
                          {errors.newOwner.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row gap-4 mt-10 justify-end">
                      <Button
                        type="button"
                        className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                        onClick={closeModal}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="text-white text-lg bg-red-600 border-black hover:bg-red-600 hover:text-white"
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                      >
                        Continue
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
