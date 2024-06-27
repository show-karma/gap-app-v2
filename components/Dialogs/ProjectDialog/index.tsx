/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import { Dialog, Tab, Transition } from "@headlessui/react";
import {
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import { z } from "zod";
import { Hex, isAddress, zeroHash } from "viem";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ExternalLink,
  IProjectDetails,
  MemberOf,
  Project,
  ProjectDetails,
  nullRef,
} from "@show-karma/karma-gap-sdk";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { getGapClient, useGap } from "@/hooks";
import { Button } from "@/components/Utilities/Button";
import {
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
  DiscordIcon,
  WebsiteIcon,
} from "@/components/Icons";
import { useProjectStore } from "@/store";
import { useOwnerStore } from "@/store/owner";
import { MESSAGES } from "@/utilities/messages";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { appNetwork } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useAuthStore } from "@/store/auth";
import { getWalletClient } from "@wagmi/core";
import { useStepper } from "@/store/txStepper";
import { updateProject } from "@/utilities/sdk/projects/editProject";
import { ContactInfoSection } from "./ContactInfoSection";
import { Contact } from "@/types/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { config } from "@/utilities/wagmi/config";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const socialMediaInputStyle =
  "bg-transparent border-0 flex flex-1 p-2 focus:outline-none outline-none focus-visible:outline-none dark:bg-zinc-900 dark:text-white text-sm rounded-md";
const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  title: z.string().min(3, { message: MESSAGES.PROJECT_FORM.TITLE }),
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
  businessModel: z.string().optional(),
  stageIn: z.string().optional(),
  raisedMoney: z.string().optional(),
  pathToTake: z.string().optional(),
});

type SchemaType = z.infer<typeof schema>;

type ProjectDialogProps = {
  buttonElement?: {
    text?: string;
    icon?: ReactNode;
    iconSide?: "left" | "right";
    styleClass: string;
  };
  projectToUpdate?: Project;
  previousContacts?: Contact[];
};

