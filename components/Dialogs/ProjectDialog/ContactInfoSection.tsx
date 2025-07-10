import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { APIContact, Contact } from "@/types/project";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { Button } from "@/components/Utilities/Button";
import { Hex } from "viem";
import Image from "next/image";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { generateRandomString } from "@/utilities/generateRandomString";

import { errorManager } from "@/components/Utilities/errorManager";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useMutation } from "@tanstack/react-query";

import { useWallet } from "@/hooks/useWallet";
import { useProjectQuery } from "@/hooks/useProjectQuery";

const labelStyle = "text-sm font-bold";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white";

interface ContactInfoSectionProps {
  existingContacts?: Contact[];
  contactInfo?: Contact;
  isEditing: boolean;
  addContact: (contact: Contact) => void;
  removeContact: (contact: Contact) => void;
}

const EmptyContactBlock = () => {
  return (
    <div
      className="h-full w-full flex flex-col gap-8 justify-center items-center px-12 py-6 bg-[#F5F8FF] dark:bg-zinc-800 rounded"
      style={{
        border: "dashed 2px #155EEF",
      }}
    >
      <div className="mt-8">
        <Image
          src="/icons/one.png"
          width={40}
          height={40}
          className="w-10 h-10"
          alt="We need at least ONE contact!"
        />
      </div>
      <div className="flex flex-col gap-0">
        <p className="text-center text-gray-900 dark:text-zinc-100 text-xl font-bold">
          We need at least ONE contact!
        </p>
        <p className="text-center text-gray-900 dark:text-zinc-300 text-base font-normal leading-normal">
          {`We'll notify you if your project qualifies for any grants
          (proactive and retroactive) and remind you about milestones and
          deadlines.`}
        </p>
      </div>
    </div>
  );
};

