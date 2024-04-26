import { z } from "zod";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { MESSAGES } from "@/utilities/messages";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Popover } from "@headlessui/react";
import { formatDate } from "@/utilities/formatDate";
import { ArrowLeftIcon, CalendarIcon } from "@heroicons/react/24/solid";
import { DayPicker } from "react-day-picker";
import { Button } from "@/components/Utilities/Button";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { NFTStorage } from "nft.storage";
import { AlloRegistry } from "@show-karma/karma-gap-sdk/core/class/GrantProgramRegistry/AlloRegistry";
import axios from "axios";
import { getWalletClient } from "@wagmi/core";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { appNetwork } from "@/utilities/network";
import { useAccount } from "wagmi";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

const createProgramSchema = z.object({
  name: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.NAME }),
  budget: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.BUDGET }),
  website: z.string().url().optional(),
  twitter: z.string().url().optional(),
  discord: z.string().url().optional(),
  amountDistributed: z
    .string()
    .min(3, { message: MESSAGES.REGISTRY.FORM.AMOUNT_DISTRIBUTED }),
  grantSize: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.GRANT_SIZE }),
  categories: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.CATEGORIES }),
  ecosystems: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.ECOSYSTEMS }),
  bounties: z.string().min(3, { message: MESSAGES.REGISTRY.FORM.BOUNTIES }),
  howManyApplicants: z.number().int(),
  howManyGrants: z.number().int(),
  linkToDetails: z.string().url(),
  dates: z
    .object({
      endsAt: z.date({
        required_error: MESSAGES.REGISTRY.FORM.END_DATE,
      }),
      startsAt: z.date().optional(),
    })
    .refine(
      (data) => {
        const endsAt = data.endsAt.getTime() / 1000;
        const startsAt = data.startsAt
          ? data.startsAt.getTime() / 1000
          : undefined;

        return startsAt ? startsAt <= endsAt : true;
      },
      {
        message: "Start date must be before the end date",
        path: ["dates", "startsAt"],
      }
    ),
});

type CreateProgramType = z.infer<typeof createProgramSchema>;

