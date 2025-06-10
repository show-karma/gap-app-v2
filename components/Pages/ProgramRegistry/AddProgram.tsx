"use client";
import { CommunitiesSelect } from "@/components/CommunitiesSelect";
import { Telegram2Icon, WebsiteIcon } from "@/components/Icons";
import { BlogIcon } from "@/components/Icons/Blog";
import { Discord2Icon } from "@/components/Icons/Discord2";
import { DiscussionIcon } from "@/components/Icons/Discussion";
import { OrganizationIcon } from "@/components/Icons/Organization";
import { Twitter2Icon } from "@/components/Icons/Twitter2";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useAuthStore } from "@/store/auth";
import { useStepper } from "@/store/modals/txStepper";
import { useRegistryStore } from "@/store/registry";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { useDynamicWallet } from "@/hooks/useDynamicWallet";
import { getWalletSignerWithAA } from "@/utilities/wallet-helpers";
import { appNetwork } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { sanitizeObject } from "@/utilities/sanitize";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import { Popover } from "@headlessui/react";
import { CalendarIcon, ChevronLeftIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AlloBase } from "@show-karma/karma-gap-sdk/core/class/GrantProgramRegistry/Allo";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";
import { registryHelper } from "./helper";
import { GrantProgram } from "./ProgramList";
import { SearchDropdown } from "./SearchDropdown";
import { StatusDropdown } from "./StatusDropdown";
import { DatePicker } from "@/components/Utilities/DatePicker";

const labelStyle = "text-sm font-bold text-brand-gray dark:text-zinc-100";
const inputStyle =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

const createProgramSchema = z.object({
  name: z
    .string()
    .min(3, { message: MESSAGES.REGISTRY.FORM.NAME.MIN })
    .max(50, { message: MESSAGES.REGISTRY.FORM.NAME.MAX }),
  dates: z
    .object({
      endsAt: z.date().optional(),
      startsAt: z.date().optional(),
    })
    .refine(
      (data) => {
        if (!data.endsAt || !data.startsAt) return true;
        const endsAt = data.endsAt.getTime() / 1000;
        const startsAt = data.startsAt.getTime() / 1000;
        return startsAt ? startsAt <= endsAt : true;
      },
      {
        message: "Start date must be before the end date",
        path: ["startsAt"],
      }
    ),
  website: z
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
  discord: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  orgWebsite: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  blog: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  forum: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  grantsSite: z.string().refine((value) => urlRegex.test(value), {
    message: "Please enter a valid URL",
  }),
  bugBounty: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  telegram: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  amountDistributed: z.coerce.number().optional(),
  description: z
    .string({
      required_error: MESSAGES.REGISTRY.FORM.DESCRIPTION,
    })
    .min(3, {
      message: MESSAGES.REGISTRY.FORM.DESCRIPTION,
    }),
  networkToCreate: z.coerce.number().optional(),
  budget: z.coerce.number().optional(),
  minGrantSize: z.coerce.number().optional(),
  maxGrantSize: z.coerce.number().optional(),
  grantsToDate: z.coerce.number().optional(),
  categories: z.array(z.string()),
  organizations: z.array(z.string()),
  ecosystems: z.array(z.string()),
  networks: z.array(z.string()),
  grantTypes: z.array(z.string()),
  platformsUsed: z.array(z.string()),
  communityRef: z.array(z.string()),
  status: z.string().optional().or(z.literal("Active")),
});

type CreateProgramType = z.infer<typeof createProgramSchema>;

