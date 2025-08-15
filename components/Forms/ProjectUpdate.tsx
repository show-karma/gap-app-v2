import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useImpactAnswers } from "@/hooks/useImpactAnswers";
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
import { useRouter, useSearchParams } from "next/navigation";
import type { FC } from "react";
import { useState, useEffect, useMemo } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  InformationCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { formatDate } from "@/utilities/formatDate";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { cn } from "@/utilities/tailwind";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { AreaChart, Card, Title } from "@tremor/react";
import { prepareChartData } from "@/components/Pages/Communities/Impact/ImpactCharts";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { sendImpactAnswers } from "@/utilities/impact";
import { autosyncedIndicators } from "@/components/Pages/Admin/IndicatorsHub";
import Link from "next/link";
import {
  IProjectResponse,
  ICommunityResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ExternalLink } from "../Utilities/ExternalLink";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIndicatorsByCommunity } from "@/utilities/queries/getIndicatorsByCommunity";
import { useUnlinkedIndicators } from "@/hooks/useUnlinkedIndicators";
import { useWallet } from "@/hooks/useWallet";
import { OutputsSection, type CategorizedIndicator } from "./Outputs";

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

interface CommunityIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  communityId: string;
  communityName?: string;
}


const updateSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MIN })
    .max(75, { message: MESSAGES.PROJECT_UPDATE_FORM.TITLE.MAX }),
  text: z.string().min(3, { message: MESSAGES.PROJECT_UPDATE_FORM.TEXT }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  grants: z.array(z.string()).optional(),
  outputs: z.array(
    z.object({
      outputId: z.string().min(1, "Output is required"),
      value: z.union([z.number().min(0), z.string()]),
      proof: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
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
  editId?: string;
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
    <div className="space-y-2">
      <select
        value={selected[0] || ""}
        onChange={(e) => {
          const grant = grants.find((g) => g.value === e.target.value);
          if (grant) {
            onSelect(e.target.value);
          }
        }}
        className={cn("w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white", className)}
      >
        <option value="">Select</option>
        {grants.map((grant) => (
          <option key={grant.value} value={grant.value}>
            {titleCount[grant.title] > 1
              ? `${grant.title} (Chain ${grant.chain})`
              : grant.title}
          </option>
        ))}
      </select>
      <div className="flex w-full h-full">
        <ExternalLink
          href={PAGES.PROJECT.SCREENS.NEW_GRANT(
            project?.details?.data?.slug || project?.uid || ""
          )}
          className="text-sm h-full w-full px-2 py-2 rounded bg-zinc-700 text-white text-center"
        >
          Add Grant
        </ExternalLink>
      </div>
    </div>
  );
};



const getFormErrorMessage = (errors: any, formValues: any) => {
  const errorMessages = [];

  // Check for validation errors first
  if (errors.title?.message) {
    errorMessages.push(errors.title.message);
  } else if (!formValues.title) {
    errorMessages.push("Title is required");
  }

  if (errors.text?.message) {
    errorMessages.push("Description is required");
  } else if (!formValues.text) {
    errorMessages.push("Description is required");
  }

  // Check outputs
  if (errors.outputs?.message) {
    errorMessages.push("Please check your metrics values");
  } else if (formValues.outputs?.length > 0) {
    const hasEmptyOutputs = formValues.outputs.some(
      (output: any) =>
        !output.outputId || output.value === "" || output.value === 0
    );
    if (hasEmptyOutputs) {
      errorMessages.push("Please fill in all metric values");
    }
  }

  // Check deliverables
  if (errors.deliverables) {
    const hasDeliverableErrors = errors.deliverables.some(
      (d: any) => d?.name || d?.proof
    );
    if (hasDeliverableErrors) {
      errorMessages.push("Please fill in all required deliverable fields");
    }
  } else if (formValues.deliverables?.length > 0) {
    const hasEmptyDeliverables = formValues.deliverables.some(
      (deliverable: any) => !deliverable.name || !deliverable.proof
    );
    if (hasEmptyDeliverables) {
      errorMessages.push("Name and proof are required for all deliverables");
    }
  }

  return errorMessages;
};

export const ProjectUpdateForm: FC<ProjectUpdateFormProps> = ({
  afterSubmit,
  editId: propEditId,
}) => {
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = propEditId || searchParams.get("editId");
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState,
    reset,
    setError,
  } = useForm<UpdateType>({
    resolver: zodResolver(updateSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    criteriaMode: "all",
    defaultValues: {
      deliverables: [],
      outputs: [],
      grants: [],
    },
  });
  const { errors, isSubmitting, isValid } = formState;
  const [isLoading, setIsLoading] = useState(false);
  const [grants, setGrants] = useState<GrantOption[]>([]);
  const [outputs, setOutputs] = useState<ImpactIndicatorWithData[]>([]);
  const [selectedToCreate, setSelectedToCreate] = useState<number | undefined>(
    undefined
  );

  const { data: indicatorsData } = useImpactAnswers({
    projectIdentifier: project?.uid,
  });

  // Get communities from selected grants
  const watchedGrantIds = watch("grants") || [];
  const selectedCommunities = useMemo(() => {
    const communities = new Map<string, { uid: string; name: string }>();

    watchedGrantIds.forEach((grantId) => {
      const grant = grants.find((g) => g.value === grantId);
      if (grant && grant.communityUID) {
        // Get community name from project grants
        const projectGrant = project?.grants?.find((g) => g.uid === grantId);
        const communityName =
          projectGrant?.community?.details?.data?.name || "Unknown Community";
        communities.set(grant.communityUID, {
          uid: grant.communityUID,
          name: communityName,
        });
      }
    });
    return Array.from(communities.values());
  }, [watchedGrantIds, grants, project?.grants]);

  // Fetch community indicators for all selected communities
  const communityIndicatorQueries = selectedCommunities.map((community) => ({
    queryKey: ["communityIndicators", community.uid],
    queryFn: () => getIndicatorsByCommunity(community.uid),
    enabled: !!community.uid,
  }));

  const { data: communityIndicatorsData = [] } = useQuery({
    queryKey: [
      "allCommunityIndicators",
      selectedCommunities.map((c) => c.uid).sort(),
    ],
    queryFn: async () => {
      if (selectedCommunities.length === 0) return [];
      const results = await Promise.all(
        selectedCommunities.map(async (community) => {
          try {
            const indicators = await getIndicatorsByCommunity(community.uid);
            return indicators.map((indicator) => ({
              ...indicator,
              communityId: community.uid,
              communityName: community.name,
            }));
          } catch (error) {
            console.error(
              `Failed to fetch indicators for community ${community.uid}:`,
              error
            );
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: selectedCommunities.length > 0,
  });

  // Fetch unlinked indicators
  const { data: unlinkedIndicatorsData = [] } = useUnlinkedIndicators();

  // Categorized indicators combining project, community, and unlinked indicators
  const categorizedIndicators = useMemo((): CategorizedIndicator[] => {
    const projectIndicators: CategorizedIndicator[] = (
      indicatorsData || []
    ).map((indicator) => ({
      ...indicator,
      source: "project" as const,
    }));

    const communityIndicators: CategorizedIndicator[] = (
      communityIndicatorsData || []
    ).map((indicator) => ({
      id: indicator.id,
      name: indicator.name,
      description: indicator.description,
      unitOfMeasure: indicator.unitOfMeasure,
      datapoints: [],
      programs: [], // Community indicators don't have specific programs associated
      hasData: false, // Community indicators start without data
      isAssociatedWithPrograms: false, // Community indicators are not associated with specific programs
      source: "community" as const,
      communityName: indicator.communityName,
      communityId: indicator.communityId,
    }));

    const unlinkedIndicators: CategorizedIndicator[] = (
      unlinkedIndicatorsData || []
    ).map((indicator) => ({
      id: indicator.id,
      name: indicator.name,
      description: indicator.description,
      unitOfMeasure: indicator.unitOfMeasure,
      datapoints: [],
      programs: [], // Unlinked indicators don't have specific programs associated
      hasData: false, // Unlinked indicators start without data
      isAssociatedWithPrograms: false, // Unlinked indicators are not associated with specific programs
      source: "unlinked" as const,
    }));

    return [...projectIndicators, ...communityIndicators, ...unlinkedIndicators];
  }, [indicatorsData, communityIndicatorsData, unlinkedIndicatorsData]);


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

        // Handle indicators data - project indicators are handled by categorizedIndicators
        if (project.uid || project.details?.data?.slug) {
          const indicators = indicatorsData;
          setOutputs(indicators || []);
        }
      } catch (error) {
        errorManager(
          `Error fetching project data for project ${project?.uid}`,
          error,
          { projectUID: project?.uid, address }
        );
        console.error("Failed to fetch project data:", error);
      }
    };

    fetchProjectData();
  }, [project?.uid, project?.grants?.length]);

  const updateToEdit = project?.updates.find((update) => update.uid === editId);
  // Effect to load edit data
  useEffect(() => {
    if (!editId || !project) return;

    if (!updateToEdit) return;

    setIsEditMode(true);

    // Set form values from the update
    setValue("title", updateToEdit.data.title || "");
    setValue("text", updateToEdit.data.text || "");

    if (updateToEdit.data.startDate) {
      setValue("startDate", new Date(updateToEdit.data.startDate));
    }

    if (updateToEdit.data.endDate) {
      setValue("endDate", new Date(updateToEdit.data.endDate));
    }

    // Set grants if they exist
    if (updateToEdit.data.grants && updateToEdit.data.grants.length > 0) {
      setValue("grants", updateToEdit.data.grants);
    }

    // Set deliverables if they exist
    if (
      updateToEdit.data.deliverables &&
      updateToEdit.data.deliverables.length > 0
    ) {
      setValue(
        "deliverables",
        updateToEdit.data.deliverables.map((deliverable) => ({
          name: deliverable.name || "",
          proof: deliverable.proof || "",
          description: deliverable.description || "",
        }))
      );
    }

    if (watch("outputs").length === 0) {
      // Set outputs if they exist and outputs are loaded
      if (
        updateToEdit.data.indicators &&
        updateToEdit.data.indicators.length > 0 &&
        outputs.length > 0
      ) {
        // Access outputs safely
        const assignOutputsValues = async () => {
          const indicators = indicatorsData;

          setValue(
            "outputs",
            updateToEdit.data.indicators!.map((indicator) => {
              const matchingOutput = indicators.find(
                (out: any) => out.id === indicator.indicatorId
              );
              const orderedDatapoints = matchingOutput?.datapoints.sort(
                (a: any, b: any) =>
                  new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
              );
              const firstDatapoint = orderedDatapoints?.[0];
              return {
                outputId: indicator.indicatorId,
                value: firstDatapoint?.value || 0,
                proof: firstDatapoint?.proof || "",
                startDate: firstDatapoint?.startDate
                  ? new Date(firstDatapoint.startDate).toISOString()
                  : undefined,
                endDate: firstDatapoint?.endDate
                  ? new Date(firstDatapoint.endDate).toISOString()
                  : undefined,
              };
            })
          );
        };
        assignOutputsValues();
      }
    }
  }, [editId, project, setValue, outputs.length]);

  const { changeStepperStep, setIsStepper } = useStepper();

  const { openShareDialog } = useShareDialogStore();

  const { gap } = useGap();

  const indicatorsList = categorizedIndicators.map((output) => ({
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

      // Filter out autosynced indicators and prepare impact data for submission
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
          startDate: output.startDate || data.startDate?.toISOString(),
          endDate: output.endDate || data.endDate?.toISOString(),
          id: output.outputId,
        }));

      // Update impact data through the API
      if (outputsData.length > 0) {
        await Promise.all(
          outputsData.map((indicator) => {
            const restOfDatapoints =
              indicatorsData?.find((i) => i.id === indicator.id)?.datapoints ||
              [];

            const filteredDatapoints = restOfDatapoints.filter(
              (dp) =>
                dp.startDate !== indicator.startDate &&
                dp.endDate !== indicator.endDate
            );
            return sendImpactAnswers(
              projectUid,
              indicator.id,
              [
                ...filteredDatapoints,
                {
                  value: indicator.value,
                  proof: indicator.proof || "",
                  startDate: indicator.startDate || new Date().toISOString(),
                  endDate: indicator.endDate || new Date().toISOString(),
                },
              ],
              () => {}
            );
          })
        );
      }

      // Create the base project update object
      const projectUpdateData = {
        data: {
          title: data.title,
          text: data.text,
          startDate: data.startDate ? data.startDate : undefined,
          endDate: data.endDate ? data.endDate : undefined,
          grants: data.grants || [],
          indicators: data.outputs.map((indicator) => ({
            indicatorId: indicator.outputId,
            name:
              categorizedIndicators.find((o) => o.id === indicator.outputId)
                ?.name || "",
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
      };

      // If in edit mode, add the existing UID
      if (isEditMode && editId) {
        Object.assign(projectUpdateData, { uid: editId });
      }

      const projectUpdate = new ProjectUpdate(projectUpdateData);

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
                  openShareDialog({
                    modalShareText: `🎉 You just dropped an update for ${project?.details?.data?.title}!`,
                    modalShareSecondText: `That's how progress gets done! Your update is now live onchain—one step closer to greatness. Keep the vibes high and the milestones rolling! 🚀🔥`,
                    shareText: SHARE_TEXTS.PROJECT_ACTIVITY(
                      project?.details?.data?.title as string,
                      project?.uid as string
                    ),
                  });
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
        },
        {
          error: MESSAGES.PROJECT_UPDATE_FORM.ERROR,
        }
      );
      console.log(error);
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

  const currentGrantIds = watch("grants") || [];
  const selectedPrograms = currentGrantIds
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


  const activityWithSameTitle =
    Boolean(project?.updates.find((u) => u.data.title === watch("title"))) &&
    !isEditMode;

  const formValues = watch();

  const handleOutputSuccess = (newIndicator: ImpactIndicatorWithData) => {
    // Update the project indicators list
    setOutputs((prev) => [...prev, newIndicator]);

    // Invalidate and refetch unlinked indicators to show the new indicator
    queryClient.invalidateQueries({ queryKey: ["unlinkedIndicators"] });

    const currentOutputs = watch("outputs") || [];
    if (selectedToCreate !== undefined) {
      // Update the existing output at the selected index
      const newOutputs = [...currentOutputs];
      newOutputs[selectedToCreate] = {
        ...newOutputs[selectedToCreate],
        outputId: newIndicator.id,
        value: newOutputs[selectedToCreate]?.value || 0,
        proof: newOutputs[selectedToCreate]?.proof || "",
      };
      setValue("outputs", newOutputs, {
        shouldValidate: true,
      });
    } else {
      // Add a new output if no index was selected
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
    }

  };


  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
    >
      {!isEditMode ? (
        <div className="flex w-full flex-col">
          <div className="flex items-center gap-2">
            <label htmlFor="update-title" className={labelStyle}>
              Activity Name *
            </label>
            <InfoTooltip content="Provide a name or title for the activity" />
          </div>
          <input
            id="update-title"
            className={cn(
              inputStyle,
              isEditMode ? "bg-gray-100 dark:bg-zinc-700" : ""
            )}
            placeholder="Ex: Launched a feature to onboard users"
            {...register("title")}
            disabled={isEditMode}
            onChange={(e) => {
              if (
                !!project?.updates.find((u) => u.data.title === e.target.value)
              ) {
                setError("title", {
                  message: "You already have an activity with this title.",
                  type: "required",
                });
              } else {
                setValue("title", e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
              }
            }}
          />
          <p className="text-base text-red-400">{errors.title?.message}</p>
        </div>
      ) : null}

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
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => {
                    if (
                      formatDate(date) === formatDate(watch("startDate") || "")
                    ) {
                      setValue("startDate", undefined, {
                        shouldValidate: true,
                      });
                      field.onChange(undefined);
                    } else {
                      setValue("startDate", date, {
                        shouldValidate: true,
                      });
                      field.onChange(date);
                    }
                  }}
                  placeholder="Pick a date"
                  clearButtonFn={() => {
                    setValue("startDate", undefined, {
                      shouldValidate: true,
                    });
                    field.onChange(undefined);
                  }}
                />
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
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => {
                    if (
                      formatDate(date) === formatDate(watch("endDate") || "")
                    ) {
                      setValue("endDate", undefined, {
                        shouldValidate: true,
                      });
                      field.onChange(undefined);
                    } else {
                      setValue("endDate", date, {
                        shouldValidate: true,
                      });
                      field.onChange(date);
                    }
                  }}
                  minDate={watch("startDate")}
                  placeholder="Pick a date"
                  clearButtonFn={() => {
                    setValue("endDate", undefined, {
                      shouldValidate: true,
                    });
                    field.onChange(undefined);
                  }}
                />
                <p className="text-base text-red-400">
                  {formState.errors.endDate?.message}
                </p>
              </div>
            )}
          />
        </div>
      </div>

      {grants.length === 0 ? null : (
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-row items-center gap-2">
            <label htmlFor="grants" className={labelStyle}>
              Tell us which grants helped you accomplish this activity?
              (Optional)
            </label>
            <InfoTooltip content="Select grants that helped you accomplish this activity." />
          </div>
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

          {/* Community Pills Display */}
          {selectedCommunities.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Communities involved:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCommunities.map((community) => (
                  <div
                    key={community.uid}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  >
                    {community.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <OutputsSection
        register={register}
        control={control}
        setValue={setValue}
        watch={watch}
        errors={errors}
        projectUID={project?.uid}
        selectedCommunities={selectedCommunities}
        selectedPrograms={selectedPrograms}
        onCreateNewIndicator={(index) => {
          setSelectedToCreate(index);
        }}
        onIndicatorCreated={handleOutputSuccess}
        labelStyle={labelStyle}
      />

      <div className="flex w-full flex-row-reverse">
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <div>
                <Button
                  type="submit"
                  className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
                  disabled={isSubmitting || !isValid || activityWithSameTitle}
                  isLoading={isSubmitting || isLoading}
                >
                  {isEditMode ? "Update activity" : "Post activity"}
                </Button>
              </div>
            </Tooltip.Trigger>
            {(isSubmitting || !isValid || activityWithSameTitle) && (
              <Tooltip.Portal>
                <Tooltip.Content
                  className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px] z-[1000]"
                  sideOffset={5}
                  side="top"
                >
                  {activityWithSameTitle ? (
                    <p>An activity with this title already exists</p>
                  ) : !isValid ? (
                    <div className="flex flex-col gap-2">
                      {getFormErrorMessage(errors, formValues).map(
                        (message, index) => (
                          <p key={index}>{message}</p>
                        )
                      )}
                    </div>
                  ) : (
                    <p>Submitting activity...</p>
                  )}
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </form>
  );
};
