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
import { IProjectUpdate, ProjectUpdate } from "@show-karma/karma-gap-sdk";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
  PlusIcon,
} from "@heroicons/react/24/solid";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { formatDate } from "@/utilities/formatDate";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { cn } from "@/utilities/tailwind";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { AreaChart, Card, Title } from "@tremor/react";
import { prepareChartData } from "@/components/Pages/Communities/Impact/ImpactCharts";
import * as Dialog from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { IndicatorForm, IndicatorFormData } from "./IndicatorForm";
import { getImpactAnswers, sendImpactAnswers } from "@/utilities/impact";
import { autosyncedIndicators } from "../Pages/Admin/IndicatorsHub";
import Link from "next/link";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ExternalLink } from "../Utilities/ExternalLink";

interface GrantOption {
  title: string;
  value: string;
  chain: number;
  communityUID: string;
}

interface OutputData {
  value: string;
  proof: string;
}

interface Output {
  title: string;
  id: string;
  data: OutputData[];
}

interface Deliverable {
  name: string;
  proof: string;
  description: string;
}

// Add this interface to extend IProjectUpdate
interface ExtendedProjectUpdate extends IProjectUpdate {
  outputs: {
    outputId: string;
    value: number;
    proof?: string;
  }[];
}

interface OutputValue {
  outputId: string;
  value: number | string;
  proof?: string;
}

const updateSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MAX }),
  text: z.string().min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TEXT }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  grants: z.array(z.string()),
  outputs: z.array(
    z.object({
      outputId: z.string().min(1, "Output is required"),
      value: z.union([z.number(), z.string()]),
      proof: z.string().optional(),
    })
  ),
  deliverables: z.array(
    z.object({
      name: z.string().min(1, "Name is required"),
      proof: z.string().min(1, "Proof is required"),
      description: z.string().optional(),
    })
  ),
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
  project?: IProjectResponse;
}> = ({ grants, onSelect, selected, className, project }) => {
  // Create a map to track duplicate titles
  const titleCount = grants.reduce((acc, grant) => {
    acc[grant.title] = (acc[grant.title] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SearchWithValueDropdown
      onSelectFunction={(value) => {
        const grant = grants.find((g) => g.value === value);
        if (grant) {
          onSelect(value);
        }
      }}
      selected={selected}
      list={grants.map((grant) => ({
        value: grant.value,
        title:
          titleCount[grant.title] > 1
            ? `${grant.title} (Chain ${grant.chain})`
            : grant.title,
      }))}
      type="grant"
      prefixUnselected="Select"
      buttonClassname={cn("w-full", className)}
      customAddButton={
        <div className="flex w-full h-full">
          <ExternalLink
            href={PAGES.PROJECT.SCREENS.NEW_GRANT(
              project?.details?.data?.slug || project?.uid || ""
            )}
            className="text-sm h-full w-full px-2 py-2 rounded bg-zinc-700 text-white"
          >
            Add Grant
          </ExternalLink>
        </div>
      }
    />
  );
};

const OutputDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPrograms: { programId: string; title: string; chainID: number }[];
  onSuccess: (indicator: ImpactIndicatorWithData) => void;
  onError: () => void;
}> = ({ open, onOpenChange, selectedPrograms, onSuccess, onError }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed z-[10] inset-0 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content
        className="fixed z-[11] left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800"
        onSubmit={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
          }
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <Dialog.Title className="text-lg font-semibold">
            Create New Output
          </Dialog.Title>
          <Dialog.Close className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-5 w-5" />
          </Dialog.Close>
        </div>

        <IndicatorForm
          preSelectedPrograms={selectedPrograms}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

const EmptyDiv: FC = () => <div className="h-5 w-1" />;

const isInvalidValue = (value: number | string, unitOfMeasure: string) => {
  if (value === "") return true;
  const numValue = Number(value);
  if (unitOfMeasure === "int") {
    return !Number.isInteger(numValue);
  }
  return isNaN(numValue);
};

export const ProjectUpdateForm: FC<ProjectUpdateFormProps> = ({
  afterSubmit,
}): JSX.Element => {
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { register, handleSubmit, watch, control, setValue, formState } =
    useForm<UpdateType>({
      resolver: zodResolver(updateSchema),
      reValidateMode: "onChange",
      mode: "onChange",
      defaultValues: {
        deliverables: [],
        outputs: [],
      },
    });
  const { errors, isSubmitting, isValid } = formState;

  const [isLoading, setIsLoading] = useState(false);
  const [grants, setGrants] = useState<GrantOption[]>([]);
  const [outputs, setOutputs] = useState<ImpactIndicatorWithData[]>([]);
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control,
    name: "deliverables",
  });
  const router = useRouter();

  // Custom handlers for deliverables
  const handleAddDeliverable = () => {
    append({ name: "", proof: "", description: "" });
    // Ensure form validation is triggered after state update
    setTimeout(() => {
      setValue("deliverables", watch("deliverables"), { shouldValidate: true });
    }, 0);
  };

  const handleRemoveDeliverable = (index: number) => {
    remove(index);
    // Ensure form validation is triggered after state update
    setTimeout(() => {
      setValue("deliverables", watch("deliverables"), { shouldValidate: true });
    }, 0);
  };

  // Fetch both grants and indicators data in a single effect
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!project) return;

      try {
        // Handle grants data
        const grantOptions = project.grants
          .filter((grant) => grant && typeof grant === "object")
          .map((grant) => ({
            title: grant.details?.data?.title || grant.uid || "Untitled Grant",
            value: grant.uid || "",
            chain: grant.chainID || project.chainID,
            communityUID: grant.community.uid || "",
          }));

        setGrants(grantOptions);

        // Handle indicators data
        if (project.uid || project.details?.data?.slug) {
          const projectIdentifier = project.details?.data?.slug || project.uid;
          const indicators = await getImpactAnswers(projectIdentifier);
          setOutputs(indicators);
        }
      } catch (error) {
        errorManager(
          `Error fetching project data for project ${project?.uid}`,
          error,
          { projectUID: project?.uid }
        );
        console.error("Failed to fetch project data:", error);
      }
    };

    fetchProjectData();
  }, [project?.uid, project?.grants?.length]);

  const { changeStepperStep, setIsStepper } = useStepper();

  const { gap } = useGap();

  const indicatorsList = outputs.map((output) => ({
    indicatorId: output.id,
    name: output.name,
  }));

  const createProjectUpdate = async (data: UpdateType) => {
    let gapClient = gap;
    if (!address || !project) return;

    try {
      if (!project?.chainID || !project.recipient || !project.uid) {
        throw new Error("Required project data is missing");
      }

      const chainId = project.chainID;
      const recipient = project.recipient;
      const projectUid = project.uid;
      const projectSlug = project.details?.data?.slug;

      if (chain?.id !== chainId) {
        await switchChainAsync?.({ chainId });
        gapClient = getGapClient(chainId);
      }

      const { walletClient, error } = await safeGetWalletClient(chainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const schema = gapClient.findSchema("ProjectUpdate");

      if (!schema) {
        throw new Error("ProjectUpdate schema not found");
      }

      const outputsData = data.outputs
        .filter(
          (output) =>
            !autosyncedIndicators.find(
              (indicator) =>
                indicator.name ===
                indicatorsList.find((i) => i.indicatorId === output.outputId)
                  ?.name
            )
        )
        .map((output) => ({
          value: output.value,
          proof: output.proof,
          startDate: data.startDate,
          endDate: data.endDate,
          id: output.outputId,
        }));

      if (outputsData.length > 0) {
        await Promise.all(
          outputsData.map((indicator) =>
            sendImpactAnswers(
              projectUid,
              indicator.id,
              [
                {
                  value: indicator.value,
                  proof: indicator.proof || "",
                  startDate:
                    indicator.startDate?.toISOString() ||
                    new Date().toISOString(),
                  endDate:
                    indicator.endDate?.toISOString() ||
                    new Date().toISOString(),
                },
              ],
              () => {}
            )
          )
        );
      }

      const projectUpdate = new ProjectUpdate({
        data: {
          title: data.title,
          text: data.text,
          startDate: data.startDate ? data.startDate : undefined,
          endDate: data.endDate ? data.endDate : undefined,
          grants: data.grants,
          indicators: data.outputs.map((indicator) => ({
            indicatorId: indicator.outputId,
            name: outputs.find((o) => o.id === indicator.outputId)?.name || "",
          })),
          deliverables: data.deliverables.map((deliverable) => ({
            name: deliverable.name,
            proof: deliverable.proof,
            description: deliverable.description || "",
          })),
          type: "project-update",
        },
        recipient,
        refUID: projectUid,
        schema,
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
                  router.push(PAGES.PROJECT.UPDATES(projectSlug || projectUid));
                  router.refresh();
                }
                retries -= 1;
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
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
          data: {
            title: data.title,
            text: data.text,
            startDate: data.startDate,
            endDate: data.endDate,
            grants: data.grants,
            indicators: indicatorsList.map((indicator) => ({
              indicatorId: indicator.indicatorId,
              name: indicator.name,
            })),
            deliverables: data.deliverables,
          } as IProjectUpdate,
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

  const handleOutputSuccess = (newIndicator: ImpactIndicatorWithData) => {
    setOutputs((prev) => [...prev, newIndicator]);

    // Automatically select the new output
    // const newOutputs = [...selectedOutputs];
    // newOutputs[selectedOutputs.length - 1].title = newIndicator.name;
    // setSelectedOutputs(newOutputs);

    const currentOutputs = watch("outputs") || [];
    setValue(
      "outputs",
      [
        ...currentOutputs,
        {
          outputId: newIndicator.id,
          value: 0,
          proof: "",
        },
      ],
      {
        shouldValidate: true,
      }
    );

    setIsOutputDialogOpen(false);
  };

  const handleOutputError = () => {
    toast.error("Failed to create output");
  };

  const selectedGrantIds = watch("grants") || [];
  const selectedPrograms = selectedGrantIds
    .map((grantId) => {
      const grant = grants.find((g) => g.value === grantId);
      if (!grant) return null;
      return {
        programId: grant.value,
        title: grant.title,
        chainID: grant.chain,
      };
    })
    .filter(
      (
        program
      ): program is { programId: string; title: string; chainID: number } =>
        program !== null && program.programId !== ""
    );

  const selectedOutputs = [...(watch("outputs") || [])];

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
          <InfoTooltip content="Provide a name or title for the activity" />
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
          <InfoTooltip
            content="Describe what you did in more detail, the specific processes
                  or sub-activities"
          />
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
            placeholderText="Conducted user research and published a report, worked with our developers, added new features, etc."
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
                <label className={labelStyle}>
                  Activity Start date (Optional)
                </label>
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
                <label className={labelStyle}>
                  Activity End date (Optional)
                </label>
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

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-row items-center gap-2">
          <label htmlFor="grants" className={labelStyle}>
            Tell us which grants helped you accomplish this activity?
          </label>
          <InfoTooltip content="Select grants that helped you accomplish this activity." />
        </div>
        {grants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-[#155EEF] rounded-lg bg-[#EEF4FF] dark:bg-zinc-900">
            <p className="text-center text-lg font-semibold text-black dark:text-zinc-200">
              No grants available. Create your first grant to get started.
            </p>
            <button
              type="button"
              onClick={() => {
                router.push(
                  PAGES.PROJECT.SCREENS.NEW_GRANT(
                    project?.details?.data?.slug || project?.uid || ""
                  )
                );
                router.refresh();
              }}
              className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 text-base font-semibold text-white bg-[#155EEF] rounded-lg hover:opacity-90"
            >
              <PlusIcon className="w-5 h-5" />
              Create a Grant
            </button>
          </div>
        ) : (
          <GrantSearchDropdown
            grants={grants}
            onSelect={(grantId) => {
              const currentGrants = watch("grants") || [];
              if (currentGrants.includes(grantId)) {
                setValue(
                  "grants",
                  currentGrants.filter((g) => g !== grantId),
                  { shouldValidate: true }
                );
              } else {
                setValue("grants", [...currentGrants, grantId], {
                  shouldValidate: true,
                });
              }
            }}
            selected={watch("grants") || []}
            className="w-full"
            project={project}
          />
        )}
      </div>

      <div className="flex items-center flex-row gap-2">
        <h2 className={cn(labelStyle, "text-xl")}>Outputs</h2>
        <InfoTooltip content="Outputs are the direct result of the activity. Note: Outputs can evolve as the activity progresses, with new ones added or refined to reflect changes. It is up to you to define the key outputs that are worth mentioning to showcase." />
      </div>

      <div
        className={cn(
          "flex w-full flex-col gap-4 p-6 bg-white dark:bg-zinc-800/50 border rounded-md",
          "border-gray-200 dark:border-zinc-700"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={cn(labelStyle)}>Deliverables</h3>
            <InfoTooltip content="Add specific deliverables with proof links and descriptions to showcase the tangible results of your activity." />
          </div>
          {fields.length > 0 && (
            <Button
              type="button"
              onClick={handleAddDeliverable}
              className="text-sm bg-zinc-700 text-white px-3 py-1.5"
            >
              Add more deliverables
            </Button>
          )}
        </div>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 dark:text-zinc-400 mb-4">
              Add your deliverables
            </p>
            <Button
              type="button"
              onClick={handleAddDeliverable}
              className="text-sm bg-zinc-700 text-white px-3 py-1.5"
            >
              Add Deliverable
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Proof/Link
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Description/Comment
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        {...register(`deliverables.${index}.name`, {
                          required: "Name is required",
                        })}
                        placeholder="Enter name"
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                      />
                      {errors.deliverables?.[index]?.name ? (
                        <p className="text-xs text-red-500 h-5">
                          {errors.deliverables[index]?.name?.message}
                        </p>
                      ) : (
                        <EmptyDiv />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        {...register(`deliverables.${index}.proof`, {
                          required: "Proof link is required",
                        })}
                        placeholder="Enter proof URL"
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                      />
                      {errors.deliverables?.[index]?.proof ? (
                        <p className="text-xs text-red-500 h-5">
                          {errors.deliverables[index]?.proof?.message}
                        </p>
                      ) : (
                        <EmptyDiv />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        {...register(`deliverables.${index}.description`)}
                        placeholder="Enter description"
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                      />
                      <EmptyDiv />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          handleRemoveDeliverable(index);
                        }}
                        type="button"
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex w-full flex-col gap-4 p-6 bg-white dark:bg-zinc-800/50 border rounded-md",
          "border-gray-200 dark:border-zinc-700"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={cn(labelStyle)}>Metrics</h3>
            <InfoTooltip content="Represent any tangible deliverables (e.g. product launched, services delivered, key documentation, reports or design files) or metrics (training sessions delivered, user signups, etc...) resulting from activities." />
          </div>
          {selectedOutputs.length > 0 &&
            [...(watch("grants") || [])].length > 0 && (
              <Button
                type="button"
                onClick={() => {
                  setValue("outputs", [
                    ...selectedOutputs,
                    {
                      outputId: "",
                      value: 0,
                      proof: "",
                    },
                  ]);
                }}
                className="text-sm bg-zinc-700 text-white px-3 py-1.5"
              >
                Add more metrics
              </Button>
            )}
        </div>

        {selectedOutputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            {!watch("grants")?.length ? (
              <div className="text-center">
                <p className="text-gray-500 dark:text-zinc-400 mb-2">
                  Please select at least one grant before adding metrics
                </p>
                <p className="text-sm text-gray-400 dark:text-zinc-500">
                  Metrics should be associated with specific grants
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 dark:text-zinc-400 mb-4">
                  Add metrics to your activity
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setValue("outputs", [
                      ...selectedOutputs,
                      {
                        outputId: "",
                        value: 0,
                        proof: "",
                      },
                    ]);
                  }}
                  className="text-sm bg-zinc-700 text-white px-3 py-1.5"
                >
                  Add metric
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Output
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Proof/Link
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {selectedOutputs.map((output, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <SearchWithValueDropdown
                        onSelectFunction={(value) => {
                          const indicator = outputs.find(
                            (ind) => ind.id === value
                          );
                          if (!indicator) return;

                          // Update the form values
                          const newOutputs = [...selectedOutputs];
                          if (
                            !selectedOutputs.find(
                              (o) => o.outputId === indicator.id
                            )
                          ) {
                            newOutputs[index].outputId = indicator.id;
                            setValue("outputs", newOutputs, {
                              shouldValidate: true,
                            });
                            setIsOutputDialogOpen(false);
                          } else {
                            newOutputs[index].outputId = "";
                            setValue("outputs", newOutputs, {
                              shouldValidate: true,
                            });
                          }
                        }}
                        isMultiple={false}
                        selected={
                          output.outputId
                            ? [
                                outputs.find((o) => o.id === output.outputId)
                                  ?.name || "",
                              ]
                            : []
                        }
                        list={outputs.map((indicator) => ({
                          value: indicator.id,
                          title: indicator.name,
                        }))}
                        type="output"
                        prefixUnselected="Select"
                        buttonClassname="w-full"
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
                      {selectedGrantIds.length > 0 && (
                        <OutputDialog
                          open={isOutputDialogOpen}
                          onOpenChange={setIsOutputDialogOpen}
                          selectedPrograms={selectedPrograms}
                          onSuccess={handleOutputSuccess}
                          onError={handleOutputError}
                        />
                      )}
                      <EmptyDiv />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={output.value === 0 ? "" : output.value}
                        onChange={(e) => {
                          const newOutputs = [...selectedOutputs];
                          const indicator = outputs.find(
                            (o) => o.id === output.outputId
                          );
                          const unitType = indicator?.unitOfMeasure || "int";

                          // Allow decimal point and numbers
                          const isValidInput =
                            unitType === "float"
                              ? /^-?\d*\.?\d*$/.test(e.target.value) // Allow decimals for float
                              : /^-?\d*$/.test(e.target.value); // Only integers for int

                          if (isValidInput) {
                            newOutputs[index] = {
                              ...newOutputs[index],
                              value:
                                e.target.value === "" ? "" : e.target.value,
                            };
                            setValue("outputs", newOutputs, {
                              shouldValidate: true,
                            });
                          }
                        }}
                        placeholder={`Enter ${
                          outputs.find((o) => o.id === output.outputId)
                            ?.unitOfMeasure === "float"
                            ? "decimal"
                            : "whole"
                        } number`}
                        disabled={
                          !!autosyncedIndicators.find(
                            (indicator) =>
                              indicator.name ===
                              indicatorsList.find(
                                (i) => i.indicatorId === output.outputId
                              )?.name
                          )
                        }
                        className={cn(
                          "w-full px-3 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border rounded-md",
                          output.outputId &&
                            isInvalidValue(
                              output.value,
                              outputs.find((o) => o.id === output.outputId)
                                ?.unitOfMeasure || "int"
                            )
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300 dark:border-zinc-700"
                        )}
                      />
                      {output.outputId &&
                      isInvalidValue(
                        output.value,
                        outputs.find((o) => o.id === output.outputId)
                          ?.unitOfMeasure || "int"
                      ) ? (
                        <p className="text-xs text-red-500 mt-1">
                          {typeof output.value === "string" &&
                          output.value === ""
                            ? "This field is required"
                            : outputs.find((o) => o.id === output.outputId)
                                ?.unitOfMeasure === "int"
                            ? "Please enter a whole number"
                            : "Please enter a valid decimal number"}
                        </p>
                      ) : (
                        <EmptyDiv />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={output.proof || ""}
                        onChange={(e) => {
                          const newOutputs = [...selectedOutputs];
                          newOutputs[index].proof = e.target.value;
                          setValue("outputs", newOutputs, {
                            shouldValidate: true,
                          });
                        }}
                        placeholder="Enter proof URL"
                        disabled={
                          !!autosyncedIndicators.find(
                            (indicator) =>
                              indicator.name ===
                              indicatorsList.find(
                                (i) => i.indicatorId === output.outputId
                              )?.name
                          )
                        }
                        className="w-full px-3 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                      />
                      <EmptyDiv />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          const newOutputs = selectedOutputs.filter(
                            (_, i) => i !== index
                          );
                          setValue("outputs", newOutputs, {
                            shouldValidate: true,
                          });
                        }}
                        type="button"
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
