"use client";

import { Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utilities/tailwind";
import type { TypeFieldsProps } from "./types";

export function VcFundFields({ register, control, labelStyle, inputStyle }: TypeFieldsProps) {
  return (
    <div className="flex flex-col w-full gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 p-5">
      <h3 className={labelStyle}>VC Fund Details</h3>
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="vc-stage" className={labelStyle}>
            Stage
          </label>
          <Controller
            name="vcFundMeta.stage"
            control={control}
            render={({ field }) => (
              <select
                id="vc-stage"
                className={inputStyle}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
              >
                <option value="">Select stage</option>
                <option value="pre-seed">Pre-Seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b+">Series B+</option>
              </select>
            )}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="vc-check-min" className={labelStyle}>
            Min Check Size
          </label>
          <input
            id="vc-check-min"
            className={inputStyle}
            placeholder="e.g. 100000"
            type="number"
            {...register("vcFundMeta.checkSizeMin")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="vc-check-max" className={labelStyle}>
            Max Check Size
          </label>
          <input
            id="vc-check-max"
            className={inputStyle}
            placeholder="e.g. 2000000"
            type="number"
            {...register("vcFundMeta.checkSizeMax")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="vc-thesis" className={labelStyle}>
            Investment Thesis
          </label>
          <textarea
            id="vc-thesis"
            className={cn(inputStyle, "bg-transparent min-h-[80px] max-h-[160px]")}
            placeholder="Describe your investment thesis"
            {...register("vcFundMeta.thesis")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="vc-portfolio" className={labelStyle}>
            Portfolio Companies (comma-separated)
          </label>
          <input
            id="vc-portfolio"
            className={inputStyle}
            placeholder="e.g. Uniswap, Aave, Compound"
            {...register("vcFundMeta.portfolio")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="vc-contact" className={labelStyle}>
            Contact Method
          </label>
          <Controller
            name="vcFundMeta.contactMethod"
            control={control}
            render={({ field }) => (
              <select
                id="vc-contact"
                className={inputStyle}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
              >
                <option value="">Select method</option>
                <option value="email">Email</option>
                <option value="form">Form</option>
                <option value="intro-only">Intro Only</option>
              </select>
            )}
          />
        </div>
        <div className="flex items-end gap-3 pb-3">
          <Controller
            name="vcFundMeta.activelyInvesting"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="actively-investing"
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <label
                  htmlFor="actively-investing"
                  className="text-sm font-medium text-gray-700 dark:text-zinc-200 cursor-pointer"
                >
                  Actively investing
                </label>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