export default function AddProgram() {
  const [description, setDescription] = useState("");
  //   const [categories, setCategories] = useState([]);
  //   const [ecosystems, setEcosystems] = useState([]);
  //   const [bounties, setBounties] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateProgramType>({
    resolver: zodResolver(createProgramSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<CreateProgramType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    // await createGrant(grant, {
    //   title: data.title,
    //   text: description,
    // }).finally(() => {
    //   setIsLoading(false);
    // });
  };

  const { address } = useAccount();

  const createProgram = async () => {
    try {
      const data = await axios.get("/api/ipfs");
      const { message: reqToken } = data.data;
      // const ipfsStorage = new NFTStorage({
      //   token: keys.ipfsToken,
      // });

      const walletClient = await getWalletClient({
        chainId: appNetwork[0].id,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const alloRegistry = new AlloRegistry(walletSigner as any, reqToken);

      const nonce = 2;
      const name = "Karma Test Program 2";
      const metadata = {
        title: name,
        description: `Karma Test Program: This is a test program to test the functionality of the Karma platform.`,
        website: "https://karma.fund",
        projectTwitter: "karma_fund",
        logoImg: "bafkreigf5egjxs3zbafr4d24kj5tf7idktfjc737xolx5h6dj7hnf77nde",
        bannerImg:
          "bafkreid5rccqi6q4xgv4cj5ofrzfmswf7fn2525e5hducvh3r56lstoi74",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        createdAt: new Date().getTime(),

        // TODO: Additional metadata
        categories: ["dapps", "infra"],
        tags: ["grant-program-registry"],
      };
      const owner = address as string;

      const response = await alloRegistry.createProgram(
        nonce,
        name,
        metadata,
        owner,
        [owner]
      );
      console.log(response);
    } catch (error) {
      console.log(error);
    }
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
      <form className="gap-4 rounded-lg bg-zinc-200 px-4 py-6 w-full max-w-max flex-col flex">
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
            <div className="flex w-full flex-col  gap-1">
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
                placeholder="Ex: 100K OP"
                {...register("budget")}
              />
              <p className="text-base text-red-400">{errors.budget?.message}</p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label
                htmlFor="program-amount-distributed"
                className={labelStyle}
              >
                Amount distributed to date *
              </label>
              <input
                id="program-amount-distributed"
                className={inputStyle}
                placeholder="Ex: 80K OP"
                {...register("amountDistributed")}
              />
              <p className="text-base text-red-400">
                {errors.amountDistributed?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-grant-size" className={labelStyle}>
                Grant size *
              </label>
              <input
                id="program-grant-size"
                className={inputStyle}
                placeholder="Ex: 80K OP"
                {...register("grantSize")}
              />
              <p className="text-base text-red-400">
                {errors.grantSize?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label
                htmlFor="program-how-many-applicants"
                className={labelStyle}
              >
                How many applicants through the site *
              </label>
              <input
                id="program-how-many-applicants"
                type="number"
                className={inputStyle}
                placeholder="Ex: 120"
                {...register("howManyApplicants")}
              />
              <p className="text-base text-red-400">
                {errors.howManyApplicants?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-how-many-grants" className={labelStyle}>
                How many grants issued *
              </label>
              <input
                id="program-how-many-grants"
                type="number"
                className={inputStyle}
                placeholder="Ex: 60"
                {...register("howManyGrants")}
              />
              <p className="text-base text-red-400">
                {errors.howManyGrants?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-links-to-details" className={labelStyle}>
                Links to details page *
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
            <div className="flex w-full flex-row items-center justify-start gap-8  ">
              <div className="flex w-max flex-row justify-between gap-4">
                <Controller
                  name="dates.startsAt"
                  control={control}
                  render={({ field, formState, fieldState }) => (
                    <div className="flex w-full flex-col gap-2">
                      <label className={labelStyle}>
                        Start date (optional)
                      </label>
                      <div>
                        <Popover className="relative">
                          <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Popover.Button>
                          <Popover.Panel className="absolute z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                            <DayPicker
                              mode="single"
                              selected={field.value}
                              onDayClick={(e) => {
                                setValue("dates.startsAt", e, {
                                  shouldValidate: true,
                                });
                                field.onChange(e);
                              }}
                              disabled={(date) => {
                                if (date < new Date("2000-01-01")) return true;
                                return false;
                              }}
                              initialFocus
                            />
                          </Popover.Panel>
                        </Popover>
                      </div>
                      <p className="text-base text-red-400">
                        {formState.errors.dates?.startsAt?.message}
                      </p>
                    </div>
                  )}
                />
              </div>
              <div className="flex w-max flex-row justify-between gap-4">
                <Controller
                  name="dates.endsAt"
                  control={control}
                  render={({ field, formState, fieldState }) => (
                    <div className="flex w-full flex-col gap-2">
                      <label className={labelStyle}>End date *</label>
                      <div>
                        <Popover className="relative">
                          <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Popover.Button>
                          <Popover.Panel className="absolute z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                            <DayPicker
                              mode="single"
                              selected={field.value}
                              onDayClick={(e) => {
                                setValue("dates.endsAt", e, {
                                  shouldValidate: true,
                                });
                                field.onChange(e);
                              }}
                              disabled={(date) => {
                                if (date < new Date("2000-01-01")) return true;
                                const startsAt = watch("dates.startsAt");
                                if (startsAt && date < startsAt) return true;
                                return false;
                              }}
                              initialFocus
                            />
                          </Popover.Panel>
                        </Popover>
                      </div>
                      <p className="text-base text-red-400">
                        {formState.errors.dates?.endsAt?.message}
                      </p>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-1">
              <label htmlFor="program-twitter" className={labelStyle}>
                Twitter
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
                Discord
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
              <label htmlFor="program-website" className={labelStyle}>
                Website
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
              <input
                id="program-categories"
                className={inputStyle}
                placeholder="Ex: Ethereum, Chain-supply, Mobile"
                {...register("categories")}
              />
              <p className="text-base text-red-400">
                {errors.categories?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-ecosystems" className={labelStyle}>
                Ecosystems *
              </label>
              <input
                id="program-ecosystems"
                className={inputStyle}
                placeholder="Ex: Green Finance, DeFi, NFTs"
                {...register("ecosystems")}
              />
              <p className="text-base text-red-400">
                {errors.ecosystems?.message}
              </p>
            </div>
            <div className="flex w-full flex-col  gap-1">
              <label htmlFor="program-bounties" className={labelStyle}>
                Bounties *
              </label>
              <input
                id="program-bounties"
                className={inputStyle}
                placeholder="Ex: Red bounty, Blue bounty, Green bounty"
                {...register("bounties")}
              />
              <p className="text-base text-red-400">
                {errors.bounties?.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-row justify-start">
          <Button
            // type="submit"
            onClick={createProgram}
            className="px-3 py-3 text-base"
          >
            Create program
          </Button>
        </div>
      </form>
    </div>
  );
}
