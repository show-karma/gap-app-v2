"use client"
import { Dialog, Transition } from "@headlessui/react"
import { type Project, ProjectEndorsement } from "@show-karma/karma-gap-sdk"
import { useRouter } from "next/navigation"
import { type FC, Fragment, useState } from "react"
import type { Hex } from "viem"
import { useAccount } from "wagmi"
/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button"
import { errorManager } from "@/components/Utilities/errorManager"
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor"
import { useContactInfo } from "@/hooks/useContactInfo"
import { getGapClient, useGap } from "@/hooks/useGap"
import { useWallet } from "@/hooks/useWallet"
import { useProjectStore } from "@/store"
import { useEndorsementStore } from "@/store/modals/endorsement"
import { useShareDialogStore } from "@/store/modals/shareDialog"
import { useStepper } from "@/store/modals/txStepper"
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils"
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"
import { PAGES } from "@/utilities/pages"
import { sanitizeObject } from "@/utilities/sanitize"
import { SHARE_TEXTS } from "@/utilities/share/text"
import { shortAddress } from "@/utilities/shortAddress"
import { safeGetWalletClient } from "@/utilities/wallet-helpers"

type EndorsementDialogProps = {}

export const EndorsementDialog: FC<EndorsementDialogProps> = () => {
  const [isLoading, setIsLoading] = useState(false)

  const { isEndorsementOpen: isOpen, setIsEndorsementOpen: setIsOpen } = useEndorsementStore()
  const [comment, setComment] = useState<string>("")
  const project = useProjectStore((state) => state.project)
  const { switchChainAsync } = useWallet()
  const { gap } = useGap()
  const { chain } = useAccount()
  const { address } = useAccount()
  const refreshProject = useProjectStore((state) => state.refreshProject)
  const router = useRouter()
  const { data: contactsInfo } = useContactInfo(project?.uid, true)

  function closeModal() {
    setIsOpen(false)
  }

  const { changeStepperStep, setIsStepper } = useStepper()

  const { openShareDialog } = useShareDialogStore()

  const notifyProjectOwner = async (endorsement: ProjectEndorsement) => {
    try {
      if (!contactsInfo?.length || !project) {
        return
      }

      for (const contact of contactsInfo) {
        if (!contact.email) {
          continue
        }

        const [_, error] = await fetchData(
          INDEXER.PROJECT.ENDORSEMENT.NOTIFY(
            project.details?.data?.slug || (project.uid as string)
          ),
          "POST",
          {
            email: contact.email,
            name: contact.name,
            endorsementId: endorsement.uid,
            endorserAddress: address,
            projectTitle: project.details?.data?.title || project.uid,
            comment: comment || undefined,
          }
        )

        if (error) {
          console.error("Failed to send notification to", contact.email, ":", error)
        }
      }
    } catch (error) {
      console.error("Failed to send endorsement notification:", error)
    }
  }

  const handleFunction = async () => {
    let gapClient = gap
    setIsLoading(true)
    try {
      if (!project) return
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      })

      if (!success) {
        setIsLoading(false)
        return
      }

      gapClient = newGapClient

      const { walletClient, error } = await safeGetWalletClient(actualChainId)

      if (error || !walletClient || !gapClient || !address) {
        throw new Error("Failed to connect to wallet", { cause: error })
      }

      const walletSigner = await walletClientToSigner(walletClient)
      const endorsement = new ProjectEndorsement({
        data: sanitizeObject({
          comment,
        }),
        schema: gapClient!.findSchema("ProjectEndorsement"),
        refUID: project?.uid,
        recipient: address as `0x${string}`,
      })
      await endorsement.attest(walletSigner, changeStepperStep).then(async (res) => {
        const txHash = res?.tx[0]?.hash
        if (txHash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, endorsement.chainID), "POST", {})
        }
        let retries = 1000
        refreshProject()
        let fetchedProject: Project | null = null
        changeStepperStep("indexing")
        while (retries > 0) {
          fetchedProject = await gapClient!.fetch.projectById(project.uid as Hex).catch(() => null)
          if (fetchedProject?.endorsements?.find((end) => end.uid === endorsement.uid)) {
            retries = 0
            changeStepperStep("indexed")

            await notifyProjectOwner(endorsement)

            router.push(
              PAGES.PROJECT.OVERVIEW((project.details?.data?.slug || project?.uid) as string)
            )
            openShareDialog({
              modalShareText: `Well played! Project ${project?.details?.data?.title} now has your epic endorsement 🎯🐉!`,
              shareText: SHARE_TEXTS.PROJECT_ENDORSEMENT(
                project?.details?.data?.title as string,
                project?.uid as string
              ),
              modalShareSecondText: ` `,
            })
            router.refresh()
          }
          retries -= 1
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }
      })
      closeModal()
    } catch (error: any) {
      console.log(error)
      errorManager(`Error of user ${address} endorsing project ${project?.uid}`, error, {
        projectUID: project?.uid,
        address,
      })
    } finally {
      setIsLoading(false)
      setIsStepper(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
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
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-normal leading-6 text-gray-900 dark:text-zinc-100"
                >
                  You are endorsing{" "}
                  <b>
                    {project?.details?.data?.title ||
                      (project?.uid ? shortAddress(project?.uid as string) : "this project")}
                  </b>
                </Dialog.Title>
                <div className="mt-8 flex flex-col gap-2">
                  <p className="text-sm">{`Leave a comment of why you are endorsing this project (optional)`}</p>
                  <MarkdownEditor
                    placeholderText="I'm endorsing this project because..."
                    value={comment}
                    onChange={(newValue: string) => {
                      setComment(newValue || "")
                    }}
                  />
                </div>
                <div className="flex flex-row gap-4 mt-10 justify-end">
                  <Button
                    className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                    onClick={closeModal}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="text-white text-lg bg-brand-blue border-brand-blue  hover:bg-brand-blue hover:text-white"
                    onClick={handleFunction}
                    disabled={isLoading}
                    isLoading={isLoading}
                  >
                    Endorse
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
