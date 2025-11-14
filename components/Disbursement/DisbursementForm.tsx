"use client"

import Papa from "papaparse"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { isAddress } from "viem"
import { useAccount, useChainId, useWalletClient } from "wagmi"
import { useWallet } from "@/hooks/useWallet"
import type { SupportedChainId } from "../../config/tokens"
import type { DisbursementRecipient } from "../../types/disbursement"
import {
  getSafeTokenBalance,
  isSafeDeployed,
  isSafeOwner,
  signAndProposeDisbursement,
} from "../../utilities/safe"
import { Button } from "./components/Button"
import { Card } from "./components/Card"
import {
  CheckCircleIcon,
  CheckIcon,
  ConfigIcon,
  DocumentIcon,
  ExternalLinkIcon,
  PlusIcon,
} from "./components/Icons"
// Import our new reusable components
import { StatusAlert } from "./components/StatusAlert"
import { DisbursementReview } from "./DisbursementReview"
import { type DisbursementStep, DisbursementStepper } from "./DisbursementStepper"

const NETWORK_OPTIONS = [
  { id: 42220, name: "Celo" },
  { id: 42161, name: "Arbitrum" },
  { id: 10, name: "Optimism" },
]

const TOKEN_OPTIONS = [{ id: "usdc", name: "USDC" }]

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toString()
}

interface PreflightChecks {
  isCorrectNetwork: boolean | null
  isDeployed: boolean | null
  isOwner: boolean | null
  hasSufficientBalance: boolean | null
  safeBalance: string
  isChecking: boolean
  error: string | null
}

interface TransactionState {
  isProcessing: boolean
  isComplete: boolean
  error: string | null
  result: {
    txHash: string
    totalRecipients: number
    totalAmount: number
    safeUrl: string
    createTxUrl?: string
    transactionData?: any
    executed?: boolean
  } | null
}