interface ContactBlockProps {
  onSelectFunction: (value: string) => void;
  contacts?: Contact[];
  value: string;
  deleteFunction: (value: string) => void;
  newContact: () => void;
}
const ContactBlock: FC<ContactBlockProps> = ({
  contacts,
  value,
  onSelectFunction,
  deleteFunction,
  newContact,
}) => {
  return (
    <div className="h-full flex flex-col gap-3 justify-start items-start p-4 w-full bg-[#F5F8FF] dark:bg-zinc-700 rounded-xl max-h-[364px]">
      <p className="text-gray-900 dark:text-zinc-100  text-base font-semibold leading-normal">
        My Contacts
      </p>
      <div className="flex flex-col gap-2 w-full overflow-y-auto">
        {contacts?.map((contact) => (
          <div
            key={contact.id}
            className="min-h-max h-max max-h-max p-4 bg-white dark:bg-zinc-600 rounded-xl justify-between items-end flex w-full flex-row gap-2"
            style={{
              border:
                value === contact.id
                  ? "2px solid #155EEF"
                  : "2px solid transparent",
            }}
          >
            <div className="flex-col justify-center items-start gap-1 flex">
              <p className="text-slate-800 dark:text-white text-base font-bold font-['Inter'] leading-normal">
                {contact.name}
              </p>
              <p className="text-slate-700 dark:text-slate-200 text-base font-normal font-['Inter'] leading-normal">
                {contact.email}
              </p>
            </div>
            <div className="rounded-3xl justify-center items-center gap-2.5 flex">
              <button
                type="button"
                onClick={() => {
                  onSelectFunction(contact.id);
                }}
              >
                <PencilSquareIcon className="w-6 h-6 max-md:w-7 max-md:h-7 text-black dark:text-white" />
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFunction(contact.id);
                }}
              >
                <TrashIcon className="w-6 h-6 max-md:w-7 max-md:h-7 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="w-full bg-white dark:bg-zinc-600 rounded-xl justify-center items-center p-4 text-gray-900 dark:text-zinc-100 text-base font-semibold leading-normal"
        style={{
          border: "dashed 1px #155EEF",
        }}
        onClick={newContact}
      >
        Add Contact
      </button>
    </div>
  );
};

export const ContactInfoSection: FC<ContactInfoSectionProps> = ({
  contactInfo,
  existingContacts,
  isEditing,
  addContact,
  removeContact,
}) => {
  const { address } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const { data: project, refetch: refreshProject } = useProjectQuery();
  const dataToUpdate = {
    id: contactInfo?.id || "0",
    name: contactInfo?.name || "",
    email: contactInfo?.email || "",
    telegram: contactInfo?.telegram || "",
  };

  const subscriptionShema = z
    .object({
      id: z.string().min(1),
      name: z
        .string()
        .min(3, "Name must be at least 3 characters long")
        .max(50, "Name must be less than 50 characters long"),
      telegram: z.string(),
      email: z
        .string()
        .email({
          message: "E-mail must be a valid email",
        })
        .min(3, "E-mail must be at least 3 characters long"),
    })
    .superRefine((data, ctx) => {
      const emailAlreadyExists = existingContacts?.find(
        (contact) => contact.email === data.email
      );
      if (emailAlreadyExists && emailAlreadyExists.id !== data.id) {
        ctx.addIssue({
          path: ["email"],
          code: "custom",
          message: "E-mail already exists in your list",
        });
        return false;
      }
      return true;
    });

  type FormType = z.infer<typeof subscriptionShema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<FormType>({
    resolver: zodResolver(subscriptionShema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

  const { refetch: refreshList } = useContactInfo(project?.uid, true);

  const clear = () => {
    reset(
      {
        id: generateRandomString(10),
        name: "",
        email: "",
        telegram: "",
      },
      {
        keepValues: false,
        keepErrors: false,
        keepTouched: false,
        keepIsValid: false,
      }
    );
  };

  const createContact = async () => {
    setIsLoading(true);
    const data = {
      id: watch("id"),
      name: watch("name"),
      email: watch("email"),
      telegram: watch("telegram"),
    };
    try {
      if (data.telegram.includes("@")) {
        // remove all @ from the string
        data.telegram = data.telegram.replace(/@/g, "");
      }
      if (!isEditing) {
        addContact({
          id: data.id || generateRandomString(10),
          name: data.name,
          email: data.email,
          telegram: data.telegram,
        });
        clear();
        toast.success("Contact info saved successfully", {
          className: "z-[9999]",
        });
        return;
      }
      const idAlreadyExists = existingContacts?.find(
        (contact) => contact.id === data.id
      );
      if (!idAlreadyExists) {
        await fetchData(
          INDEXER.SUBSCRIPTION.CREATE(
            project?.details?.data?.slug || (project?.uid as string)
          ),
          "POST",
          { contacts: [data] },
          {},
          {},
          true
        ).then(([res, error]) => {
          if (!error) {
            refreshList();
            refreshProject();
            clear();
            toast.success("Contact info created successfully", {
              className: "z-[9999]",
            });
          } else {
            toast.error("Something went wrong. Please try again later.", {
              className: "z-[9999]",
            });
          }
        });
      } else {
        await fetchData(
          INDEXER.SUBSCRIPTION.UPDATE(
            project?.details?.data?.slug || (project?.uid as string),
            data.id
          ),
          "PUT",
          data,
          {},
          {},
          true
        ).then(async ([res, error]) => {
          if (!error) {
            toast.success("Contact info updated successfully");
            clear();
            refreshList();
            refreshProject();
          } else {
            throw Error(error);
          }
        });
      }
    } catch (error: any) {
      errorManager(
        `Error creating contact`,
        error,
        {
          address,
          project: project?.details?.data?.slug || project?.uid,
          data,
        },
        {
          error: "Failed to create contact.",
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const deleteContact = async (contactId: string) => {
    setIsDeleteLoading(true);
    try {
      if (!isEditing) {
        removeContact(
          existingContacts?.find((item) => item.id === contactId) ||
            contactInfo!
        );
        clear();
        toast.success("Contact info deleted successfully", {
          className: "z-[9999]",
        });
        return;
      }
      await fetchData(
        INDEXER.SUBSCRIPTION.DELETE(
          project?.details?.data?.slug || (project?.uid as string)
        ),
        "DELETE",
        { contacts: [contactId] },
        {},
        {},
        true
      ).then(([res, error]) => {
        if (!error) {
          toast.success("Contact info deleted successfully", {
            className: "z-[9999]",
          });
          refreshList();
        } else {
          throw Error(error);
        }
      });
      // const subscription = await fetchData(INDEXER.NOTIFICATIONS.UPDATE())
    } catch (error: any) {
      errorManager(
        `Error deleting contact ${contactId} from project ${
          project?.details?.data?.slug || project?.uid
        }`,
        error,
        {
          address,
          project: project?.details?.data?.slug || project?.uid,
          contactId,
        },
        {
          error: "Failed to delete contact.",
        }
      );
      console.log(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const changeId = (value: string) => {
    setValue("id", value, {
      shouldValidate: true,
    });
    const contact = existingContacts?.find((contact) => contact.id === value);
    setValue("name", contact?.name || "", {
      shouldValidate: contact ? true : false,
    });
    setValue("email", contact?.email || "", {
      shouldValidate: contact ? true : false,
    });
    setValue("telegram", contact?.telegram || "", {
      shouldValidate: contact ? true : false,
    });
  };

  return (
    <div className="rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
      <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
        Contact Info
      </h3>
      <p className="text-zinc-600 dark:text-blue-100">
        We promise to never spam you. We will send notifications to inform you
        if your project qualifies for any grants (proactive or retroactive), and
        provide reminders about milestones and grant deadlines.
      </p>

      <div className="flex flex-row gap-8 w-full max-md:flex-col-reverse">
        <form className="flex flex-col gap-4 w-full">
          <div className="flex w-full min-w-[320px] flex-col gap-2">
            <div className="flex w-full flex-col gap-2">
              <label htmlFor="name-input" className={labelStyle}>
                Name *
              </label>
              <input
                id="name-input"
                type="text"
                className={inputStyle}
                placeholder="John Smith"
                {...register("name")}
              />
              <p className="text-red-500">{errors.name?.message}</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <label htmlFor="email-input" className={labelStyle}>
                Email *
              </label>
              <input
                id="email-input"
                type="text"
                className={inputStyle}
                placeholder="john.smith@smith.co"
                {...register("email")}
              />
              <p className="text-red-500">{errors.email?.message}</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <label htmlFor="telegram-input" className={labelStyle}>
                Telegram (optional)
              </label>
              <input
                id="telegram-input"
                type="text"
                className={inputStyle}
                placeholder="johnsmith"
                {...register("telegram")}
              />
              <p className="text-red-500">{errors.telegram?.message}</p>
            </div>
          </div>
          <div className={`flex flex-row justify-end`}>
            <Button
              isLoading={isLoading}
              disabled={isLoading || !isValid || isDeleteLoading}
              onClick={createContact}
              className="flex disabled:opacity-50 flex-row w-max max-md:w-full max-md:text-lg dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-sm border border-transparent bg-black px-3.5 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Save
            </Button>
          </div>
        </form>
        <div className="w-full">
          {existingContacts?.length ? (
            <ContactBlock
              contacts={existingContacts}
              value={watch("id")}
              onSelectFunction={changeId}
              deleteFunction={deleteContact}
              newContact={() => {
                clear();
              }}
            />
          ) : (
            <EmptyContactBlock />
          )}
        </div>
      </div>
    </div>
  );
};
