"use client";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { CommunitiesSelect } from "@/components/CommunitiesSelect";
import { Telegram2Icon, WebsiteIcon } from "@/components/Icons";
import { BlogIcon } from "@/components/Icons/Blog";
import { Discord2Icon } from "@/components/Icons/Discord2";
import { DiscussionIcon } from "@/components/Icons/Discussion";
import { OrganizationIcon } from "@/components/Icons/Organization";
import { Twitter2Icon } from "@/components/Icons/Twitter2";
import { Button } from "@/components/Utilities/Button";
import { DateTimePicker } from "@/components/Utilities/DateTimePicker";
import { errorManager } from "@/components/Utilities/errorManager";
import { MultiEmailInput } from "@/components/Utilities/MultiEmailInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { getCommunities } from "@/services/communities.service";
import { ProgramRegistryService } from "@/services/programRegistry.service";
import type { Community } from "@/types/v2/community";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { appNetwork } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { cn } from "@/utilities/tailwind";
import { registryHelper } from "./helper";
import type { GrantProgram } from "./ProgramList";
import { buildMetadata, buildTopLevelFields } from "./programUtils";
import { SearchDropdown } from "./SearchDropdown";
import { StatusDropdown } from "./StatusDropdown";
import { createProgramSchema, OPPORTUNITY_TYPE_OPTIONS, type ProgramFormData } from "./schema";
import { AcceleratorFields } from "./TypeFields/AcceleratorFields";
import { BountyFields } from "./TypeFields/BountyFields";
import { HackathonFields } from "./TypeFields/HackathonFields";
import { RfpFields } from "./TypeFields/RfpFields";
import { VcFundFields } from "./TypeFields/VcFundFields";

const labelStyle = "text-sm font-bold text-brand-gray dark:text-zinc-100";
const inputStyle =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

