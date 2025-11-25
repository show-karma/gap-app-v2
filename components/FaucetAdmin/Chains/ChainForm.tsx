"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const chainSchema = z.object({
  chainId: z.number().min(1, "Chain ID must be positive"),
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  rpcUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  explorerUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  decimals: z.number().min(0).max(18),
})

type ChainFormData = z.infer<typeof chainSchema>

interface ChainFormProps {
  chain?: any
  onSave: (data: ChainFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ChainForm({ chain, onSave, onCancel, isLoading }: ChainFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ChainFormData>({
    resolver: zodResolver(chainSchema),
    defaultValues: {
      chainId: chain?.chainId || 1,
      name: chain?.name || "",
      symbol: chain?.symbol || "",
      rpcUrl: chain?.rpcUrl || "",
      explorerUrl: chain?.explorerUrl || "",
      decimals: chain?.decimals || 18,
    },
  })

  const onSubmit = async (data: ChainFormData) => {
    setIsSubmitting(true)
    try {
      // Clean up optional URLs
      const cleanedData = {
        ...data,
        rpcUrl: data.rpcUrl || undefined,
        explorerUrl: data.explorerUrl || undefined,
      }
      await onSave(cleanedData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chain ID */}
        <div>
          <label
            htmlFor="chain-form-chainId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Chain ID <span className="text-red-500">*</span>
          </label>
          <input
            id="chain-form-chainId"
            type="number"
            {...register("chainId", { valueAsNumber: true })}
            disabled={!!chain}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="1"
          />
          {errors.chainId && <p className="mt-1 text-sm text-red-600">{errors.chainId.message}</p>}
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="chain-form-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Chain Name <span className="text-red-500">*</span>
          </label>
          <input
            id="chain-form-name"
            type="text"
            {...register("name")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            placeholder="Ethereum"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {/* Symbol */}
        <div>
          <label
            htmlFor="chain-form-symbol"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Native Token Symbol <span className="text-red-500">*</span>
          </label>
          <input
            id="chain-form-symbol"
            type="text"
            {...register("symbol")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            placeholder="ETH"
          />
          {errors.symbol && <p className="mt-1 text-sm text-red-600">{errors.symbol.message}</p>}
        </div>

        {/* Decimals */}
        <div>
          <label
            htmlFor="chain-form-decimals"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Decimals <span className="text-red-500">*</span>
          </label>
          <input
            id="chain-form-decimals"
            type="number"
            {...register("decimals", { valueAsNumber: true })}
            min={0}
            max={18}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            placeholder="18"
          />
          {errors.decimals && (
            <p className="mt-1 text-sm text-red-600">{errors.decimals.message}</p>
          )}
        </div>

        {/* RPC URL */}
        <div>
          <label
            htmlFor="chain-form-rpcUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            RPC URL (Optional)
          </label>
          <input
            id="chain-form-rpcUrl"
            type="url"
            {...register("rpcUrl")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            placeholder="https://mainnet.infura.io/v3/..."
          />
          {errors.rpcUrl && <p className="mt-1 text-sm text-red-600">{errors.rpcUrl.message}</p>}
        </div>

        {/* Explorer URL */}
        <div>
          <label
            htmlFor="chain-form-explorerUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Explorer URL (Optional)
          </label>
          <input
            id="chain-form-explorerUrl"
            type="url"
            {...register("explorerUrl")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            placeholder="https://etherscan.io"
          />
          {errors.explorerUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.explorerUrl.message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isLoading ? "Saving..." : chain ? "Update Chain" : "Create Chain"}
        </button>
      </div>
    </form>
  )
}
