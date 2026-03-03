/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FC, Fragment, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAccount } from "wagmi";
import { z } from "zod";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { communityAdminsService } from "@/services/community-admins.service";
import { adminTransferOwnership } from "@/services/project.service";
import { useProjectStore } from "@/store";
import { useAdminTransferOwnershipModalStore } from "@/store/modals/adminTransferOwnership";
import { Button } from "../Utilities/Button";
import { errorManager } from "../Utilities/errorManager";

const schema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" }),
});

type FormData = z.infer<typeof schema>;

const inputStyle =
  "rounded border border-zinc-300 dark:bg-zinc-800 px-2 py-1 text-black dark:text-white w-full";
const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

export const AdminTransferOwnershipDialog: FC = () => {
  const {
    isAdminTransferOwnershipModalOpen: isOpen,
    closeAdminTransferOwnershipModal: closeModal,
  } = useAdminTransferOwnershipModalStore();

  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { address } = useAccount();
  const { startAttestation, showSuccess, showError } = useAttestationToast();

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
    startAttestation("Transferring ownership...");
    try {
      const newOwnerAddress = await communityAdminsService.resolveEmailToWallet(data.email);

      await adminTransferOwnership(project.uid, project.chainID, newOwnerAddress);

      await refreshProject();
      showSuccess(
        "Transfer ownership request submitted successfully. It can take few minutes to reflect."
      );
      closeModal();
    } catch (error: any) {
      showError("Failed to request ownership transfer.");
      errorManager(
        `Error requesting ownership transfer from ${project.owner} to ${data.email}`,
        error,
        {
          address: address,
          project: project?.details?.slug || project?.uid,
          oldOwner: project?.owner,
          newOwnerEmail: data.email,
        },
        {
          error: "Failed to request ownership transfer.",
        }
      );
    }
  };

  return (
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
                    <label htmlFor="newOwnerEmail" className={labelStyle}>
                      New Owner Email
                    </label>
                    <input
                      className={inputStyle}
                      type="email"
                      id="newOwnerEmail"
                      placeholder="newowner@example.com"
                      {...register("email")}
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
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
  );
};
