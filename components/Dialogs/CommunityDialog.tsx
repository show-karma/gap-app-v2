/* eslint-disable @next/next/no-img-element */

import { Dialog, Transition } from "@headlessui/react";
import { ChevronRightIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Community } from "@show-karma/karma-gap-sdk";
import { useRouter } from "next/navigation";
import { type FC, Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import fetchData from "@/utilities/fetchData";
import { MESSAGES } from "@/utilities/messages";
import { gapSupportedNetworks } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { errorManager } from "../Utilities/errorManager";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";
import { Button } from "../ui/button";

const inputStyle = "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle = "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  name: z
    .string()
    .min(3, { message: MESSAGES.COMMUNITY_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.COMMUNITY_FORM.TITLE.MAX }),
  slug: z.string().min(3, { message: MESSAGES.COMMUNITY_FORM.SLUG }),
  imageURL: z.string().min(1, { message: MESSAGES.COMMUNITY_FORM.IMAGE_URL }),
});

type SchemaType = z.infer<typeof schema>;

type ProjectDialogProps = {
  buttonElement?: {
    text?: string;
    icon?: ReactNode;
    iconSide?: "left" | "right";
    styleClass: string;
  };
  createCommuninity?: Community;
  refreshCommunities: () => Promise<Community[] | undefined>;
};

export const CommunityDialog: FC<ProjectDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4" />,
    iconSide: "left",
    text: "New Community",
    styleClass: "",
  },
  createCommuninity,
  refreshCommunities,
}) => {
  const dataToUpdate = useMemo(
    () => ({
      description: createCommuninity?.details?.description || "",
      name: createCommuninity?.details?.name || "",
      imageURL: createCommuninity?.details?.imageURL || "",
      slug: createCommuninity?.details?.slug || "",
    }),
    [createCommuninity]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [shouldResetOnOpen, setShouldResetOnOpen] = useState(true);
  const [description, setDescription] = useState(dataToUpdate?.description || "");
  const [selectedChain, setSelectedChain] = useState(gapSupportedNetworks[0].id);

  const { authenticated, login } = useAuth();
  const router = useRouter();

  function closeModal() {
    setIsOpen(false);
    setShouldResetOnOpen(true);
  }

  function openModal() {
    setIsOpen(true);
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

  useEffect(() => {
    if (isOpen && shouldResetOnOpen) {
      reset(dataToUpdate);
      setDescription(dataToUpdate?.description || "");
      setSelectedChain(gapSupportedNetworks[0].id);
    }
  }, [isOpen, shouldResetOnOpen, dataToUpdate, reset, setDescription]);

  const [isLoading, setIsLoading] = useState(false);

  const createCommunity = async (data: SchemaType) => {
    if (!authenticated) {
      login?.();
      return;
    }

    setIsLoading(true);

    try {
      const [result, error, , status] = await fetchData(
        "/v2/communities",
        "POST",
        {
          name: data.name,
          description: description || data.name,
          imageURL: data.imageURL,
          slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          chainID: selectedChain,
        },
        {},
        {},
        true
      );

      if (error) {
        const lowerError = (error as string).toLowerCase();
        if (status === 403 && lowerError.includes("community limit")) {
          toast.error("You've reached the free tier limit of 1 community. Contact us to upgrade.", {
            duration: 10000,
          });
          return;
        }
        throw new Error(error as string);
      }

      const communitySlug =
        (result as any)?.slug || data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      toast.success("Community created successfully!");
      closeModal();
      try {
        await refreshCommunities();
      } catch {
        // Non-critical — community was already created
      }
      router.push(PAGES.COMMUNITY.ALL_GRANTS(communitySlug));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already exists")) {
        toast.error("A community with this slug already exists. Please choose a different slug.");
      } else {
        toast.error("Failed to create community. Please try again.");
        errorManager("Error creating community", error, { ...data });
      }
      setShouldResetOnOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SchemaType) => {
    await createCommunity(data);
  };

  return (
    <>
      <Button onClick={openModal} className={cn(buttonElement.styleClass)}>
        {buttonElement.iconSide === "left" && buttonElement.icon}
        {buttonElement.text}
        {buttonElement.iconSide === "right" && buttonElement.icon}
      </Button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={isLoading ? () => {} : closeModal}>
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
            <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
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
                    Create a new Community!
                  </Dialog.Title>
                  <button
                    type="button"
                    className="top-6 absolute right-6 hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                    onClick={isLoading ? () => {} : closeModal}
                    disabled={isLoading}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  {!createCommuninity && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-zinc-300">
                        Fill out these details to create a new Community
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col w-full px-2 py-4 gap-1 sm:px-0">
                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="name-input" className={labelStyle}>
                          Name *
                        </label>
                        <input
                          id="name-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "My awesome Community"'
                          {...register("name")}
                        />
                        <p className="text-red-500">{errors.name?.message}</p>
                      </div>
                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="select-input" className={labelStyle}>
                          Chain *
                        </label>
                        <select
                          id="select-input"
                          className={inputStyle}
                          value={selectedChain}
                          onChange={(e) => {
                            setSelectedChain(+e.target.value);
                          }}
                        >
                          {gapSupportedNetworks.map((chain) => (
                            <option key={chain.id} value={chain.id}>
                              {chain.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="desc-input" className={labelStyle}>
                          Description *
                        </label>
                        <MarkdownEditor
                          value={description}
                          onChange={(newValue: string) => {
                            setDescription(newValue || "");
                          }}
                        />
                      </div>

                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="name-input" className={labelStyle}>
                          Image URL *
                        </label>
                        <input
                          id="name-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "https://example.com/image.jpg"'
                          {...register("imageURL")}
                        />
                        <p className="text-red-500">{errors.imageURL?.message}</p>
                      </div>

                      <div className="flex w-full flex-col gap-2">
                        <label htmlFor="name-input" className={labelStyle}>
                          Slug *
                        </label>
                        <input
                          id="name-input"
                          type="text"
                          className={inputStyle}
                          placeholder='e.g. "grant-portal"'
                          {...register("slug")}
                        />
                        <p className="text-red-500">{errors.slug?.message}</p>
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
                        Create Community
                        <ChevronRightIcon className="w-4 h-4" />
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
