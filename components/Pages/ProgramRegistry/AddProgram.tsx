import { z } from "zod";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dispatch, useState } from "react";
import { MESSAGES } from "@/utilities/messages";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { NFTStorage } from "nft.storage";
import { AlloRegistry } from "@show-karma/karma-gap-sdk/core/class/GrantProgramRegistry/AlloRegistry";
import { getWalletClient } from "@wagmi/core";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { envVars } from "@/utilities/enviromentVars";
import { useRouter } from "next/router";

import { useAuthStore } from "@/store/auth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { registryHelper } from "./helper";
import { SearchDropdown } from "./SearchDropdown";
import { appNetwork } from "@/utilities/network";
import { NetworkDropdown } from "./NetworkDropdown";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { cn } from "@/utilities/tailwind";
import { DiscordIcon, TwitterIcon, WebsiteIcon } from "@/components/Icons";
import { BlogIcon } from "@/components/Icons/Blog";
import { DiscussionIcon } from "@/components/Icons/Discussion";
import { OrganizationIcon } from "@/components/Icons/Organization";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { GrantProgram } from "./ProgramList";

const labelStyle = "text-sm font-bold text-[#344054] dark:text-zinc-100";
const inputStyle =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

const createProgramSchema = z.object({
  name: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.NAME }),
  website: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  discord: z.string().url().optional().or(z.literal("")),
  orgWebsite: z.string().url().optional().or(z.literal("")),
  blog: z.string().url().optional().or(z.literal("")),
  forum: z.string().url().optional().or(z.literal("")),
  grantsSite: z.string().url().optional().or(z.literal("")),
  bugBounty: z.string().url().optional().or(z.literal("")),
  amountDistributed: z.coerce.number().optional(),
  description: z
    .string({
      required_error: MESSAGES.REGISTRY.FORM.DESCRIPTION,
    })
    .min(3, {
      message: MESSAGES.REGISTRY.FORM.DESCRIPTION,
    }),
  networkToCreate: z.coerce.number().gt(0, {
    message: MESSAGES.REGISTRY.FORM.NETWORKTOCREATE,
  }),
  budget: z.coerce.number().min(1, { message: MESSAGES.REGISTRY.FORM.BUDGET }),
  minGrantSize: z.coerce
    .number()
    .min(1, { message: MESSAGES.REGISTRY.FORM.MIN_GRANT_SIZE }),
  maxGrantSize: z.coerce
    .number()
    .min(1, { message: MESSAGES.REGISTRY.FORM.MAX_GRANT_SIZE }),
  grantsToDate: z.coerce.number().optional(),
  linkToDetails: z.string().url(),
  categories: z
    .array(z.string())
    .min(1, { message: MESSAGES.REGISTRY.FORM.CATEGORIES }),
  ecosystems: z
    .array(z.string())
    .min(1, { message: MESSAGES.REGISTRY.FORM.ECOSYSTEMS }),
  networks: z
    .array(z.string())
    .min(1, { message: MESSAGES.REGISTRY.FORM.NETWORKS }),
  grantTypes: z
    .array(z.string())
    .min(1, { message: MESSAGES.REGISTRY.FORM.GRANT_TYPES }),
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateProgramType>({
    resolver: zodResolver(createProgramSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      name: programToEdit?.metadata?.title,
      description: programToEdit?.metadata?.description,
      amountDistributed: programToEdit?.metadata?.amountDistributedToDate as
        | number
        | undefined,
      budget: programToEdit?.metadata?.programBudget as number | undefined,
      minGrantSize: programToEdit?.metadata?.minGrantSize as number | undefined,
      maxGrantSize: programToEdit?.metadata?.maxGrantSize as number | undefined,
      grantsToDate: programToEdit?.metadata?.grantsToDate as number | undefined,
      bugBounty: programToEdit?.metadata?.bugBounty,
      linkToDetails: programToEdit?.metadata?.linkToDetails,
      website: programToEdit?.metadata?.website,
      twitter: programToEdit?.metadata?.projectTwitter,
      discord: programToEdit?.metadata?.socialLinks?.discord,
      orgWebsite: programToEdit?.metadata?.socialLinks?.orgWebsite,
      blog: programToEdit?.metadata?.socialLinks?.blog,
      forum: programToEdit?.metadata?.socialLinks?.forum,
      categories: programToEdit?.metadata?.categories || [],
      ecosystems: programToEdit?.metadata?.ecosystems || [],
      networks: programToEdit?.metadata?.networks || [],
      grantTypes: programToEdit?.metadata?.grantTypes || [],
      networkToCreate: programToEdit?.chainID || 0,
      grantsSite: programToEdit?.metadata?.socialLinks?.grantsSite,
    },
  });

  const onChangeGeneric = (
    value: string,
    fieldName: "categories" | "ecosystems" | "networks" | "grantTypes"
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
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { openConnectModal } = useConnectModal();

  const createProgram = async (data: CreateProgramType) => {
    setIsLoading(true);
    try {
      if (!isConnected || !isAuth) {
        openConnectModal?.();
        return;
      }
      const chainSelected = data.networkToCreate;
      if (chain && chain.id !== chainSelected) {
        await switchNetworkAsync?.(chainSelected);
      }

      const ipfsStorage = new NFTStorage({
        token: envVars.IPFS_TOKEN,
      });

      const walletClient = await getWalletClient({
        chainId: chainSelected,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const alloRegistry = new AlloRegistry(walletSigner as any, ipfsStorage);

      const nonce = Math.floor(Math.random() * 1000000 + 1);
      const metadata = {
        title: data.name,
        description: data.description,
        programBudget: data.budget,
        amountDistributedToDate: data.amountDistributed,
        minGrantSize: data.minGrantSize,
        maxGrantSize: data.maxGrantSize,
        grantsToDate: data.grantsToDate,
        linkToDetails: data.linkToDetails,
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
        },
        bugBounty: data.bugBounty,
        categories: data.categories,
        ecosystems: data.ecosystems,
        networks: data.networks,
        grantTypes: data.grantTypes,
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        createdAt: new Date().getTime(),
        type: "program",
        tags: ["karma-gap", "grant-program-registry"],
      };
      console.log(metadata);
      const owner = address as string;

      const hasRegistry = await alloRegistry
        .createProgram(nonce + 1, data.name, metadata, owner, [owner])
        .then((res) => {
          return res;
        })
        .catch((error) => {
          throw new Error(error);
        });
      if (!hasRegistry) {
        throw new Error("Error creating program");
      }
      toast.success("Program created successfully");
      router.push(PAGES.REGISTRY.ROOT);
    } catch (error) {
      console.log(error);
      toast.error("An error occurred while creating the program");
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
      if (chain && chain.id !== chainSelected) {
        await switchNetworkAsync?.(chainSelected);
      }

      const ipfsStorage = new NFTStorage({
        token: envVars.IPFS_TOKEN,
      });

      const walletClient = await getWalletClient({
        chainId: chainSelected,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const alloRegistry = new AlloRegistry(walletSigner as any, ipfsStorage);

      const metadata = {
        title: data.name,
        description: data.description,
        programBudget: data.budget,
        amountDistributedToDate: data.amountDistributed,
        minGrantSize: data.minGrantSize,
        maxGrantSize: data.maxGrantSize,
        grantsToDate: data.grantsToDate,
        linkToDetails: data.linkToDetails,
        website: data.website || "",
        projectTwitter: data.twitter || "",
        socialLinks: {
          twitter: data.twitter || "",
          website: data.website || "",
          discord: data.discord || "",
          orgWebsite: data.orgWebsite || "",
          blog: data.blog || "",
          forum: data.forum || "",
        },
        bugBounty: data.bugBounty,
        categories: data.categories,
        ecosystems: data.ecosystems,
        networks: data.networks,
        grantTypes: data.grantTypes,
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        createdAt: new Date().getTime(),
        type: "program",
        tags: ["karma-gap", "grant-program-registry"],
      };

      const permissionToEditOnChain =
        programToEdit?.createdByAddress?.toLowerCase() ===
        address?.toLowerCase();
      if (permissionToEditOnChain) {
        const hasRegistry = await alloRegistry
          .updateProgramMetadata(programToEdit?.programId as string, metadata)
          .then((res) => {
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
          INDEXER.REGISTRY.UPDATE,
          "PUT",
          {
            programId: programToEdit?.programId,
            chainId: chainSelected,
            metadata,
          },
          {},
          {},
          true
        );
        if (error)
          throw new Error("An error occurred while editing the program");
      }
      toast.success("Program edited successfully");
      await refreshPrograms?.().then(() => {
        backTo?.();
      });
    } catch (error) {
      console.log(error);
      toast.error("An error occurred while editing the program");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<CreateProgramType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
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
                  <label
                    htmlFor="program-links-to-details"
                    className={labelStyle}
                  >
                    Link to program details *
                  </label>
                  <input
                    id="program-links-to-details"
                    className={inputStyle}
                    placeholder="Ex: https://program.xyz/details"
                    {...register("linkToDetails")}
                  />
                  <p className="text-base text-red-400">
                    {errors.linkToDetails?.message}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col max-w-full gap-1">
                <label htmlFor="program-description" className={labelStyle}>
                  Description *
                </label>
                <MarkdownEditor
                  className="bg-transparent"
                  value={watch("description")}
                  onChange={(newValue: string) =>
                    setValue("description", newValue || "", {
                      shouldValidate: true,
                    })
                  }
                  placeholderText="Please provide a description of this program"
                />
                <p className="text-base text-red-400">
                  {errors.description?.message}
                </p>
              </div>
              <div className="grid grid-cols-4  max-sm:grid-cols-1 max-md:grid-cols-2 gap-4 justify-between">
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-categories" className={labelStyle}>
                    Categories *
                  </label>
                  <SearchDropdown
                    list={registryHelper.categories}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "categories")
                    }
                    type={"Categories"}
                    selected={watch("categories")}
                    prefixUnselected="Select"
                  />
                  <p className="text-base text-red-400">
                    {errors.categories?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-ecosystems" className={labelStyle}>
                    Ecosystems *
                  </label>
                  <SearchDropdown
                    list={registryHelper.ecosystems}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "ecosystems")
                    }
                    type={"Ecosystems"}
                    selected={watch("ecosystems")}
                    prefixUnselected="Select"
                  />
                  <p className="text-base text-red-400">
                    {errors.ecosystems?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-networks" className={labelStyle}>
                    Networks *
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
                  />
                  <p className="text-base text-red-400">
                    {errors.networks?.message}
                  </p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-types" className={labelStyle}>
                    Types *
                  </label>
                  <SearchDropdown
                    list={registryHelper.grantTypes}
                    onSelectFunction={(value: string) =>
                      onChangeGeneric(value, "grantTypes")
                    }
                    type={"Grant Types"}
                    selected={watch("grantTypes")}
                    prefixUnselected="Select"
                  />
                  <p className="text-base text-red-400">
                    {errors.grantTypes?.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 max-sm:grid-cols-1 w-full gap-6 border-b border-b-[#98A2B3] pb-10">
              <div className="flex w-full flex-col justify-between gap-2">
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
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-budget" className={labelStyle}>
                  Program budget *
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
                  Amount distributed to date (optional)
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
                  Grants issued to date (optional)
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
                  Min Grant size *
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
                  Max Grant size *
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
                  X/Twitter (optional)
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <TwitterIcon className="text-[#47ACDF] w-4 h-4" />
                  </div>
                  <input
                    id="program-twitter"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://twitter.com/program"
                    {...register("twitter")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.twitter?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-discord" className={labelStyle}>
                  Discord (optional)
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <DiscordIcon className="text-[#5865F2] w-4 h-4" />
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
                  Blog (optional)
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <BlogIcon className="text-orange-500 w-4 h-4" />
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
                  Forum (optional)
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
                  Organization website (optional)
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
                <label htmlFor="program-website" className={labelStyle}>
                  Program Website (optional)
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <WebsiteIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://program.xyz"
                    id="program-website"
                    {...register("website")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.website?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-grants-site" className={labelStyle}>
                  Grants Website (optional)
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <WebsiteIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://program.xyz"
                    id="program-grants-site"
                    {...register("grantsSite")}
                  />
                </div>
                <p className="text-base text-red-400">
                  {errors.grantsSite?.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-bug-bounty" className={labelStyle}>
                  Link to Bug bounty (optional)
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
