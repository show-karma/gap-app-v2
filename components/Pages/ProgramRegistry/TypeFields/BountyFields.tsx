"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { TypeFieldsProps } from "./types";

export function BountyFields({
  register,
  control,
  errors,
  labelStyle,
  inputStyle,
}: TypeFieldsProps) {
  return (
    <div className="flex flex-col w-full gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 p-5">
      <h3 className={labelStyle}>Bounty Details</h3>
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="bounty-reward" className={labelStyle}>
            Reward Amount *
          </label>
          <Input
            id="bounty-reward"
            className={inputStyle}
            placeholder="e.g. 5000"
            type="number"
            {...register("bountyMeta.rewardAmount")}
          />
          {errors.bountyMeta?.rewardAmount?.message && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.bountyMeta.rewardAmount.message}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="bounty-currency" className={labelStyle}>
            Reward Currency
          </label>
          <Input
            id="bounty-currency"
            className={inputStyle}
            placeholder="USD"
            defaultValue="USD"
            {...register("bountyMeta.rewardCurrency")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="bounty-difficulty" className={labelStyle}>
            Difficulty
          </label>
          <Controller
            name="bountyMeta.difficulty"
            control={control}
            render={({ field }) => (
              <select
                id="bounty-difficulty"
                className={inputStyle}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
              >
                <option value="">Select difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            )}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="bounty-skills" className={labelStyle}>
            Skills (comma-separated)
          </label>
          <Input
            id="bounty-skills"
            className={inputStyle}
            placeholder="e.g. Solidity, React, Rust"
            {...register("bountyMeta.skills")}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="bounty-platform" className={labelStyle}>
            Platform
          </label>
          <Input
            id="bounty-platform"
            className={inputStyle}
            placeholder="e.g. Gitcoin, Superteam Earn"
            {...register("bountyMeta.platform")}
          />
        </div>
      </div>
    </div>
  );
}
