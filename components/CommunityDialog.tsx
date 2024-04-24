/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MarkdownEditor } from "./Utilities/MarkdownEditor";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Community, nullRef } from "@show-karma/karma-gap-sdk";
import { Button } from "./Utilities/Button";
import { useProjectStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { appNetwork } from "@/utilities/network";
import { cn } from "@/utilities/tailwind";
import { useAuthStore } from "@/store/auth";
import { getGapClient, useGap } from "@/hooks";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  name: z.string().min(3, { message: MESSAGES.COMMUNITY_FORM.TITLE }),
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
  CreateCommuninty?: Community;
};

export const CommunityDialog: FC<ProjectDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-white" />,
    iconSide: "left",
    text: "New Community",
    styleClass: "",
  },
  CreateCommuninty,
}) => {
  const dataToUpdate = {
    description: CreateCommuninty?.details?.description || "",
    name: CreateCommuninty?.details?.name || "",
    imageURL: CreateCommuninty?.details?.imageURL || "",
    slug: CreateCommuninty?.details?.slug || "",
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

  const { isConnected, address } = useAccount();
  const { isAuth } = useAuthStore();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork({
    chainId: appNetwork[0].id,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { openConnectModal } = useConnectModal();
  const signer = useSigner();

  const { gap } = useGap();

  const createCommunity = async (data: SchemaType) => {
    console.log("data", data);
    if (!gap) return;
    let gapClient = gap;
    if (!checkNetworkIsValid(chain?.id)) {
      await switchNetworkAsync?.(appNetwork[0].id);
      gapClient = getGapClient(appNetwork[0].id);
    }

    if (chain?.id != selectedChainId) {
      await switchNetworkAsync?.(selectedChainId);
    }

    try {
      const newCommunity = new Community({
        data: {
          community: true,
        },
        schema: gapClient.findSchema("Community"),
        refUID: nullRef,
        recipient: address || "0x00",
        uid: nullRef,
      });
      if (await gapClient.fetch.slugExists(data.slug as string)) {
        data.slug = await gapClient.generateSlug(data.slug as string);
      }

      await newCommunity.attest(signer, {
        name: data.name,
        description: description as string,
        imageURL: data.imageURL as string,
        slug: data.slug as string,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async (data: SchemaType) => {
    try {
      setIsLoading(true); // Set loading state to true
      await createCommunity(data); // Call the createCommunity function
      setIsLoading(false); // Reset loading state
      closeModal(); // Close the dialog upon successful submission
    } catch (error) {
      console.error("Error creating community:", error);
      setIsLoading(false); // Reset loading state
    }
  };

  const [description, setDescription] = useState(
    dataToUpdate?.description || ""
  );
  const [selectedChainId, setSelectedChainId] = useState(1115510);

  return (
    <>
      <button
        onClick={openModal}
        className={cn(
          "flex justify-center min-w-max items-center gap-x-1 rounded-md bg-brand-blue border-2 border-brand-blue px-3 py-2 text-sm font-semibold text-white dark:text-zinc-100 hover:opacity-75 dark:hover:bg-primary-900",
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
                    Create a new Community!
                  </Dialog.Title>
                  <button
                    type="button"
                    className="top-6 absolute right-6 hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                    onClick={closeModal}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  {!CreateCommuninty && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-zinc-300">
                        Fill out these details to create a new Community
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="w-full px-2 py-4 sm:px-0">
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
                          ChainId *
                        </label>
                        <select
                          id="select-input"
                          className={inputStyle}
                          value={selectedChainId}
                          onChange={(e) => {
                            setSelectedChainId(parseInt(e.target.value));
                            console.log(e.target.value);
                          }}
                        >
                          <option value={1115510}>1115510</option>
                          <option value={10}>10</option>
                          <option value={10}>1</option>
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
                        <p className="text-red-500">
                          {errors.imageURL?.message}
                        </p>
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
