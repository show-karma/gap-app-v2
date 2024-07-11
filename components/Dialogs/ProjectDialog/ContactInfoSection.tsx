import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { useOwnerStore, useProjectStore } from "@/store";
import { Contact } from "@/types/project";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { ContactsDropdown } from "@/components/Pages/Project/ContactsDropdown";
import { Button } from "@/components/Utilities/Button";
import { Hex } from "viem";

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

interface ContactInfoSectionProps {
  existingContacts?: Contact[];
  contactInfo?: Contact;
  isEditing: boolean;
  addContact: (contact: Contact) => void;
  removeContact: (contact: Contact) => void;
}

export const ContactInfoSection: FC<ContactInfoSectionProps> = ({
  contactInfo,
  existingContacts,
  isEditing,
  addContact,
  removeContact,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const project = useProjectStore((state) => state.project);
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
    resolver: zodResolver(subscriptionShema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: dataToUpdate,
  });

  const setProjectContactsInfo = useProjectStore(
    (state) => state.setProjectContactsInfo
  );

  const refreshList = async (projectId: Hex) => {
    const [data] = await fetchData(
      INDEXER.SUBSCRIPTION.GET(projectId),
      "GET",
      {},
      {},
      {},
      true
    ).catch(() => []);
    if (data) {
      setProjectContactsInfo(data);
    }
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
          id: data.name + data.email,
          name: data.name,
          email: data.email,
          telegram: data.telegram,
        });
        reset();
        toast.success("Contact info saved successfully", {
          className: "z-[9999]",
        });
        return;
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
            refreshList(project!.uid as Hex);
            reset();
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
            reset();
            refreshList(project!.uid as Hex);
          } else {
            toast.error("Something went wrong. Please try again later.");
          }
        });
      }
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
      if (!isEditing) {
        removeContact(
          existingContacts?.find((item) => item.id === watch("id")) ||
            contactInfo!
        );
        reset();
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
        { contacts: [watch("id")] },
        {},
        {},
        true
      ).then(([res, error]) => {
        if (!error) {
          toast.success("Contact info deleted successfully", {
            className: "z-[9999]",
          });
          refreshList(project!.uid as Hex);
          reset();
        } else {
          toast.error("Something went wrong. Please try again later.", {
            className: "z-[9999]",
          });
        }
      });
      // const subscription = await fetchData(INDEXER.NOTIFICATIONS.UPDATE())
    } catch (error: any) {
      toast.error("Something went wrong. Please try again later.", {
        className: "z-[9999]",
      });
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

      <form className="flex flex-col gap-4">
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
        </div>
        <Button
          isLoading={isLoading}
          disabled={isLoading || !isValid || isDeleteLoading}
          onClick={createContact}
          className="flex disabled:opacity-50 flex-row dark:bg-zinc-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-black px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Save
        </Button>
        {watch("id") === "0" ? null : (
          <Button
            isLoading={isDeleteLoading}
            disabled={isLoading || !isValid || isDeleteLoading}
            type="button"
            onClick={deleteContact}
            className="flex disabled:opacity-50 flex-row dark:bg-red-900 hover:text-white dark:text-white gap-2 items-center justify-center rounded-md border border-transparent bg-red-500 px-6 py-2 text-md font-medium text-white hover:opacity-70 hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Delete this contact
          </Button>
        )}
      </form>
    </div>
  );
};
