/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAccount } from "wagmi";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";

type RegionCreationDialogProps = {
  refreshRegions: () => Promise<void>;
};

const schema = z.object({
  name: z
    .string()
    .min(3, { message: "Region name must be at least 3 characters" }),
});

type SchemaType = z.infer<typeof schema>;

export const RegionCreationDialog: FC<RegionCreationDialogProps> = ({
  refreshRegions,
}) => {
  let [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const params = useParams();
  const communityId = params.communityId as string;

  const { data: community } = useCommunityDetails(communityId);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  function closeModal() {
    setIsOpen(false);
    reset();
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

      const communityUID = community?.uid || communityId;
      if (!communityUID) {
        throw new Error("Community ID is not available");
      }

      const [request, error] = await fetchData(
        INDEXER.REGIONS.CREATE(communityUID),
        "POST",
        {
          name: data.name,
        },
        {},
        {},
        true
      );

      if (error)
        throw new Error("An error occurred while creating the region");

      toast.success("Region created successfully");
      refreshRegions();
      closeModal();
    } catch (error: any) {
      errorManager(
        "Error creating region",
        error,
        { data, communityId, address },
        {
          error: "Failed to create region. Please try again.",
        }
      );
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={openModal}
        className={
          "flex justify-center items-center gap-x-1 rounded-md bg-primary-500 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-white dark:text-zinc-100  hover:opacity-75 dark:hover:opacity-75 border border-primary-200 dark:border-primary-900"
        }
      >
        <PlusIcon className="h-4 w-4" />
        Create region
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
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex w-full flex-col gap-4"
                  >
                    <div className="flex w-full flex-col">
                      <label
                        htmlFor="region-name"
                        className={"text-sm font-bold"}
                      >
                        Region name *
                      </label>
                      <input
                        id="region-name"
                        className={
                          "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        }
                        placeholder="Ex: North America, Europe, Asia"
                        {...register("name")}
                      />
                      <p className="text-base text-red-400">
                        {errors.name?.message}
                      </p>
                    </div>
                    <div className="flex flex-row gap-4 justify-end">
                      <Button
                        className="text-zinc-900 hover:bg-transparent text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:opacity-75 disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                        onClick={closeModal}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-white text-lg bg-primary-500 border-black  hover:bg-primary-600 hover:text-white"
                        disabled={isLoading || !isValid}
                        isLoading={isLoading}
                        type="submit"
                      >
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