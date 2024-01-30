/* eslint-disable react/no-unstable-nested-components */
import { zodResolver } from "@hookform/resolvers/zod";
import type { Grant } from "@show-karma/karma-gap-sdk";
import { type FC, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import { Question } from "@/types";
import { ReviewerInfo } from "@/types/reviewer";
import { INDEXER, MESSAGES, additionalQuestion } from "@/utilities";
import { useAccount } from "wagmi";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { DynamicStars } from "@/components/Utilities/DynamicStars";
import { Button } from "@/components/Utilities/Button";

interface ReviewFormProps {
  grant: Grant;
  allQuestions: Question[];
  alreadyReviewed: boolean;
  reviewerInfo: ReviewerInfo;
}

const FormSchema = z.object({
  questions: z.array(
    z.object({
      id: z.number().min(0),
      rating: z.number().min(1, { message: MESSAGES.GRANT.REVIEW.FORM.RATING }),
      answer: z.string().optional(),
      questionId: z.number().min(0),
    })
  ),
  infos: z
    .object({
      choice: z.enum(["yes", "no"], {
        required_error: "You need to answer this.",
      }),
      name: z.string(),
      email: z.string().email({ message: "Invalid email" }),
      categories: z.string().array(),
    })
    .partial()
    .refine(
      (data) => {
        return data.choice;
      },
      {
        message: "This answer is required.",
        path: ["choice"],
      }
    )
    .refine(
      (data) => {
        if (data.choice === "yes") {
          return data.name;
        }
        return true;
      },
      {
        message: "Insert your name.",
        path: ["name"],
      }
    )
    .refine(
      (data) => {
        if (data.choice === "yes") {
          return data.categories?.length;
        }
        return true;
      },
      {
        message: "Select at least one category.",
        path: ["categories"],
      }
    )
    .refine(
      (data) => {
        if (data.choice === "yes") {
          return data.email;
        }
        return true;
      },
      {
        message: "Insert your e-mail.",
        path: ["email"],
      }
    ),
});

const categories = [
  "Community Growth",
  "ZK Tech",
  "DeFi protocols",
  "NFT projects",
  "DAO Tools",
  "L2 Tech",
];

export const ReviewForm: FC<ReviewFormProps> = ({
  grant,
  allQuestions,
  alreadyReviewed,
  reviewerInfo,
}) => {
  const { address } = useAccount();
  const project = useProjectStore((state) => state.project);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  const orderedQuestions = [
    ...allQuestions.filter(
      (question) => !additionalQuestion(question.questionId)
    ),
    ...allQuestions.filter((question) =>
      additionalQuestion(question.questionId)
    ),
  ];
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      questions: orderedQuestions.map((question) => {
        if (additionalQuestion(question.questionId)) {
          return {
            id: question.id,
            rating: 1,
            answer: "",
            questionId: question.questionId,
          };
        }
        return {
          id: question.id,
          rating: 0,
          answer: "",
          questionId: question.questionId,
        };
      }),
      infos: reviewerInfo,
    },
  });

  const saveReview = async ({
    questions: dataQuestions,
    infos,
  }: z.infer<typeof FormSchema>) => {
    setIsSaving(true);
    try {
      const mountAnswers = dataQuestions.map((item) => {
        if (
          additionalQuestion(
            allQuestions.find((question) => question.id === item.id)?.questionId
          )
        ) {
          return {
            questionId: item.id,
            explanation: item.answer,
            rating: 0,
          };
        }
        return {
          questionId: item.id,
          explanation: item.answer,
          rating: +item.rating,
        };
      });

      await fetchData(
        INDEXER.GRANTS.REVIEWS.REVIEWER.SAVE(address as string),
        "PUT",
        {
          choice: infos.choice === "yes",
          name: infos.choice === "yes" ? infos.name : undefined,
          email: infos.choice === "yes" ? infos.email : undefined,
          categories: infos.choice === "yes" ? infos.categories : undefined,
        }
      ).catch((error) => {
        console.log(error);
      });
      await fetchData(INDEXER.GRANTS.REVIEWS.SEND(grant.uid), "POST", {
        publicAddress: address,
        answers: mountAnswers,
      }).then(() => {
        toast.success(
          MESSAGES.GRANT.REVIEW.SUCCESS(
            project?.details?.title as string,
            grant.details?.title as string
          )
        );
        setHasSubmitted(true);
      });
    } catch (error) {
      toast.error(
        MESSAGES.GRANT.REVIEW.ERROR(
          project?.details?.title as string,
          grant.details?.title as string
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  function onSubmit(data: z.infer<typeof FormSchema>) {
    saveReview(data);
  }

  const { watch } = form;
  const choice = watch("infos.choice");

  return alreadyReviewed || hasSubmitted ? (
    <div className="flex w-full max-w-max flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <p className="text-base text-black">
        {MESSAGES.GRANT.REVIEW.ALREADY_REVIEWED}
      </p>
    </div>
  ) : (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex  w-full flex-col gap-3  rounded-xl"
    >
      {orderedQuestions.map((question, index) => (
        <div
          key={`${question.query}${question.id}`}
          className="flex w-full flex-col gap-2"
        >
          <div className="flex w-full flex-row items-center justify-between gap-3 max-lg:flex-col max-lg:items-start">
            <div
              data-color-mode="light"
              className="max-w-2xl text-base font-semibold text-black"
            >
              <ReactMarkdown
                className="text-base font-semibold text-black"
                components={{
                  strong: ({ children, ...props }) => {
                    return <ExternalLink {...props}>{children}</ExternalLink>;
                  },
                  a: ({ children, ...props }) => {
                    return <ExternalLink {...props}>{children}</ExternalLink>;
                  },
                }}
              >
                {question.query}
              </ReactMarkdown>
            </div>

            {additionalQuestion(question.questionId) ? null : (
              <div
                className="flex w-full max-w-max flex-row items-center gap-3 rounded p-3"
                style={{
                  backgroundColor:
                    +(form.getValues("questions")[index]?.rating || 0) > 0
                      ? "#EEF4FF"
                      : "#F2F4F7",
                }}
                {...form.register(`questions.${index}.rating`)}
              >
                <p className="text-base font-bold text-gray-600">Rating</p>
                <DynamicStars
                  totalStars={5}
                  rating={form.getValues("questions")[index]?.rating || 0}
                  setRating={(rating) => {
                    form.setValue(`questions.${index}.rating`, rating || 0);
                  }}
                />
                {+(form.getValues("questions")[index]?.rating || 0) > 0 ? (
                  <p className="text-xl font-semibold text-gray-600 ">
                    {form.getValues("questions")[index]?.rating}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <textarea
              className="w-full rounded-lg border border-zinc-200 px-2 py-1"
              placeholder={MESSAGES.GRANT.REVIEW.FORM.PLACEHOLDERS.ANSWER}
              {...form.register(`questions.${index}.answer`)}
            />
          </div>
        </div>
      ))}
      <div>
        <label
          id="infos.choice"
          className="max-w-2xl text-base font-semibold text-black"
        >
          Would you be interested in reviewing grants across web3 ecosystem?
          Compensation will be provided for your efforts.
        </label>
        <div className="flex flex-row items-center gap-8">
          <label className="flex flex-row items-center gap-2">
            <input
              className="text-base font-normal"
              {...form.register("infos.choice")}
              type="radio"
              value="yes"
            />
            Yes
          </label>
          <label className="flex flex-row items-center gap-2">
            <input
              className="text-base font-normal"
              {...form.register("infos.choice")}
              type="radio"
              value="no"
            />
            No
          </label>
        </div>
      </div>
      {choice === "yes" ? (
        <div className="flex flex-col gap-3">
          <div>
            <label
              id="infos.name"
              className="text-base font-semibold text-black"
            >
              Enter your name
            </label>
            <input
              className="w-full max-w-sm rounded-lg border border-zinc-200 px-2 py-1"
              placeholder="Input your name"
              {...form.register("infos.name")}
            />
          </div>
          <div>
            <label
              id="infos.email"
              className="text-base font-semibold text-black"
            >
              Enter your email address
            </label>
            <input
              className="w-full max-w-sm rounded-lg border border-zinc-200 px-2 py-1"
              placeholder="Input your email"
              {...form.register("infos.email")}
            />
          </div>
          <div>
            <label
              id="infos.categories"
              className="text-base font-semibold text-black"
            >
              Enter your email address
            </label>
          </div>
        </div>
      ) : null}
      <div className="flex w-full flex-row justify-end">
        <Button
          type="submit"
          className="w-max bg-blue-800 text-lg text-white hover:bg-blue-800"
          isLoading={isSaving}
        >
          Submit
        </Button>
      </div>
    </form>
  );
};