export const DisbursementForm = () => {
  const { address: userAddress, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const walletChainId = useChainId()
  const { switchChainAsync, isPending: isSwitchingNetwork } = useWallet()
  const [recipients, setRecipients] = useState<DisbursementRecipient[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [safeAddress, setSafeAddress] = useState("")
  const [network, setNetwork] = useState<SupportedChainId>(42220)
  const [token, setToken] = useState<"usdc">("usdc")
  const [isDragOver, setIsDragOver] = useState(false)

  // Step management
  const [currentStep, setCurrentStep] = useState<DisbursementStep>("configure")
  const [completedSteps, setCompletedSteps] = useState<DisbursementStep[]>([])

  // Pre-flight checks
  const [preflightChecks, setPreflightChecks] = useState<PreflightChecks>({
    isCorrectNetwork: null,
    isDeployed: null,
    isOwner: null,
    hasSufficientBalance: null,
    safeBalance: "0",
    isChecking: false,
    error: null,
  })

  // Transaction state
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isProcessing: false,
    isComplete: false,
    error: null,
    result: null,
  })

  const markStepComplete = (step: DisbursementStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  const handleNetworkChange = async (newNetwork: SupportedChainId) => {
    setNetwork(newNetwork)

    // Auto-switch wallet network if connected and different from selected
    if (isConnected && walletChainId !== newNetwork) {
      try {
        await switchChainAsync({ chainId: newNetwork })
      } catch (error) {
        console.error("Failed to switch network:", error)
        toast.error(
          "Failed to switch network. Please manually switch to the correct network in your wallet."
        )
        setPreflightChecks((prev) => ({
          ...prev,
          isCorrectNetwork: false,
          error: "Network switch failed - please switch manually",
        }))
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      processFile(selectedFile)
    }
  }

  const processFile = (file: File) => {
    setFile(file)
    parseCsv(file)
    markStepComplete("upload")
    setCurrentStep("review")
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files && files[0] && files[0].type === "text/csv") {
        processFile(files[0])
      }
    },
    [processFile]
  )

  const parseCsv = (file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        // Skip the first row (header row)
        const dataRows = results.data.slice(1)

        const parsedData: DisbursementRecipient[] = dataRows.map((row: any) => {
          const address = row[0]?.trim()
          const amount = row[1]?.trim()
          let error: string | undefined

          if (!isAddress(address)) {
            error = "Invalid address"
          } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            error = "Invalid amount"
          }

          return { address, amount, error }
        })
        setRecipients(parsedData)
      },
    })
  }

  // Run pre-flight checks
  const runPreflightChecks = useCallback(async () => {
    if (!safeAddress || !userAddress || !isConnected || recipients.length === 0) {
      return
    }

    setPreflightChecks((prev) => ({ ...prev, isChecking: true, error: null }))

    try {
      // First check if wallet is on correct network
      const isCorrectNetwork = walletChainId === network

      if (!isCorrectNetwork) {
        setPreflightChecks({
          isCorrectNetwork: false,
          isDeployed: null,
          isOwner: null,
          hasSufficientBalance: null,
          safeBalance: "0",
          isChecking: false,
          error: `Please switch your wallet to ${
            NETWORK_OPTIONS.find((n) => n.id === network)?.name
          } network.`,
        })
        return
      }

      // Check if Safe is deployed on this network
      const isDeployed = await isSafeDeployed(safeAddress, network)

      if (!isDeployed) {
        setPreflightChecks({
          isCorrectNetwork: true,
          isDeployed: false,
          isOwner: null,
          hasSufficientBalance: null,
          safeBalance: "0",
          isChecking: false,
          error: `Safe is not deployed on ${
            NETWORK_OPTIONS.find((n) => n.id === network)?.name
          }. Please check the address and network.`,
        })
        return
      }

      // Check if user is owner of the Safe
      const isOwner = await isSafeOwner(safeAddress, userAddress, network)

      // Get Safe token balance
      const balanceInfo = await getSafeTokenBalance(safeAddress, token, network)

      // Calculate total amount needed
      const totalAmount = recipients.reduce((sum, r) => {
        if (!r.error) {
          return sum + parseFloat(r.amount)
        }
        return sum
      }, 0)

      const hasSufficientBalance = parseFloat(balanceInfo.balanceFormatted) >= totalAmount

      setPreflightChecks({
        isCorrectNetwork: true,
        isDeployed: true,
        isOwner,
        hasSufficientBalance,
        safeBalance: balanceInfo.balanceFormatted,
        isChecking: false,
        error: null,
      })
    } catch (error) {
      console.error("Pre-flight check failed:", error)
      setPreflightChecks((prev) => ({
        ...prev,
        isChecking: false,
        error: "Failed to verify Safe. Please check the address and network.",
      }))
    }
  }, [safeAddress, userAddress, isConnected, recipients, network, token, walletChainId])

  // Handle disbursement execution
  const handleDisbursement = async () => {
    if (!walletClient || !safeAddress || !userAddress) {
      return
    }

    setTransactionState({
      isProcessing: true,
      isComplete: false,
      error: null,
      result: null,
    })

    try {
      const result = await signAndProposeDisbursement(
        safeAddress,
        recipients,
        token,
        network,
        walletClient
      )

      setTransactionState({
        isProcessing: false,
        isComplete: true,
        error: null,
        result,
      })
    } catch (error) {
      console.error("Disbursement failed:", error)
      setTransactionState({
        isProcessing: false,
        isComplete: false,
        error: error instanceof Error ? error.message : "Transaction failed",
        result: null,
      })
    }
  }

  // Trigger pre-flight checks when relevant data changes
  useEffect(() => {
    if (safeAddress && userAddress && isConnected && recipients.length > 0) {
      runPreflightChecks()
    }
  }, [runPreflightChecks, safeAddress, userAddress, isConnected, recipients, walletChainId])

  // Update step based on form completion
  useEffect(() => {
    if (safeAddress && !completedSteps.includes("configure")) {
      markStepComplete("configure")
      setCurrentStep("upload")
    }
  }, [safeAddress, completedSteps, markStepComplete])

  const hasErrors = recipients.some((r) => r.error)
  const canDisburse =
    recipients.length > 0 &&
    !hasErrors &&
    safeAddress &&
    isConnected &&
    preflightChecks.isCorrectNetwork === true &&
    preflightChecks.isDeployed === true &&
    preflightChecks.isOwner === true &&
    preflightChecks.hasSufficientBalance === true &&
    !preflightChecks.isChecking &&
    !transactionState.isProcessing

  const totalAmount = recipients.reduce((sum, r) => {
    if (!r.error) {
      return sum + parseFloat(r.amount)
    }
    return sum
  }, 0)

  // Don't show form if transaction is complete
  if (transactionState.isComplete && transactionState.result) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-12 text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                transactionState.result.executed ? "bg-green-100" : "bg-blue-100"
              }`}
            >
              {transactionState.result.executed ? (
                <CheckIcon className="h-8 w-8 text-green-600" />
              ) : (
                <CheckCircleIcon className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div className="mt-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {transactionState.result.executed
                  ? "🎉 Disbursement Completed!"
                  : "✅ Transaction Ready!"}
              </h3>
              <div className="mt-4 space-y-3">
                <p className="text-gray-600 max-w-2xl mx-auto">
                  {transactionState.result.executed
                    ? `Successfully executed disbursement to ${transactionState.result.totalRecipients} recipients for a total of ${transactionState.result.totalAmount} USDC. The funds have been transferred!`
                    : `Successfully signed disbursement to ${transactionState.result.totalRecipients} recipients for a total of ${transactionState.result.totalAmount} USDC. The transaction is ready for execution.`}
                </p>
                <div className="bg-gray-50 rounded-lg px-4 py-3 mx-auto max-w-md">
                  <p className="text-sm text-gray-600">Transaction Hash:</p>
                  <code className="text-xs font-mono bg-white px-2 py-1 rounded border text-gray-800 break-all">
                    {transactionState.result.txHash}
                  </code>
                </div>
                {transactionState.result.createTxUrl && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <svg
                        className="h-5 w-5 text-amber-400 mt-0.5 mr-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Manual Action Required</p>
                        <p className="text-sm text-amber-700 mt-1">
                          The Safe Transaction Service is unavailable. Please use the Safe app to
                          manually create this transaction.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                {transactionState.result.executed ? (
                  <Button
                    variant="success"
                    href={transactionState.result.safeUrl}
                    external
                    icon={<ExternalLinkIcon />}
                  >
                    View Transaction
                  </Button>
                ) : transactionState.result.createTxUrl ? (
                  <Button
                    href={transactionState.result.createTxUrl}
                    external
                    icon={<ExternalLinkIcon />}
                  >
                    Open Safe App
                  </Button>
                ) : (
                  <Button
                    href={transactionState.result.safeUrl}
                    external
                    icon={<ExternalLinkIcon />}
                  >
                    View in Safe App
                  </Button>
                )}
                <Button
                  variant="secondary"
                  icon={<PlusIcon />}
                  onClick={() => {
                    setTransactionState({
                      isProcessing: false,
                      isComplete: false,
                      error: null,
                      result: null,
                    })
                    setRecipients([])
                    setFile(null)
                    setSafeAddress("")
                    setCurrentStep("configure")
                    setCompletedSteps([])
                  }}
                >
                  Start New Disbursement
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Safe Disbursement</h1>
          <p className="text-gray-600">
            Distribute USDC tokens to multiple recipients using Gnosis Safe
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <DisbursementStepper currentStep={currentStep} completedSteps={completedSteps} />
        </div>

        <div className="space-y-6">
          {/* Transaction Error */}
          {transactionState.error && (
            <StatusAlert
              type="error"
              title="❌ Transaction Failed"
              message={transactionState.error}
              onDismiss={() =>
                setTransactionState((prev) => ({
                  ...prev,
                  error: null,
                }))
              }
            />
          )}

          {/* Wallet Connection Warning */}
          {!isConnected && (
            <StatusAlert
              type="warning"
              title="🔗 Wallet Connection Required"
              message="Please connect your wallet to proceed with the disbursement."
            />
          )}

          <Card
            title="Configure Disbursement"
            titleIcon={<ConfigIcon className="h-5 w-5 text-indigo-600" />}
            titleEmoji="⚙️"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Safe Address Input */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="safe-address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  🏦 Gnosis Safe Address
                </label>
                <input
                  type="text"
                  name="safe-address"
                  id="safe-address"
                  value={safeAddress}
                  onChange={(e) => setSafeAddress(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-colors"
                  placeholder="0x..."
                  disabled={transactionState.isProcessing}
                />
              </div>

              {/* Network Selection */}
              <div>
                <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-2">
                  🌐 Network
                </label>
                <select
                  id="network"
                  name="network"
                  value={network}
                  onChange={(e) => handleNetworkChange(Number(e.target.value) as SupportedChainId)}
                  className="block w-full rounded-lg border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                  disabled={transactionState.isProcessing || isSwitchingNetwork}
                >
                  {NETWORK_OPTIONS.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Selection */}
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Token
                </label>
                <select
                  id="token"
                  name="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value as "usdc")}
                  className="block w-full rounded-lg border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                  disabled={transactionState.isProcessing}
                >
                  {TOKEN_OPTIONS.map((token) => (
                    <option key={token.id} value={token.id}>
                      {token.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card
            title="Upload Recipients"
            titleIcon={<DocumentIcon className="h-5 w-5 text-emerald-600" />}
            titleEmoji="📄"
          >
            <div>
              <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-700 mb-3">
                📊 Upload CSV File
              </label>
              <div
                className={`flex justify-center rounded-xl border-2 border-dashed px-6 pb-6 pt-5 transition-all duration-200 ${
                  isDragOver
                    ? "border-indigo-400 bg-indigo-50 scale-105"
                    : "border-gray-300 hover:border-gray-400"
                } ${transactionState.isProcessing ? "opacity-50 pointer-events-none" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-2 text-center">
                  <svg
                    className={`mx-auto h-16 w-16 transition-colors ${
                      isDragOver ? "text-indigo-500" : "text-gray-400"
                    }`}
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500 transition-colors"
                    >
                      <span className="font-semibold">
                        {file ? `📄 ${file.name}` : "📤 Upload a file"}
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={transactionState.isProcessing}
                      />
                    </label>
                    {!file && <p className="pl-1">or drag and drop</p>}
                  </div>
                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block">
                    📋 CSV format: address, amount
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <DisbursementReview recipients={recipients} />

          {/* Pre-flight Check Status */}
          {safeAddress && isConnected && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 rounded-lg p-2 mr-3">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">🔍 Pre-flight Checks</h3>
              </div>
              <div className="space-y-4">
                {preflightChecks.isChecking ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-600 font-medium">
                      Verifying Safe access and balance...
                    </span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center p-3 rounded-lg border ${
                        preflightChecks.isCorrectNetwork === true
                          ? "bg-green-50 border-green-200 text-green-700"
                          : preflightChecks.isCorrectNetwork === false
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="text-lg mr-3">
                        {preflightChecks.isCorrectNetwork === true
                          ? "✅"
                          : preflightChecks.isCorrectNetwork === false
                            ? "❌"
                            : "⏳"}
                      </span>
                      <div>
                        <div className="font-medium">🌐 Wallet Network</div>
                        <div className="text-sm">
                          {preflightChecks.isCorrectNetwork === true
                            ? "Connected to correct network"
                            : preflightChecks.isCorrectNetwork === false
                              ? `Auto-switching to ${
                                  NETWORK_OPTIONS.find((n) => n.id === network)?.name
                                }...`
                              : isSwitchingNetwork
                                ? "Switching networks..."
                                : "Checking network..."}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center p-3 rounded-lg border ${
                        preflightChecks.isDeployed === true
                          ? "bg-green-50 border-green-200 text-green-700"
                          : preflightChecks.isDeployed === false
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="text-lg mr-3">
                        {preflightChecks.isDeployed === true
                          ? "✅"
                          : preflightChecks.isDeployed === false
                            ? "❌"
                            : "⏳"}
                      </span>
                      <div>
                        <div className="font-medium">🏦 Safe Contract</div>
                        <div className="text-sm">
                          {preflightChecks.isDeployed === true
                            ? "Safe found on network"
                            : preflightChecks.isDeployed === false
                              ? "Safe not found on this network"
                              : "Checking deployment..."}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center p-3 rounded-lg border ${
                        preflightChecks.isOwner === true
                          ? "bg-green-50 border-green-200 text-green-700"
                          : preflightChecks.isOwner === false
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="text-lg mr-3">
                        {preflightChecks.isOwner === true
                          ? "✅"
                          : preflightChecks.isOwner === false
                            ? "❌"
                            : "⏳"}
                      </span>
                      <div>
                        <div className="font-medium">👤 Ownership</div>
                        <div className="text-sm">
                          {preflightChecks.isOwner === true
                            ? "Wallet is Safe owner"
                            : preflightChecks.isOwner === false
                              ? "Wallet is not a Safe owner"
                              : "Checking ownership..."}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center p-3 rounded-lg border ${
                        preflightChecks.hasSufficientBalance === true
                          ? "bg-green-50 border-green-200 text-green-700"
                          : preflightChecks.hasSufficientBalance === false
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="text-lg mr-3">
                        {preflightChecks.hasSufficientBalance === true
                          ? "✅"
                          : preflightChecks.hasSufficientBalance === false
                            ? "❌"
                            : "⏳"}
                      </span>
                      <div>
                        <div className="font-medium">💰 Balance</div>
                        <div className="text-sm">
                          {formatNumber(parseFloat(preflightChecks.safeBalance) || 0)} USDC
                          available
                          {totalAmount > 0 && ` (${formatNumber(totalAmount)} USDC needed)`}
                        </div>
                      </div>
                    </div>

                    {preflightChecks.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="text-red-700 text-sm font-medium">
                          ❌ {preflightChecks.error}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {recipients.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 flex-1">
                  <div className="flex items-center">
                    <div className="bg-white rounded-lg p-2 mr-3">
                      <svg
                        className="h-5 w-5 text-indigo-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">📊 Summary</div>
                      <div className="text-sm text-gray-600">
                        👥 {recipients.length} recipients • 💰 {formatNumber(totalAmount)} USDC
                        total
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canDisburse}
                  onClick={handleDisbursement}
                  className={`inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    !canDisburse
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : transactionState.isProcessing
                        ? "bg-blue-600 text-white"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white focus:ring-indigo-500 transform hover:scale-105"
                  }`}
                >
                  {transactionState.isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      🔄 Processing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      🚀 Disburse Funds
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
