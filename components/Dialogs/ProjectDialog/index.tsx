"use client";
import { Dialog, Transition } from "@headlessui/react";
import { ChevronRightIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  type ExternalCustomLink,
  type ExternalLink,
  type IProjectDetails,
  MemberOf,
  nullRef,
  Project,
  ProjectDetails,
} from "@show-karma/karma-gap-sdk";
import debounce from "lodash.debounce";
import { useRouter } from "next/navigation";
import { type FC, Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { type Hex, isAddress, zeroHash } from "viem";
import { useAccount } from "wagmi";
import { z } from "zod";
/* eslint-disable @next/next/no-img-element */
import {
  DiscordIcon,
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
  WebsiteIcon,
} from "@/components/Icons";
import { DeckIcon } from "@/components/Icons/Deck";
import { FarcasterIcon } from "@/components/Icons/Farcaster";
import { VideoIcon } from "@/components/Icons/Video";
import { ExternalLink as ExternalLinkComponent } from "@/components/Utilities/ExternalLink";
import { errorManager } from "@/components/Utilities/errorManager";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { checkSlugExists, getProject } from "@/services/project.service";
import { searchProjects } from "@/services/project-search.service";
import { useProjectStore } from "@/store";
import { useProjectEditModalStore } from "@/store/modals/projectEdit";
import { useSimilarProjectsModalStore } from "@/store/modals/similarProjects";
import { useStepper } from "@/store/modals/txStepper";
import { useOwnerStore } from "@/store/owner";
import type { Contact } from "@/types/project";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { type CustomLink, isCustomLink } from "@/utilities/customLink";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { gapSupportedNetworks } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { updateProject } from "@/utilities/sdk/projects/editProject";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { SimilarProjectsDialog } from "../SimilarProjectsDialog";
import { ContactInfoSection } from "./ContactInfoSection";
import { FaucetSection } from "./FaucetSection";
import { NetworkDropdown } from "./NetworkDropdown";

const inputStyle = "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const socialMediaInputStyle =
  "bg-transparent border-0 flex flex-1 p-2 focus:outline-none outline-none focus-visible:outline-none dark:bg-zinc-900 dark:text-white text-sm rounded-md";
const labelStyle = "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

export const projectSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.PROJECT_FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.PROJECT_FORM.TITLE.MAX }),
  chainID: z.number({
    required_error: "Network is required",
    message: "Network is required",
  }),
  locationOfImpact: z.string().optional(),
  description: z
    .string({
      required_error: "Description is required",
    })
    .min(1, {
      message: "Description is required",
    }),
  problem: z
    .string({
      required_error: "Problem is required",
    })
    .min(1, {
      message: "Problem is required",
    }),
  solution: z
    .string({
      required_error: "Solution is required",
    })
    .min(1, {
      message: "Solution is required",
    }),
  missionSummary: z
    .string({
      required_error: "Mission Summary is required",
    })
    .min(1, {
      message: "Mission Summary is required",
    }),
  recipient: z
    .string()
    .optional()
    .refine(
      (input) => !input || input?.length === 0 || isAddress(input),
      MESSAGES.PROJECT_FORM.RECIPIENT
    ),
  // tags: z.custom<string>(
  //   (input) =>
  //     (input as string).split(',').every((field) => field.trim().length >= 3),
  //   MESSAGES.PROJECT_FORM.TAGS
  // ),
  twitter: z
    .string()
    .refine((value) => !value.includes("@"), {
      message: MESSAGES.PROJECT_FORM.SOCIALS.TWITTER,
    })
    .optional(),
  github: z.string().optional(),
  discord: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  pitchDeck: z.string().optional(),
  demoVideo: z.string().optional(),
  farcaster: z.string().optional(),
  profilePicture: z.string().optional(),
  businessModel: z.string().optional(),
  stageIn: z.string().optional(),
  raisedMoney: z.string().optional(),
  pathToTake: z.string().optional(),
});

type SchemaType = z.infer<typeof projectSchema>;

type ProjectDialogProps = {
  buttonElement?: {
    text?: string;
    icon?: ReactNode;
    iconSide?: "left" | "right";
    styleClass: string;
  } | null;
  projectToUpdate?: ProjectResponse;
  previousContacts?: Contact[];
  useEditModalStore?: boolean; // New prop to control which modal state to use
};

