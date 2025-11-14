import { ShareIcon, TrashIcon } from "@heroicons/react/24/outline"
import type {
  IGrantUpdate,
  IGrantUpdateStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import { type FC, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import { DeleteDialog } from "@/components/DeleteDialog"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import { errorManager } from "@/components/Utilities/errorManager"
import { getGapClient, useGap } from "@/hooks/useGap"
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke"
import { useWallet } from "@/hooks/useWallet"
import { useOwnerStore, useProjectStore } from "@/store"
import { useCommunityAdminStore } from "@/store/communityAdmin"
import { useStepper } from "@/store/modals/txStepper"
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid"
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils"
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain"
import fetchData from "@/utilities/fetchData"
import { formatDate } from "@/utilities/formatDate"
import { INDEXER } from "@/utilities/indexer"
import { MESSAGES } from "@/utilities/messages"
import { ReadMore } from "@/utilities/ReadMore"
import { retryUntilConditionMet } from "@/utilities/retries"
import { shareOnX } from "@/utilities/share/shareOnX"
import { SHARE_TEXTS } from "@/utilities/share/text"
import { safeGetWalletClient } from "@/utilities/wallet-helpers"
import { VerifiedBadge } from "./VerifiedBadge"
import { VerifyGrantUpdateDialog } from "./VerifyGrantUpdateDialog"

interface UpdateTagProps {
  index: number
}
export const FlagIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line x1="4" x2="4" y1="22" y2="15"></line>
    </svg>
  )
}
const UpdateTag: FC<UpdateTagProps> = ({ index }) => {
  return (
    <div className="flex w-max flex-row gap-3 rounded-full  bg-[#F5F3FF] px-3 py-1 text-[#5720B7] dark:text-violet-100 dark:bg-purple-700">
      <FlagIcon />
      <p className="text-xs font-bold text-[#5720B7] dark:text-violet-100">UPDATE {index}</p>
    </div>
  )
}

interface GrantUpdateProps {
  title: string
  description: string
  index: number
  date: Date | number
  update: IGrantUpdate
}

