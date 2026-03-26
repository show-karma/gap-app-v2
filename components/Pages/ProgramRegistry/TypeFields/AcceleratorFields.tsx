"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { TypeFieldsProps } from "./types";

export function AcceleratorFields({ register, control, labelStyle, inputStyle }: TypeFieldsProps) {
  return (
    <div className="flex flex-col w-full gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 p-5">
      <h3 className={labelStyle}>Accelerator Details</h3>
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="accelerator-stage" className={labelStyle}>
            Stage
          </label>
          <Controller
            name="acceleratorMeta.stage"
            control={control}
            render={({ field }) => (
              <select
                id="accelerator-stage"
                className={inputStyle}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
              >
                <option value="">Select stage</option>
                <option value="pre-seed">Pre-Seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
              </select>
            )}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="accelerator-equity" className={labelStyle}>
            Equity Requirement
          </label>
          <Input
            id="accelerator-equity"
            className={inputStyle}
            placeholder="e.g. 7%"
            {...register("acceleratorMeta.equity")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="accelerator-location" className={labelStyle}>
            Location
          </label>
          <Input
            id="accelerator-location"
            className={inputStyle}
            placeholder="e.g. Remote, New York"
            {...register("acceleratorMeta.location")}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="accelerator-funding" className={labelStyle}>
            Funding Amount
          </label>
          <Input
            id="accelerator-funding"
            className={inputStyle}
            placeholder="e.g. 150000"
            type="number"
            {...register("acceleratorMeta.fundingAmount")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="accelerator-duration" className={labelStyle}>
            Program Duration (months)
          </label>
          <Input
            id="accelerator-duration"
            className={inputStyle}
            placeholder="e.g. 3"
            type="number"
            {...register("acceleratorMeta.programDuration")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="accelerator-batch-size" className={labelStyle}>
            Batch Size
          </label>
          <Input
            id="accelerator-batch-size"
            className={inputStyle}
            placeholder="e.g. 10"
            type="number"
            {...register("acceleratorMeta.batchSize")}
          />
        </div>
      </div>
    </div>
  );
}