export const ProjectDialog: FC<ProjectDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-white" />,
    iconSide: "left",
    text: "Add Project",
    styleClass: "",
  },
  projectToUpdate,
  previousContacts,
  useEditModalStore = false, // Default to false for create mode
}) => {
  const dataToUpdate = useMemo(() => {
    if (!projectToUpdate) return undefined;

    const { details } = projectToUpdate;
    const links = details?.links || [];
    const getLinkUrl = (type: string) => links.find((l) => l.type === type)?.url || "";

    return {
      chainID: projectToUpdate.chainID,
      description: details?.description || "",
      title: details?.title || "",
      problem: details?.problem,
      solution: details?.solution,
      missionSummary: details?.missionSummary,
      locationOfImpact: details?.locationOfImpact,
      imageURL: details?.logoUrl,
      twitter: getLinkUrl("twitter"),
      github: getLinkUrl("github"),
      discord: getLinkUrl("discord"),
      website: getLinkUrl("website"),
      linkedin: getLinkUrl("linkedin"),
      pitchDeck: getLinkUrl("pitchDeck"),
      demoVideo: getLinkUrl("demoVideo"),
      farcaster: getLinkUrl("farcaster"),
      profilePicture: details?.logoUrl,
      tags: details?.tags,
      recipient: projectToUpdate.owner,
      businessModel: details?.businessModel,
      stageIn: details?.stageIn,
      raisedMoney: details?.raisedMoney,
      pathToTake: details?.pathToTake,
    };
  }, [projectToUpdate]);

  const [contacts, setContacts] = useState<Contact[]>(previousContacts || []);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(() => {
    const links = projectToUpdate?.details?.links || [];
    return links.filter(isCustomLink).map((link: any, index: number) => ({
      id: `custom-${index}`,
      name: link.name || "",
      url: link.url,
    }));
  });

  // Logo upload state management
  const [uploadedLogoFile, setUploadedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [_logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [tempLogoKey, setTempLogoKey] = useState<string | null>(null);

  // Modal state management - use edit store or local state based on mode
  const { isProjectEditModalOpen, setIsProjectEditModalOpen } = useProjectEditModalStore();

  const [localIsOpen, setLocalIsOpen] = useState(false);

  // Determine which modal state to use
  const isOpen = useEditModalStore ? isProjectEditModalOpen : localIsOpen;
  const setIsOpen = useEditModalStore ? setIsProjectEditModalOpen : setLocalIsOpen;

  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [step, setStep] = useState(0);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isConnected, address } = useAccount();
  const { authenticated: isAuth, login } = useAuth();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);
  const router = useRouter();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { openSimilarProjectsModal, isSimilarProjectsModalOpen } = useSimilarProjectsModalStore();
  const [walletSigner, setWalletSigner] = useState<any>(null);
  const [_faucetFunded, setFaucetFunded] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, trigger, formState, setError } =
    useForm<SchemaType>({
      resolver: zodResolver(projectSchema),
      reValidateMode: "onChange",
      mode: "onChange",
      defaultValues: dataToUpdate,
    });
  const { errors, isValid } = formState;

  // Watch the chainID value for the useEffect
  const chainIDValue = watch("chainID");

  // Handle network change and chain switching
  const handleNetworkChange = async (networkId: number) => {
    if (!isConnected || !address) {
      return;
    }

    setIsChangingNetwork(true);

    try {
      // If we're not on the selected network, switch to it
      if (chain?.id !== networkId) {
        await switchChainAsync({ chainId: networkId });
        // Wait a bit for the chain switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Now get the wallet client for the new chain
      const { walletClient, error } = await safeGetWalletClient(networkId);

      if (!error && walletClient) {
        const signer = await walletClientToSigner(walletClient);
        setWalletSigner(signer);
      } else {
        setWalletSigner(null);
        toast.error("Failed to connect to the selected network");
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
      toast.error("Failed to switch network. Please try again.");
      setWalletSigner(null);
      throw error; // Re-throw to let NetworkDropdown handle it
    } finally {
      setIsChangingNetwork(false);
    }
  };

  // Prepare wallet signer when wallet is connected and chain is selected
  useEffect(() => {
    const prepareSigner = async () => {
      if (isConnected && address && chainIDValue) {
        try {
          // Check if we're on the correct chain
          if (chain?.id === chainIDValue) {
            // Get wallet client for the current chain
            const { walletClient, error } = await safeGetWalletClient(chainIDValue);

            if (!error && walletClient) {
              const signer = await walletClientToSigner(walletClient);
              setWalletSigner(signer);
            } else {
              setWalletSigner(null);
            }
          } else {
            // Chain mismatch, signer will be set after chain switch
            setWalletSigner(null);
          }
        } catch (error) {
          console.error("Failed to prepare wallet signer:", error);
          setWalletSigner(null);
        }
      } else {
        setWalletSigner(null);
      }
    };

    prepareSigner();
  }, [isConnected, address, chainIDValue, chain?.id]);

  // Reset form when switching between create/edit modes or when modal opens
  useEffect(() => {
    if (isOpen) {
      if (projectToUpdate) {
        // Edit mode - populate with existing data
        const updateData = dataToUpdate ?? {
          title: "",
          description: "",
          problem: "",
          solution: "",
          missionSummary: "",
          locationOfImpact: "",
          twitter: "",
          github: "",
          discord: "",
          website: "",
          linkedin: "",
          pitchDeck: "",
          demoVideo: "",
          farcaster: "",
          profilePicture: "",
          businessModel: "",
          stageIn: "",
          raisedMoney: "",
          pathToTake: "",
          recipient: "",
        };
        reset(updateData);
        // Reset logo state to project's existing logo
        const imageURL = projectToUpdate.details?.logoUrl;
        if (imageURL) {
          setLogoPreviewUrl(imageURL);
        } else {
          setLogoPreviewUrl(null);
        }
        setUploadedLogoFile(null);
        setIsLogoUploading(false);
        setLogoUploadProgress(0);
        setTempLogoKey(null);
      } else {
        // Create mode - reset to empty form
        reset({
          title: "",
          description: "",
          problem: "",
          solution: "",
          missionSummary: "",
          locationOfImpact: "",
          twitter: "",
          github: "",
          discord: "",
          website: "",
          linkedin: "",
          pitchDeck: "",
          demoVideo: "",
          farcaster: "",
          profilePicture: "",
          businessModel: "",
          stageIn: "",
          raisedMoney: "",
          pathToTake: "",
          recipient: "",
        });
        setContacts([]);
        setCustomLinks([]);
        setStep(0);
        setFaucetFunded(false);
        // Clear all logo state in create mode
        setUploadedLogoFile(null);
        setLogoPreviewUrl(null);
        setIsLogoUploading(false);
        setLogoUploadProgress(0);
        setTempLogoKey(null);
      }
    }
  }, [isOpen, projectToUpdate, reset, dataToUpdate]);

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  useEffect(() => {
    if (isOpen && !isAuth) {
      login?.();
      closeModal();
    }
  }, [isOpen, isAuth, closeModal, login]);

  const validateCustomLinks = () => {
    return customLinks.some((link) => !link.name.trim() || !link.url.trim());
  };

  const hasErrors = () => {
    if (step === 0) {
      return (
        !!errors?.title ||
        !!errors?.recipient ||
        !!errors?.locationOfImpact ||
        !!errors?.description ||
        !!errors?.problem ||
        !!errors?.solution ||
        !!errors?.missionSummary ||
        !watch("title") ||
        !watch("description") ||
        !watch("problem") ||
        !watch("solution") ||
        !watch("missionSummary")
      );
    }
    if (step === 1) {
      return (
        !!errors?.twitter ||
        !!errors?.github ||
        !!errors?.discord ||
        !!errors?.website ||
        !!errors?.linkedin ||
        !!errors?.pitchDeck ||
        !!errors?.demoVideo ||
        !!errors?.farcaster ||
        !!errors?.profilePicture ||
        validateCustomLinks()
      );
    }
    if (step === 3) {
      return !contacts.length || !!errors?.chainID || !watch("chainID");
    }

    return false;
  };

  const checkFormAndTriggerErrors = async (callback?: () => void) => {
    const stepsToValidate: Record<number, (keyof SchemaType)[]> = {
      0: [
        "title",
        "recipient",
        "locationOfImpact",
        "description",
        "problem",
        "solution",
        "missionSummary",
      ],
      1: [
        "twitter",
        "github",
        "discord",
        "website",
        "linkedin",
        "pitchDeck",
        "demoVideo",
        "farcaster",
        "profilePicture",
      ],
      3: ["chainID"],
    };

    if (stepsToValidate[step]) {
      const triggerResult = await trigger(stepsToValidate[step], {
        shouldFocus: true,
      });
      if (!triggerResult) return;
    }
    if (step === 3) {
      if (!contacts.length) return;
    }
    callback?.();
  };

  const createProject = async (data: SchemaType): Promise<void> => {
    try {
      setIsLoading(true);
      if (!isConnected || !isAuth) {
        login?.();
        return;
      }
      if (!address) return;
      if (!gap) return;

      const chainSelected = data.chainID;

      // Ensure we're on the correct chain
      const { success, chainId, gapClient } = await ensureCorrectChain({
        targetChainId: chainSelected,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      const project = new Project({
        data: {
          project: true,
        },
        schema: gapClient.findSchema("Project"),
        recipient: (data.recipient || address) as Hex,
        uid: nullRef,
      });

      interface NewProjectData extends IProjectDetails {
        // tags?: Tag[];
        members?: Hex[];
        links: Array<ExternalLink[0] | ExternalCustomLink>;
        recipient?: string;
      }
      const { chainID, ...rest } = data;
      const newProjectInfo: NewProjectData = {
        ...rest,
        members: [(data.recipient || address) as Hex],
        links: [
          {
            type: "twitter",
            url: data.twitter || "",
          },
          {
            type: "github",
            url: data.github || "",
          },
          {
            type: "discord",
            url: data.discord || "",
          },
          {
            type: "website",
            url: data.website || "",
          },
          {
            type: "linkedin",
            url: data.linkedin || "",
          },
          {
            type: "pitchDeck",
            url: data.pitchDeck || "",
          },
          {
            type: "demoVideo",
            url: data.demoVideo || "",
          },
          {
            type: "farcaster",
            url: data.farcaster || "",
          },
          ...(customLinks?.map((link) => ({
            type: "custom",
            name: link.name.trim(),
            url: link.url.trim(),
          })) || []),
        ],
        imageURL: data.profilePicture || "",
      };

      if (!gapClient) return;

      const slug = await gapClient.generateSlug(newProjectInfo.title);

      // Promote temporary logo to permanent before project creation
      let finalImageURL = data.profilePicture || "";
      if (tempLogoKey) {
        try {
          const projectIdentifier = `${slug}-${chainSelected}`;

          const [promoteData, promoteError] = await fetchData(
            INDEXER.PROJECT.LOGOS.PROMOTE_TO_PERMANENT(),
            "POST",
            {
              tempKey: tempLogoKey,
              projectId: projectIdentifier,
            }
          );

          if (!promoteError) {
            const { permanentUrl } = promoteData;
            finalImageURL = permanentUrl;
          } else {
            console.warn("Failed to promote logo to permanent status, using temp URL");
          }
        } catch (error) {
          console.warn("Error promoting logo before project creation:", error);
          // Continue with temp URL if promotion fails
        }
      }

      newProjectInfo.imageURL = finalImageURL;

      // eslint-disable-next-line no-param-reassign
      project.details = new ProjectDetails({
        data: {
          title: newProjectInfo.title,
          description: newProjectInfo.description,
          problem: newProjectInfo.problem,
          solution: newProjectInfo.solution,
          missionSummary: newProjectInfo.missionSummary,
          locationOfImpact: newProjectInfo.locationOfImpact,
          imageURL: finalImageURL,
          links: newProjectInfo.links,
          slug,
          tags: newProjectInfo.tags?.map((tag) => ({
            name: tag.name,
          })),
          businessModel: newProjectInfo.businessModel,
          stageIn: newProjectInfo.stageIn,
          raisedMoney: newProjectInfo.raisedMoney,
          pathToTake: newProjectInfo.pathToTake,
        },
        refUID: project.uid,
        schema: gapClient.findSchema("ProjectDetails"),
        recipient: project.recipient,
        uid: nullRef,
      });

      if (newProjectInfo.tags) {
        // eslint-disable-next-line no-param-reassign
        project.details.tags = newProjectInfo.tags?.map((t) => ({
          name: t.name,
        }));
      }

      if (newProjectInfo.members) {
        // eslint-disable-next-line no-param-reassign
        project.members = newProjectInfo.members?.map(
          (member) =>
            new MemberOf({
              recipient: member,
              refUID: project.uid,
              schema: gapClient.findSchema("MemberOf"),
              uid: nullRef,
              data: {
                memberOf: true,
              },
            })
        );
      }

      // Use chainId from ensureCorrectChain result to ensure we're using the correct chain
      const { walletClient, error } = await safeGetWalletClient(chainId);

      if (error || !walletClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      changeStepperStep("preparing");
      await project.attest(walletSigner, changeStepperStep).then(async (res) => {
        let retries = 5;
        const txHash = res?.tx[0]?.hash;
        if (txHash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, chainId), "POST", {});
        }
        let fetchedProject: ProjectResponse | null = null;
        changeStepperStep("indexing");

        // First, poll using checkSlugExists to avoid 404 errors in Sentry
        const projectIdentifier = slug || project.uid;
        while (retries > 0) {
          // eslint-disable-next-line no-await-in-loop
          const exists = await checkSlugExists(projectIdentifier);
          if (exists) {
            // Project is indexed, now fetch the full details
            // eslint-disable-next-line no-await-in-loop
            fetchedProject = await getProject(projectIdentifier);
            break;
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        if (fetchedProject?.uid && fetchedProject.uid !== zeroHash) {
          if (data.github) {
            const githubFromField = data.github.includes("http")
              ? data.github
              : `https://${data.github}`;
            const repoUrl = new URL(githubFromField);
            const pathParts = repoUrl.pathname.split("/").filter(Boolean);
            if (repoUrl.hostname.includes("github.com") && pathParts.length >= 2) {
              const owner = pathParts[0];
              const repoName = pathParts[1];

              const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);

              if (!response.ok) {
                toast.error("Failed to fetch GitHub repository");
                throw new Error("Failed to fetch GitHub repository");
              }

              const repoData = await response.json();
              if (repoData.private) {
                toast.error("GitHub repository is private");
                throw new Error("GitHub repository is private");
              }

              const [_githubUpdateData, error] = await fetchData(
                INDEXER.PROJECT.EXTERNAL.UPDATE(fetchedProject.uid),
                "PUT",
                {
                  target: "github",
                  ids: [repoUrl.href],
                }
              );
              if (error) {
                toast.error("Failed to update GitHub repository");
                throw new Error("Failed to update GitHub repository");
              }
            }
          }

          const [, subscriptionError] = await fetchData(
            INDEXER.SUBSCRIPTION.CREATE(fetchedProject.uid),
            "POST",
            { contacts },
            {},
            {},
            true
          );

          if (subscriptionError) {
            toast.error("Something went wrong with contact info save. Please try again later.", {
              className: "z-[9999]",
            });
          }

          toast.success(MESSAGES.PROJECT.CREATE.SUCCESS);
          changeStepperStep("indexed");
          closeModal();
          router.push(PAGES.PROJECT.SCREENS.NEW_GRANT(slug || project.uid));
          router.refresh();
        }
      });

      reset();
      setStep(0);
      setIsStepper(false);
      setContacts([]);
      setCustomLinks([]);
    } catch (error: any) {
      errorManager(
        MESSAGES.PROJECT.CREATE.ERROR(data.title),
        error,
        {
          address,
          data,
        },
        {
          error: MESSAGES.PROJECT.CREATE.ERROR(data.title),
        }
      );
      setIsStepper(false);
      // Don't reset form on error - keep user's data (modal stays open)
    } finally {
      setIsLoading(false);
    }
  };

  const updateThisProject = async (data: SchemaType): Promise<void> => {
    try {
      setIsLoading(true);
      if (!isConnected || !isAuth) {
        login?.();
        return;
      }
      if (!address) {
        throw new Error("Address not found");
      }
      if (!projectToUpdate) {
        throw new Error("Project to update not found");
      }
      if (!dataToUpdate) {
        throw new Error("Data to update not found");
      }
      if (!gap) {
        throw new Error("Gap client not found");
      }

      const targetChainId = projectToUpdate.chainID;

      // Ensure we're on the correct chain
      const { success, chainId, gapClient } = await ensureCorrectChain({
        targetChainId,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      const shouldRefresh = dataToUpdate.title === data.title;

      // Use chainId from ensureCorrectChain result
      const { walletClient, error } = await safeGetWalletClient(chainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(projectToUpdate.uid);
      if (!fetchedProject) return;
      changeStepperStep("preparing");

      // Promote temporary logo to permanent before project update
      let finalImageURL = data.profilePicture || "";
      if (tempLogoKey) {
        try {
          const [promoteData, promoteError] = await fetchData(
            INDEXER.PROJECT.LOGOS.PROMOTE_TO_PERMANENT(),
            "POST",
            {
              tempKey: tempLogoKey,
              projectId: fetchedProject.uid,
            }
          );

          if (!promoteError) {
            const { permanentUrl } = promoteData;
            finalImageURL = permanentUrl;
          } else {
            console.warn("Failed to promote logo to permanent status, using temp URL");
          }
        } catch (error) {
          console.warn("Error promoting logo before project update:", error);
          // Continue with temp URL if promotion fails
        }
      }

      const newProjectInfo = {
        title: data.title,
        description: data.description,
        problem: data.problem,
        solution: data.solution,
        missionSummary: data.missionSummary,
        locationOfImpact: data.locationOfImpact,
        tags: dataToUpdate.tags?.map((item) => ({ name: item })) || [],
        businessModel: data.businessModel,
        stageIn: data.stageIn,
        raisedMoney: data.raisedMoney,
        pathToTake: data.pathToTake,
        imageURL: finalImageURL,
      };
      const socialData = {
        discord: data.discord,
        github: data.github,
        linkedin: data.linkedin,
        twitter: data.twitter,
        website: data.website,
        pitchDeck: data.pitchDeck,
        demoVideo: data.demoVideo,
        farcaster: data.farcaster,
        customLinks,
      };

      // Handle GitHub repository update if changed
      if (data.github && !(projectToUpdate as any).external?.github?.includes(data.github)) {
        const githubFromField = data.github.includes("http")
          ? data.github
          : `https://${data.github}`;
        const repoUrl = new URL(githubFromField);
        const pathParts = repoUrl.pathname.split("/").filter(Boolean);
        if (repoUrl.hostname.includes("github.com") && pathParts.length >= 2) {
          const owner = pathParts[0];
          const repoName = pathParts[1];

          const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);

          if (!response.ok) {
            throw new Error("Failed to fetch GitHub repository");
          }

          const repoData = await response.json();
          if (repoData.private) {
            throw new Error("GitHub repository is private");
          }

          const ids = (fetchedProject as any).external?.github || [];

          const [_githubUpdateData, error] = await fetchData(
            INDEXER.PROJECT.EXTERNAL.UPDATE(fetchedProject.uid),
            "PUT",
            {
              target: "github",
              ids: [...ids, repoUrl.href],
            }
          );
          if (error) {
            throw new Error("Failed to update GitHub repository");
          }
        }
      }

      await updateProject(
        fetchedProject,
        newProjectInfo,
        socialData,
        walletSigner,
        gapClient,
        changeStepperStep,
        closeModal
      ).then(async (res) => {
        toast.success(MESSAGES.PROJECT.UPDATE.SUCCESS);
        setStep(0);
        if (shouldRefresh) {
          refreshProject();
        } else {
          const project = res.details?.slug || res.uid;
          router.push(PAGES.PROJECT.OVERVIEW(project));
          router.refresh();
        }
      });
    } catch (error: any) {
      errorManager(
        `Error updating project ${projectToUpdate?.details?.slug || projectToUpdate?.uid}`,
        error,
        { ...data, address },
        {
          error: MESSAGES.PROJECT.UPDATE.ERROR,
        }
      );
      openModal();
    } finally {
      setIsLoading(false);
      setIsStepper(false);
      setCustomLinks([]);
    }
  };

  const onSubmit = async (data: SchemaType) => {
    const sanitizedData = sanitizeObject(data);
    if (projectToUpdate) {
      updateThisProject(sanitizedData);
    } else {
      createProject(sanitizedData);
    }
  };

  const { data: contactsInfo } = useContactInfo(projectToUpdate?.uid);

  useEffect(() => {
    if (projectToUpdate) {
      setContacts((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(contactsInfo || [])) return prev;
        return contactsInfo || [];
      });
    }
  }, [contactsInfo, projectToUpdate]);

  const tooltipText = () => {
    const errors = hasErrors();
    if (isLoading) {
      return <p>Loading...</p>;
    }
    if (!errors) {
      return;
    }

    return <p>Please fill all the required fields</p>;
  };

  const [isSearchingProject, setIsSearchingProject] = useState(false);
  const [existingProjects, setExistingProjects] = useState<ProjectResponse[]>([]);

  const searchByExistingName = debounce(async (value: string) => {
    if (
      value.length < 3 ||
      (projectToUpdate &&
        value.toLowerCase() === (projectToUpdate as ProjectResponse).details?.title?.toLowerCase())
    ) {
      return;
    }
    try {
      setIsSearchingProject(true);
      const result = await searchProjects(value);
      const hasEqualTitle =
        result.filter((item) => item.details?.title?.toLowerCase() === value.toLowerCase()).length >
        0;
      if (hasEqualTitle) {
        setExistingProjects(result);
        setError("title", {
          message:
            "We found a project with similar name. Please double check to make sure you don't already have a project in our platform.",
        });
      } else {
        setExistingProjects([]);
      }
      return;
    } catch (_error) {
    } finally {
      setIsSearchingProject(false);
    }
  }, 500);

  const categories = [
    {
      title: "General info",
      desc: "These are the basics about your project",
      fields: (
        <div className="flex w-full flex-col gap-8 max-w-3xl">
          {isSimilarProjectsModalOpen ? (
            <SimilarProjectsDialog
              similarProjects={existingProjects}
              projectName={watch("title")}
            />
          ) : null}
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="name-input" className={labelStyle}>
              Name *
            </label>
            <input
              id="name-input"
              type="text"
              className={inputStyle}
              placeholder='e.g. "My awesome project"'
              {...register("title")}
              onBlur={() => {
                searchByExistingName(watch("title"));
              }}
            />
            <div className="flex flex-col gap-1 justify-start items-start">
              {isSearchingProject ? (
                <Skeleton className="w-full h-6" />
              ) : (
                <p className="text-red-500">
                  {errors.title?.message}{" "}
                  {errors.title?.message?.includes("similar") ? (
                    <>
                      <span>If you need help getting access to your project, message us </span>
                      <ExternalLinkComponent
                        className="underline text-red-700 dark:text-red-300"
                        href={SOCIALS.TELEGRAM}
                      >
                        {SOCIALS.TELEGRAM}.
                      </ExternalLinkComponent>{" "}
                    </>
                  ) : null}
                </p>
              )}
              {errors.title?.message?.includes("similar") ? (
                <button
                  type="button"
                  className="text-blue-500 underline cursor-pointer bg-transparent border-none p-0"
                  style={{
                    userSelect: "none",
                  }}
                  onClick={() => {
                    openSimilarProjectsModal();
                  }}
                >
                  View similar projects
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2" data-color-mode="light">
            <label htmlFor="desc-input" className={labelStyle}>
              Description *
            </label>
            <MarkdownEditor
              value={watch("description")}
              onChange={(newValue: string) => {
                setValue("description", newValue || "", {
                  shouldValidate: true,
                });
              }}
            />
            <p className="text-red-500">{errors.description?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2" data-color-mode="light">
            <label htmlFor="desc-input" className={labelStyle}>
              Problem *
            </label>
            <MarkdownEditor
              placeholderText="e.g. Climate change is a serious problem that is affecting our planet
              and we are building a platform that connects people with similar interests."
              value={watch("problem")}
              onChange={(newValue: string) => {
                setValue("problem", newValue || "", {
                  shouldValidate: true,
                });
              }}
            />
            <p className="text-red-500">{errors.problem?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2" data-color-mode="light">
            <label htmlFor="desc-input" className={labelStyle}>
              Solution *
            </label>
            <MarkdownEditor
              placeholderText="We are solving this problem by building a platform that connects people with similar interests."
              value={watch("solution")}
              onChange={(newValue: string) => {
                setValue("solution", newValue || "", {
                  shouldValidate: true,
                });
              }}
            />
            <p className="text-red-500">{errors.solution?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2" data-color-mode="light">
            <label htmlFor="desc-input" className={labelStyle}>
              Mission Summary *
            </label>
            <MarkdownEditor
              placeholderText="e.g. We are on a mission to build a better world by solving the problem of climate change."
              value={watch("missionSummary")}
              onChange={(newValue: string) => {
                setValue("missionSummary", newValue || "", {
                  shouldValidate: true,
                });
              }}
            />
            <p className="text-red-500">{errors.missionSummary?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="location-impact-input" className={labelStyle}>
              Location of Impact (optional)
            </label>
            <input
              id="location-impact-input"
              placeholder="e.g. Global, India, Africa, etc."
              type="text"
              className={inputStyle}
              {...register("locationOfImpact")}
            />
            <p className="text-red-500">{errors.locationOfImpact?.message}</p>
          </div>

          {isOwner && !projectToUpdate && (
            <div className="flex w-full flex-col gap-2">
              <label htmlFor="recipient-input" className={labelStyle}>
                Recipient address
              </label>
              <input
                id="recipient-input"
                type="text"
                className={inputStyle}
                placeholder="0xab...0xbf2"
                {...register("recipient")}
              />
              <p className="text-red-500">{errors.recipient?.message}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Add your socials",
      desc: "Add your social accounts",
      fields: (
        <div className="flex w-full flex-col gap-8 max-w-3xl">
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="twitter-input" className={labelStyle}>
              Twitter (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <TwitterIcon className="h-5 w-5" />
              <input
                id="twitter-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="Your/organization handle"
                {...register("twitter")}
              />
            </div>
            <p className="text-red-500">{errors.twitter?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="github-input" className={labelStyle}>
              Github (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <GithubIcon className="h-5 w-5" />
              <input
                id="github-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="Your username or organization name"
                {...register("github")}
              />
            </div>
            <p className="text-red-500">{errors.github?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="discord-input" className={labelStyle}>
              Discord (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <DiscordIcon className="h-5 w-5" />
              <input
                id="discord-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="Your username or organization Discord server"
                {...register("discord")}
              />
            </div>
            <p className="text-red-500">{errors.discord?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="website-input" className={labelStyle}>
              Website (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <WebsiteIcon className="h-5 w-5" />
              <input
                id="website-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="https://karmahq.xyz"
                {...register("website")}
              />
            </div>
            <p className="text-red-500">{errors.website?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="linkedin-input" className={labelStyle}>
              LinkedIn (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <LinkedInIcon className="h-5 w-5 " />
              <input
                id="linkedin-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="Your/organization link"
                {...register("linkedin")}
              />
            </div>
            <p className="text-red-500">{errors.linkedin?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="pitch-deck-input" className={labelStyle}>
              Pitch Deck (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <DeckIcon className="h-5 w-5" />
              <input
                id="pitch-deck-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="https://pitchdeck.com"
                {...register("pitchDeck")}
              />
            </div>
            <p className="text-red-500">{errors.pitchDeck?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="demo-input" className={labelStyle}>
              Demo video (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <VideoIcon className="h-5 w-5" />
              <input
                id="demo-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="https://youtube.com/watch?v=demo"
                {...register("demoVideo")}
              />
            </div>
            <p className="text-red-500">{errors.demoVideo?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="farcaster-input" className={labelStyle}>
              Farcaster (optional)
            </label>
            <div className="flex w-full flex-row items-center gap-2 rounded-lg border border-gray-400 px-4 py-2">
              <FarcasterIcon className="h-5 w-5" />
              <input
                id="farcaster-input"
                type="text"
                className={socialMediaInputStyle}
                placeholder="https://warpcast.com/my-project"
                {...register("farcaster")}
              />
            </div>
            <p className="text-red-500">{errors.farcaster?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="profile-logo-input" className={labelStyle}>
              Project Logo (optional)
            </label>
            {logoPreviewUrl && !isLogoUploading && (
              <div className="flex flex-col gap-2">
                <img
                  src={logoPreviewUrl}
                  alt="Logo preview"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setUploadedLogoFile(null);
                    setLogoPreviewUrl(null);
                    setValue("profilePicture", "", { shouldValidate: true });
                    setTempLogoKey(null);
                  }}
                  className="text-sm text-red-600 hover:text-red-800 self-start"
                >
                  Remove Logo
                </button>
              </div>
            )}
            <FileUpload
              useS3Upload={true}
              onFileSelect={(file: File) => {
                setUploadedLogoFile(file);
              }}
              onS3UploadComplete={(finalUrl: string, tempKey: string) => {
                setValue("profilePicture", finalUrl, { shouldValidate: true });
                setLogoPreviewUrl(finalUrl);
                setTempLogoKey(tempKey);
                setIsLogoUploading(false);
              }}
              onS3UploadError={(_error: string) => {
                setUploadedLogoFile(null);
                setLogoPreviewUrl(null);
                setValue("profilePicture", "", { shouldValidate: true });
                setIsLogoUploading(false);
                setTempLogoKey(null);
              }}
              onUploadProgress={(progress: number) => {
                setLogoUploadProgress(progress);
                setIsLogoUploading(progress > 0 && progress < 100);
              }}
              acceptedFormats="image/*"
              uploadedFile={uploadedLogoFile}
              description="Max 5MB, Square (1:1) ratio required, JPEG/PNG/WebP"
              className="w-full"
              maxFileSize={5 * 1024 * 1024}
              allowedFileTypes={["image/jpeg", "image/png", "image/webp"]}
            />
            <p className="text-red-500">{errors.profilePicture?.message}</p>
          </div>

          {/* Custom Links Section */}
          <div className="flex w-full flex-col gap-4">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Custom Links
              </h4>
              {customLinks.map((link, index) => (
                <div key={link.id} className="flex w-full flex-col gap-2 mb-4">
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label htmlFor={`custom-link-name-${index}`} className={labelStyle}>
                        Name
                      </label>
                      <input
                        id={`custom-link-name-${index}`}
                        type="text"
                        value={link.name}
                        onChange={(e) => {
                          const updatedLinks = [...customLinks];
                          updatedLinks[index].name = e.target.value;
                          setCustomLinks(updatedLinks);
                        }}
                        className={inputStyle}
                        placeholder="e.g., Documentation, Blog"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label htmlFor={`custom-link-url-${index}`} className={labelStyle}>
                        URL
                      </label>
                      <input
                        id={`custom-link-url-${index}`}
                        type="text"
                        value={link.url}
                        onChange={(e) => {
                          const updatedLinks = [...customLinks];
                          updatedLinks[index].url = e.target.value;
                          setCustomLinks(updatedLinks);
                        }}
                        className={inputStyle}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedLinks = customLinks.filter((_, i) => i !== index);
                          setCustomLinks(updatedLinks);
                        }}
                        className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newLink: CustomLink = {
                    id: `custom-${Date.now()}`,
                    name: "",
                    url: "",
                  };
                  const updatedLinks = [...customLinks, newLink];
                  setCustomLinks(updatedLinks);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <PlusIcon className="h-4 w-4" />
                Add New Link
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Project stage",
      desc: "What stage is your project at?",
      fields: (
        <div className="flex w-full flex-col gap-8 max-w-3xl">
          <p className="text-black dark:text-white">
            Answer few more questions below and we can help you take your project to next level by
            either recommending grants or introduce to funders/investors.
          </p>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="business-modal-input" className={labelStyle}>
              What is your business model? (optional)
            </label>
            <input
              id="business-modal-input"
              type="text"
              className={inputStyle}
              placeholder="Describe your business model"
              {...register("businessModel")}
            />
            <p className="text-red-500">{errors.businessModel?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="stage-input" className={labelStyle}>
              What stage are you in? (optional)
            </label>
            <input
              id="stage-input"
              type="text"
              className={inputStyle}
              placeholder="e.g. MVP, Seed, Series A, Series B, Series C"
              {...register("stageIn")}
            />
            <p className="text-red-500">{errors.stageIn?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="raised-money-input" className={labelStyle}>
              How much money have you raised from grants or investors? (optional)
            </label>
            <input
              id="raised-money-input"
              type="text"
              className={inputStyle}
              placeholder="120k USD"
              {...register("raisedMoney")}
            />
            <p className="text-red-500">{errors.raisedMoney?.message}</p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor="raised-money-input" className={labelStyle}>
              What path do you want to take? (optional)
            </label>
            <select
              className={inputStyle}
              value={watch("pathToTake") || "none"}
              onChange={(e) => {
                setValue("pathToTake", e.target.value);
              }}
            >
              <option className="font-body" disabled key="None" value="none">
                Select
              </option>
              {[
                "Have raised VC round",
                "Want to raise from VCs",
                "Want to grow through just grant funding",
                "Just want it to build it as side gig",
              ].map((item) => (
                <option className="font-body" key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      title: "Contact info",
      desc: "How can we contact you?",
      fields: (
        <div className="flex w-full min-w-[320px] flex-col gap-8">
          <ContactInfoSection
            existingContacts={contacts}
            isEditing={!!projectToUpdate}
            addContact={(contact) => {
              const withoutContact = contacts.filter((c) => c.id !== contact.id);
              setContacts([...withoutContact, contact]);
            }}
            removeContact={(contact) => setContacts(contacts.filter((c) => c.id !== contact.id))}
          />
          {!projectToUpdate ? (
            <div className="flex w-full flex-col gap-2 border-t border-zinc-200 dark:border-zinc-700 pt-8">
              <label htmlFor="chain-id-input" className={labelStyle}>
                Choose a network to create your project
              </label>
              <NetworkDropdown
                onSelectFunction={(networkId) => {
                  setValue("chainID", networkId, {
                    shouldValidate: true,
                  });
                  // Reset faucet funding status when network changes
                  setFaucetFunded(false);
                }}
                onNetworkChange={handleNetworkChange}
                isChangingNetwork={isChangingNetwork}
                networks={gapSupportedNetworks}
                previousValue={watch("chainID")}
              />
              <p className="text-red-500">{errors.chainID?.message}</p>

              {/* Show network status */}
              {isChangingNetwork && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Switching to selected network...
                  </p>
                </div>
              )}

              {/* Add FaucetSection for gas funding - keep visible even after funding */}
              {watch("chainID") && walletSigner && !isChangingNetwork && (
                <FaucetSection
                  chainId={watch("chainID")}
                  projectFormData={{
                    title: watch("title"),
                    description: watch("description"),
                    problem: watch("problem"),
                    solution: watch("solution"),
                    missionSummary: watch("missionSummary"),
                    locationOfImpact: watch("locationOfImpact"),
                    profilePicture: watch("profilePicture"),
                    twitter: watch("twitter"),
                    github: watch("github"),
                    discord: watch("discord"),
                    website: watch("website"),
                    linkedin: watch("linkedin"),
                    pitchDeck: watch("pitchDeck"),
                    demoVideo: watch("demoVideo"),
                    farcaster: watch("farcaster"),
                    recipient: watch("recipient"),
                    businessModel: watch("businessModel"),
                    stageIn: watch("stageIn"),
                    raisedMoney: watch("raisedMoney"),
                    pathToTake: watch("pathToTake"),
                    customLinks: customLinks,
                  }}
                  walletSigner={walletSigner}
                  recipient={(watch("recipient") || address) as Hex}
                  onFundsReceived={async () => {
                    setFaucetFunded(true);
                    toast.success("Wallet funded! You can now create your project.");

                    // Refresh wallet signer after funding
                    try {
                      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for blockchain state
                      const chainId = watch("chainID");
                      if (chainId) {
                        const { walletClient, error } = await safeGetWalletClient(chainId);
                        if (!error && walletClient) {
                          const signer = await walletClientToSigner(walletClient);
                          setWalletSigner(signer);
                        }
                      }
                    } catch (error) {
                      console.error("Failed to refresh wallet signer after funding:", error);
                    }
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      {buttonElement ? (
        <Button
          type="button"
          onClick={openModal}
          id="new-project-button"
          className={buttonElement.styleClass}
        >
          {buttonElement.iconSide === "left" && buttonElement.icon}
          {buttonElement.text}
          {buttonElement.iconSide === "right" && buttonElement.icon}
        </Button>
      ) : null}

      {isOpen && (
        <Transition appear show={true} as={Fragment}>
          <Dialog as="div" className="relative z-[100]" onClose={closeModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-max max-w-max transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100"
                    >
                      {projectToUpdate ? "Edit project" : "Create a new project!"}
                    </Dialog.Title>
                    <button
                      type="button"
                      className="top-6 absolute right-6 hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                      onClick={closeModal}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    {!projectToUpdate && (
                      <div className="mt-2  max-w-3xl">
                        <p className="text-sm text-gray-600 dark:text-zinc-300">
                          We&apos;ll start by outlining some basics about your project. Don&apos;t
                          worry about grants right now, you can add that from your Project Page once
                          it&apos;s been created.
                        </p>
                      </div>
                    )}

                    {/* Screens start */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="w-full px-2 py-4 sm:px-0 max-w-3xl">
                        <div>
                          <div className="flex space-x-1 rounded-xl p-1 gap-2">
                            {categories.map((category, index) => (
                              <button
                                type="button"
                                key={category.title}
                                className={cn(
                                  "w-full pt-2.5 text-sm font-medium leading-5 items-start flex flex-col justify-start text-left duration-200 ease-in-out transition-all focus:outline-none focus-visible:outline-none focus-within:outline-none active:outline-none",
                                  index <= step
                                    ? "text-blue-700 dark:text-blue-400 border-t-4 border-t-brand-blue"
                                    : "text-zinc-600 dark:text-blue-100 border-t-4 border-t-zinc-400 hover:opacity-70"
                                )}
                                // onClick={() => setStep(index)}
                                disabled={projectToUpdate && index === categories.length - 1}
                              >
                                <h5>{category.title}</h5>
                                <p className="text-zinc-600 dark:text-blue-100">{category.desc}</p>
                              </button>
                            ))}
                          </div>
                          <div
                            className={cn(
                              "rounded-xl bg-transparent py-4 px-1 text-black dark:text-white"
                            )}
                          >
                            {categories[step].fields}
                          </div>
                        </div>
                      </div>
                      {/* Screens end */}

                      <div className="mt-4 flex flex-row justify-end gap-4">
                        <Button
                          type="button"
                          variant={"outline"}
                          className="border-border"
                          onClick={() => {
                            if (step === 0) {
                              closeModal();
                            } else {
                              setStep((oldStep) => (oldStep > 0 ? oldStep - 1 : oldStep));
                            }
                          }}
                          disabled={isLoading}
                        >
                          {step === 0 ? (
                            "Cancel"
                          ) : (
                            <>
                              <ChevronRightIcon className="w-4 h-4 transform rotate-180" />
                              Back
                            </>
                          )}
                        </Button>
                        {step < categories.length - 1 && (
                          <Tooltip.Provider>
                            <Tooltip.Root delayDuration={0}>
                              <Tooltip.Trigger asChild>
                                <div className="flex w-max h-max">
                                  <Button
                                    type="button"
                                    className="flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                    onClick={() => {
                                      const nextStep = () =>
                                        setStep((oldStep) =>
                                          oldStep >= categories.length - 1 ? oldStep : oldStep + 1
                                        );
                                      checkFormAndTriggerErrors(nextStep);
                                    }}
                                    disabled={hasErrors() || isLoading}
                                  >
                                    Next
                                    <ChevronRightIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                {hasErrors() || isLoading ? (
                                  <Tooltip.Content
                                    className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 z-[1000]"
                                    sideOffset={5}
                                    side="bottom"
                                  >
                                    {tooltipText()}
                                    <Tooltip.Arrow className="TooltipArrow" />
                                  </Tooltip.Content>
                                ) : null}
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        )}

                        {step === categories.length - 1 && (
                          <Tooltip.Provider>
                            <Tooltip.Root delayDuration={0}>
                              <Tooltip.Trigger asChild>
                                <div className="flex w-max h-max">
                                  <Button
                                    type={"submit"}
                                    className="flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                    disabled={hasErrors() || isLoading}
                                  >
                                    {projectToUpdate ? "Update project" : "Create project"}
                                    {!projectToUpdate ? (
                                      <ChevronRightIcon className="w-4 h-4" />
                                    ) : null}
                                  </Button>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                {hasErrors() || isLoading ? (
                                  <Tooltip.Content
                                    className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 z-[1000]"
                                    sideOffset={5}
                                    side="bottom"
                                  >
                                    {tooltipText()}
                                    <Tooltip.Arrow className="TooltipArrow" />
                                  </Tooltip.Content>
                                ) : null}
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        )}
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}
    </>
  );
};
