/* eslint-disable @next/next/no-img-element */
"use client";

import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useOwnerStore, useProjectStore } from "@/store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GrantDetails,
  nullRef,
  Grant,
  Milestone,
  IMilestone,
} from "@show-karma/karma-gap-sdk";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Hex, isAddress } from "viem";
import { useChainId, useSwitchChain } from "wagmi";
import { z } from "zod";
import { Milestone as MilestoneComponent } from "./Milestone";
import { usePathname, useRouter } from "next/navigation";
import { CommunitiesDropdown } from "@/components/CommunitiesDropdown";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getGapClient, useGap } from "@/hooks";
import toast from "react-hot-toast";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getWalletClient } from "@wagmi/core";
import { useGrantFormStore } from "./store";
import { MESSAGES } from "@/utilities/messages";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { PAGES } from "@/utilities/pages";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import { useAuthStore } from "@/store/auth";
import { formatDate } from "@/utilities/formatDate";
import { getProjectById, isCommunityAdminOf } from "@/utilities/sdk";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useCommunitiesStore } from "@/store/communities";
import { cn } from "@/utilities/tailwind";
import { useStepper } from "@/store/modals/txStepper";
import { config } from "@/utilities/wagmi/config";
import {
  ICommunityResponse,
  IGrantResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { sanitizeObject } from "@/utilities/sanitize";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import Link from "next/link";
import { GrantScreen } from "@/types";
import { GrantTitleDropdown } from "./GrantTitleDropdown";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { appNetwork } from "@/utilities/network";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:text-zinc-100 dark:border-gray-600 disabled:bg-gray-100 disabled:text-gray-400";
const textAreaStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:text-zinc-100 dark:border-gray-600";

const grantSchema = z.object({
  title: z.string().min(1, { message: MESSAGES.GRANT.FORM.TITLE.MIN }),
  programId: z.string().optional(),
  amount: z.string().optional(),
  fundUsage: z.string().optional(),
  community: z.string().nonempty({ message: MESSAGES.GRANT.FORM.COMMUNITY }),
  // season: z.string(),
  // cycle: z.string(),
  startDate: z.date({
    required_error: MESSAGES.GRANT.FORM.DATE,
  }),
  proofOfWorkGrantUpdate: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  linkToProposal: z
    .string()
    .url({
      message: MESSAGES.GRANT.FORM.LINK_TO_PROPOSAL,
    })
    .or(z.literal("")),
  recipient: z
    .string()
    .optional()
    .refine(
      (input) => !input || input?.length === 0 || isAddress(input),
      MESSAGES.GRANT.FORM.RECIPIENT
    ),
  questions: z
    .array(
      z.object({
        query: z.string().min(1),
        explanation: z.string().optional(),
        type: z.string().min(1),
      })
    )
    .optional(),
});

type GrantType = z.infer<typeof grantSchema>;

interface NewGrantProps {
  grantToEdit?: IGrantResponse;
}

interface Question {
  query: string;
  explanation: string;
  type: string;
}

interface GenericQuestion {
  query: string;
  explanation: string;
  type: string;
}

interface NewGrantData {
  title: string;
  description: string;
  linkToProposal: string;
  proofOfWorkGrantUpdate?: string;
  amount?: string;
  milestones: IMilestone[];
  community: string;
  season?: string;
  programId?: string;
  cycle?: string;
  recipient?: string;
  grantUpdate?: string;
  startDate?: number;
  questions: {
    type: string;
    query: string;
    explanation: string;
  }[];
  fundUsage?: string;
}

export function SearchGrantProgram({
  grantToEdit,
  communityUID,
  chainId,
  setValue,
  watch,
}: {
  grantToEdit?: IGrantResponse;
  communityUID: string;
  chainId: number;
  setValue: any;
  watch: any;
}) {
  const [allPrograms, setAllPrograms] = useState<GrantProgram[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [result, error] = await fetchData(
        INDEXER.COMMUNITY.PROGRAMS(communityUID)
      );
      if (error) {
        console.log(error);
      }
      const sortedAlphabetically = result.sort(
        (a: GrantProgram, b: GrantProgram) => {
          const aTitle = a.metadata?.title || "";
          const bTitle = b.metadata?.title || "";
          if (aTitle < bTitle) return -1;
          if (aTitle > bTitle) return 1;
          return 0;
        }
      );
      setAllPrograms(sortedAlphabetically);
      setIsLoading(false);
    })();
  }, [communityUID]);

  return (
    <div className="w-full max-w-[400px]">
      {isLoading ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Loading Grants...
        </div>
      ) : !communityUID ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Select a community to proceed
        </div>
      ) : (
        <GrantTitleDropdown
          chainId={chainId}
          list={allPrograms}
          setValue={setValue}
          setSelectedProgram={setSelectedProgram}
          type={"Grant"}
          grantToEdit={grantToEdit}
          selectedProgram={selectedProgram}
          prefixUnselected="Select"
          buttonClassname="w-full max-w-full"
          canAdd
        />
      )}
    </div>
  );
}