export const ProjectDialog: FC<ProjectDialogProps> = ({
  buttonElement = {
    icon: <PlusIcon className="h-4 w-4 text-white" />,
    iconSide: "left",
    text: "New Project",
    styleClass: "",
  },
  projectToUpdate,
  previousContacts,
}) => {
  const dataToUpdate = {
    description: projectToUpdate?.details?.description || "",
    title: projectToUpdate?.details?.title || "",
    imageURL: projectToUpdate?.details?.imageURL,
    twitter: projectToUpdate?.details?.links?.find(
      (link) => link.type === "twitter"
    )?.url,
    github: projectToUpdate?.details?.links?.find(
      (link) => link.type === "github"
    )?.url,
    discord: projectToUpdate?.details?.links?.find(
      (link) => link.type === "discord"
    )?.url,
    website: projectToUpdate?.details?.links?.find(
      (link) => link.type === "website"
    )?.url,
    linkedin: projectToUpdate?.details?.links?.find(
      (link) => link.type === "linkedin"
    )?.url,
    tags: projectToUpdate?.details?.tags.map((item) => item.name),
    members: projectToUpdate?.members.map((item) => item.recipient),
    recipient: projectToUpdate?.recipient,
    businessModel: projectToUpdate?.details?.businessModel,
    stageIn: projectToUpdate?.details?.stageIn,
    raisedMoney: projectToUpdate?.details?.raisedMoney,
    pathToTake: projectToUpdate?.details?.pathToTake,
  };

  const [contacts, setContacts] = useState<Contact[]>(previousContacts || []);
  let [isOpen, setIsOpen] = useState(false);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [step, setStep] = useState(0);

  const isOwner = useOwnerStore((state) => state.isOwner);

  const { isConnected, address } = useAccount();
  const { isAuth } = useAuthStore();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [isLoading, setIsLoading] = useState(false);
  const { openConnectModal } = useConnectModal();
  const router = useRouter();
  const { gap } = useGap();

  const { changeStepperStep, setIsStepper } = useStepper();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

  const [description, setDescription] = useState(
    dataToUpdate?.description || ""
  );

  const [team, setTeam] = useState<string[]>(dataToUpdate?.members || []);
  const [teamInput, setTeamInput] = useState("");
  const [teamInputError, setTeamInputError] = useState<string | undefined>("");

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
    if (!projectToUpdate) {
      setContacts([]);
    }
  }

  // const addMemberToArray = () => {
  //   event?.preventDefault();
  //   event?.stopPropagation();
  //   const splittedMembers = new Set(
  //     teamInput.split(",").map((m) => m.trim().toLowerCase())
  //   );
  //   const uniqueMembers = Array.from(splittedMembers).filter(
  //     (m) => !team.includes(m)
  //   );
  //   setTeamInput("");
  //   setTeam((prev) => [...prev, ...uniqueMembers]);
  // };

  // const checkTeamError = () => {
  //   if (isAddress(teamInput) || teamInput.length === 0) {
  //     setTeamInputError(undefined);
  //     return;
  //   }
  //   const splittedMembers = teamInput
  //     .split(",")
  //     .map((m) => m.trim().toLowerCase());
  //   const checkArray = splittedMembers.every((address) => {
  //     return isAddress(address);
  //   });
  //   if (checkArray) {
  //     setTeamInputError(undefined);
  //     return;
  //   }
  //   setTeamInputError(MESSAGES.PROJECT_FORM.MEMBERS);
  // };

  // useEffect(() => {
  //   checkTeamError();
  // }, [teamInput]);

  const handleErrors = () => {
    const isDescriptionValid = !!description.length;
    if (step === 0) {
      return (
        !!errors?.title ||
        !!errors?.recipient ||
        !isDescriptionValid ||
        !watch("title")
      );
    }
    if (step === 1) {
      return (
        !!errors?.twitter ||
        !!errors?.github ||
        !!errors?.discord ||
        !!errors?.website ||
        !!errors?.linkedin
      );
    }
    if (step === 3) {
      return !contacts.length;
    }
    // if (step === 2) {
    //   return (
    //     !!teamInputError || !team.length || !isValid || !isDescriptionValid
    //   );
    // }

    return false;
  };

  const createProject = async (data: SchemaType) => {
    try {
      setIsLoading(true);
      if (!isConnected || !isAuth) {
        openConnectModal?.();
        return;
      }
      if (!address) return;
      if (!gap) return;
      let gapClient = gap;

      if (chain && !checkNetworkIsValid(chain?.id)) {
        await switchChainAsync?.({ chainId: appNetwork[0].id });
        gapClient = getGapClient(appNetwork[0].id);
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
        links: ExternalLink;
        recipient?: string;
      }

      const newProjectInfo: NewProjectData = {
        ...data,
        description,
        // members: team.map((item) => item as Hex),
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
        ],
        imageURL: "",
      };

      if (!gap) return;

      const slug = await gap.generateSlug(newProjectInfo.title);
      // eslint-disable-next-line no-param-reassign
      project.details = new ProjectDetails({
        data: {
          title: newProjectInfo.title,
          description: newProjectInfo.description,
          imageURL: "",
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
        schema: gap.findSchema("ProjectDetails"),
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
              schema: gap.findSchema("MemberOf"),
              uid: nullRef,
              data: {
                memberOf: true,
              },
            })
        );
      }

      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      closeModal();

      await project.attest(walletSigner, changeStepperStep).then(async () => {
        let retries = 1000;
        let fetchedProject: Project | null = null;
        changeStepperStep("indexing");
        while (retries > 0) {
          // eslint-disable-next-line no-await-in-loop
          fetchedProject = await (slug
            ? gap.fetch.projectBySlug(slug)
            : gap.fetch.projectById(project.uid as Hex)
          ).catch(() => null);
          if (fetchedProject?.uid && fetchedProject.uid !== zeroHash) {
            await fetchData(
              INDEXER.SUBSCRIPTION.CREATE(fetchedProject.uid),
              "POST",
              { contacts },
              {},
              {},
              true
            ).then(([res, error]) => {
              if (error) {
                toast.error(
                  "Something went wrong with contact info save. Please try again later.",
                  {
                    className: "z-[9999]",
                  }
                );
              }
              retries = 0;
              toast.success(MESSAGES.PROJECT.CREATE.SUCCESS);
              router.push(PAGES.PROJECT.GRANTS(slug || project.uid));
              changeStepperStep("indexed");
              return;
            });
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });

      reset();
      setDescription("");
      setTeam([]);
      setTeamInput("");
      setStep(0);
      setIsStepper(false);
      setContacts([]);
    } catch (error) {
      console.log({ error });
      toast.error(MESSAGES.PROJECT.CREATE.ERROR);
      setIsStepper(false);
      openModal();
    } finally {
      setIsLoading(false);
    }
  };

  const updateThisProject = async (data: SchemaType) => {
    let gapClient = gap;
    try {
      setIsLoading(true);
      if (!isConnected || !isAuth) {
        openConnectModal?.();
        return;
      }
      if (!address || !projectToUpdate) return;
      if (!gap) return;
      if (chain && chain.id !== projectToUpdate.chainID) {
        await switchChainAsync?.({ chainId: projectToUpdate.chainID });
        gapClient = getGapClient(projectToUpdate.chainID);
      }
      const shouldRefresh = dataToUpdate.title === data.title;
      const walletClient = await getWalletClient(config, {
        chainId: projectToUpdate.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await updateProject(
        projectToUpdate,
        {
          title: data.title,
          description: description,
          tags: dataToUpdate?.tags?.map((item) => ({ name: item })) || [],
          businessModel: data.businessModel,
          stageIn: data.stageIn,
          raisedMoney: data.raisedMoney,
          pathToTake: data.pathToTake,
        },
        {
          discord: data.discord,
          github: data.github,
          linkedin: data.linkedin,
          twitter: data.twitter,
          website: data.website,
        },
        walletSigner,
        gapClient,
        changeStepperStep,
        closeModal
      ).then(async (res) => {
        toast.success(MESSAGES.PROJECT.UPDATE.SUCCESS);
        setStep(0);
        if (shouldRefresh) {
          refreshProject();
          setIsStepper(false);
        } else {
          const project = res.details?.slug || res.uid;
          router.push(PAGES.PROJECT.OVERVIEW(project));
        }
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.PROJECT.UPDATE.ERROR);
      setIsStepper(false);
      openModal();
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SchemaType) => {
    if (projectToUpdate) {
      updateThisProject(data);
    } else {
      createProject(data);
    }
  };

  const contactsInfo = useProjectStore((state) => state.projectContactsInfo);

  useMemo(() => {
    if (projectToUpdate) {
      setContacts(contactsInfo || []);
    }
  }, [contactsInfo]);

  const categories = [
    {
      title: "General info",
      desc: "These are the basics about your project",
      fields: (
        <div className="flex w-full flex-col gap-8">
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
            />
            <p className="text-red-500">{errors.title?.message}</p>
          </div>

          <div className="flex w-full flex-col gap-2" data-color-mode="light">
            <label htmlFor="desc-input" className={labelStyle}>
              Description *
            </label>
            <MarkdownEditor
              value={description}
              onChange={(newValue: string) => {
                setDescription(newValue || "");
              }}
            />
          </div>

          {/* <div className="flex w-full flex-col gap-2">
        <label htmlFor="tags-input" className={labelStyle}>
        Tags (Helps users discover your project)
        </label>
        <input
          id="tags-input"
          type="text"
          className={inputStyle}
          placeholder="e.g. Dev Tool, Defi, NFT, Governance"
          {...register('tags')}
        />
        <p className="text-red-500">{errors.tags?.message}</p>
      </div> */}
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
        <div className="flex w-full flex-col gap-8">
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
                placeholder="https://gap.karmahq.xyz"
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
        </div>
      ),
    },
    {
      title: "Project stage",
      desc: "Tell us how is your project",
      fields: (
        <div className="flex w-full flex-col gap-8">
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
              How much money did you raise from investors? (optional)
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
                "No VC",
                "Only grants",
                "Public good sidegig always",
                "Want to raise",
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
        <div className="flex w-full min-w-[320px] flex-col gap-2">
          <ContactInfoSection
            existingContacts={contacts}
            isEditing={!!projectToUpdate}
            addContact={(contact) => {
              const withoutContact = contacts.filter(
                (c) => c.id !== contact.id
              );
              setContacts([...withoutContact, contact]);
            }}
            removeContact={(contact) =>
              setContacts(contacts.filter((c) => c.id !== contact.id))
            }
          />
        </div>
      ),
    },
    // {
    //   id: "teamMembers",
    //   title: "Team members",
    //   desc: "The wonderful people who built it",
    //   fields: (
    //     <div className="flex w-full flex-col gap-8">
    //       <div className="flex w-full flex-col gap-2">
    //         <label htmlFor="members-input" className={labelStyle}>
    //           Invite team members *
    //         </label>
    //         <div className="flex w-full flex-row items-center gap-2 max-sm:flex-col">
    //           <input
    //             id="members-input"
    //             type="text"
    //             className="flex flex-1 rounded-lg border border-gray-400 bg-transparent p-2 px-4 focus-visible:outline-none max-sm:w-full"
    //             placeholder="ETH address, comma separated"
    //             value={teamInput}
    //             onChange={(e) => setTeamInput(e.target.value)}
    //           />
    //           <button
    //             type="button"
    //             onClick={addMemberToArray}
    //             className="bg-black px-12 py-2 rounded-lg text-white transition-all duration-300 ease-in-out disabled:opacity-40 max-sm:w-full"
    //             disabled={!!teamInputError || !teamInput.length}
    //           >
    //             Add
    //           </button>
    //         </div>
    //         <p className="text-red-500">{teamInputError}</p>
    //         <div className="flex w-full flex-col items-center gap-4">
    //           {team.length ? (
    //             <div className="mt-2 h-1 w-20 rounded-full bg-gray-400" />
    //           ) : null}
    //           <div className="flex w-full flex-col gap-2">
    //             {team.map((member) => (
    //               <div
    //                 key={member}
    //                 className="flex w-full flex-row items-center justify-between truncate rounded border border-gray-400 p-2 max-sm:max-w-[330px]"
    //               >
    //                 <p className="w-min truncate font-sans font-normal text-slate-700 dark:text-zinc-100">
    //                   {member}
    //                 </p>
    //                 <button
    //                   type="button"
    //                   className="border border-black bg-white px-8 py-2 text-black transition-all duration-300 ease-in-out disabled:opacity-40"
    //                   onClick={() =>
    //                     setTeam((prev) => prev.filter((m) => m !== member))
    //                   }
    //                 >
    //                   Remove
    //                 </button>
    //               </div>
    //             ))}
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   ),
    // },
  ];

  return (
    <>
      <button
        onClick={openModal}
        className={cn(
          "flex justify-center min-w-max items-center gap-x-1 rounded-md bg-brand-blue border-2 border-brand-blue px-3 py-2 text-sm font-semibold text-white dark:text-zinc-100  hover:opacity-75 dark:hover:bg-primary-900",
          buttonElement.styleClass
        )}
        id="new-project-button"
      >
        {buttonElement.iconSide === "left" && buttonElement.icon}
        {buttonElement.text}
        {buttonElement.iconSide === "right" && buttonElement.icon}
      </button>
      <Transition appear show={isOpen} as={Fragment}>
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
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
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
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-zinc-300">
                        We’ll start by outlining some basics about your project.
                        Don’t worry about grants right now, you can add that
                        from your Project Page once it’s been created.
                      </p>
                    </div>
                  )}
                  {!projectToUpdate && (
                    <div className="bg-yellow-100 flex flex-row gap-4 rounded-md text-sm px-4 py-2 items-center my-3 dark:bg-yellow-900  text-orange-900 dark:text-white">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      <p>
                        If you have already created this project in another
                        platform, make sure you connect to the right wallet.
                      </p>
                    </div>
                  )}
                  {/* Screens start */}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="w-full px-2 py-4 sm:px-0">
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
                              disabled={
                                projectToUpdate &&
                                index === categories.length - 1
                              }
                            >
                              <h5>{category.title}</h5>
                              <p className="text-zinc-600 dark:text-blue-100">
                                {category.desc}
                              </p>
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
                      <button
                        type="button"
                        className="flex items-center flex-row gap-2 dark:border-white dark:text-zinc-100 justify-center rounded-md border bg-transparent border-gray-200 px-4 py-2 text-md font-medium text-black hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => {
                          if (step === 0) {
                            closeModal();
                          } else {
                            setStep((oldStep) =>
                              oldStep > 0 ? oldStep - 1 : oldStep
                            );
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
                      </button>
                      {step < categories.length - 1 && (
                        <Button
                          type="button"
                          className="flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          onClick={() => {
                            setStep((oldStep) =>
                              oldStep >= categories.length - 1
                                ? oldStep
                                : oldStep + 1
                            );
                          }}
                          disabled={handleErrors() || isLoading}
                          isLoading={isLoading}
                        >
                          Next
                          <ChevronRightIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {step === categories.length - 1 && (
                        <Button
                          type={"submit"}
                          className="flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          disabled={handleErrors() || isLoading}
                          isLoading={isLoading}
                        >
                          {projectToUpdate
                            ? "Update project"
                            : "Create project"}
                          {!projectToUpdate ? (
                            <ChevronRightIcon className="w-4 h-4" />
                          ) : null}
                        </Button>
                      )}
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
