"use client";
/* eslint-disable @next/next/no-img-element */
import { Dialog, Transition } from "@headlessui/react";
import { FC, Fragment, useEffect, useState } from "react";

import { Button } from "@/components/Utilities/Button";
import { useProjectStore } from "@/store";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useAuthStore } from "@/store/auth";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useWallet } from "@/hooks/useWallet";

type ContributorProfileDialogProps = {};

const profileSchema = z.object({
  name: z.string().min(3, { message: "This name is too short" }),
  aboutMe: z.string().optional(),
  github: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  twitter: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  linkedin: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  farcaster: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400";

type SchemaType = z.infer<typeof profileSchema>;

export const ContributorProfileDialog: FC<
  ContributorProfileDialogProps
> = () => {
  const project = useProjectStore((state) => state.project);
  const { address, chain, isConnected } = useAccount();
  const {
    closeModal,
    isModalOpen: isOpen,
    isGlobal,
  } = useContributorProfileModalStore();

  // Fetch contributor profile using React Query
  const {
    profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useContributorProfile(address);

  // Fetch team profiles using React Query
  const { refetch: refetchTeamProfiles } = useTeamProfiles(project);

  const isProjectMember = !!project?.members.find(
    (item) =>
      item.recipient.toLowerCase() === address?.toLowerCase() ||
      project?.recipient?.toLowerCase() === address?.toLowerCase()
  );
  const isEditing = isProjectMember || isGlobal;
  const inviteCodeParam = useSearchParams().get("invite-code");
  const { gap } = useGap();
  const { switchChainAsync } = useWallet();
  const {
    register,
    setValue,
    handleSubmit,
    watch,
    clearErrors,
    reset,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(profileSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const { openConnectModal } = useConnectModal();
  const [isLoading, setIsLoading] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();
  const { isAuth } = useAuthStore();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const isAllowed = isConnected && isAuth;

  const onSubmit = async (data: SchemaType) => {
    let gapClient = gap;
    if (!address) return;
    if (!isGlobal && !project) return;
    try {
      setIsLoading(true);
      const targetChainId = isGlobal ? chain?.id : project?.chainID;
      if (!targetChainId) {
        toast.error("Chain not found");
        setIsLoading(false);
        return;
      }
      if (chain?.id !== targetChainId) {
        await switchChainAsync?.({ chainId: targetChainId });
        gapClient = getGapClient(targetChainId);
      }

      const { walletClient, error } = await safeGetWalletClient(targetChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const contributorProfile = new ContributorProfile({
        data: {
          aboutMe: data.aboutMe,
          github: data.github,
          linkedin: data.linkedin,
          name: data.name,
          twitter: data.twitter,
          farcaster: data.farcaster,
        },
        recipient: address as `0x${string}`,
        schema: gapClient.findSchema("ContributorProfile"),
      });
      await contributorProfile
        .attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          if (!isProjectMember && !isGlobal && inviteCodeParam) {
            const [data, error] = await fetchData(
              INDEXER.PROJECT.INVITATION.ACCEPT_LINK(project?.uid as string),
              "POST",
              {
                hash: inviteCodeParam,
              }
            );
            if (error) throw error;
          }
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, targetChainId),
              "POST",
              {}
            );
          }

          while (retries > 0) {
            if (!isProjectMember && !isGlobal) {
              await refreshProject().then(async (refreshedProject) => {
                // Check if the member is already in the project
                const hasMember = refreshedProject?.members.find(
                  (item) =>
                    item.recipient.toLowerCase() === address.toLowerCase()
                );
                // If the member is already in the project, update the profile
                if (hasMember) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(
                    "Congrats! You have joined the team successfully"
                  );
                  refetchTeamProfiles();
                  closeModal();
                }
              });
            } else {
              // Refetch profile to check if it's updated
              const { data: updatedProfile } = await refetchProfile();
              if (updatedProfile?.data) {
                const profileFetched = {
                  aboutMe: updatedProfile.data.aboutMe,
                  github: updatedProfile.data.github,
                  linkedin: updatedProfile.data.linkedin,
                  name: updatedProfile.data.name,
                  twitter: updatedProfile.data.twitter,
                  farcaster: updatedProfile.data.farcaster,
                } as SchemaType;

                const isUpdated = Object.keys(profileFetched).every(
                  (key: string) =>
                    profileFetched[key as keyof SchemaType] ===
                    data[key as keyof SchemaType]
                );
                if (isUpdated) {
                  retries = 0;
                  changeStepperStep("indexed");
                  refetchTeamProfiles();
                  toast.success("Profile updated successfully");
                  closeModal();
                }
              }
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
      return;
    } catch (e) {
      errorManager("Failed to accept invite", e, {
        projectId: project?.uid,
        inviteCode: inviteCodeParam,
        address,
      });
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  // Update form values when profile data is loaded
  useEffect(() => {
    if (profile?.data) {
      setValue("aboutMe", profile.data.aboutMe, {
        shouldValidate: true,
      });
      setValue("github", profile.data.github, {
        shouldValidate: true,
      });
      setValue("linkedin", profile.data.linkedin, {
        shouldValidate: true,
      });
      setValue("twitter", profile.data.twitter, {
        shouldValidate: true,
      });
      setValue("name", profile.data.name || "", {
        shouldValidate: !!profile.data.name,
      });
      setValue("farcaster", profile.data.farcaster, {
        shouldValidate: !!profile.data.farcaster,
      });
    } else {
      reset();
    }
  }, [profile, setValue]);

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
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                >
                  {isEditing
                    ? "Edit your profile"
                    : `Accept invite to join ${
                        project?.details?.data.title || "this project"
                      }`}
                </Dialog.Title>
                {isAllowed ? (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col gap-2 mt-8">
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="ethAddress" className={labelStyle}>
                          Your ETH address
                        </label>
                        <p
                          className={cn(
                            inputStyle,
                            "opacity-70 cursor-not-allowed"
                          )}
                        >
                          {address}
                        </p>
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="name" className={labelStyle}>
                          Name
                        </label>
                        <input
                          id="name"
                          className={inputStyle}
                          placeholder="Ex: John Doe"
                          {...register("name")}
                        />
                        <p className="text-base text-red-400">
                          {errors.name?.message}
                        </p>
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="aboutMe" className={labelStyle}>
                          About me (optional)
                        </label>
                        <textarea
                          id="aboutMe"
                          className={cn(inputStyle, "min-h-32")}
                          placeholder="Ex: I'm a software developer with 8 years of experience. I have been building in blockchain space for 3 years. I am proficient in NodeJS, Typescript and React."
                          {...register("aboutMe")}
                        />
                        <p className="text-base text-red-400">
                          {errors.aboutMe?.message}
                        </p>
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="github" className={labelStyle}>
                          Github (optional)
                        </label>
                        <input
                          id="github"
                          className={inputStyle}
                          placeholder="Ex: https://github.com/johndoe"
                          {...register("github")}
                        />
                        <p className="text-base text-red-400">
                          {errors.github?.message}
                        </p>
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="twitter" className={labelStyle}>
                          Twitter (optional)
                        </label>
                        <input
                          id="twitter"
                          className={inputStyle}
                          placeholder="Ex: https://x.com/johndoe"
                          {...register("twitter")}
                        />
                        <p className="text-base text-red-400">
                          {errors.twitter?.message}
                        </p>
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="linkedin" className={labelStyle}>
                          Linkedin (optional)
                        </label>
                        <input
                          id="linkedin"
                          className={inputStyle}
                          placeholder="Ex: https://linkedin.com/in/johndoe"
                          {...register("linkedin")}
                        />
                        <p className="text-base text-red-400">
                          {errors.linkedin?.message}
                        </p>
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label htmlFor="farcaster" className={labelStyle}>
                          Farcaster (optional)
                        </label>
                        <input
                          id="farcaster"
                          className={inputStyle}
                          placeholder="Ex: https://warpcast.com/johndoe"
                          {...register("farcaster")}
                        />
                        <p className="text-base text-red-400">
                          {errors.farcaster?.message}
                        </p>
                      </div>
                      <Button
                        className="justify-center items-center flex text-center text-base w-full bg-black dark:bg-zinc-900 hover:bg-black hover:dark:bg-zinc-800 text-white dark:text-zinc-100"
                        type="submit"
                        disabled={isLoading || !isValid}
                        isLoading={isLoading}
                      >
                        {isEditing ? "Update profile" : "Create profile"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2 justify-center items-start mt-8">
                    <p className="text-base text-zinc-900 dark:text-zinc-100 text-left w-full">
                      {isEditing
                        ? "Login with your wallet to edit your profile."
                        : `The owner of the project ${project?.details?.data.title} has requested you to join their team on Karma GAP.  Login with your wallet to complete your profile and join the team.`}
                    </p>
                    <Button
                      type="button"
                      className="rounded-md text-lg"
                      onClick={openConnectModal}
                    >
                      Login
                    </Button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
