"use client"

import { Dialog, Transition } from "@headlessui/react"
import { CheckCircleIcon, LinkIcon } from "@heroicons/react/24/outline"
import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import type { FC } from "react"
import { Fragment, useEffect, useState } from "react"
import { Button } from "@/components/Utilities/Button"
import { PROJECT_NAME } from "@/constants/brand"
import { useOwnerStore, useProjectStore } from "@/store"
import { useCommunityAdminStore } from "@/store/communityAdmin"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"

interface GrantLinkExternalAddressButtonProps {
  grant: IGrantResponse & { external: Record<string, string[]> }
}

export const GrantLinkExternalAddressButton: FC<GrantLinkExternalAddressButtonProps> = ({
  grant,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner)
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner)
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin)
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin
  const isEnabledForCommunity = grant.community?.details?.data?.slug === "octant"
  const [isOpen, setIsOpen] = useState(false)
  const [editedAddress, setEditedAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (grant?.external?.octant?.[0]) {
      setEditedAddress(grant?.external?.octant?.[0])
    }
  }, [grant?.external?.octant])

  const handleSave = async (address: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const [data, error] = await fetchData(
        INDEXER.GRANTS.EXTERNAL_ADDRESS.UPDATE(grant.uid),
        "PUT",
        {
          target: "octant",
          address: address,
        }
      )

      if (data) {
        // Update the local state to reflect the change
        setEditedAddress(address)
      }

      if (error) {
        setError(`Failed to update Octant address. Please try again.`)
      }
    } catch (err) {
      setError(`Failed to update Octant address. Please try again.`)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthorized || !isEnabledForCommunity) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="flex flex-row items-center justify-center gap-2 rounded-md border border-primary-500 bg-white px-3.5 py-2 text-sm font-semibold text-primary-500 hover:bg-primary-100"
      >
        Link Octant Address
        <div className="h-5 w-5">
          <LinkIcon className="h-5 w-5 transition-none" />
        </div>
      </Button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title as="h3" className=" text-gray-900 dark:text-zinc-100">
                    <h2 className="text-2xl font-bold leading-6">Link Octant Address</h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Please add the Ethereum account address you used for the &quot;
                      {grant.details?.data?.title}&quot; in Octant. This will enable Octant to
                      retrieve your {PROJECT_NAME} profile data and display it within the Octant
                      app.
                    </p>
                  </Dialog.Title>
                  <div className="max-h-[60vh] flex flex-col gap-2 mt-8 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg">
                        <div className="flex items-center space-x-4 w-full">
                          <span className="text-md font-bold capitalize">Octant</span>
                          <input
                            type="text"
                            value={editedAddress || grant?.external?.octant?.[0]}
                            onChange={(e) => setEditedAddress(e.target.value)}
                            className="text-sm rounded-md w-full text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <Button
                          onClick={() => handleSave(editedAddress)}
                          disabled={isLoading}
                          className="ml-3 p-2 flex flex-row items-center justify-center gap-2 rounded-md border border-primary-500 bg-primary-100 px-3.5 py-2 text-sm font-semibold text-primary-500 hover:bg-primary-100"
                        >
                          {isLoading ? "Saving..." : "Save"}{" "}
                          <CheckCircleIcon className="h-5 w-5 transition-none" />
                        </Button>
                      </div>
                    </div>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={() => setIsOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