const defaultFundUsage = `| Budget Item    | % of Allocated funding |
| -------- | ------- |
| Item 1  | X%   |
| Item 2 | Y%     |
| Item 3 | Z%     |`;

export const NewGrant: FC<NewGrantProps> = ({ grantToEdit }) => {
  const {
    user,
    ready,
    authenticated,
  } = usePrivy();
  const chainId = useChainId();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = appNetwork.find((c) => c.id === chainId);
  const address = user && wallets[0]?.address as `0x${string}`; const isOwner = useOwnerStore((state) => state.isOwner);
  const pathname = usePathname();
  const grantScreen: GrantScreen = pathname.includes("edit-grant")
    ? "edit-grant"
    : "create-grant";
  const {
    milestonesForms: milestones,
    createMilestone,
    setFormPriorities,
  } = useGrantFormStore();
  const { isAuth } = useAuthStore();

  const refreshProject = useProjectStore((state) => state.refreshProject);

  const [description, setDescription] = useState(
    grantScreen === "edit-grant"
      ? grantToEdit?.details?.data?.description || ""
      : ""
  );
  const [grantUpdate, setGrantUpdate] = useState("");
  const [communityNetworkId, setCommunityNetworkId] = useState<number>(
    appNetwork[0].id
  );
  const [isCommunityAllowed, setIsCommunityAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const selectedProject = useProjectStore((state) => state.project);
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();

  function premade<T extends GenericQuestion>(): T[] | undefined {
    const hasQuestions = grantToEdit?.details?.data?.questions?.filter(
      (item) => item?.type && item?.explanation && item?.query
    );
    if (grantScreen === "edit-grant" && hasQuestions?.length) {
      if (
        hasQuestions.length !== grantToEdit?.details?.data?.questions.length
      ) {
        const fillQuestions = grantToEdit?.details?.data?.questions.map(
          (item: GenericQuestion) => ({
            query: item?.query,
            explanation: item?.explanation,
            type: item?.type,
          })
        ) as T[];

        return fillQuestions;
      }
      return hasQuestions as T[];
    }
    return undefined;
  }

  const form = useForm<GrantType>({
    resolver: zodResolver(grantSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      title:
        grantScreen === "edit-grant" ? grantToEdit?.details?.data?.title : "",
      amount:
        grantScreen === "edit-grant" ? grantToEdit?.details?.data?.amount : "",
      community:
        grantScreen === "edit-grant" ? grantToEdit?.data?.communityUID : "",
      // season: grantScreen === "edit-grant" ? grantToEdit?.details?.season : "",
      // cycle: grantScreen === "edit-grant" ? grantToEdit?.details?.cycle : "",
      fundUsage: grantToEdit?.details?.data?.fundUsage || defaultFundUsage,
      recipient:
        grantScreen === "edit-grant"
          ? grantToEdit?.recipient
          : selectedProject?.recipient,
      linkToProposal:
        grantScreen === "edit-grant"
          ? grantToEdit?.details?.data?.proposalURL
          : "",
      startDate:
        grantScreen === "edit-grant" && grantToEdit?.details?.data?.startDate
          ? new Date(grantToEdit?.details?.data?.startDate * 1000)
          : undefined,
      questions: premade<Question>(),
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const { saveMilestone, milestonesForms, clearMilestonesForms } =
    useGrantFormStore();

  const router = useRouter();

  const { changeStepperStep, setIsStepper } = useStepper();
  const createNewGrant = async (
    data: NewGrantData,
    communityNetworkId: number
  ) => {
    if (!address || !selectedProject) return;
    if (!gap) throw new Error("Please, connect a wallet");
    let gapClient = gap;
    try {
      setIsLoading(true);
      if (!isConnected || !isAuth) return;
      if (!checkNetworkIsValid(chainId) || chainId !== communityNetworkId) {
        await switchChainAsync?.({ chainId: communityNetworkId });
        gapClient = getGapClient(communityNetworkId);
      }
      const grant = new Grant({
        data: {
          communityUID: data.community,
        },
        refUID: selectedProject.uid,
        schema: gapClient.findSchema("Grant"),
        recipient: (data.recipient as Hex) || address,
        uid: nullRef,
      });
      const sanitizedDetails = sanitizeObject({
        ...data,
        amount: data.amount || "",
        proposalURL: data.linkToProposal,
        assetAndChainId: ["0x0", 1],
        payoutAddress: address,
        // cycle: data.cycle,
        // season: data.season,
      });

      console.log(sanitizedDetails, data?.fundUsage);

      grant.details = new GrantDetails({
        data: sanitizedDetails,
        refUID: grant.uid,
        schema: gapClient.findSchema("GrantDetails"),
        recipient: grant.recipient,
        uid: nullRef,
      });

      // eslint-disable-next-line no-param-reassign
      grant.milestones = data.milestones.map((milestone) => {
        const sanitizedMilestone = sanitizeObject({
          title: milestone.title,
          description: milestone.description,
          endsAt: milestone.endsAt,
          startsAt: milestone.startsAt,
          priority: milestone.priority,
        });
        const created = new Milestone({
          data: sanitizedMilestone,
          refUID: grant.uid,
          schema: gapClient.findSchema("Milestone"),
          recipient: grant.recipient,
          uid: nullRef,
        });

        return created;
      });

      const walletClient = await getWalletClient(config, {
        chainId: communityNetworkId,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await grant
        .attest(walletSigner as any, selectedProject.chainID, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grant.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(selectedProject.uid as Hex)
              .catch(() => null);
            if (
              fetchedProject?.grants?.find(
                (oldGrant) => oldGrant.uid === grant.uid
              )
            ) {
              clearMilestonesForms();
              retries = 0;
              toast.success(MESSAGES.GRANT.CREATE.SUCCESS);
              changeStepperStep("indexed");
              router.push(
                PAGES.PROJECT.GRANT(
                  selectedProject.details?.data.slug || selectedProject.uid,
                  grant.uid
                )
              );
              router.refresh();
              setFormPriorities([]);
              await refreshProject();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      toast.error(MESSAGES.GRANT.CREATE.ERROR);
      errorManager(
        `Error creating grant to project ${selectedProject.uid}`,
        error
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const updateGrant = async (oldGrant: IGrantResponse, data: NewGrantData) => {
    if (!address || !oldGrant.refUID || !selectedProject) return;
    let gapClient = gap;
    try {
      setIsLoading(true);
      if (chain?.id !== oldGrant.chainID) {
        await switchChainAsync?.({ chainId: oldGrant.chainID });
        gapClient = getGapClient(communityNetworkId);
      }
      if (!gapClient) return;
      const projectInstance = await getProjectById(oldGrant.refUID);
      const oldGrantInstance = projectInstance?.grants?.find(
        (item) => item?.uid?.toLowerCase() === oldGrant?.uid?.toLowerCase()
      );
      if (!oldGrantInstance) return;
      oldGrantInstance.setValues({
        communityUID: data.community,
      });
      const grantData = sanitizeObject({
        ...data,
        proposalURL: data.linkToProposal,
        payoutAddress: address,
        // cycle: data.cycle,
        // season: data.season,
      });
      oldGrantInstance.details?.setValues(grantData);
      const walletClient = await getWalletClient(config, {
        chainId: oldGrant.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const oldProjectData = await gapIndexerApi
        .projectBySlug(oldGrant.refUID)
        .then((res) => res.data);
      const oldGrantData = oldProjectData?.grants?.find(
        (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
      );
      await oldGrantInstance.details
        ?.attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, oldGrant.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            const fetchedProject = await gapIndexerApi
              .projectBySlug(oldGrant.refUID)
              .then((res) => res.data)
              .catch(() => null);
            const fetchedGrant = fetchedProject?.grants.find(
              (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
            );

            if (
              new Date(fetchedGrant?.details?.updatedAt) >
              new Date(oldGrantData?.updatedAt)
            ) {
              clearMilestonesForms();
              retries = 0;
              toast.success(MESSAGES.GRANT.UPDATE.SUCCESS);
              changeStepperStep("indexed");
              await refreshProject().then(() => {
                router.push(
                  PAGES.PROJECT.GRANT(
                    selectedProject.details?.data?.slug || selectedProject.uid,
                    oldGrant.uid
                  )
                );
                router.refresh();
              });
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      toast.error(MESSAGES.GRANT.UPDATE.ERROR);
      errorManager(
        `Error updating grant ${oldGrant.uid} from project ${selectedProject.uid}`,
        error
      );
      console.log(error);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const allMilestonesValidated = milestones.every(
    (milestone) => milestone.isValid === true
  );

  const saveAllMilestones = () => {
    milestonesForms.forEach((milestone, index) => {
      const { data, isValid } = milestone;
      if (isValid) {
        saveMilestone(data, index);
      }
    });
  };

  const onSubmit = async (data: GrantType) => {
    console.log("ProgramId: ", data.programId);
    saveAllMilestones();
    let questions: {
      type: string;
      query: string;
      explanation: string;
    }[] =
      data?.questions && data?.questions?.length > 0
        ? data?.questions?.map((item) => ({
          type: item.type,
          query: item.query,
          explanation: item.explanation || "",
        }))
        : [];

    const milestonesData = milestones.map((item) => item.data);
    const newGrant = {
      amount: data.amount,
      description,
      linkToProposal: data.linkToProposal,
      title: data.title,
      milestones: milestonesData,
      community: data.community,
      // season: data.season,
      // cycle: data.cycle,
      recipient: data.recipient,
      grantUpdate,
      questions,
      startDate: data.startDate.getTime() / 1000,
      programId: data?.programId,
      proofOfWorkGrantUpdate: data.proofOfWorkGrantUpdate,
      fundUsage:
        data?.fundUsage === defaultFundUsage ? undefined : data?.fundUsage,
    };

    if (grantScreen === "edit-grant" && grantToEdit) {
      updateGrant(grantToEdit, newGrant);
    } else {
      createNewGrant(newGrant, communityNetworkId);
    }
  };

  const setCommunityValue = (value: string, networkId: number) => {
    setCommunityNetworkId(networkId);
    setValue("community", value, {
      shouldValidate: true,
    });
  };

  const { communities } = useCommunitiesStore();
  const isCommunityAdminOfSome = communities.length !== 0;

  const isDescriptionValid = !!description.length;
  const signer = useSigner();

  const [allCommunities, setAllCommunities] = useState<ICommunityResponse[]>(
    []
  );

  const community = form.getValues("community");

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        if (!gap) throw new Error("Gap not initialized");
        const result = await gapIndexerApi.communities();
        setAllCommunities(result.data);
        return result;
      } catch (error: any) {
        console.log(error);
        setAllCommunities([]);
        return undefined;
      }
    };
    fetchCommunities();
  }, []);

  useEffect(() => {
    if (isOwner) {
      setIsCommunityAllowed(true);
      return;
    }
    async function checkCommunityAdmin(communityToSearch: string) {
      try {
        const findCommunity = allCommunities.find(
          (item) => item.uid.toLowerCase() === communityToSearch.toLowerCase()
        );
        if (!findCommunity) return setIsCommunityAllowed(false);
        const result = await isCommunityAdminOf(
          findCommunity,
          address as string,
          signer
        );
        setIsCommunityAllowed(result);
      } catch (error: any) {
        setIsCommunityAllowed(false);
        errorManager(
          `Error checking if ${address} is community admin for ${communityToSearch}`,
          error
        );
      }
    }
    const communityIdEdit =
      grantScreen === "edit-grant" ? grantToEdit?.data?.communityUID : null;
    if (
      isCommunityAdminOfSome &&
      allCommunities.length &&
      (community || communityIdEdit)
    ) {
      checkCommunityAdmin(community || communityIdEdit || "");
    }
  }, [
    isCommunityAdminOfSome,
    community,
    grantScreen,
    grantToEdit?.data?.communityUID,
    allCommunities,
    address,
  ]);

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const actionButtonDisable =
    isSubmitting ||
    isLoading ||
    !isDescriptionValid ||
    !allMilestonesValidated ||
    !isValid ||
    (!isCommunityAllowed &&
      isCommunityAdminOfSome &&
      !(isOwner || isProjectOwner));

  const handleButtonDisableMessage = () => {
    if (!isValid) return "Please fill all required(*) fields.";
    if (
      !isCommunityAllowed &&
      isCommunityAdminOfSome &&
      !(isOwner || isProjectOwner)
    )
      return "You are not admin of this community.";
    if (isSubmitting || isLoading) return "Please wait...";
    if (!isDescriptionValid) return "Description is required.";
    if (!allMilestonesValidated) return "All milestones must be filled.";
    return "";
  };

  useEffect(() => {
    if (grantToEdit?.details?.data?.programId) {
      setValue("programId", grantToEdit?.details?.data?.programId);
    }
  }, []);

  return (
    <div className={"flex w-full flex-col items-start  justify-center"}>
      <div className="flex w-full max-w-3xl flex-col items-start justify-start gap-6 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-900 px-6 pb-6 pt-5 max-lg:max-w-full">
        <div className="flex w-full items-center flex-row justify-between">
          <h3 className="text-2xl font-bold text-black dark:text-zinc-100">
            {grantScreen === "edit-grant"
              ? "Update grant"
              : "Create a new grant"}
          </h3>
          <Link
            href={
              grantToEdit
                ? PAGES.PROJECT.GRANT(
                  (selectedProject?.details?.data?.slug ||
                    selectedProject?.uid) as string,
                  grantToEdit?.uid as string
                )
                : PAGES.PROJECT.GRANTS(
                  (selectedProject?.details?.data?.slug ||
                    selectedProject?.uid) as string
                )
            }
            className="bg-transparent px-1 hover:bg-transparent hover:opacity-75 text-black dark:text-zinc-100"
          >
            <XMarkIcon className="h-8 w-8 " />
          </Link>
        </div>
        <form className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col">
            <label htmlFor="grant-title" className={`${labelStyle} mb-1`}>
              Community *
            </label>
            <CommunitiesDropdown
              onSelectFunction={setCommunityValue}
              previousValue={
                grantScreen === "edit-grant"
                  ? grantToEdit?.data?.communityUID
                  : undefined
              }
              communities={allCommunities}
            />
            <p className="text-base text-red-400">
              {errors.community?.message}
            </p>
          </div>
          <div className="flex w-full flex-col">
            <label htmlFor="grant-title" className={`${labelStyle} mb-1`}>
              Choose Grant Program or Add New*
            </label>
            <SearchGrantProgram
              grantToEdit={grantToEdit}
              communityUID={form.getValues("community")}
              chainId={communityNetworkId}
              setValue={setValue}
              watch={watch}
            />

            <p className="text-base text-red-400">{errors.title?.message}</p>
          </div>

          <div className="flex w-full flex-col">
            <Controller
              name="startDate"
              control={form.control}
              render={({ field, formState, fieldState }) => (
                <div className="flex w-full flex-col gap-2">
                  <label className={labelStyle}>Start Date *</label>
                  <div>
                    <Popover className="relative">
                      <Popover.Button className="max-lg:w-full w-max text-base flex-row flex gap-2 items-center bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-md">
                        {field.value ? (
                          formatDate(field.value)
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Popover.Button>
                      <Popover.Panel className="absolute z-10 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                        <DayPicker
                          mode="single"
                          selected={field.value}
                          onDayClick={(e) => {
                            setValue("startDate", e, { shouldValidate: true });
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
                    {formState.errors.startDate?.message}
                  </p>
                </div>
              )}
            />
          </div>
          <div className="flex w-full flex-col">
            <label htmlFor="grant-amount" className={labelStyle}>
              Amount (optional)
            </label>
            <input
              id="grant-amount"
              className={inputStyle}
              placeholder="25K OP"
              {...register("amount")}
            />
            <p className="text-base text-red-400">{errors.amount?.message}</p>
          </div>
          <div className="flex w-full flex-col">
            <label htmlFor="grant-linkToProposal" className={labelStyle}>
              Link to Proposal (optional)
            </label>
            <input
              id="grant-linkToProposal"
              className={inputStyle}
              {...register("linkToProposal")}
            />
            <p className="text-base text-red-400">
              {errors.linkToProposal?.message}
            </p>
          </div>
          {/* <div className="flex w-full flex-col">
            <label htmlFor="grant-season" className={labelStyle}>
              Season (optional)
            </label>
            <input
              id="grant-season"
              className={inputStyle}
              placeholder="Ex: Season 1"
              {...register("season")}
            />
            <p className="text-base text-red-400">{errors.season?.message}</p>
          </div> */}
          {/* <div className="flex w-full flex-col">
            <label htmlFor="grant-cycle" className={labelStyle}>
              Cycle (optional)
            </label>
            <input
              id="grant-cycle"
              className={inputStyle}
              placeholder="Ex: Cycle 12"
              {...register("cycle")}
            />
            <p className="text-base text-red-400">{errors.cycle?.message}</p>
          </div> */}

          {(isOwner || isCommunityAdminOfSome) && (
            <div className="flex w-full flex-col">
              <label htmlFor="tags-input" className={labelStyle}>
                Recipient address
              </label>
              <input
                id="tags-input"
                type="text"
                className={cn(
                  inputStyle,
                  "text-gray-500 dark:text-gray-300 cursor-not-allowed dark:bg-zinc-900"
                )}
                placeholder="0xab...0xbf2"
                // {...register("recipient")}
                readOnly
                disabled
                value={form.getValues("recipient")}
              />
              <p className="text-red-500">{errors.recipient?.message}</p>
            </div>
          )}
          <div className="flex w-full flex-col">
            <label htmlFor="grant-description" className={labelStyle}>
              Description *
            </label>
            <div className="mt-2 w-full bg-transparent dark:border-gray-600">
              <MarkdownEditor
                className="bg-transparent dark:border-gray-600"
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
                placeholderText="Add a brief description about this grant"
              />
            </div>
            {grantScreen === "edit-grant" && !isDescriptionValid ? (
              <p className="text-red-500">Description is required</p>
            ) : null}
          </div>
          <div className="flex w-full flex-col">
            <label htmlFor="grant-description" className={labelStyle}>
              Breakdown of funds usage (optional)
            </label>
            <div className="mt-2 w-full bg-transparent dark:border-gray-600">
              <MarkdownEditor
                className="bg-transparent dark:border-gray-600"
                value={watch("fundUsage") || ""}
                onChange={(newValue: string) =>
                  setValue("fundUsage", newValue || "", {
                    shouldValidate: true,
                  })
                }
                placeholderText="Enter a breakdown of how the funds will be used (e.g. development costs, marketing, etc.)"
              />
            </div>
          </div>

          {form.getValues("questions") &&
            form.getValues("questions")?.map((item, index) => (
              <Controller
                key={index}
                control={form.control}
                name={`questions.${index}.explanation`}
                render={({ field, formState }) => (
                  <div className="flex flex-col gap-2">
                    <label
                      id={`questions.${index}.explanation`}
                      className={labelStyle}
                    >
                      {item.query} (optional)
                    </label>
                    <textarea className={textAreaStyle} {...field} />
                    <p>
                      {
                        formState.errors.questions?.[index]?.explanation
                          ?.message
                      }
                    </p>
                  </div>
                )}
              />
            ))}
        </form>
        {grantScreen === "create-grant" && (
          <div className="flex w-full flex-col items-center justify-center gap-8 py-8">
            {milestones.map((milestone, index) => (
              <MilestoneComponent
                currentMilestone={milestone.data}
                key={+index}
                index={index}
              />
            ))}
            <button
              onClick={() => {
                createMilestone();
              }}
              className="border border-dashed dark:border-blue-300 dark:hover:bg-transparent dark:text-blue-200 border-blue-800 bg-transparent px-8 py-4 text-base font-bold text-blue-800 hover:bg-white hover:opacity-75"
            >
              Add milestone
            </button>
          </div>
        )}
        <div className="flex w-full flex-row justify-end gap-8">
          <Button
            disabled={isSubmitting || isLoading}
            className="border dark:border-blue-300 dark:text-blue-400 border-blue-500 bg-transparent text-base px-6 font-bold text-blue-800 hover:bg-transparent hover:opacity-75"
            onClick={() => {
              if (!selectedProject) return;
              if (!grantToEdit) {
                router.push(
                  PAGES.PROJECT.GRANTS(
                    selectedProject.details?.data?.slug || selectedProject?.uid
                  )
                );
                router.refresh();
                return;
              }
              router.push(
                PAGES.PROJECT.GRANT(
                  selectedProject.details?.data?.slug || selectedProject?.uid,
                  grantToEdit.uid
                )
              );
              router.refresh();
            }}
          >
            Cancel
          </Button>

          <Tooltip.Provider>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <div className="h-max">
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    className="flex items-center justify-start gap-3 rounded bg-blue-500 dark:bg-blue-900 px-6 text-base font-bold text-white hover:bg-blue-500 hover:opacity-75"
                    disabled={actionButtonDisable}
                    isLoading={isSubmitting || isLoading}
                  >
                    {grantScreen === "edit-grant"
                      ? "Update grant"
                      : "Create grant"}
                  </Button>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="TooltipContent" sideOffset={5}>
                  {actionButtonDisable ? (
                    <div className="px-2 bg-red-100 rounded-md py-2 dark:bg-red-900">
                      <p>{handleButtonDisableMessage()}</p>
                    </div>
                  ) : null}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
    </div>
  );
};
