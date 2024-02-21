/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useOwnerStore, useProjectStore } from "@/store";
import { MilestoneWithCompleted } from "@/types/milestones";
import {
  MESSAGES,
  PAGES,
  appNetwork,
  useSigner,
  walletClientToSigner,
} from "@/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GrantDetails,
  nullRef,
  GrantUpdate,
  Grant,
  Milestone,
  MilestoneCompleted,
} from "@show-karma/karma-gap-sdk";
import type { FC } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Hex, isAddress } from "viem";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { z } from "zod";
import { Milestone as MilestoneComponent } from "./Milestone";

import { CommunitiesDropdown } from "@/components/CommunitiesDropdown";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useGap } from "@/hooks";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getWalletClient } from "@wagmi/core";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:text-zinc-100 dark:border-gray-600";
const textAreaStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:text-zinc-100 dark:border-gray-600";

const SUCCESS_QUESTIONS = ["How should the success of your grant be measured?"];

const IMPACT_QUESTIONS = [
  "What is the intended direct impact your project will have on the ecosystem?",
  "What is the long-term impact of your grant?",
];

const INNOVATION_QUESTIONS = [
  "How will receiving a grant enable you to foster growth or innovation within the ecosystem?",
];

const FUND_QUESTIONS = ["How will the grant funds be used?"];
const TIMEFRAME_QUESTIONS = ["What is the timeframe for the work funded?"];

const grantSchema = z.object({
  title: z.string().min(3, { message: MESSAGES.GRANT.FORM.TITLE }),
  amount: z.string().optional(),
  community: z.string().nonempty({ message: MESSAGES.GRANT.FORM.COMMUNITY }),
  season: z.string(),
  cycle: z.string(),
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
  successQuestions: z.array(
    z.object({
      query: z.string().nonempty(),
      explanation: z.string().optional(),
      type: z.literal("SUCCESS_MEASURE"),
    })
  ),
  impactQuestions: z.array(
    z.object({
      query: z.string().nonempty(),
      explanation: z.string().optional(),
      type: z.literal("IMPACT_MEASUREMENT"),
    })
  ),
  innovationQuestions: z.array(
    z.object({
      query: z.string().nonempty(),
      explanation: z.string().optional(),
      type: z.literal("INNOVATION"),
    })
  ),
  fundQuestions: z.array(
    z.object({
      query: z.string().nonempty(),
      explanation: z.string().optional(),
      type: z.literal("FUND_USAGE"),
    })
  ),
  timeframeQuestions: z.array(
    z.object({
      query: z.string().nonempty(),
      explanation: z.string().optional(),
      type: z.literal("TIMEFRAME"),
    })
  ),
});

type GrantType = z.infer<typeof grantSchema>;

interface NewGrantProps {
  grantToEdit?: Grant;
}

interface SuccessQuestion {
  query: string;
  explanation: string;
  type: "SUCCESS_MEASURE";
}
interface ImpactQuestion {
  query: string;
  explanation: string;
  type: "IMPACT_MEASUREMENT";
}
interface FundQuestion {
  query: string;
  explanation: string;
  type: "FUND_USAGE";
}
interface TimeframeQuestion {
  query: string;
  explanation: string;
  type: "TIMEFRAME";
}
interface InnovationQuestion {
  query: string;
  explanation: string;
  type: "INNOVATION";
}

type QuestionType =
  | "SUCCESS_MEASURE"
  | "IMPACT_MEASUREMENT"
  | "INNOVATION"
  | "TIMEFRAME"
  | "FUND_USAGE";

interface GenericQuestion {
  query: string;
  explanation: string;
  type: QuestionType;
}

interface NewGrantData {
  title: string;
  description: string;
  linkToProposal: string;
  amount?: string;
  milestones: MilestoneWithCompleted[];
  community: string;
  season?: string;
  cycle?: string;
  recipient?: string;
  grantUpdate?: string;
  questions: {
    type: string;
    query: string;
    explanation: string;
  }[];
}

