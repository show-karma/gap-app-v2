"use client";

import { useState, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Dialog, Transition } from "@headlessui/react";
import { useAuthStore } from "@/store/auth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { useAccount } from "wagmi";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";
import { Spinner } from "@/components/Utilities/Spinner";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { envVars } from "@/utilities/enviromentVars";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

interface AdminEmail {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  communityId: string;
  createdAt: string;
}

interface Props {
  communityId: string;
  community: ICommunityResponse;
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
    <Skeleton className="h-10 w-32" />
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  </div>
);

export function AdminEmailsManager({ communityId, community }: Props) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const signer = useSigner();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState({ email: "", name: "" });
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

  // Check if user is community admin using the same method as CommunityAdminPage
  useEffect(() => {
    if (!community) return;

    const checkIfAdmin = async () => {
      setLoading(true);
      if (!community?.uid || !isAuth) return;
      try {
        const checkAdmin = await isCommunityAdminOf(
          community,
          address as string,
          signer
        );
        setIsAdmin(checkAdmin);
      } catch (error: any) {
        errorManager(
          `Error checking if ${address} is admin of ${communityId}`,
          error
        );
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, isAuth, community?.uid, signer, communityId]);

  // Fetch emails on component mount if user is admin
  useEffect(() => {
    if (isAdmin) {
      fetchEmails();
    }
  }, [isAdmin]);

  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching emails from:", `/communities/${community.uid}/admins/emails`);
      console.log("Using base URL:", envVars.NEXT_PUBLIC_GAP_INDEXER_URL);
      const [data, error] = await fetchData(`/communities/${community.uid}/admins/emails`, "GET");
      if (error) {
        throw new Error(error);
      }
      console.log("Fetched emails:", data);
      setEmails(data);
    } catch (error) {
      console.error("Failed to fetch admin emails:", error);
      toast.error("Failed to fetch admin emails");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    // Validate email
    if (!newEmail.email) {
      setErrors({ email: "Email is required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.email)) {
      setErrors({ email: "Invalid email format" });
      return;
    }

    // Check if email already exists in the list
    const emailExists = emails.some(email => email.email.toLowerCase() === newEmail.email.toLowerCase());
    if (emailExists) {
      setErrors({ email: "This email is already in the admin list" });
      return;
    }

    try {
      setIsLoading(true);
      const [data, error] = await fetchData(
        `/communities/${community.uid}/admins/emails`,
        "POST",
        {
          communityId: community.uid,
          email: newEmail.email,
          name: newEmail.name || undefined,
        }
      );
      
      if (error) {
        if (error.includes("409") || error.includes("Conflict")) {
          // Conflict - email already exists on server
          setErrors({ email: "This email is already in the admin list" });
        } else {
          throw new Error(error);
        }
        return;
      }
      
      toast.success("Admin email added successfully");
      setNewEmail({ email: "", name: "" });
      fetchEmails();
    } catch (error: any) {
      console.error("Failed to add admin email:", error);
      toast.error("Failed to add admin email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (email: string) => {
    setEmailToDelete(email);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!emailToDelete) return;

    try {
      setIsLoading(true);
      const [data, error] = await fetchData(
        `/communities/${community.uid}/admins/emails/${emailToDelete}`,
        "DELETE"
      );
      
      if (error) {
        throw new Error(error);
      }
      
      toast.success("Admin email removed successfully");
      fetchEmails();
    } catch (error) {
      console.error("Failed to remove admin email:", error);
      toast.error("Failed to remove admin email");
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setEmailToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Manage Admin Emails</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300 text-center">
            {MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}
          </p>
          <Button
            className="mt-4"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Manage Admin Emails</h1>

      {/* Add New Email Form */}
      <form onSubmit={handleAddEmail} className="mb-8 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={newEmail.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail({ ...newEmail, email: e.target.value })}
              required
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Name (Optional)
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={newEmail.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail({ ...newEmail, name: e.target.value })}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isLoading ? "Adding..." : "Add Admin Email"}
        </Button>
      </form>

      {/* Admin Emails Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Added Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
            {emails.map((email) => (
              <tr key={email.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {email.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {email.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {formatDate(email.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  <Button
                    variant="primary"
                    onClick={() => handleDeleteClick(email.email)}
                    disabled={isLoading}
                    className="bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm px-3 py-1"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <Transition appear show={showDeleteModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowDeleteModal(false)}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-200"
                  >
                    Confirm Delete
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to remove this admin email?
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-4">
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isLoading}
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleDeleteConfirm}
                      disabled={isLoading}
                      className="bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      {isLoading ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 