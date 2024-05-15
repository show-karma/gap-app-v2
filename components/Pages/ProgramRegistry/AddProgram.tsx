import { z } from "zod";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dispatch, useState } from "react";
import { MESSAGES } from "@/utilities/messages";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
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
import { Dropdown } from "@/components/Utilities/Dropdown";

import { useAuthStore } from "@/store/auth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { registryHelper } from "./helper";
import { SearchDropdown } from "./SearchDropdown";
import { appNetwork } from "@/utilities/network";
import { NetworkDropdown } from "./NetworkDropdown";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
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
  budget: z.coerce.number().min(1, { message: MESSAGES.REGISTRY.FORM.BUDGET }),
  amountDistributed: z.coerce.number().optional(),
  network: z.coerce.number().int("Must select a network"),
  minGrantSize: z.coerce.number().int("Must be a integer"),
  maxGrantSize: z.coerce.number().int("Must be a integer"),
  grantsToDate: z.coerce.number().int("Must be a integer").optional(),
  linkToDetails: z.string().url(),
});

type CreateProgramType = z.infer<typeof createProgramSchema>;

export default function AddProgram() {
  const [description, setDescription] = useState("");
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [selectedEcosystems, setSelectedEcosystems] = useState<string[]>([]);
  const [selectedGrantTypes, setSelectedGrantTypes] = useState<string[]>([]);
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
  });

  const onChangeGeneric = (
    value: string,
    setToChange: Dispatch<React.SetStateAction<string[]>>
  ) => {
    setToChange((oldArray) => {
      const newArray = [...oldArray];
      if (newArray.includes(value)) {
        const filteredArray = newArray.filter((item) => item !== value);
        return filteredArray;
      } else {
        newArray.push(value);
      }
      return newArray;
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
      const chainSelected = data.network;
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
      const name = data.name;
      const metadata = {
        title: name,
        description: description,
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
        categories: selectedCategories,
        ecosystems: selectedEcosystems,
        networks: selectedNetworks,
        grantTypes: selectedGrantTypes,
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        createdAt: new Date().getTime(),

        // TODO: Additional metadata
        tags: ["grant-program-registry"],
      };
      const owner = address as string;

      const hasRegistry = await alloRegistry
        .createProgram(nonce + 1, name, metadata, owner, [owner])
        .then((res) => {
          console.log("res", res);
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

  const onSubmit: SubmitHandler<CreateProgramType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    await createProgram(data);
  };

  return (
    <div className="my-4 flex w-full max-w-full flex-col justify-between items-start gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4">
      <div className="flex flex-col gap-2">
        <Link href={PAGES.REGISTRY.ROOT}>
          <Button className="flex flex-row gap-2 dark:text-black text-white bg-black dark:bg-zinc-600 hover:bg-black dark:hover:bg-white">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to programs{" "}
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Add your program registry
        </h1>
        <p className="text-base text-black dark:text-white">
          Add your program registry to the list of programs that are available
          to the community.
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="gap-4 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-4 py-6 w-full max-w-max flex-col flex"
      >
        <div className=" grid grid-cols-2 w-full gap-4">
          <div className="flex flex-col gap-2">
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
              <p className="text-base text-red-400">{errors.name?.message}</p>
            </div>
            <div className="flex w-full flex-col">
              <label htmlFor="program-network" className={labelStyle}>
                Network *
              </label>
              <NetworkDropdown
                onSelectFunction={(value) => {
                  setValue("network", value, {
                    shouldValidate: true,
                  });
                }}
                previousValue={watch("network")}
                list={supportedChains}
              />
              <p className="text-base text-red-400">
                {errors.network?.message}
              </p>
            </div>
            <div className="flex w-full flex-col max-w-[480px] gap-1">
              <label htmlFor="program-description" className={labelStyle}>
                Description (optional)
              </label>
              <MarkdownEditor
                className="bg-transparent"
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
                placeholderText="Please provide a description of this program"
              />
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
              <p className="text-base text-red-400">{errors.budget?.message}</p>
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
              <label htmlFor="program-links-to-details" className={labelStyle}>
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
          <div className="flex flex-col gap-2">
            <div className="flex w-full flex-col gap-1">
              <label htmlFor="program-twitter" className={labelStyle}>
                Twitter (optional)
              </label>
              <input
                id="program-twitter"
                className={inputStyle}
                placeholder="Ex: https://twitter.com/program"
                {...register("twitter")}
              />
              <p className="text-base text-red-400">
                {errors.twitter?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-discord" className={labelStyle}>
                Discord (optional)
              </label>
              <input
                id="program-discord"
                className={inputStyle}
                placeholder="Ex: https://discord.gg/program"
                {...register("discord")}
              />
              <p className="text-base text-red-400">
                {errors.discord?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-blog" className={labelStyle}>
                Blog (optional)
              </label>
              <input
                id="program-blog"
                className={inputStyle}
                placeholder="Ex: https://blog.program.co/program"
                {...register("blog")}
              />
              <p className="text-base text-red-400">{errors.blog?.message}</p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-forum" className={labelStyle}>
                Forum (optional)
              </label>
              <input
                id="program-forum"
                className={inputStyle}
                placeholder="Ex: https://forum.program.co/program"
                {...register("forum")}
              />
              <p className="text-base text-red-400">{errors.forum?.message}</p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-org" className={labelStyle}>
                Organization website (optional)
              </label>
              <input
                id="program-org"
                className={inputStyle}
                placeholder="Ex: https://org.program.co/program"
                {...register("orgWebsite")}
              />
              <p className="text-base text-red-400">
                {errors.orgWebsite?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-website" className={labelStyle}>
                Program Website (optional)
              </label>
              <input
                id="program-website"
                className={inputStyle}
                placeholder="Ex: https://program.xyz"
                {...register("website")}
              />
              <p className="text-base text-red-400">
                {errors.website?.message}
              </p>
            </div>

            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-categories" className={labelStyle}>
                Categories *
              </label>
              <SearchDropdown
                list={registryHelper.categories}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedCategories)
                }
                cleanFunction={() => {
                  setSelectedCategories([]);
                }}
                type={"Categories"}
                selected={selectedCategories}
                prefixUnselected="Select"
              />
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-ecosystems" className={labelStyle}>
                Ecosystems *
              </label>
              <SearchDropdown
                list={registryHelper.ecosystems}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedEcosystems)
                }
                cleanFunction={() => {
                  setSelectedEcosystems([]);
                }}
                type={"Ecosystems"}
                selected={selectedEcosystems}
                prefixUnselected="Select"
              />
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-networks" className={labelStyle}>
                Networks *
              </label>

              <SearchDropdown
                list={registryHelper.networks}
                imageDictionary={registryHelper.networkImages}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedNetworks)
                }
                cleanFunction={() => {
                  setSelectedNetworks([]);
                }}
                type={"Networks"}
                selected={selectedNetworks}
                prefixUnselected="Select"
              />
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-types" className={labelStyle}>
                Types *
              </label>
              <SearchDropdown
                list={registryHelper.grantTypes}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedGrantTypes)
                }
                cleanFunction={() => {
                  setSelectedGrantTypes([]);
                }}
                type={"Grant Types"}
                selected={selectedGrantTypes}
                prefixUnselected="Select"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-row justify-start">
          <Button
            isLoading={isLoading}
            type="submit"
            className="px-3 py-3 text-base"
            disabled={
              !isValid ||
              isSubmitting ||
              selectedCategories.length === 0 ||
              selectedEcosystems.length === 0 ||
              selectedNetworks.length === 0 ||
              selectedGrantTypes.length === 0
            }
          >
            Create program
          </Button>
        </div>
      </form>
    </div>
  );
}