export default function AddProgram({
  programToEdit,
  backTo,
  refreshPrograms,
}: {
  programToEdit?: GrantProgram | null;
  backTo?: () => void;
  refreshPrograms?: () => Promise<void>;
}) {
  const router = useRouter();
  const { wallet: dynamicWallet } = useDynamicWallet();
  const supportedChains = appNetwork
    .filter((chain) => {
      const support = [10, 42161, 11155111];
      return support.includes(chain.id);
    })
    .map((chain) => {
      return {
        label: chain.name,
        value: chain.id,
        img: chainImgDictionary(chain.id),
      };
    });
  const { gap } = useGap();

  const [allCommunities, setAllCommunities] = useState<ICommunityResponse[]>(
    []
  );

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        if (!gap || !gapIndexerApi) throw new Error("Gap not initialized");
        const result = await gapIndexerApi.communities();
        setAllCommunities(result.data);
        return result;
      } catch (error: any) {
        console.log(error);
        setAllCommunities([]);
        return undefined;
      }
    };

    if (allCommunities.length === 0) fetchCommunities();
  }, [allCommunities]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateProgramType>({
    resolver: zodResolver(createProgramSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      name: programToEdit?.metadata?.title,
      description: programToEdit?.metadata?.description,
      dates: {
        startsAt: programToEdit?.metadata?.startsAt
          ? new Date(programToEdit?.metadata?.startsAt)
          : undefined,
        endsAt: programToEdit?.metadata?.endsAt
          ? new Date(programToEdit?.metadata?.endsAt)
          : undefined,
      },
      amountDistributed: programToEdit?.metadata?.amountDistributedToDate as
        | number
        | undefined,
      budget: programToEdit?.metadata?.programBudget as number | undefined,
      minGrantSize: programToEdit?.metadata?.minGrantSize as number | undefined,
      maxGrantSize: programToEdit?.metadata?.maxGrantSize as number | undefined,
      grantsToDate: programToEdit?.metadata?.grantsToDate as number | undefined,
      bugBounty: programToEdit?.metadata?.bugBounty,
      website: programToEdit?.metadata?.website,
      twitter: programToEdit?.metadata?.projectTwitter,
      telegram: programToEdit?.metadata?.socialLinks?.telegram,
      discord: programToEdit?.metadata?.socialLinks?.discord,
      orgWebsite: programToEdit?.metadata?.socialLinks?.orgWebsite,
      blog: programToEdit?.metadata?.socialLinks?.blog,
      forum: programToEdit?.metadata?.socialLinks?.forum,
      categories: programToEdit?.metadata?.categories || [],
      ecosystems: programToEdit?.metadata?.ecosystems || [],
      organizations: programToEdit?.metadata?.organizations || [],
      networks: programToEdit?.metadata?.networks || [],
      grantTypes: Array.isArray(programToEdit?.metadata?.grantTypes)
        ? programToEdit?.metadata?.grantTypes
        : programToEdit?.metadata?.grantTypes
        ? [programToEdit?.metadata?.grantTypes]
        : [],
      networkToCreate: programToEdit?.chainID || 0,
      grantsSite: programToEdit?.metadata?.socialLinks?.grantsSite,
      platformsUsed: programToEdit?.metadata?.platformsUsed || [],
      communityRef: programToEdit?.metadata?.communityRef || [],
      status: programToEdit?.metadata?.status || "Active",
    },
  });

  const onChangeGeneric = (
    value: string,
    fieldName:
      | "categories"
      | "ecosystems"
      | "networks"
      | "grantTypes"
      | "organizations"
      | "platformsUsed"
      | "communityRef"
  ) => {
    const oldArray = watch(fieldName);
    let newArray = [...oldArray];
    if (newArray.includes(value)) {
      const filtered = newArray.filter((item) => item !== value);
      setValue(fieldName, filtered, {
        shouldValidate: true,
      });
      return;
    } else {
      newArray.push(value);
    }
    setValue(fieldName, newArray, {
      shouldValidate: true,
    });
  };

  const [isLoading, setIsLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { changeStepperStep, setIsStepper } = useStepper();

  const { isRegistryAdmin } = useRegistryStore();

  const createProgram = async (data: CreateProgramType) => {
    setIsLoading(true);
    try {
      if (!isConnected || !isAuth) {
        openConnectModal?.();
        return;
      }
      const chainSelected = data.networkToCreate;

      const metadata = {
        title: data.name,
        description: data.description,
        programBudget: data.budget,
        amountDistributedToDate: data.amountDistributed,
        minGrantSize: data.minGrantSize,
        maxGrantSize: data.maxGrantSize,
        grantsToDate: data.grantsToDate,
        startsAt: data.dates.startsAt,
        endsAt: data.dates.endsAt,
        website: data.website || "",
        projectTwitter: data.twitter || "",
        socialLinks: {
          twitter: data.twitter || "",
          website: data.website || "",
          discord: data.discord || "",
          orgWebsite: data.orgWebsite || "",
          blog: data.blog || "",
          forum: data.forum || "",
          grantsSite: data.grantsSite || "",
          telegram: data.telegram || "",
        },
        bugBounty: data.bugBounty,
        categories: data.categories,
        ecosystems: data.ecosystems,
        organizations: data.organizations,
        networks: data.networks,
        grantTypes: data.grantTypes,
        platformsUsed: data.platformsUsed,
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        status: "Active",
        type: "program",
        tags: ["karma-gap", "grant-program-registry"],
        communityRef: data.communityRef,
      };

      const [request, error] = await fetchData(
        INDEXER.REGISTRY.CREATE,
        "POST",
        {
          owner: address,
          chainId: chainSelected,
          metadata,
        },
        {},
        {},
        true
      );
      if (error) {
        throw new Error(error);
      }
      toast.success(
        <p className="text-left">
          You have successfully created the grant program.
          <br />
          We will review and approve the program shortly.
        </p>,
        {
          duration: 20000,
        }
      );
      router.push(PAGES.REGISTRY.ROOT);
    } catch (error: any) {
      const errorMessage = error.message;
      if (errorMessage?.includes("already exists")) {
        toast.error("A program with this name already exists");
      } else {
        errorManager(
          MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name),
          error,
          {
            address,
            data,
          },
          {
            error: MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name),
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const editProgram = async (data: CreateProgramType) => {
    setIsLoading(true);
    try {
      if (!isConnected || !isAuth || !address) {
        openConnectModal?.();
        return;
      }
      const chainSelected = data.networkToCreate;
      if (chain?.id !== chainSelected) {
        await switchChainAsync?.({ chainId: chainSelected as number });
      }

      const { walletClient, error } = await safeGetWalletClient(
        chainSelected as number
      );

      if (error || !walletClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await getWalletSignerWithAA(
        walletClient,
        dynamicWallet,
        "updateProgram"
      );

      const metadata = sanitizeObject({
        title: data.name,
        description: data.description,
        programBudget: data.budget,
        amountDistributedToDate: data.amountDistributed,
        minGrantSize: data.minGrantSize,
        maxGrantSize: data.maxGrantSize,
        grantsToDate: data.grantsToDate,
        startsAt: data.dates.startsAt,
        endsAt: data.dates.endsAt,
        website: data.website || "",
        projectTwitter: data.twitter || "",
        socialLinks: {
          twitter: data.twitter || "",
          website: data.website || "",
          discord: data.discord || "",
          orgWebsite: data.orgWebsite || "",
          blog: data.blog || "",
          forum: data.forum || "",
          grantsSite: data.grantsSite || "",
          telegram: data.telegram || "",
        },
        bugBounty: data.bugBounty,
        categories: data.categories,
        ecosystems: data.ecosystems,
        organizations: data.organizations,
        networks: data.networks,
        grantTypes: data.grantTypes,
        platformsUsed: data.platformsUsed,
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        type: "program",
        tags: ["karma-gap", "grant-program-registry"],
        status: data.status,
        communityRef: data.communityRef,
      });

      const isSameAddress =
        programToEdit?.createdByAddress?.toLowerCase() ===
        address?.toLowerCase();
      const lowercasedAdmins = programToEdit?.admins?.map((item) =>
        item.toLowerCase()
      );
      const permissionToEditOnChain = !!(
        programToEdit?.txHash &&
        (isSameAddress || isRegistryAdmin) &&
        lowercasedAdmins?.includes(address?.toLowerCase())
      );
      if (permissionToEditOnChain) {
        const allo = new AlloBase(
          walletSigner as any,
          envVars.IPFS_TOKEN,
          chainSelected as number
        );
        const hasRegistry = await allo
          .updatePoolMetadata(
            programToEdit?.programId as string,
            metadata,
            changeStepperStep
          )
          .then(async (res) => {
            let retries = 1000;
            changeStepperStep("indexing");
            while (retries > 0) {
              await fetchData(
                INDEXER.REGISTRY.GET_ALL +
                  `?programId=${programToEdit?.programId}`
              )
                .then(async ([res]) => {
                  const hasUpdated =
                    new Date(programToEdit?.updatedAt) <
                    new Date((res?.programs?.[0] as GrantProgram)?.updatedAt);

                  if (hasUpdated) {
                    retries = 0;
                    changeStepperStep("indexed");
                  }
                  retries -= 1;
                  // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                })
                .catch(async () => {
                  retries -= 1;
                  // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                });
            }
            return res;
          })
          .catch((error) => {
            throw new Error(error);
          });

        if (!hasRegistry) {
          throw new Error("Error editing program");
        }
      } else {
        const [request, error] = await fetchData(
          INDEXER.REGISTRY.UPDATE(
            programToEdit?._id.$oid as string,
            chainSelected as number
          ),
          "PUT",
          {
            metadata,
          },
          {},
          {},
          true
        );
        if (error) throw new Error(error);
      }
      toast.success("Program updated successfully!");
      await refreshPrograms?.().then(() => {
        backTo?.();
      });
    } catch (error: any) {
      errorManager(
        MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name),
        error,
        {
          address,
          data,
        },
        { error: MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name) }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const onSubmit: SubmitHandler<CreateProgramType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    data.networkToCreate = registryHelper.supportedNetworks;

    if (programToEdit) {
      await editProgram(data);
    } else {
      await createProgram(data);
    }
  };

  return (
    <div className="my-10 flex w-full max-w-full flex-col justify-between items-center gap-6 px-12 pb-7 max-2xl:px-8 max-md:px-4">
      <div className="flex flex-col justify-start items-center max-w-[900px] w-full gap-6">
        <div className="flex flex-col justify-start items-start gap-3 p-0 w-full">
          <div className="flex flex-col gap-2 p-0">
            {programToEdit ? (
              <Button
                onClick={backTo}
                className="flex flex-row gap-2 bg-transparent hover:bg-transparent text-[#004EEB] text-sm p-0"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <p className="border-b border-b-[#004EEB]">
                  Back to Manage Programs
                </p>
              </Button>
            ) : (
              <Link href={PAGES.REGISTRY.ROOT}>
                <Button className="flex flex-row gap-2 bg-transparent hover:bg-transparent text-[#004EEB] text-sm p-0">
                  <ChevronLeftIcon className="w-4 h-4" />
                  <p className="border-b border-b-[#004EEB]">
                    Back to programs
                  </p>
                </Button>
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-black dark:text-white font-body">
              {programToEdit
                ? `Update ${programToEdit.metadata?.title} program`
                : "Add your program to onchain registry"}
            </h1>
            <p className="text-base text-black dark:text-white">
              {programToEdit
                ? ""
                : "Add your program to the registry and attract high quality builders."}
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="gap-4 rounded-lg w-full flex-col flex"
        >
          <div className="flex flex-col w-full gap-6">
            <div className="flex flex-col w-full gap-6 border-b border-b-[#98A2B3] pb-10">
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-name" className={labelStyle}>
                    Program name *
                  </label>
                  <input
                    id="program-name"
                    className={inputStyle}
                    placeholder="Ex: Super cool Program"
                    {...register("name")}
                  />
                  <p className="text-base text-red-400">
                    {errors.name?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-grants-site" className={labelStyle}>
                    Grants Site *
                  </label>
                  <input
                    id="program-grants-site"
                    className={inputStyle}
                    placeholder="Ex: https://program.xyz/"
                    {...register("grantsSite")}
                  />
                  <p className="text-base text-red-400">
                    {errors.grantsSite?.message}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-row items-center justify-between gap-4">
                <div className="flex w-full flex-row justify-between gap-4">
                  <Controller
                    name="dates.startsAt"
                    control={control}
                    render={({ field, formState }) => (
                      <div className="flex w-full flex-col gap-2">
                        <label className={labelStyle}>
                          Start date (optional)
                        </label>
                        <DatePicker
                          selected={field.value}
                          onSelect={(date) => {
                            if (
                              formatDate(date) ===
                              formatDate(watch("dates.startsAt") || "")
                            ) {
                              setValue("dates.startsAt", undefined, {
                                shouldValidate: true,
                              });
                              field.onChange(undefined);
                            } else {
                              setValue("dates.startsAt", date, {
                                shouldValidate: true,
                              });
                              field.onChange(date);
                            }
                          }}
                          placeholder="Pick a date"
                          buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                          clearButtonFn={() => {
                            setValue("dates.startsAt", undefined, {
                              shouldValidate: true,
                            });
                            field.onChange(undefined);
                          }}
                        />
                        <p className="text-base text-red-400">
                          {formState.errors.dates?.startsAt?.message}
                        </p>
                      </div>
                    )}
                  />
                </div>
                <div className="flex w-full flex-row justify-between gap-4">
                  <Controller
                    name="dates.endsAt"
                    control={control}
                    render={({ field, formState }) => (
                      <div className="flex w-full flex-col gap-2">
                        <label className={labelStyle}>
                          End date (optional)
                        </label>
                        <DatePicker
                          selected={field.value}
                          onSelect={(date) => {
                            if (
                              formatDate(date) ===
                              formatDate(watch("dates.endsAt") || "")
                            ) {
                              setValue("dates.endsAt", undefined, {
                                shouldValidate: true,
                              });
                              field.onChange(undefined);
                            } else {
                              setValue("dates.endsAt", date, {
                                shouldValidate: true,
                              });
                              field.onChange(date);
                            }
                          }}
                          minDate={watch("dates.startsAt")}
                          placeholder="Pick a date"
                          buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                          clearButtonFn={() => {
                            setValue("dates.endsAt", undefined, {
                              shouldValidate: true,
                            });
                            field.onChange(undefined);
                          }}
                        />
                        <p className="text-base text-red-400">
                          {formState.errors.dates?.endsAt?.message}
                        </p>
                      </div>
                    )}
                  />
                </div>
              </div>
              <div className="flex w-full flex-col max-w-full gap-1">
                <label htmlFor="program-description" className={labelStyle}>
                  Description *
                </label>
                <textarea
                  className={cn(
                    inputStyle,
                    "bg-transparent min-h-[120px] max-h-[360px]"
                  )}
                  value={watch("description")}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setValue("description", event.target.value || "", {
                      shouldValidate: true,
                    })
                  }
                  placeholder="Please provide a description of this program"
                />
                <p className="text-base text-red-400">
                  {errors.description?.message}
                </p>
              </div>
              <div className="grid grid-cols-4  max-sm:grid-cols-1 max-md:grid-cols-2 gap-4 justify-between">
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-categories" className={labelStyle}>
                    Categories
                  </label>
                  <SearchDropdown
                    list={registryHelper.categories}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "categories")
                    }
                    type={"Categories"}
                    selected={watch("categories")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                  />
                  <p className="text-base text-red-400">
                    {errors.categories?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-organizations" className={labelStyle}>
                    Organizations
                  </label>
                  <SearchDropdown
                    list={registryHelper.organizations}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "organizations")
                    }
                    type={"Organizations"}
                    selected={watch("organizations")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    canAdd
                  />
                  <p className="text-base text-red-400">
                    {errors.organizations?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-ecosystems" className={labelStyle}>
                    Ecosystems
                  </label>
                  <SearchDropdown
                    list={registryHelper.ecosystems}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "ecosystems")
                    }
                    type={"Ecosystems"}
                    selected={watch("ecosystems")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    canAdd
                  />
                  <p className="text-base text-red-400">
                    {errors.ecosystems?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-networks" className={labelStyle}>
                    Networks
                  </label>

                  <SearchDropdown
                    list={registryHelper.networks}
                    imageDictionary={registryHelper.networkImages}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "networks")
                    }
                    type={"Networks"}
                    selected={watch("networks")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    canAdd
                  />
                  <p className="text-base text-red-400">
                    {errors.networks?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-types" className={labelStyle}>
                    Funding Mechanisms
                  </label>
                  <SearchDropdown
                    list={registryHelper.grantTypes}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "grantTypes")
                    }
                    type={"Mechanisms"}
                    selected={watch("grantTypes")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                  />
                  <p className="text-base text-red-400">
                    {errors.grantTypes?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-types" className={labelStyle}>
                    Platforms Used
                  </label>
                  <SearchDropdown
                    list={registryHelper.platformsUsed}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "platformsUsed")
                    }
                    type={"Platforms"}
                    selected={watch("platformsUsed")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    shouldSort={false}
                    canAdd
                  />
                  <p className="text-base text-red-400">
                    {errors.platformsUsed?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col">
                  <label htmlFor="grant-title" className={`${labelStyle} mb-1`}>
                    Communities related
                  </label>
                  <CommunitiesSelect
                    onSelectFunction={(community: ICommunityResponse) => {
                      onChangeGeneric(community?.uid, "communityRef");
                    }}
                    list={allCommunities}
                    selected={watch("communityRef")}
                    buttonClassname="w-full max-w-full"
                    type="community"
                  />
                  <p className="text-base text-red-400">
                    {errors?.communityRef?.message}
                  </p>
                </div>
                {programToEdit && (
                  <div className="flex w-full flex-col gap-1">
                    <label htmlFor="program-status" className={labelStyle}>
                      Status
                    </label>
                    <StatusDropdown
                      onSelectFunction={(value: string) => {
                        setValue("status", value);
                      }}
                      list={registryHelper.status}
                      previousValue={watch("status")}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 max-sm:grid-cols-1 w-full gap-6 border-b border-b-[#98A2B3] pb-10">
              {/* <div className="flex w-full flex-col justify-between gap-2">
                <label htmlFor="program-network" className={labelStyle}>
                  Network to create program *
                </label>
                <NetworkDropdown
                  onSelectFunction={(value) => {
                    setValue("networkToCreate", value, {
                      shouldValidate: true,
                    });
                  }}
                  previousValue={watch("networkToCreate")}
                  list={supportedChains}
                />
                <p className="text-base text-red-400">
                  {errors.networkToCreate?.message}
                </p>
              </div> */}
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-budget" className={labelStyle}>
                  Program budget
                </label>
                <input
                  id="program-budget"
                  className={inputStyle}
                  placeholder="Ex: 100500"
                  type="number"
                  {...register("budget")}
                />
                <p className="text-base text-red-400">
                  {errors.budget?.message}
                </p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label
                  htmlFor="program-amount-distributed"
                  className={labelStyle}
                >
                  Amount distributed to date
                </label>
                <input
                  id="program-amount-distributed"
                  className={inputStyle}
                  placeholder="Ex: 804150"
                  type="number"
                  {...register("amountDistributed")}
                />
                <p className="text-base text-red-400">
                  {errors.amountDistributed?.message}
                </p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-grants-issued" className={labelStyle}>
                  Grants issued to date
                </label>
                <input
                  id="program-grants-issued"
                  type="number"
                  className={inputStyle}
                  placeholder="Ex: 60"
                  {...register("grantsToDate")}
                />
                <p className="text-base text-red-400">
                  {errors.grantsToDate?.message}
                </p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-min-grant-size" className={labelStyle}>
                  Min Grant size
                </label>
                <input
                  type="number"
                  id="program-min-grant-size"
                  className={inputStyle}
                  placeholder="Ex: 80000"
                  {...register("minGrantSize")}
                />
                <p className="text-base text-red-400">
                  {errors.minGrantSize?.message}
                </p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-max-grant-size" className={labelStyle}>
                  Max Grant size
                </label>
                <input
                  type="number"
                  id="program-max-grant-size"
                  className={inputStyle}
                  placeholder="Ex: 80000"
                  {...register("maxGrantSize")}
                />
                <p className="text-base text-red-400">
                  {errors.maxGrantSize?.message}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 max-sm:grid-cols-1 w-full gap-6  pb-10">
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-twitter" className={labelStyle}>
                  X/Twitter
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <Twitter2Icon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    id="program-twitter"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://x.com/program"
                    {...register("twitter")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.twitter?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-discord" className={labelStyle}>
                  Discord
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <Discord2Icon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    id="program-discord"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://discord.gg/program"
                    {...register("discord")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.discord?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-blog" className={labelStyle}>
                  Blog
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <BlogIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    id="program-blog"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://blog.program.co/program"
                    {...register("blog")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.blog?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-forum" className={labelStyle}>
                  Forum
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <DiscussionIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    id="program-forum"
                    placeholder="Ex: https://forum.program.co/program"
                    {...register("forum")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.forum?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-org" className={labelStyle}>
                  Organization website
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <OrganizationIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://org.program.co/program"
                    id="program-org"
                    {...register("orgWebsite")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.orgWebsite?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-bug-bounty" className={labelStyle}>
                  Link to Bug bounty
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <WebsiteIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://program.xyz"
                    id="program-bug-bounty"
                    {...register("bugBounty")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.bugBounty?.message}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-telegram" className={labelStyle}>
                  Telegram
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <Telegram2Icon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://t.me/yourusername"
                    id="program-telegram"
                    {...register("telegram")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.telegram?.message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-start">
            <Button
              isLoading={isLoading}
              type="submit"
              className="px-3 py-3 text-base"
              disabled={
                isSubmitting
                // ||
                // !isValid ||
                // selectedCategories.length === 0 ||
                // selectedEcosystems.length === 0 ||
                // selectedNetworks.length === 0 ||
                // selectedGrantTypes.length === 0
              }
            >
              {programToEdit ? "Update program" : "Create program"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
