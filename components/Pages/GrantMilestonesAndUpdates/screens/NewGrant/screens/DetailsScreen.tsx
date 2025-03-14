import React, { useEffect } from "react";
import { StepBlock } from "../StepBlock";
import { Button } from "@/components/Utilities/Button";
import { useGrantFormStore } from "../store";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Popover } from "@headlessui/react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { DayPicker } from "react-day-picker";
import { formatDate } from "@/utilities/formatDate";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { isAddress } from "viem";
import { MESSAGES } from "@/utilities/messages";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:text-zinc-100 dark:border-gray-600 disabled:bg-gray-100 disabled:text-gray-400";

const defaultFundUsage = `| Budget Item    | % of Allocated funding |
| -------- | ------- |
| Item 1  | X%   |
| Item 2 | Y%     |
| Item 3 | Z%     |`;

// Define base schema for both flows
const baseSchema = z.object({
  startDate: z.date({
    required_error: MESSAGES.GRANT.FORM.DATE,
  }),
  description: z.string().min(1, { message: "Description is required" }),
});

// Define additional fields for grant flow
const grantSchema = baseSchema.extend({
  amount: z.string().optional(),
  fundUsage: z.string().optional(),
  linkToProposal: z
    .string()
    .url({
      message: MESSAGES.GRANT.FORM.LINK_TO_PROPOSAL,
    })
    .or(z.literal("")),
  proofOfWorkGrantUpdate: z
    .string()
    .refine((value) => !value || urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  recipient: z
    .string()
    .optional()
    .refine(
      (input) => !input || input?.length === 0 || isAddress(input),
      MESSAGES.GRANT.FORM.RECIPIENT
    ),
});

// Define types based on schemas
type BaseFormType = z.infer<typeof baseSchema>;
type GrantFormType = z.infer<typeof grantSchema>;

export const DetailsScreen: React.FC = () => {
  const { setCurrentStep, flowType, formData, updateFormData } =
    useGrantFormStore();
  const selectedProject = useProjectStore((state) => state.project);
  const router = useRouter();

  // Initialize the appropriate form based on flow type
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
    control,
  } = useForm<GrantFormType>({
    resolver: zodResolver(flowType === "grant" ? grantSchema : baseSchema),
    defaultValues: {
      startDate: formData.startDate,
      description: formData.description || "",
      amount: formData.amount || "",
      fundUsage: formData.fundUsage || defaultFundUsage,
      linkToProposal: formData.linkToProposal || "",
      proofOfWorkGrantUpdate: formData.proofOfWorkGrantUpdate || "",
      recipient: formData.recipient || selectedProject?.recipient || "",
    },
    mode: "onChange",
  });

  // Watch the description field
  const description = watch("description");

  const handleNext = () => {
    if (!isValid) return;

    // Create a base update object
    const updateObj: Partial<typeof formData> = {
      description: watch("description"),
      startDate: watch("startDate"),
    };

    // Add grant-specific fields if in grant flow
    if (flowType === "grant") {
      updateObj.amount = watch("amount");
      updateObj.fundUsage = watch("fundUsage");
      updateObj.linkToProposal = watch("linkToProposal");
      updateObj.proofOfWorkGrantUpdate = watch("proofOfWorkGrantUpdate");
      updateObj.recipient = watch("recipient");
    }

    // Ensure we have a title
    if (!formData.title) {
      updateObj.title =
        flowType === "grant" ? "My Grant" : "My Funding Program";
    }

    // Update form data and proceed to next step
    updateFormData(updateObj);
    setCurrentStep(4);
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  const handleCancel = () => {
    if (!selectedProject) return;
    router.push(
      PAGES.PROJECT.GRANTS(
        selectedProject.details?.data?.slug || selectedProject?.uid
      )
    );
  };

  return (
    <StepBlock currentStep={3} totalSteps={4} flowType={flowType}>
      <div className="flex flex-col w-full max-w-3xl mx-auto">
        <h3 className="text-xl font-semibold mb-6 text-center">
          Tell us about your{" "}
          {flowType === "grant" ? "grant" : "funding program"}
        </h3>

        <form
          className="w-full mb-8 space-y-6"
          onSubmit={handleSubmit(handleNext)}
        >
          {/* Start Date - Required for both flows */}
          <div className="flex w-full flex-col">
            <label className={labelStyle}>Start Date *</label>
            <div className="mt-2">
              <Popover className="relative">
                <Popover.Button className="max-lg:w-full w-max text-base flex-row flex gap-2 items-center bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-md">
                  {watch("startDate") ? (
                    formatDate(watch("startDate"))
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Popover.Button>
                <Popover.Panel className="absolute z-10 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                  <DayPicker
                    mode="single"
                    selected={watch("startDate")}
                    onDayClick={(day) => {
                      setValue("startDate", day, { shouldValidate: true });
                      trigger();
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
            {errors.startDate && (
              <p className="text-red-500 text-sm mt-1">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* Description - Required for both flows */}
          <div className="flex w-full flex-col">
            <label htmlFor="grant-description" className={labelStyle}>
              Description *
            </label>
            <div className="mt-2 w-full bg-transparent dark:border-gray-600">
              <MarkdownEditor
                className="bg-transparent dark:border-gray-600"
                value={description || ""}
                onChange={(newValue: string) => {
                  setValue("description", newValue || "", {
                    shouldValidate: true,
                  });
                  trigger("description");
                }}
                placeholderText={`Add a brief description about this ${
                  flowType === "grant" ? "grant" : "funding program"
                }`}
              />
            </div>
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Fields only for grant flow */}
          {flowType === "grant" && (
            <>
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
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.amount?.message}
                  </p>
                )}
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
                {errors.linkToProposal && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.linkToProposal?.message}
                  </p>
                )}
              </div>

              <div className="flex w-full flex-col">
                <label
                  htmlFor="grant-proofOfWorkGrantUpdate"
                  className={labelStyle}
                >
                  Proof of Work Grant Update URL (optional)
                </label>
                <input
                  id="grant-proofOfWorkGrantUpdate"
                  className={inputStyle}
                  {...register("proofOfWorkGrantUpdate")}
                />
                {errors.proofOfWorkGrantUpdate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.proofOfWorkGrantUpdate?.message}
                  </p>
                )}
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
                {errors.fundUsage && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.fundUsage?.message}
                  </p>
                )}
              </div>
            </>
          )}
        </form>

        <div className="flex justify-between w-full">
          <div>
            <Button
              onClick={handleCancel}
              className="border dark:border-blue-300 dark:text-blue-400 border-blue-500 bg-transparent text-base px-6 font-bold text-blue-800 hover:bg-transparent hover:opacity-75"
            >
              Cancel
            </Button>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleBack}
              className="border dark:border-blue-300 dark:text-blue-400 border-blue-500 bg-transparent text-base px-6 font-bold text-blue-800 hover:bg-transparent hover:opacity-75"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit(handleNext)}
              className="flex items-center justify-start gap-3 rounded bg-blue-500 dark:bg-blue-900 px-6 text-base font-bold text-white hover:bg-blue-500 hover:opacity-75"
              disabled={!isValid}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </StepBlock>
  );
};
