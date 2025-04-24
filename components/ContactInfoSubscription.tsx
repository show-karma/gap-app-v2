"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./Utilities/Button";
import toast from "react-hot-toast";
import { useOwnerStore, useProjectStore } from "@/store";
import { Contact } from "@/types/project";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

import { errorManager } from "./Utilities/errorManager";
import { generateRandomString } from "@/utilities/generateRandomString";
import { useContactInfo } from "@/hooks/useContactInfo";

const labelStyle = "text-sm font-bold";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white";

const subscriptionSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name must be less than 50 characters"),
  telegram: z.string(),
  email: z
    .string()
    .email({
      message: "E-mail must be a valid email",
    })
    .min(3, "E-mail must be at least 3 characters long"),
});

type FormType = z.infer<typeof subscriptionSchema>;

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
    <div className="h-full flex flex-col gap-3 justify-start items-start p-4 w-full bg-[#F5F8FF] dark:bg-zinc-700 rounded-xl max-h-[367px] min-w-[320px]">
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

interface ContactInfoSubscriptionProps {
  contactInfo?: Contact;
}

export const ContactInfoSubscription: FC<ContactInfoSubscriptionProps> = ({
  contactInfo,
}) => {
  const project = useProjectStore((state) => state.project);
  const projectId = project?.uid;
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;
  const { data: existingContacts, refetch: refreshContactInfo } =
    useContactInfo(projectId, isAuthorized);

  const [isLoading, setIsLoading] = useState(false);

  const refreshProject = useProjectStore((state) => state.refreshProject);

  const dataToUpdate = {
    id: contactInfo?.id || "0",
    name: contactInfo?.name || "",
    email: contactInfo?.email || "",
    telegram: contactInfo?.telegram || "",
  };
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<FormType>({
    resolver: zodResolver(subscriptionSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

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

  const onSubmit: SubmitHandler<FormType> = async (data) => {
    setIsLoading(true);
    try {
      if (data.telegram.includes("@")) {
        // remove all @ from the string
        data.telegram = data.telegram.replace(/@/g, "");
      }
      if (data.id === "0") {
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
            toast.success("Contact info created successfully");
            refreshProject();
            refreshContactInfo();
            clear();
          } else {
            toast.error("Something went wrong. Please try again later.");
            throw new Error("Something went wrong while creating contact info");
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
        ).then(([res, error]) => {
          if (!error) {
            toast.success("Contact info updated successfully");
            refreshProject();
            refreshContactInfo();
            clear();
          } else {
            throw Error(error);
          }
        });
      }
      // const subscription = await fetchData(INDEXER.NOTIFICATIONS.UPDATE())
    } catch (error: any) {
      errorManager("Error while updating contact info", error, {
        project: project?.details?.data?.slug || (project?.uid as string),
        contactId: data.id,
        data,
      });
      toast.error("Something went wrong. Please try again later.");
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const deleteContact = async () => {
    setIsDeleteLoading(true);
    try {
      await fetchData(
        INDEXER.SUBSCRIPTION.DELETE(
          project?.details?.data?.slug || (project?.uid as string)
        ),
        "DELETE",
        { contacts: [watch("id")] },
        {},
        {},
        true
      ).then(([res, error]) => {
        if (!error) {
          toast.success("Contact info deleted successfully");
          refreshProject();
          refreshContactInfo();
        } else {
          throw Error(error);
        }
      });
      // const subscription = await fetchData(INDEXER.NOTIFICATIONS.UPDATE())
    } catch (error: any) {
      errorManager("Error deleting contact info", error, {
        project: project?.details?.data?.slug || (project?.uid as string),
        contactId: watch("id"),
      });
      toast.error("Something went wrong. Please try again later.");
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

  return isAuthorized ? (
    <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800 dark:border flex flex-col gap-4 items-start">
      <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
        Contact Info
      </h3>
      <p className="text-zinc-600 dark:text-blue-100">
        We promise to never spam you. We will send notifications to inform you
        if your project qualifies for any grants (proactive or retroactive), and
        provide reminders about milestones and grant deadlines.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col md:flex-row gap-8"
      >
        <div className="flex w-full flex-col gap-3">
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
              E-mail *
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
          <Button
            isLoading={isLoading}
            disabled={isLoading || !isValid || !isAuthorized || isDeleteLoading}
            type="submit"
            className="flex disabled:opacity-50 dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Save
          </Button>
        </div>
        <div className="flex w-full flex-col gap-2">
          <ContactBlock
            contacts={existingContacts}
            value={watch("id")}
            onSelectFunction={changeId}
            deleteFunction={deleteContact}
            newContact={() => changeId("0")}
          />
          <p className="text-red-500">{errors.id?.message}</p>
        </div>
      </form>
    </div>
  ) : (
    <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800 dark:border flex flex-col gap-4 items-start">
      <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
        You are not authorized
      </h3>
      <p className="text-zinc-600 dark:text-blue-100">
        This is a private page. You are not authorized to view this page.
      </p>
    </div>
  );
};