export const NewGrant: FC<NewGrantProps> = ({ grantToEdit }) => {
  const { address } = useAccount();
  const signer = useSigner();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const searchParams = useSearchParams();
  const grantScreen = searchParams?.get("tab");

  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [milestones, setMilestones] = useState<MilestoneWithCompleted[]>([]);
  const [description, setDescription] = useState(
    grantScreen === "edit-grant" ? grantToEdit?.details?.description || "" : ""
  );
  const [grantUpdate, setGrantUpdate] = useState("");
  const [communityNetworkId, setCommunityNetworkId] = useState<number>(
    appNetwork[0].id
  );
  const [isLoading, setIsLoading] = useState(false);
  const selectedProject = useProjectStore((state) => state.project);
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { gap } = useGap();
  const { isConnected } = useAccount();

  function premade<T extends GenericQuestion>(
    type: QuestionType,
    questions: string[]
  ): T[] {
    const hasQuestions = grantToEdit?.details?.questions?.filter(
      (item) => item.type === type
    );
    if (grantScreen === "edit-grant" && hasQuestions?.length) {
      if (hasQuestions.length !== questions.length) {
        const fillQuestions = questions.map((item) => ({
          query: item,
          explanation: "",
          type,
        })) as T[];
        fillQuestions.forEach((_, i) => {
          const match = hasQuestions.find((item) => {
            return item.query === fillQuestions[i]?.query;
          });
          if (match) {
            fillQuestions[i] = match as T;
          }
        });
        return fillQuestions;
      }
      return hasQuestions as T[];
    }
    return questions.map((item) => ({
      query: item,
      explanation: "",
      type,
    })) as T[];
  }

  const form = useForm<GrantType>({
    resolver: zodResolver(grantSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      title: grantScreen === "edit-grant" ? grantToEdit?.details?.title : "",
      amount: grantScreen === "edit-grant" ? grantToEdit?.details?.amount : "",
      community: grantScreen === "edit-grant" ? grantToEdit?.communityUID : "",
      season: grantScreen === "edit-grant" ? grantToEdit?.details?.season : "",
      cycle: grantScreen === "edit-grant" ? grantToEdit?.details?.cycle : "",
      linkToProposal:
        grantScreen === "edit-grant" ? grantToEdit?.details?.proposalURL : "",
      successQuestions: premade<SuccessQuestion>(
        "SUCCESS_MEASURE",
        SUCCESS_QUESTIONS
      ),
      impactQuestions: premade<ImpactQuestion>(
        "IMPACT_MEASUREMENT",
        IMPACT_QUESTIONS
      ),
      innovationQuestions: premade<InnovationQuestion>(
        "INNOVATION",
        INNOVATION_QUESTIONS
      ),
      timeframeQuestions: premade<TimeframeQuestion>(
        "TIMEFRAME",
        TIMEFRAME_QUESTIONS
      ),
      fundQuestions: premade<FundQuestion>("FUND_USAGE", FUND_QUESTIONS),
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const router = useRouter();

  const { connector } = useAccount();

  const createNewGrant = async (
    data: NewGrantData,
    communityNetworkId: number
  ) => {
    if (!address || !selectedProject) return;
    if (!gap) throw new Error("Please, connect a wallet");

    try {
      setIsLoading(true);
      if (!isConnected) return;
      const grant = new Grant({
        data: {
          communityUID: data.community,
        },
        refUID: selectedProject.uid,
        schema: gap.findSchema("Grant"),
        recipient: (data.recipient as Hex) || address,
        uid: nullRef,
      });
      const chainId = await connector?.getChainId();
      if (!checkNetworkIsValid(chainId) || chainId !== communityNetworkId) {
        await switchNetworkAsync?.(communityNetworkId);
      }
      grant.details = new GrantDetails({
        data: {
          amount: data.amount || "",
          description: data.description,
          proposalURL: data.linkToProposal,
          title: data.title,
          assetAndChainId: ["0x0", 1],
          payoutAddress: address,
          cycle: data.cycle,
          season: data.season,
          questions: data.questions,
        },
        refUID: grant.uid,
        schema: gap.findSchema("GrantDetails"),
        recipient: grant.recipient,
        uid: nullRef,
      });
      // eslint-disable-next-line no-param-reassign
      grant.updates = data.grantUpdate
        ? [
            new GrantUpdate({
              data: {
                text: data.grantUpdate || "",
                title: "",
              },
              schema: gap.findSchema("Milestone"),
              recipient: grant.recipient,
            }),
          ]
        : [];

      // eslint-disable-next-line no-param-reassign
      grant.milestones = data.milestones.map((milestone) => {
        const created = new Milestone({
          data: {
            title: milestone.title,
            description: milestone.description,
            endsAt: milestone.endsAt,
          },
          refUID: grant.uid,
          schema: gap.findSchema("Milestone"),
          recipient: grant.recipient,
          uid: nullRef,
        });
        if (milestone.completedText) {
          created.completed = new MilestoneCompleted({
            data: {
              reason: milestone.completedText,
              type: "completed",
            },
            refUID: created.uid,
            schema: gap.findSchema("MilestoneCompleted"),
            recipient: grant.recipient,
          });
        }
        return created;
      });

      const walletClient = await getWalletClient({
        chainId: communityNetworkId,
      });
      if (!walletClient) return;
      await grant
        .attest(signer as any, selectedProject.chainID)
        .then(async () => {
          // eslint-disable-next-line no-param-reassign
          toast.success(MESSAGES.GRANT.CREATE.SUCCESS);
          router.push(
            PAGES.PROJECT.TABS.SELECTED_TAB(
              selectedProject.details?.slug || selectedProject.uid,
              grant.uid,
              "overview"
            )
          );
          selectedProject?.grants.unshift(grant);
        });
    } catch (error) {
      toast.error(MESSAGES.GRANT.CREATE.ERROR);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateGrant = async (oldGrant: Grant, data: NewGrantData) => {
    if (!address || !selectedProject) return;
    try {
      setIsLoading(true);
      if (chain && chain.id !== oldGrant.chainID) {
        await switchNetworkAsync?.(oldGrant.chainID);
      }
      oldGrant.setValues({
        communityUID: data.community,
      });
      oldGrant.details?.setValues({
        amount: data.amount || "",
        description: data.description,
        proposalURL: data.linkToProposal,
        title: data.title,
        payoutAddress: address,
        cycle: data.cycle,
        season: data.season,
        questions: data.questions,
      });
      const walletClient = await getWalletClient({
        chainId: communityNetworkId,
      });
      if (!walletClient) return;
      await oldGrant.details?.attest(signer as any).then(async () => {
        // eslint-disable-next-line no-param-reassign
        toast.success(MESSAGES.GRANT.UPDATE.SUCCESS);
        await refreshProject().then(() => {
          router.push(
            PAGES.PROJECT.GRANT(
              selectedProject.details?.slug || selectedProject.uid,
              oldGrant.uid
            )
          );
        });
      });
    } catch (error) {
      toast.error(MESSAGES.GRANT.UPDATE.ERROR);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: GrantType) => {
    let questions: {
      type: string;
      query: string;
      explanation: string;
    }[] = data.successQuestions
      .map((item) => ({
        type: "SUCCESS_MEASURE",
        query: item.query,
        explanation: item.explanation || "",
      }))
      .concat(
        data.impactQuestions.map((item) => ({
          type: "IMPACT_MEASUREMENT",
          query: item.query,
          explanation: item.explanation || "",
        }))
      );
    const hasFundQuestions = data.fundQuestions.filter(
      (item) => item.explanation && item.explanation.length > 0
    );
    if (hasFundQuestions.length > 0) {
      questions = questions.concat(
        hasFundQuestions.map((item) => ({
          type: "FUND_USAGE",
          query: item.query,
          explanation: item.explanation || "",
        }))
      );
    }
    const hasTimeQuestions = data.timeframeQuestions.filter(
      (item) => item.explanation && item.explanation.length > 0
    );
    if (hasTimeQuestions.length > 0) {
      questions = questions.concat(
        hasTimeQuestions.map((item) => ({
          type: "TIMEFRAME",
          query: item.query,
          explanation: item.explanation || "",
        }))
      );
    }
    const hasInnovation = data.innovationQuestions.filter(
      (item) => item.explanation && item.explanation.length > 0
    );
    if (hasInnovation.length > 0) {
      questions = questions.concat(
        hasInnovation.map((item) => ({
          type: "INNOVATION",
          query: item.query,
          explanation: item.explanation || "",
        }))
      );
    }
    const newGrant = {
      amount: data.amount,
      description,
      linkToProposal: data.linkToProposal,
      title: data.title,
      milestones,
      community: data.community,
      season: data.season,
      cycle: data.cycle,
      recipient: data.recipient,
      grantUpdate,
      questions,
    };
    if (grantScreen === "edit-grant" && grantToEdit) {
      updateGrant(grantToEdit, newGrant);
    } else {
      createNewGrant(newGrant, communityNetworkId);
    }
  };

  const createMilestone = () => {
    const newMilestone: MilestoneWithCompleted = {
      title: "",
      description: "",
      endsAt: 1,
    };
    const newMilestones = [...milestones, newMilestone];
    setMilestones(newMilestones);
  };

  const removeMilestone = (index: number) => {
    const newMilestones = [...milestones];
    newMilestones.splice(index, 1);
    setMilestones(newMilestones);
  };

  const saveMilestone = (milestone: MilestoneWithCompleted, index: number) => {
    const newMilestones = [...milestones];
    newMilestones[index] = milestone;
    setMilestones(newMilestones);
  };

  const setCommunityValue = (value: string, networkId: number) => {
    setCommunityNetworkId(networkId);
    setValue("community", value, {
      shouldValidate: true,
    });
  };

  const isDescriptionValid = !!description.length;

  return (
    <div className={"flex w-full flex-col items-start  justify-center"}>
      <div className="flex w-full max-w-3xl flex-col items-start justify-start gap-6 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-900 px-6 pb-6 pt-5 max-lg:max-w-full">
        <div className="flex w-full items-center flex-row justify-between">
          <h3 className="text-2xl font-bold text-black dark:text-zinc-100">
            {grantScreen === "edit-grant" ? "Edit grant" : "Create a new grant"}
          </h3>
          <Button
            className="bg-transparent px-4 hover:bg-transparent hover:opacity-75 text-black dark:text-zinc-100"
            onClick={() => {
              if (!selectedProject) return;
              if (!grantToEdit) {
                router.push(
                  PAGES.PROJECT.GRANTS(
                    selectedProject.details?.slug || selectedProject?.uid
                  )
                );
                return;
              }
              router.push(
                PAGES.PROJECT.TABS.SELECTED_TAB(
                  selectedProject?.details?.slug || selectedProject.uid,
                  grantToEdit.uid,
                  "overview"
                )
              );
            }}
          >
            <XMarkIcon className="h-8 w-8 " />
          </Button>
        </div>
        <form className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col">
            <label htmlFor="grant-title" className={labelStyle}>
              Grant title
            </label>
            <input
              id="grant-title"
              className={inputStyle}
              placeholder="Ex: Optimism Dashboard, Gitcoin Round 18 etc."
              {...register("title")}
            />
            <p className="text-base text-red-400">{errors.title?.message}</p>
          </div>
          <div className="flex w-full flex-col">
            <label htmlFor="grant-title" className={labelStyle}>
              Community
            </label>
            <CommunitiesDropdown
              onSelectFunction={setCommunityValue}
              previousValue={
                grantScreen === "edit-grant"
                  ? grantToEdit?.communityUID
                  : undefined
              }
            />
            <p className="text-base text-red-400">
              {errors.community?.message}
            </p>
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
          <div className="flex w-full flex-col">
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
          </div>
          <div className="flex w-full flex-col">
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
          </div>

          {isOwner && (
            <div className="flex w-full flex-col">
              <label htmlFor="tags-input" className={labelStyle}>
                Recipient address
              </label>
              <input
                id="tags-input"
                type="text"
                className={inputStyle}
                placeholder="0xab...0xbf2"
                {...register("recipient")}
              />
              <p className="text-red-500">{errors.recipient?.message}</p>
            </div>
          )}
          <div className="flex w-full flex-col">
            <label htmlFor="grant-description" className={labelStyle}>
              Description
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

          {IMPACT_QUESTIONS.map((item, index) => (
            <Controller
              key={item}
              control={form.control}
              name={`impactQuestions.${index}.explanation`}
              render={({ field, formState }) => (
                <div className="flex flex-col gap-2">
                  <label
                    id={`impactQuestions.${index}.explanation`}
                    className={labelStyle}
                  >
                    {item} (optional)
                  </label>
                  <textarea className={textAreaStyle} {...field} />
                  <p>
                    {
                      formState.errors.impactQuestions?.[index]?.explanation
                        ?.message
                    }
                  </p>
                </div>
              )}
            />
          ))}
          {SUCCESS_QUESTIONS.map((item, index) => (
            <Controller
              key={item}
              control={form.control}
              name={`successQuestions.${index}.explanation`}
              render={({ field, formState }) => (
                <div className="flex flex-col gap-2">
                  <label
                    id={`successQuestions.${index}.explanation`}
                    className={labelStyle}
                  >
                    {item} (optional)
                  </label>
                  <textarea className={textAreaStyle} {...field} />
                  <p>
                    {
                      formState.errors.successQuestions?.[index]?.explanation
                        ?.message
                    }
                  </p>
                </div>
              )}
            />
          ))}
          {INNOVATION_QUESTIONS.map((item, index) => (
            <Controller
              key={item}
              control={form.control}
              name={`innovationQuestions.${index}.explanation`}
              render={({ field, formState }) => (
                <div className="flex flex-col gap-2">
                  <label
                    id={`innovationQuestions.${index}.explanation`}
                    className={labelStyle}
                  >
                    {item} (optional)
                  </label>
                  <textarea className={textAreaStyle} {...field} />
                  <p>
                    {
                      formState.errors.innovationQuestions?.[index]?.explanation
                        ?.message
                    }
                  </p>
                </div>
              )}
            />
          ))}
          {FUND_QUESTIONS.map((item, index) => (
            <Controller
              key={item}
              control={form.control}
              name={`fundQuestions.${index}.explanation`}
              render={({ field, formState }) => (
                <div className="flex flex-col gap-2">
                  <label
                    id={`fundQuestions.${index}.explanation`}
                    className={labelStyle}
                  >
                    {item} (optional)
                  </label>
                  <textarea className={textAreaStyle} {...field} />
                  <p>
                    {
                      formState.errors.fundQuestions?.[index]?.explanation
                        ?.message
                    }
                  </p>
                </div>
              )}
            />
          ))}
          {TIMEFRAME_QUESTIONS.map((item, index) => (
            <Controller
              key={item}
              control={form.control}
              name={`timeframeQuestions.${index}.explanation`}
              render={({ field, formState }) => (
                <div className="flex flex-col gap-2">
                  <label
                    id={`timeframeQuestions.${index}.explanation`}
                    className={labelStyle}
                  >
                    {item} (optional)
                  </label>
                  <textarea className={textAreaStyle} {...field} />
                  <p>
                    {
                      formState.errors.timeframeQuestions?.[index]?.explanation
                        ?.message
                    }
                  </p>
                </div>
              )}
            />
          ))}
          {grantScreen === "create-grant" && (
            <div className="flex w-full flex-col">
              <label htmlFor="grant-update" className={labelStyle}>
                Grant update (optional)
              </label>
              <div
                className="mt-2 w-full bg-transparent"
                data-color-mode="light"
              >
                <MarkdownEditor
                  className="bg-transparent"
                  value={grantUpdate}
                  onChange={(newValue: string) =>
                    setGrantUpdate(newValue || "")
                  }
                  placeholderText="To share updates on the progress of this grant, please add the details here."
                />
              </div>
            </div>
          )}
        </form>
        {grantScreen === "create-grant" && (
          <div className="flex w-full flex-col items-center justify-center gap-8 py-8">
            {milestones.map((milestone, index) => (
              <MilestoneComponent
                currentMilestone={milestone}
                key={+index}
                index={index}
                removeMilestone={removeMilestone}
                saveMilestone={saveMilestone}
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
                    selectedProject.details?.slug || selectedProject?.uid
                  )
                );
                return;
              }
              router.push(
                PAGES.PROJECT.TABS.SELECTED_TAB(
                  selectedProject.details?.slug || selectedProject.uid,
                  grantToEdit.uid,
                  "overview"
                )
              );
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit(onSubmit)}
            className="flex items-center justify-start gap-3 rounded bg-blue-500 dark:bg-blue-900 px-6 text-base font-bold text-white hover:bg-blue-500 hover:opacity-75"
            disabled={
              isSubmitting ||
              isLoading ||
              !isDescriptionValid ||
              (grantScreen === "create-grant" && !isValid)
            }
            isLoading={isSubmitting || isLoading}
          >
            {grantScreen === "edit-grant" ? "Edit grant" : "Create grant"}
          </Button>
        </div>
      </div>
    </div>
  );
};
