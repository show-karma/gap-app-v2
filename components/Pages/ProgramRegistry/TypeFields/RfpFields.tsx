"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utilities/tailwind";
import type { TypeFieldsProps } from "./types";

export function RfpFields({ register, errors, labelStyle, inputStyle }: TypeFieldsProps) {
  return (
    <div className="flex flex-col w-full gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 p-5">
      <h3 className={labelStyle}>RFP Details</h3>
      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="rfp-org" className={labelStyle}>
            Issuing Organization *
          </label>
          <Input
            id="rfp-org"
            className={inputStyle}
            placeholder="e.g. Ethereum Foundation"
            {...register("rfpMeta.issuingOrganization")}
          />
          <p className="text-base text-red-400">{errors.rfpMeta?.issuingOrganization?.message}</p>
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="rfp-budget" className={labelStyle}>
            Budget Amount
          </label>
          <Input
            id="rfp-budget"
            className={inputStyle}
            placeholder="e.g. 500000"
            type="number"
            {...register("rfpMeta.budgetAmount")}
          />
        </div>
      </div>
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="rfp-scope" className={labelStyle}>
          Scope
        </label>
        <textarea
          id="rfp-scope"
          className={cn(inputStyle, "bg-transparent min-h-[80px] max-h-[160px]")}
          placeholder="Describe the scope of this RFP"
          {...register("rfpMeta.scope")}
        />
      </div>
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="rfp-requirements" className={labelStyle}>
          Requirements (one per line)
        </label>
        <textarea
          id="rfp-requirements"
          className={cn(inputStyle, "bg-transparent min-h-[80px] max-h-[160px]")}
          placeholder={
            "Open source codebase\nProduction-ready in 3 months\nWeekly progress reports"
          }
          {...register("rfpMeta.requirements")}
        />
      </div>
    </div>
  );
}
