/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { type FC, Fragment, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";

type CategoryCreationDialogProps = {
  refreshCategories: () => Promise<void>;
};

const schema = z.object({
  name: z.string().min(3, { message: "Category name must be at least 3 characters" }),
});

type SchemaType = z.infer<typeof schema>;

export const CategoryCreationDialog: FC<CategoryCreationDialogProps> = ({ refreshCategories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const params = useParams();
  const communityId = params.communityId as string;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  const { authenticated: isAuth } = useAuth();
  const { authenticate } = useAuth();

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    try {
      setIsLoading(true);
      if (!isAuth) {
        await authenticate();
      }
      const [_request, error] = await fetchData(
        INDEXER.CATEGORIES.CREATE(communityId),
        "POST",
        data,
        {},
        {},
        true
      );
      if (error) throw new Error("An error occurred while creating the category");
      toast.success("Category created successfully");
      refreshCategories();
      closeModal();
    } catch (error: any) {
      errorManager(
        MESSAGES.CATEGORY.CREATE.ERROR,
        error,
        { data, communityId, address },
        {
          error: MESSAGES.CATEGORY.CREATE.ERROR,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={openModal}
        className={
          "flex justify-center items-center gap-x-1 rounded-md px-3 py-2 text-sm font-semibold"
        }
      >
        <PlusIcon className="h-4 w-4" />
        Create category
      </Button>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
                    <div className="flex w-full flex-col">
                      <label htmlFor="milestone-title" className={"text-sm font-bold"}>
                        Category name *
                      </label>
                      <input
                        id="milestone-title"
                        className={
                          "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        }
                        placeholder="Ex: Community building"
                        {...register("name")}
                      />
                      <p className="text-base text-red-400">{errors.name?.message}</p>
                    </div>
                    <div className="flex flex-row gap-4 justify-end">
                      <Button onClick={closeModal} disabled={isLoading} variant="outline">
                        Cancel
                      </Button>
                      <Button disabled={isLoading} isLoading={isLoading} type="submit">
                        Create
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
