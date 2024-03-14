/* eslint-disable react/no-unstable-nested-components */
import { zodResolver } from "@hookform/resolvers/zod";
import type { Grant } from "@show-karma/karma-gap-sdk";
import { type FC, useState, Fragment } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Question } from "@/types";
import { ReviewerInfo } from "@/types/reviewer";
import { useAccount } from "wagmi";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { DynamicStars } from "@/components/Utilities/DynamicStars";
import { Button } from "@/components/Utilities/Button";
import { CheckIcon } from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { MESSAGES } from "@/utilities/messages";
import { additionalQuestion } from "@/utilities/tabs";
import { INDEXER } from "@/utilities/indexer";
import { cn } from "@/utilities/tailwind";

interface ReviewFormProps {
  grant: Grant;
  allQuestions: Question[];
  alreadyReviewed: boolean;
  reviewerInfo: ReviewerInfo;
}

const possibleCategories = [
  "Community Growth",
  "ZK Tech",
  "DeFi protocols",
  "NFT projects",
  "DAO Tools",
  "L2 Tech",
];

const ErrorMessage = ({ message }: { message?: string }) => (
  <p className="text-red-600 text-sm">{message}</p>
);

const FormSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      rating: z.number().min(1, { message: MESSAGES.GRANT.REVIEW.FORM.RATING }),
      answer: z.string().optional(),
      questionId: z.string(),
    })
  ),
  infos: z
    .object({
      choice: z.enum(["yes", "no"], {
        required_error: "You need to answer this.",
        invalid_type_error: "You need to answer this.",
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
      (question) => !additionalQuestion(question.questionId, question?.query)
    ),
    ...allQuestions.filter((question) =>
      additionalQuestion(question.questionId, question?.query)
    ),
  ];
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      questions: orderedQuestions.map((question) => {
        if (additionalQuestion(question.questionId, question?.query)) {
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
      const mountAnswers = dataQuestions.map((item: any) => {
        if (
          additionalQuestion(
            allQuestions.find((question) => question.id === item.id)
              ?.questionId,
            allQuestions.find((question) => question.id === item.id)?.query
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
  const categories = watch("infos.categories");

  return alreadyReviewed || hasSubmitted ? (
    <div className="flex w-full max-w-max flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <p className="text-base text-black dark:text-zinc-100">
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
              className="max-w-2xl text-base font-semibold text-black dark:text-zinc-100"
            >
              <MarkdownPreview
                className="text-base font-semibold text-black dark:text-zinc-100"
                components={{
                  strong: ({ children, ...props }) => {
                    return <ExternalLink {...props}>{children}</ExternalLink>;
                  },
                  a: ({ children, ...props }) => {
                    return <ExternalLink {...props}>{children}</ExternalLink>;
                  },
                }}
                source={question.query}
              />
            </div>

            {additionalQuestion(question.questionId, question?.query) ? null : (
              <div className="flex flex-col gap-2 p-3 max-lg:p-0">
                <div
                  className="flex w-full max-w-max flex-row items-center gap-3 rounded dark:bg-transparent px-2.5 py-3"
                  style={{
                    backgroundColor: "rgb(242, 244, 247)",
                  }}
                  {...form.register(`questions.${index}.rating`)}
                >
                  <p className="text-base font-bold text-gray-600 dark:text-zinc-100">
                    Rating *
                  </p>
                  <DynamicStars
                    totalStars={5}
                    rating={form.watch("questions")[index]?.rating || 0}
                    setRating={(rating) => {
                      form.setValue(`questions.${index}.rating`, rating || 0);
                    }}
                  />
                  {+(form.getValues("questions")[index]?.rating || 0) > 0 ? (
                    <p className="text-xl font-semibold text-gray-600 dark:text-zinc-100">
                      {form.getValues("questions")[index]?.rating}
                    </p>
                  ) : null}
                </div>
                <ErrorMessage
                  message={
                    form.formState.errors?.questions?.[index]?.rating?.message
                  }
                />
              </div>
            )}
          </div>

          <div>
            <textarea
              className="w-full rounded-lg border border-zinc-200 px-2 py-1 dark:bg-zinc-800 dark:text-white dark:border-zinc-600"
              placeholder={MESSAGES.GRANT.REVIEW.FORM.PLACEHOLDERS.ANSWER}
              {...form.register(`questions.${index}.answer`)}
            />
            <ErrorMessage
              message={
                form.formState.errors?.questions?.[index]?.answer?.message
              }
            />
          </div>
        </div>
      ))}
      <div className="mt-8">
        <label
          id="infos.choice"
          className="max-w-2xl text-base font-semibold text-black dark:text-zinc-100"
        >
          Would you be interested in reviewing grants across web3 ecosystem?
          Compensation will be provided for your efforts. *
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
        <ErrorMessage message={form.formState.errors?.infos?.choice?.message} />
      </div>
      {choice === "yes" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label
              id="infos.name"
              className="text-base font-semibold text-black dark:text-zinc-100"
            >
              Enter your name *
            </label>
            <input
              className="w-full max-w-sm rounded-lg border border-zinc-200 px-2 py-1 dark:bg-zinc-800 dark:text-white dark:border-zinc-600"
              placeholder="Input your name"
              {...form.register("infos.name")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              id="infos.email"
              className="text-base font-semibold text-black dark:text-zinc-100"
            >
              Enter your email address *
            </label>
            <input
              className="w-full max-w-sm rounded-lg border border-zinc-200 px-2 py-1 dark:bg-zinc-800 dark:text-white dark:border-zinc-600"
              placeholder="Input your email"
              {...form.register("infos.email")}
            />
          </div>
          <Controller
            control={form.control}
            name="infos.categories"
            render={({ field: { onChange } }) => (
              <Listbox
                value={categories}
                onChange={(value) => {
                  onChange(value);
                }}
                multiple
              >
                {({ open }) => (
                  <div className="flex flex-col items-start gap-2">
                    <Listbox.Label className="text-base font-semibold text-black dark:text-zinc-100">
                      What type of grants would you like to review? Choose all
                      that apply *
                    </Listbox.Label>
                    <div className="relative flex-1 w-56">
                      <Listbox.Button className="relative w-full dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900  ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                        {categories && categories.length > 0 ? (
                          <p className="flex flex-row gap-1">
                            {categories?.length}
                            <span>
                              {pluralize("category", categories?.length)}{" "}
                              selected
                            </span>
                          </p>
                        ) : (
                          <p>Categories</p>
                        )}
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </span>
                      </Listbox.Button>

                      <Transition
                        show={open}
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base  ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {possibleCategories?.map((category) => (
                            <Listbox.Option
                              key={category}
                              className={({ active }) =>
                                cn(
                                  active
                                    ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                    : "text-gray-900 dark:text-gray-200 ",
                                  "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                                )
                              }
                              value={category}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={cn(
                                      selected
                                        ? "font-semibold"
                                        : "font-normal",
                                      "block truncate"
                                    )}
                                  >
                                    {category}
                                  </span>

                                  {selected ? (
                                    <span
                                      className={cn(
                                        "text-primary-600 dark:text-primary-400",
                                        "absolute inset-y-0 right-0 flex items-center pr-4"
                                      )}
                                    >
                                      <CheckIcon
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </div>
                )}
              </Listbox>
            )}
          />
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