export default function AddProgram({
  programToEdit,
  backTo,
  refreshPrograms,
  isAdmin = false,
}: {
  programToEdit?: GrantProgram | null;
  backTo?: () => void;
  refreshPrograms?: () => Promise<void>;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const _supportedChains = appNetwork
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

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const typeSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCommunitiesData = async () => {
      const communities = await getCommunities();
      setAllCommunities(communities);
    };

    if (allCommunities.length === 0) fetchCommunitiesData();
  }, [allCommunities]);

  const handleTypeSelectorKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const container = typeSelectorRef.current;
    if (!container) return;
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")
    );
    const currentIndex = buttons.indexOf(e.target as HTMLButtonElement);
    if (currentIndex === -1) return;
    e.preventDefault();
    const nextIndex =
      e.key === "ArrowRight"
        ? (currentIndex + 1) % buttons.length
        : (currentIndex - 1 + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  }, []);

  // Extract defaultValues to a stable memoized reference
  const formDefaultValues = useMemo(
    () => ({
      opportunityType: programToEdit?.type ?? "grant",
      deadline: programToEdit?.deadline ? new Date(programToEdit.deadline) : undefined,
      submissionUrl: programToEdit?.submissionUrl ?? "",
      name: programToEdit?.metadata?.title,
      description: programToEdit?.metadata?.description,
      shortDescription: programToEdit?.metadata?.shortDescription || "",
      dates: {
        startsAt: programToEdit?.metadata?.startsAt
          ? new Date(programToEdit?.metadata?.startsAt)
          : undefined,
        endsAt: programToEdit?.metadata?.endsAt
          ? new Date(programToEdit?.metadata?.endsAt)
          : undefined,
      },
      amountDistributed: programToEdit?.metadata?.amountDistributedToDate as number | undefined,
      budget: programToEdit?.metadata?.programBudget
        ? Number(String(programToEdit.metadata.programBudget).replace(/[^0-9.]/g, "")) || undefined
        : undefined,
      minGrantSize: programToEdit?.metadata?.minGrantSize as number | undefined,
      maxGrantSize: programToEdit?.metadata?.maxGrantSize as number | undefined,
      grantsToDate: programToEdit?.metadata?.grantsToDate as number | undefined,
      bugBounty: programToEdit?.metadata?.bugBounty,
      website: programToEdit?.metadata?.website,
      twitter: programToEdit?.metadata?.projectTwitter,
      telegram: programToEdit?.metadata?.socialLinks?.telegram,
      discord: programToEdit?.metadata?.socialLinks?.discord,
      orgWebsite: programToEdit?.metadata?.socialLinks?.orgWebsite,
      blog: programToEdit?.metadata?.socialLinks?.blog,
      forum: programToEdit?.metadata?.socialLinks?.forum,
      facebook: programToEdit?.metadata?.socialLinks?.facebook,
      instagram: programToEdit?.metadata?.socialLinks?.instagram,
      categories: programToEdit?.metadata?.categories || [],
      ecosystems: programToEdit?.metadata?.ecosystems || [],
      organizations: programToEdit?.metadata?.organizations || [],
      networks: programToEdit?.metadata?.networks || [],
      grantTypes: Array.isArray(programToEdit?.metadata?.grantTypes)
        ? programToEdit?.metadata?.grantTypes
        : programToEdit?.metadata?.grantTypes
          ? [programToEdit?.metadata?.grantTypes]
          : [],
      networkToCreate: programToEdit?.chainID || 0,
      grantsSite: programToEdit?.metadata?.socialLinks?.grantsSite,
      platformsUsed: programToEdit?.metadata?.platformsUsed || [],
      communityRef: programToEdit?.metadata?.communityRef || [],
      // Default: public form = open enrollment (anyoneCanJoin: true).
      // This diverges from admin form (CreateProgramModal) which defaults to restricted (anyoneCanJoin: false).
      anyoneCanJoin: programToEdit?.metadata?.anyoneCanJoin ?? true,
      status: programToEdit?.metadata?.status || "Active",
      adminEmails: programToEdit?.metadata?.adminEmails || [],
      financeEmails: programToEdit?.metadata?.financeEmails || [],
      hackathonMeta: programToEdit?.hackathonMetadata
        ? {
            location: programToEdit.hackathonMetadata.location ?? "",
            tracks: programToEdit.hackathonMetadata.tracks?.join(", ") ?? "",
            prizePool:
              programToEdit.hackathonMetadata.prizes?.reduce(
                (sum, p) => sum + (Number(p.amount) || 0),
                0
              ) || undefined,
            prizeCurrency: programToEdit.hackathonMetadata.prizes?.[0]?.currency ?? "USD",
            teamSizeMin: programToEdit.hackathonMetadata.teamSize?.min,
            teamSizeMax: programToEdit.hackathonMetadata.teamSize?.max,
            registrationDeadline: programToEdit.hackathonMetadata.registrationDeadline
              ? new Date(programToEdit.hackathonMetadata.registrationDeadline)
              : undefined,
          }
        : { prizeCurrency: "USD" },
      bountyMeta: programToEdit?.bountyMetadata
        ? {
            rewardAmount: Number(programToEdit.bountyMetadata.reward?.amount) || undefined,
            rewardCurrency: programToEdit.bountyMetadata.reward?.currency ?? "USD",
            difficulty: programToEdit.bountyMetadata.difficulty,
            skills: programToEdit.bountyMetadata.skills?.join(", ") ?? "",
            platform: programToEdit.bountyMetadata.platform ?? "",
          }
        : { rewardCurrency: "USD" },
      acceleratorMeta: programToEdit?.acceleratorMetadata
        ? {
            stage: programToEdit.acceleratorMetadata.stage,
            equity: programToEdit.acceleratorMetadata.equity ?? "",
            fundingAmount: Number(programToEdit.acceleratorMetadata.funding?.amount) || undefined,
            fundingCurrency: programToEdit.acceleratorMetadata.funding?.currency ?? "USD",
            programDuration: programToEdit.acceleratorMetadata.programDuration,
            batchSize: programToEdit.acceleratorMetadata.batchSize,
            location: programToEdit.acceleratorMetadata.location ?? "",
          }
        : { fundingCurrency: "USD" },
      vcFundMeta: programToEdit?.vcFundMetadata
        ? {
            stage: programToEdit.vcFundMetadata.stage,
            checkSizeMin: programToEdit.vcFundMetadata.checkSize?.min,
            checkSizeMax: programToEdit.vcFundMetadata.checkSize?.max,
            checkSizeCurrency: programToEdit.vcFundMetadata.checkSize?.currency ?? "USD",
            thesis: programToEdit.vcFundMetadata.thesis ?? "",
            portfolio: Array.isArray(programToEdit.vcFundMetadata.portfolio)
              ? programToEdit.vcFundMetadata.portfolio.join(", ")
              : (programToEdit.vcFundMetadata.portfolio ?? ""),
            contactMethod: programToEdit.vcFundMetadata.contactMethod,
            activelyInvesting: programToEdit.vcFundMetadata.activelyInvesting,
          }
        : { checkSizeCurrency: "USD" },
      rfpMeta: programToEdit?.rfpMetadata
        ? {
            issuingOrganization: programToEdit.rfpMetadata.issuingOrganization ?? "",
            budgetAmount: Number(programToEdit.rfpMetadata.budget?.amount) || undefined,
            budgetCurrency: programToEdit.rfpMetadata.budget?.currency ?? "USD",
            scope: programToEdit.rfpMetadata.scope ?? "",
            requirements: programToEdit.rfpMetadata.requirements?.join("\n") ?? "",
          }
        : { budgetCurrency: "USD" },
    }),
    [programToEdit]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormData>({
    resolver: zodResolver(createProgramSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: formDefaultValues,
  });

  const opportunityType = watch("opportunityType");

  const onChangeGeneric = (
    value: string,
    fieldName:
      | "categories"
      | "ecosystems"
      | "networks"
      | "grantTypes"
      | "organizations"
      | "platformsUsed"
      | "communityRef"
  ) => {
    const oldArray = watch(fieldName);
    const newArray = [...oldArray];
    if (newArray.includes(value)) {
      const filtered = newArray.filter((item) => item !== value);
      setValue(fieldName, filtered, {
        shouldValidate: true,
      });
      return;
    } else {
      newArray.push(value);
    }
    setValue(fieldName, newArray, {
      shouldValidate: true,
    });
  };

  const [isLoading, setIsLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { authenticated: isAuth, login } = useAuth();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();

  // Metadata is constructed inline rather than via ProgramRegistryService.buildProgramMetadata()
  // because this form has significantly more fields (social links, categories, ecosystems, etc.)
  // than CreateProgramFormData supports. The service method is designed for the simpler
  const createProgram = async (data: ProgramFormData) => {
    setIsLoading(true);
    try {
      if (!isConnected || !isAuth) {
        login?.();
        return;
      }
      const chainSelected = data.networkToCreate;

      const metadata = { ...buildMetadata(data), status: "Active" };
      const topLevelFields = buildTopLevelFields(data);

      // Use V2 endpoint - owner comes from JWT session
      const [_request, error] = await fetchData(
        INDEXER.REGISTRY.V2.CREATE,
        "POST",
        {
          chainId: chainSelected,
          metadata,
          ...topLevelFields,
        },
        {},
        {},
        true
      );
      if (error) {
        throw new Error(error);
      }
      toast.success(
        <p className="text-left">
          You have successfully submitted the funding opportunity.
          <br />
          We will review and approve it shortly.
        </p>,
        {
          duration: 20000,
        }
      );
      router.push(PAGES.REGISTRY.ROOT);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes("already exists")) {
        toast.error("A program with this name already exists");
      } else {
        errorManager(
          MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name),
          error,
          {
            address,
            data,
          },
          {
            error: MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name),
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const editProgram = async (data: ProgramFormData) => {
    setIsLoading(true);
    try {
      // V2 update uses JWT authentication, no wallet connection needed
      if (!isAuth) {
        login?.();
        return;
      }

      const chainSelected = data.networkToCreate;
      const setup = await setupChainAndWallet({
        targetChainId: chainSelected as number,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsLoading(false);
        return;
      }

      const metadata = sanitizeObject({
        ...buildMetadata(data),
        status: data.status,
      });
      const topLevelFields = buildTopLevelFields(data);

      // Always use V2 update endpoint (off-chain)
      // All programs now use V2, regardless of whether they were originally created on-chain
      const programIdToUpdate = programToEdit?.programId;
      if (!programIdToUpdate) {
        throw new Error("Program ID not found. Cannot update program.");
      }

      // Use V2 update endpoint with both metadata and type-specific fields
      await ProgramRegistryService.updateProgram(programIdToUpdate, metadata, topLevelFields);
      toast.success("Program updated successfully!");
      await refreshPrograms?.().then(() => {
        backTo?.();
      });
    } catch (error: unknown) {
      toast.error(MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name));
      errorManager(
        MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name),
        error,
        {
          address,
          data,
        },
        { error: MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name) }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<ProgramFormData> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    data.networkToCreate = registryHelper.supportedNetworks;

    if (programToEdit) {
      await editProgram(data);
    } else {
      await createProgram(data);
    }
  };

  return (
    <div className="my-10 flex w-full max-w-full flex-col justify-between items-center gap-6 px-12 pb-7 max-2xl:px-8 max-md:px-4">
      <div className="flex flex-col justify-start items-center max-w-[900px] w-full gap-6">
        <div className="flex flex-col justify-start items-start gap-3 p-0 w-full">
          <div className="flex flex-col gap-2 p-0">
            {programToEdit ? (
              <Button
                onClick={backTo}
                className="flex flex-row gap-2 bg-transparent hover:bg-transparent text-primary text-sm p-0"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <p className="border-b border-b-primary">Back to Manage Programs</p>
              </Button>
            ) : (
              <Link href={PAGES.REGISTRY.ROOT}>
                <Button className="flex flex-row gap-2 bg-transparent hover:bg-transparent text-primary text-sm p-0">
                  <ChevronLeftIcon className="w-4 h-4" />
                  <p className="border-b border-b-primary">Back to programs</p>
                </Button>
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-black dark:text-white font-body">
              {programToEdit
                ? `Update ${programToEdit.metadata?.title} program`
                : "Submit a Funding Opportunity"}
            </h1>
            <p className="text-base text-black dark:text-white">
              {programToEdit
                ? ""
                : "Add your funding opportunity to the registry and attract high quality builders."}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="gap-4 rounded-lg w-full flex-col flex">
          <div className="flex flex-col w-full gap-6">
            {/* Opportunity Type Selector */}
            <div className="flex flex-col w-full gap-3">
              <span id="opportunity-type-label" className={labelStyle}>
                Opportunity Type *
              </span>
              <Controller
                name="opportunityType"
                control={control}
                render={({ field }) => (
                  <div
                    ref={typeSelectorRef}
                    className="flex flex-wrap gap-2"
                    role="toolbar"
                    aria-label="Select opportunity type"
                  >
                    {OPPORTUNITY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={field.value === opt.value}
                        tabIndex={field.value === opt.value ? 0 : -1}
                        onKeyDown={handleTypeSelectorKeyDown}
                        className={cn(
                          "rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          field.value === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                        onClick={() => field.onChange(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Deadline & Submission URL (for non-grant types) */}
            {opportunityType !== "grant" && (
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <Controller
                  name="deadline"
                  control={control}
                  render={({ field }) => (
                    <div className="flex w-full flex-col gap-2">
                      <div className={labelStyle}>
                        Deadline{" "}
                        <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                          (optional)
                        </span>
                      </div>
                      <DateTimePicker
                        selected={field.value}
                        onSelect={(date: Date | undefined) => field.onChange(date)}
                        placeholder="Select deadline"
                        timeMode="end"
                      />
                    </div>
                  )}
                />
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="submission-url" className={labelStyle}>
                    Submission URL{" "}
                    <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                      (optional)
                    </span>
                  </label>
                  <Input
                    id="submission-url"
                    className={inputStyle}
                    placeholder="Ex: https://apply.example.com"
                    {...register("submissionUrl")}
                  />
                  <p className="text-base text-red-400">{errors.submissionUrl?.message}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col w-full gap-6 border-b border-b-[#98A2B3] pb-10">
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-name" className={labelStyle}>
                    Program name *
                  </label>
                  <Input
                    id="program-name"
                    className={inputStyle}
                    placeholder="Ex: Builder Growth Program"
                    {...register("name")}
                  />
                  <p className="text-base text-red-400">{errors.name?.message}</p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-grants-site" className={labelStyle}>
                    Program website *
                  </label>
                  <Input
                    id="program-grants-site"
                    className={inputStyle}
                    placeholder="Ex: https://program.xyz/"
                    {...register("grantsSite")}
                  />
                  <p className="text-base text-red-400">{errors.grantsSite?.message}</p>
                </div>
              </div>
              <div className="flex w-full flex-row items-center justify-between gap-4">
                <div className="flex w-full flex-row justify-between gap-4">
                  <Controller
                    name="dates.startsAt"
                    control={control}
                    render={({ field, formState }) => (
                      <div className="flex w-full flex-col gap-2">
                        <div className={labelStyle}>
                          Start date{" "}
                          {opportunityType === "hackathon" ? (
                            "*"
                          ) : (
                            <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                              (optional)
                            </span>
                          )}
                        </div>
                        <DateTimePicker
                          selected={field.value}
                          onSelect={(date) => {
                            setValue("dates.startsAt", date, {
                              shouldValidate: true,
                            });
                            field.onChange(date);
                          }}
                          timeMode="start"
                          placeholder="Pick a date"
                          buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                          clearButtonFn={() => {
                            setValue("dates.startsAt", undefined, {
                              shouldValidate: true,
                            });
                            field.onChange(undefined);
                          }}
                        />
                        <p className="text-base text-red-400">
                          {formState.errors.dates?.startsAt?.message}
                        </p>
                      </div>
                    )}
                  />
                </div>
                <div className="flex w-full flex-row justify-between gap-4">
                  <Controller
                    name="dates.endsAt"
                    control={control}
                    render={({ field, formState }) => (
                      <div className="flex w-full flex-col gap-2">
                        <div className={labelStyle}>
                          End date{" "}
                          {opportunityType === "hackathon" ? (
                            "*"
                          ) : (
                            <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                              (optional)
                            </span>
                          )}
                        </div>
                        <DateTimePicker
                          selected={field.value}
                          onSelect={(date) => {
                            setValue("dates.endsAt", date, {
                              shouldValidate: true,
                            });
                            field.onChange(date);
                          }}
                          timeMode="end"
                          minDate={watch("dates.startsAt")}
                          placeholder="Pick a date"
                          buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                          clearButtonFn={() => {
                            setValue("dates.endsAt", undefined, {
                              shouldValidate: true,
                            });
                            field.onChange(undefined);
                          }}
                        />
                        <p className="text-base text-red-400">
                          {formState.errors.dates?.endsAt?.message}
                        </p>
                      </div>
                    )}
                  />
                </div>
              </div>
              <div className="flex w-full flex-col max-w-full gap-1">
                <label htmlFor="program-short-description" className={labelStyle}>
                  One-line Description
                </label>
                <Input
                  id="program-short-description"
                  className={inputStyle}
                  placeholder="Brief description (max 100 characters)"
                  maxLength={100}
                  {...register("shortDescription")}
                />
                <div className="flex justify-between">
                  <p className="text-base text-red-400">{errors.shortDescription?.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {watch("shortDescription")?.length || 0}/100
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col max-w-full gap-1">
                <label htmlFor="program-description" className={labelStyle}>
                  Description *
                </label>
                <textarea
                  id="program-description"
                  className={cn(inputStyle, "bg-transparent min-h-[120px] max-h-[360px]")}
                  value={watch("description")}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setValue("description", event.target.value || "", {
                      shouldValidate: true,
                    })
                  }
                  placeholder="Please provide a description of this program"
                />
                <p className="text-base text-red-400">{errors.description?.message}</p>
              </div>

              {/* Type-Specific Fields */}
              {opportunityType === "hackathon" && (
                <HackathonFields
                  register={register}
                  control={control}
                  errors={errors}
                  labelStyle={labelStyle}
                  inputStyle={inputStyle}
                />
              )}
              {opportunityType === "bounty" && (
                <BountyFields
                  register={register}
                  control={control}
                  errors={errors}
                  labelStyle={labelStyle}
                  inputStyle={inputStyle}
                />
              )}
              {opportunityType === "accelerator" && (
                <AcceleratorFields
                  register={register}
                  control={control}
                  errors={errors}
                  labelStyle={labelStyle}
                  inputStyle={inputStyle}
                />
              )}
              {opportunityType === "vc_fund" && (
                <VcFundFields
                  register={register}
                  control={control}
                  errors={errors}
                  labelStyle={labelStyle}
                  inputStyle={inputStyle}
                />
              )}
              {opportunityType === "rfp" && (
                <RfpFields
                  register={register}
                  control={control}
                  errors={errors}
                  labelStyle={labelStyle}
                  inputStyle={inputStyle}
                />
              )}

              {isAdmin && (
                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Controller
                    name="adminEmails"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div className="flex w-full flex-col gap-1">
                        <label htmlFor="admin-emails" className={labelStyle}>
                          Admin Emails (optional)
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Applicants will reply to these emails
                        </p>
                        <MultiEmailInput
                          emails={field.value || []}
                          onChange={field.onChange}
                          placeholder="Enter admin email"
                          disabled={isLoading}
                          error={fieldState.error?.message}
                        />
                      </div>
                    )}
                  />
                  <Controller
                    name="financeEmails"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div className="flex w-full flex-col gap-1">
                        <label htmlFor="finance-emails" className={labelStyle}>
                          Finance Emails *
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Notified when milestones are verified
                        </p>
                        <MultiEmailInput
                          emails={field.value || []}
                          onChange={field.onChange}
                          placeholder="Enter finance email"
                          disabled={isLoading}
                          error={fieldState.error?.message}
                        />
                      </div>
                    )}
                  />
                </div>
              )}
              <div className="grid grid-cols-4  max-sm:grid-cols-1 max-md:grid-cols-2 gap-4 justify-between">
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-categories" className={labelStyle}>
                    Categories
                  </label>
                  <SearchDropdown
                    list={registryHelper.categories}
                    onSelectFunction={(value: string) => onChangeGeneric(value, "categories")}
                    type={"Categories"}
                    selected={watch("categories")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                  />
                  <p className="text-base text-red-400">{errors.categories?.message}</p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-organizations" className={labelStyle}>
                    Organizations
                  </label>
                  <SearchDropdown
                    list={registryHelper.organizations}
                    onSelectFunction={(value: string) => onChangeGeneric(value, "organizations")}
                    type={"Organizations"}
                    selected={watch("organizations")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    canAdd
                  />
                  <p className="text-base text-red-400">{errors.organizations?.message}</p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-ecosystems" className={labelStyle}>
                    Ecosystems
                  </label>
                  <SearchDropdown
                    list={registryHelper.ecosystems}
                    onSelectFunction={(value: string) => onChangeGeneric(value, "ecosystems")}
                    type={"Ecosystems"}
                    selected={watch("ecosystems")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    canAdd
                  />
                  <p className="text-base text-red-400">{errors.ecosystems?.message}</p>
                </div>
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="program-types" className={labelStyle}>
                    Funding Mechanisms
                  </label>
                  <SearchDropdown
                    list={registryHelper.grantTypes}
                    onSelectFunction={(value: string) => onChangeGeneric(value, "grantTypes")}
                    type={"Mechanisms"}
                    selected={watch("grantTypes")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                  />
                  <p className="text-base text-red-400">{errors.grantTypes?.message}</p>
                </div>
                <div className="flex w-full flex-col  gap-1">
                  <label htmlFor="program-types" className={labelStyle}>
                    Platforms Used
                  </label>
                  <SearchDropdown
                    list={registryHelper.platformsUsed}
                    onSelectFunction={(value: string) => onChangeGeneric(value, "platformsUsed")}
                    type={"Platforms"}
                    selected={watch("platformsUsed")}
                    prefixUnselected="Select"
                    buttonClassname="w-full max-w-full"
                    shouldSort={false}
                    canAdd
                  />
                  <p className="text-base text-red-400">{errors.platformsUsed?.message}</p>
                </div>
                <div className="flex w-full flex-col">
                  <label htmlFor="grant-title" className={`${labelStyle} mb-1`}>
                    Communities related
                  </label>
                  <CommunitiesSelect
                    onSelectFunction={(community: Community) => {
                      onChangeGeneric(community?.uid, "communityRef");
                    }}
                    list={allCommunities}
                    selected={watch("communityRef")}
                    buttonClassname="w-full max-w-full"
                    type="community"
                  />
                  <p className="text-base text-red-400">{errors?.communityRef?.message}</p>
                </div>
                {programToEdit && (
                  <div className="flex w-full flex-col gap-1">
                    <label htmlFor="program-status" className={labelStyle}>
                      Status
                    </label>
                    <StatusDropdown
                      onSelectFunction={(value: string) => {
                        setValue("status", value);
                      }}
                      list={registryHelper.status}
                      previousValue={watch("status")}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Checkbox
                  id="open-enrollment"
                  checked={watch("anyoneCanJoin")}
                  onCheckedChange={(checked) => {
                    setValue("anyoneCanJoin", checked === true, {
                      shouldValidate: true,
                    });
                  }}
                />
                <label
                  htmlFor="open-enrollment"
                  className="text-sm font-medium text-gray-700 dark:text-zinc-200 cursor-pointer"
                >
                  Any project can self attest their participation in this program
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 max-sm:grid-cols-1 w-full gap-6 border-b border-b-[#98A2B3] pb-10">
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-budget" className={labelStyle}>
                  Program budget
                </label>
                <Input
                  id="program-budget"
                  className={inputStyle}
                  placeholder="Ex: 100500"
                  type="number"
                  {...register("budget")}
                />
                <p className="text-base text-red-400">{errors.budget?.message}</p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-amount-distributed" className={labelStyle}>
                  Amount distributed to date
                </label>
                <Input
                  id="program-amount-distributed"
                  className={inputStyle}
                  placeholder="Ex: 804150"
                  type="number"
                  {...register("amountDistributed")}
                />
                <p className="text-base text-red-400">{errors.amountDistributed?.message}</p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-grants-issued" className={labelStyle}>
                  Grants issued to date
                </label>
                <Input
                  id="program-grants-issued"
                  type="number"
                  className={inputStyle}
                  placeholder="Ex: 60"
                  {...register("grantsToDate")}
                />
                <p className="text-base text-red-400">{errors.grantsToDate?.message}</p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-min-grant-size" className={labelStyle}>
                  Min Grant size
                </label>
                <Input
                  type="number"
                  id="program-min-grant-size"
                  className={inputStyle}
                  placeholder="Ex: 80000"
                  {...register("minGrantSize")}
                />
                <p className="text-base text-red-400">{errors.minGrantSize?.message}</p>
              </div>
              <div className="flex w-full flex-col  gap-1">
                <label htmlFor="program-max-grant-size" className={labelStyle}>
                  Max Grant size
                </label>
                <Input
                  type="number"
                  id="program-max-grant-size"
                  className={inputStyle}
                  placeholder="Ex: 80000"
                  {...register("maxGrantSize")}
                />
                <p className="text-base text-red-400">{errors.maxGrantSize?.message}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 max-sm:grid-cols-1 w-full gap-6  pb-10">
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-twitter" className={labelStyle}>
                  X/Twitter
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <Twitter2Icon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    id="program-twitter"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://x.com/program"
                    {...register("twitter")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.twitter?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-discord" className={labelStyle}>
                  Discord
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <Discord2Icon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    id="program-discord"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://discord.gg/program"
                    {...register("discord")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.discord?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-blog" className={labelStyle}>
                  Blog
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <BlogIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    id="program-blog"
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://blog.program.co/program"
                    {...register("blog")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.blog?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-forum" className={labelStyle}>
                  Forum
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <DiscussionIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    id="program-forum"
                    placeholder="Ex: https://forum.program.co/program"
                    {...register("forum")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.forum?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-org" className={labelStyle}>
                  Organization website
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <OrganizationIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://org.program.co/program"
                    id="program-org"
                    {...register("orgWebsite")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.orgWebsite?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-bug-bounty" className={labelStyle}>
                  Link to Bug bounty
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <WebsiteIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://program.xyz"
                    id="program-bug-bounty"
                    {...register("bugBounty")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.bugBounty?.message}</p>
              </div>

              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-telegram" className={labelStyle}>
                  Telegram
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <Telegram2Icon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://t.me/yourusername"
                    id="program-telegram"
                    {...register("telegram")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.telegram?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-facebook" className={labelStyle}>
                  Facebook
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <WebsiteIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://facebook.com/program"
                    id="program-facebook"
                    {...register("facebook")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.facebook?.message}</p>
              </div>
              <div className="flex w-full flex-col gap-2 justify-between">
                <label htmlFor="program-instagram" className={labelStyle}>
                  Instagram
                </label>
                <div className="w-full relative">
                  <div className="h-full w-max absolute flex justify-center items-center mx-3">
                    <WebsiteIcon className="text-zinc-500 w-4 h-4" />
                  </div>
                  <Input
                    className={cn(inputStyle, "pl-10 mt-0")}
                    placeholder="Ex: https://instagram.com/program"
                    id="program-instagram"
                    {...register("instagram")}
                  />
                </div>
                <p className="text-base text-red-400">{errors.instagram?.message}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-start">
            <Button
              isLoading={isLoading}
              type="submit"
              className="px-3 py-3 text-base"
              disabled={isSubmitting}
            >
              {programToEdit ? "Update program" : "Create program"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
