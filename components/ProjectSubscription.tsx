import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./Utilities/Button";
import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { INDEXER, PAGES, envVars } from "@/utilities";
import { useOwnerStore, useProjectStore } from "@/store";
import axios from "axios";
import { useRouter } from "next/router";
import { Spinner } from "./Utilities/Spinner";
import * as Popover from "@radix-ui/react-popover";
import { Contact } from "@/types/project";
import { ContactsDropdown } from "./Pages/Project/ContactsDropdown";

const labelStyle = "text-sm font-bold";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white";

const subscriptionShema = z.object({
  id: z.string().min(1),
  name: z.string().min(3, "Name must be at least 3 characters long"),
  telegram: z.string(),
  email: z
    .string()
    .email({
      message: "E-mail must be a valid email",
    })
    .min(3, "E-mail must be at least 3 characters long"),
});

type FormType = z.infer<typeof subscriptionShema>;

interface ProjectSubscriptionProps {
  existingContacts?: Contact[];
  contactInfo?: Contact;
}

export const ProjectSubscription: FC<ProjectSubscriptionProps> = ({
  contactInfo,
  existingContacts,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const project = useProjectStore((state) => state.project);

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const refreshProject = useProjectStore((state) => state.refreshProject);

  const isAuthorized = isOwner || isProjectOwner;

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
    formState: { errors, isValid },
  } = useForm<FormType>({
    resolver: zodResolver(subscriptionShema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

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
            project?.details?.slug || (project?.uid as string)
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
          } else {
            toast.error("Something went wrong. Please try again later.");
          }
        });
      } else {
        await fetchData(
          INDEXER.SUBSCRIPTION.UPDATE(
            project?.details?.slug || (project?.uid as string),
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
          } else {
            toast.error("Something went wrong. Please try again later.");
          }
        });
      }
      // const subscription = await fetchData(INDEXER.NOTIFICATIONS.UPDATE())
    } catch (error: any) {
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
          project?.details?.slug || (project?.uid as string)
        ),
        "DELETE",
        { contacts: [contactInfo?.id] },
        {},
        {},
        true
      ).then(([res, error]) => {
        if (!error) {
          toast.success("Contact info deleted successfully");
          refreshProject();
        } else {
          toast.error("Something went wrong. Please try again later.");
        }
      });
      // const subscription = await fetchData(INDEXER.NOTIFICATIONS.UPDATE())
    } catch (error: any) {
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
    <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
      <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
        Contact Info
      </h3>
      <p className="text-zinc-600 dark:text-blue-100">
        We promise to never spam you. We will send notifications to inform you
        if your project qualifies for any grants (proactive or retroactive), and
        provide reminders about milestones and grant deadlines.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex w-full min-w-[320px] flex-col gap-2">
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="id-input" className={labelStyle}>
              Contact
            </label>
            <ContactsDropdown
              contacts={existingContacts}
              value={watch("id")}
              onSelectFunction={changeId}
            />
            <p className="text-red-500">{errors.id?.message}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="name-input" className={labelStyle}>
              Name
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
              E-mail
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
        <Button
          isLoading={isLoading}
          disabled={isLoading || !isValid || !isAuthorized || isDeleteLoading}
          type="submit"
          className="flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Save
        </Button>
        {watch("id") === "0" ? null : (
          <Button
            isLoading={isDeleteLoading}
            disabled={isLoading || !isValid || !isAuthorized || isDeleteLoading}
            type="button"
            onClick={deleteContact}
            className="flex disabled:opacity-50 flex-row dark:bg-red-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-red-500 px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Delete this contact
          </Button>
        )}
      </form>
    </div>
  ) : (
    <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
      <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
        You are not authorized
      </h3>
      <p className="text-zinc-600 dark:text-blue-100">
        This is a private page. You are not authorized to view this page.
      </p>
    </div>
  );
};
