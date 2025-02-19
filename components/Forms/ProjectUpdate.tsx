/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { config } from "@/utilities/wagmi/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectUpdate } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  InformationCircleIcon,
  CalendarIcon,
  TrashIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { formatDate } from "@/utilities/formatDate";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { cn } from "@/utilities/tailwind";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { AreaChart, Card, Title } from "@tremor/react";
import { prepareChartData } from "@/components/Pages/Communities/Impact/ImpactCharts";
import * as Dialog from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface GrantOption {
  title: string;
  value: string;
  chain: number;
}

interface OutputData {
  value: string;
  proof: string;
}

interface Output {
  title: string;
  data: OutputData[];
}

const updateSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MAX }),
  text: z.string().min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TEXT }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  grants: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

type UpdateType = z.infer<typeof updateSchema>;

interface ProjectUpdateFormProps {
  afterSubmit?: () => void;
}

const GrantSearchDropdown: FC<{
  grants: GrantOption[];
  onSelect: (grantId: string) => void;
  selected: string[];
  className?: string;
}> = ({ grants, onSelect, selected, className }) => {
  // Create a map of grants by title to handle duplicates
  const grantsByTitle = grants.reduce((acc, grant) => {
    const key = grant.title;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(grant);
    return acc;
  }, {} as Record<string, GrantOption[]>);

  // Create display titles for grants, adding chain info for duplicates
  const displayTitles = grants.map((grant) => {
    const grantsWithSameTitle = grantsByTitle[grant.title];
    if (grantsWithSameTitle.length > 1) {
      return `${grant.title} (Chain ${grant.chain})`;
    }
    return grant.title;
  });

  // Map between display titles and actual grants
  const grantByDisplayTitle = Object.fromEntries(
    grants.map((grant, index) => [displayTitles[index], grant])
  );

  return (
    <SearchDropdown
      onSelectFunction={(displayTitle) => {
        const grant = grantByDisplayTitle[displayTitle];
        if (grant) {
          onSelect(grant.value);
        }
      }}
      selected={selected.map((grantId) => {
        const grant = grants.find((g) => g.value === grantId);
        if (!grant) return grantId;
        const grantsWithSameTitle = grantsByTitle[grant.title];
        if (grantsWithSameTitle.length > 1) {
          return `${grant.title} (Chain ${grant.chain})`;
        }
        return grant.title;
      })}
      list={displayTitles}
      type="grant"
      prefixUnselected="Select"
      buttonClassname={cn("w-full", className)}
      canSearch
    />
  );
};

const OutputCard: FC<{
  output: Output;
  onDelete: (title: string) => void;
  onUpdateData: (data: OutputData[]) => void;
}> = ({ output, onDelete, onUpdateData }) => {
  return (
    <div className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-md shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
          {output.title}
        </h3>
        <button
          onClick={() => onDelete(output.title)}
          className="text-red-500 hover:text-red-700"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Proof
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              <tr>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={output.data[0]?.value || ""}
                    onChange={(e) => {
                      const newData = [...output.data];
                      if (!newData[0]) newData[0] = { value: "", proof: "" };
                      newData[0].value = e.target.value;
                      onUpdateData(newData);
                    }}
                    placeholder="Enter value"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={output.data[0]?.proof || ""}
                    onChange={(e) => {
                      const newData = [...output.data];
                      if (!newData[0]) newData[0] = { value: "", proof: "" };
                      newData[0].proof = e.target.value;
                      onUpdateData(newData);
                    }}
                    placeholder="Enter proof URL or description"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const OUTPUT_TYPES = ["float", "int"] as const;
type OutputType = (typeof OUTPUT_TYPES)[number];

const outputSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name must be less than 50 characters" }),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be less than 500 characters" }),
  type: z.enum(OUTPUT_TYPES),
});

type OutputFormData = z.infer<typeof outputSchema>;

const OutputDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OutputFormData) => void;
}> = ({ open, onOpenChange, onSubmit }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OutputFormData>({
    resolver: zodResolver(outputSchema),
  });

  const handleFormSubmit = (data: OutputFormData) => {
    onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Create New Output
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(handleFormSubmit)(e);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                {...register("name")}
                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                placeholder="Enter output name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                {...register("description")}
                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                placeholder="Enter output description"
                rows={2}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                {...register("type")}
                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              >
                {OUTPUT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Create Output
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const ProjectUpdateForm: FC<ProjectUpdateFormProps> = ({
  afterSubmit,
}): JSX.Element => {
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<UpdateType>({
    resolver: zodResolver(updateSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [grants, setGrants] = useState<GrantOption[]>([]);
  const [outputs, setOutputs] = useState<string[]>(["Output 1", "Output 2"]);
  const [selectedOutputs, setSelectedOutputs] = useState<Output[]>([]);
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);

  useEffect(() => {
    if (project?.grants) {
      const grantOptions = project.grants
        .filter((grant) => grant && typeof grant === "object")
        .map((grant) => {
          return {
            title: grant.details?.data?.title || grant.uid || "Untitled Grant",
            value: grant.uid || "",
            chain: grant.chainID || project.chainID,
          };
        });

      setGrants(grantOptions);
    }
  }, [project]);

  const { changeStepperStep, setIsStepper } = useStepper();

  const { gap } = useGap();
  const router = useRouter();

  const createProjectUpdate = async ({
    title,
    text,
    startDate,
    endDate,
    grants,
    outputs,
  }: UpdateType) => {
    let gapClient = gap;
    if (!address || !project) return;
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const projectUpdate = new ProjectUpdate({
        data: sanitizeObject({
          text,
          title,
          startDate,
          endDate,
          grants,
          outputs,
          type: "project-activity",
        }),
        recipient: project.recipient,
        refUID: project.uid,
        schema: gapClient.findSchema("ProjectUpdate"),
      });

      await projectUpdate
        .attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, projectUpdate.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const attestUID = projectUpdate.uid;
                const alreadyExists = fetchedProject?.updates.find(
                  (g) => g.uid === attestUID
                );

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_UPDATE_FORM.SUCCESS);
                  afterSubmit?.();
                  router.push(
                    PAGES.PROJECT.UPDATES(
                      project?.details?.data.slug || project.uid
                    )
                  );
                  router.refresh();
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
        });
    } catch (error) {
      errorManager(
        `Error of user ${address} creating project activity for project ${project?.uid}`,
        error,
        {
          projectUID: project?.uid,
          address: address,
          data: { title, text, startDate, endDate, grants, outputs },
        }
      );
      console.log(error);
      toast.error(MESSAGES.PROJECT_UPDATE_FORM.ERROR);
    } finally {
      setIsStepper(false);
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<UpdateType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    await createProjectUpdate(data);
  };

  const handleOutputSubmit = (data: OutputFormData) => {
    const newOutputName = data.name;

    // Add to outputs list for dropdown
    setOutputs((prev) => [...prev, newOutputName]);

    // Automatically select the new output
    const currentOutputs = watch("outputs") || [];
    setValue("outputs", [...currentOutputs, newOutputName], {
      shouldValidate: true,
    });

    setSelectedOutputs((prev) => [
      ...prev,
      {
        title: newOutputName,
        data: [{ value: "", proof: "" }],
      },
    ]);
  };

  console.log("grants", grants);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
    >
      <div className="flex w-full flex-col">
        <div className="flex items-center gap-2">
          <label htmlFor="update-title" className={labelStyle}>
            Activity Name *
          </label>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <InformationCircleIcon className="h-4 w-4 text-gray-500" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="max-w-xs rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300"
                  sideOffset={5}
                >
                  Provide a name or title for the activity
                  <Tooltip.Arrow className="fill-white dark:fill-zinc-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        <input
          id="update-title"
          className={inputStyle}
          placeholder="Ex: Launched a feature to onboard users"
          {...register("title")}
        />
        <p className="text-base text-red-400">{errors.title?.message}</p>
      </div>

      <div className="flex w-full gap-2 flex-col">
        <div className="flex items-center gap-2">
          <label htmlFor="update-description" className={labelStyle}>
            Description *
          </label>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <InformationCircleIcon className="h-4 w-4 text-gray-500" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="max-w-xs rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300"
                  sideOffset={5}
                >
                  Describe what you did in more detail, the specific processes
                  or sub-activities
                  <Tooltip.Arrow className="fill-white dark:fill-zinc-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        <div className="w-full bg-transparent" data-color-mode="light">
          <MarkdownEditor
            className="bg-white"
            value={watch("text")}
            onChange={(newValue: string) =>
              setValue("text", newValue, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              })
            }
            placeholderText="To share updates on the progress of this project, please add the details here."
          />
        </div>
      </div>

      <div className="flex w-full flex-row items-center justify-between gap-4">
        <div className="flex w-full flex-row justify-between gap-4">
          <Controller
            name="startDate"
            control={control}
            render={({ field, formState }) => (
              <div className="flex w-full flex-col gap-2">
                <label className={labelStyle}>Start date (Optional)</label>
                <div>
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button className="w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md border border-gray-200">
                        {field.value ? (
                          formatDate(field.value)
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content className="z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                        <DayPicker
                          mode="single"
                          selected={field.value}
                          onDayClick={(e) => {
                            setValue("startDate", e, {
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
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
                <p className="text-base text-red-400">
                  {formState.errors.startDate?.message}
                </p>
              </div>
            )}
          />

          <Controller
            name="endDate"
            control={control}
            render={({ field, formState }) => (
              <div className="flex w-full flex-col gap-2">
                <label className={labelStyle}>End date (Optional)</label>
                <div>
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button className="w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md border border-gray-200">
                        {field.value ? (
                          formatDate(field.value)
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content className="z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                        <DayPicker
                          mode="single"
                          selected={field.value}
                          onDayClick={(e) => {
                            setValue("endDate", e, {
                              shouldValidate: true,
                            });
                            field.onChange(e);
                          }}
                          disabled={(date) => {
                            if (date < new Date("2000-01-01")) return true;
                            const startDate = watch("startDate");
                            if (startDate && date < startDate) return true;
                            return false;
                          }}
                          initialFocus
                        />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
                <p className="text-base text-red-400">
                  {formState.errors.endDate?.message}
                </p>
              </div>
            )}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <label className={labelStyle}>
          Tell us which grants helped you accomplish this activity?
        </label>
        <SearchDropdown
          onSelectFunction={(displayTitle) => {
            // Find grant by display title (which may include chain info)
            const grant = grants.find((g) => {
              const hasMultipleWithSameTitle =
                grants.filter((otherGrant) => otherGrant.title === g.title)
                  .length > 1;

              return hasMultipleWithSameTitle
                ? `${g.title} (Chain ${g.chain})` === displayTitle
                : g.title === displayTitle;
            });

            if (grant) {
              const currentGrants = watch("grants") || [];
              // Check if grant is already selected
              const grantIndex = currentGrants.indexOf(grant.value);

              if (grantIndex !== -1) {
                // Remove grant if already selected
                setValue(
                  "grants",
                  currentGrants.filter((_, index) => index !== grantIndex),
                  { shouldValidate: true }
                );
              } else {
                // Add grant if not selected
                setValue("grants", [...currentGrants, grant.value], {
                  shouldValidate: true,
                });
              }
            }
          }}
          selected={(watch("grants") || []).map((grantId) => {
            const grant = grants.find((g) => g.value === grantId);
            if (!grant) return grantId;

            const hasMultipleWithSameTitle =
              grants.filter((otherGrant) => otherGrant.title === grant.title)
                .length > 1;

            return hasMultipleWithSameTitle
              ? `${grant.title} (Chain ${grant.chain})`
              : grant.title;
          })}
          list={grants.map((grant) => {
            const hasMultipleWithSameTitle =
              grants.filter((otherGrant) => otherGrant.title === grant.title)
                .length > 1;

            return hasMultipleWithSameTitle
              ? `${grant.title} (Chain ${chainNameDictionary(grant.chain)})`
              : grant.title;
          })}
          type="grant"
          prefixUnselected="Select"
          buttonClassname="w-full max-w-[300px]"
          canSearch
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className={labelStyle}>
              Add key outputs from the activity
            </label>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <InformationCircleIcon className="h-4 w-4 text-gray-500" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="max-w-xs rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300"
                    sideOffset={5}
                  >
                    Represent any tangible deliverables or metrics resulting
                    from activities.
                    <Tooltip.Arrow className="fill-white dark:fill-zinc-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </div>

        <SearchDropdown
          onSelectFunction={(value) => {
            const currentOutputs = watch("outputs") || [];
            const outputIndex = currentOutputs.indexOf(value);

            if (outputIndex !== -1) {
              // Remove output if already selected
              setValue(
                "outputs",
                currentOutputs.filter((_, index) => index !== outputIndex),
                { shouldValidate: true }
              );
              setSelectedOutputs((prev) =>
                prev.filter((output) => output.title !== value)
              );
            } else {
              // Add output if not selected
              setValue("outputs", [...currentOutputs, value], {
                shouldValidate: true,
              });
              setSelectedOutputs((prev) => [
                ...prev,
                {
                  title: value,
                  data: [{ value: "", proof: "" }],
                },
              ]);
            }
          }}
          selected={watch("outputs") || []}
          list={outputs}
          type="output"
          prefixUnselected="Select"
          buttonClassname="w-full"
          canSearch
          canAdd
          customAddButton={
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOutputDialogOpen(true);
              }}
              className="text-sm w-full bg-zinc-700 text-white"
            >
              Add new output
            </Button>
          }
        />

        {/* Output Cards */}
        <div className="mt-4 space-y-4">
          {selectedOutputs.map((output, outputIndex) => (
            <OutputCard
              key={output.title}
              output={output}
              onDelete={(title) => {
                const currentOutputs = watch("outputs") || [];
                setValue(
                  "outputs",
                  currentOutputs.filter((t) => t !== title),
                  { shouldValidate: true }
                );
                setSelectedOutputs((prev) =>
                  prev.filter((o) => o.title !== title)
                );
              }}
              onUpdateData={(newData) => {
                const newOutputs = [...selectedOutputs];
                newOutputs[outputIndex].data = newData;
                setSelectedOutputs(newOutputs);
              }}
            />
          ))}
        </div>
      </div>

      <OutputDialog
        open={isOutputDialogOpen}
        onOpenChange={setIsOutputDialogOpen}
        onSubmit={handleOutputSubmit}
      />

      <div className="flex w-full flex-row-reverse">
        <Button
          type="submit"
          className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
          disabled={isSubmitting || !isValid}
          isLoading={isSubmitting || isLoading}
        >
          Post activity
        </Button>
      </div>
    </form>
  );
};