export const GrantUpdate: FC<GrantUpdateProps> = ({ title, description, index, date, update }) => {
  const { chain, address } = useAccount()
  const { switchChainAsync } = useWallet()
  const refreshProject = useProjectStore((state) => state.refreshProject)
  const [isDeletingGrantUpdate, setIsDeletingGrantUpdate] = useState(false)
  const selectedProject = useProjectStore((state) => state.project)
  const { gap } = useGap()
  const { changeStepperStep, setIsStepper } = useStepper()
  const { project, isProjectOwner } = useProjectStore()
  const { isOwner: isContractOwner } = useOwnerStore()
  const isOnChainAuthorized = isProjectOwner || isContractOwner
  const { performOffChainRevoke } = useOffChainRevoke()

  const undoGrantUpdate = async () => {
    let gapClient = gap
    try {
      setIsDeletingGrantUpdate(true)
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: update.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      })

      if (!success) {
        setIsDeletingGrantUpdate(false)
        return
      }

      gapClient = newGapClient

      const { walletClient, error } = await safeGetWalletClient(actualChainId)

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error })
      }
      if (!walletClient || !gapClient) return
      const walletSigner = await walletClientToSigner(walletClient)

      const instanceProject = await gapClient.fetch.projectById(project?.uid)
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === update.refUID.toLowerCase()
      )
      if (!grantInstance) return
      const grantUpdateInstance = grantInstance.updates.find(
        (item) => item.uid.toLowerCase() === update.uid.toLowerCase()
      )
      if (!grantUpdateInstance) return

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject()
            const grant = fetchedProject?.grants?.find(
              (item) => item.uid.toLowerCase() === update.refUID.toLowerCase()
            )
            const stillExists = grant?.updates?.find(
              (grantUpdate) => grantUpdate.uid.toLowerCase() === update.uid.toLowerCase()
            )
            return !stillExists
          },
          () => {
            callbackFn?.()
          }
        )
      }

      if (!isOnChainAuthorized) {
        await performOffChainRevoke({
          uid: grantUpdateInstance.uid as `0x${string}`,
          chainID: grantUpdateInstance.chainID,
          checkIfExists: checkIfAttestationExists,
          toastMessages: {
            success: MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS,
            loading: MESSAGES.GRANT.GRANT_UPDATE.UNDO.LOADING,
          },
        })
      } else {
        try {
          const res = await grantUpdateInstance.revoke(walletSigner as any, changeStepperStep)
          changeStepperStep("indexing")
          const txHash = res?.tx[0]?.hash
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grantUpdateInstance.chainID),
              "POST",
              {}
            )
          }

          await checkIfAttestationExists(() => {
            changeStepperStep("indexed")
          })
          toast.success(MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS)
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          setIsStepper(false) // Reset stepper since we're falling back

          const success = await performOffChainRevoke({
            uid: grantUpdateInstance.uid as `0x${string}`,
            chainID: grantUpdateInstance.chainID,
            checkIfExists: checkIfAttestationExists,
            toastMessages: {
              success: MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS,
              loading: MESSAGES.GRANT.GRANT_UPDATE.UNDO.LOADING,
            },
          })

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError
          }
        }
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR,
        error,
        { grantUpdateUID: update.uid, address },
        { error: MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR }
      )
    } finally {
      setIsDeletingGrantUpdate(false)
      setIsStepper(false)
    }
  }

  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin)
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin)

  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin

  const [verifiedUpdate, setVerifiedUpdate] = useState<IGrantUpdateStatus[]>(update?.verified || [])

  const addVerifiedUpdate = (newVerified: IGrantUpdateStatus) => {
    setVerifiedUpdate([...verifiedUpdate, newVerified])
  }

  useEffect(() => {
    setVerifiedUpdate(update?.verified || [])
  }, [update])

  /*
   * Check if the grant update was created after the launch date of the feature
   * @returns {boolean}
   */
  const checkProofLaunch = () => {
    return new Date("2024-08-30") <= new Date(update?.createdAt)
  }

  const isAfterProofLaunch = checkProofLaunch()

  const grant = project?.grants.find((g) => g.uid.toLowerCase() === update.refUID.toLowerCase())

  return (
    <div className="flex w-full flex-1 max-w-full flex-col gap-4 rounded-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 bg-white p-4 transition-all duration-200 ease-in-out  max-sm:px-2">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-row gap-3 items-center flex-wrap">
          <UpdateTag index={index} />
          {verifiedUpdate.length ? (
            <VerifiedBadge verifications={verifiedUpdate} title={`Update ${index} - Reviews`} />
          ) : null}
          <VerifyGrantUpdateDialog grantUpdate={update} addVerifiedUpdate={addVerifiedUpdate} />
        </div>
        <div className="flex flex-row gap-3 items-center flex-wrap">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
            Created on {formatDate(date)}
          </p>
          {isAuthorized ? (
            <div className="flex flex-row gap-2 items-center">
              <ExternalLink
                href={shareOnX(
                  SHARE_TEXTS.GRANT_UPDATE(
                    grant?.details?.data?.title as string,
                    project?.uid as string,
                    update.uid
                  )
                )}
              >
                <ShareIcon className="text-gray-500 dark:text-zinc-300 w-5 h-5" />
              </ExternalLink>
              <DeleteDialog
                deleteFunction={undoGrantUpdate}
                isLoading={isDeletingGrantUpdate}
                title={
                  <p className="font-normal">
                    Are you sure you want to delete <b>{update.data.title}</b> update?
                  </p>
                }
                buttonElement={{
                  text: "",
                  icon: <TrashIcon className="text-red-500 w-5 h-5" />,
                  styleClass: "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent",
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      {title ? (
        <p className="text-lg font-semibold text-black dark:text-zinc-100 max-sm:text-base">
          {title}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 w-full">
        <ReadMore readLessText="Read less update" readMoreText="Read full update">
          {description}
        </ReadMore>
        {isAfterProofLaunch && update?.data.proofOfWork ? (
          <div className="flex flex-row items-center gap-1 flex-1 max-w-full flex-wrap max-sm:mt-4">
            <p className="text-sm w-full min-w-max max-w-max font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
              Proof of work:
            </p>
            <ExternalLink
              href={
                update?.data.proofOfWork.includes("http")
                  ? update?.data.proofOfWork
                  : `https://${update?.data.proofOfWork}`
              }
              className="flex flex-row w-max max-w-full gap-2 bg-transparent text-sm font-semibold text-blue-600 underline dark:text-blue-100 hover:bg-transparent break-all line-clamp-3"
            >
              {update?.data.proofOfWork.includes("http")
                ? `${update?.data.proofOfWork.slice(0, 80)}${
                    update?.data.proofOfWork.slice(0, 80).length >= 80 ? "..." : ""
                  }`
                : `https://${update?.data.proofOfWork.slice(0, 80)}${
                    update?.data.proofOfWork.slice(0, 80).length >= 80 ? "..." : ""
                  }`}
            </ExternalLink>
          </div>
        ) : null}
      </div>
    </div>
  )
}
