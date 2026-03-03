"use client";

import { Controller } from "react-hook-form";
import { DateTimePicker } from "@/components/Utilities/DateTimePicker";
import type { TypeFieldsProps } from "./types";

export function HackathonFields({
  register,
  control,
  errors,
  labelStyle,
  inputStyle,
}: TypeFieldsProps) {
  return (
    <div className="flex flex-col w-full gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 p-5">
      <h3 className={labelStyle}>Hackathon Details</h3>
      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="hackathon-location" className={labelStyle}>
            Location *
          </label>
          <input
            id="hackathon-location"
            className={inputStyle}
            placeholder="e.g. Virtual, San Francisco, Istanbul"
            {...register("hackathonMeta.location")}
          />
          <p className="text-base text-red-400">{errors.hackathonMeta?.location?.message}</p>
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="hackathon-tracks" className={labelStyle}>
            Tracks (comma-separated)
          </label>
          <input
            id="hackathon-tracks"
            className={inputStyle}
            placeholder="e.g. DeFi, NFT, Infrastructure"
            {...register("hackathonMeta.tracks")}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="hackathon-prize-pool" className={labelStyle}>
            Total Prize Pool
          </label>
          <input
            id="hackathon-prize-pool"
            className={inputStyle}
            placeholder="e.g. 50000"
            type="number"
            {...register("hackathonMeta.prizePool")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="hackathon-prize-currency" className={labelStyle}>
            Prize Currency
          </label>
          <input
            id="hackathon-prize-currency"
            className={inputStyle}
            placeholder="USD"
            defaultValue="USD"
            {...register("hackathonMeta.prizeCurrency")}
          />
        </div>
        <Controller
          name="hackathonMeta.registrationDeadline"
          control={control}
          render={({ field }) => (
            <div className="flex w-full flex-col gap-1">
              <span id="hackathon-reg-deadline-label" className={labelStyle}>
                Registration Deadline
              </span>
              <DateTimePicker
                selected={field.value}
                onSelect={(date: Date | undefined) => field.onChange(date)}
                placeholder="Pick a date"
                timeMode="end"
                aria-labelledby="hackathon-reg-deadline-label"
              />
            </div>
          )}
        />
      </div>
      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="hackathon-team-min" className={labelStyle}>
            Min Team Size
          </label>
          <input
            id="hackathon-team-min"
            className={inputStyle}
            placeholder="e.g. 1"
            type="number"
            {...register("hackathonMeta.teamSizeMin")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="hackathon-team-max" className={labelStyle}>
            Max Team Size
          </label>
          <input
            id="hackathon-team-max"
            className={inputStyle}
            placeholder="e.g. 5"
            type="number"
            {...register("hackathonMeta.teamSizeMax")}
          />
        </div>
      </div>
    </div>
  );
}
