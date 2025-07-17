"use client";
import { useOwnerStore } from "@/store";
import { useState } from "react";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import axios from "axios";
import { envVars } from "@/utilities/enviromentVars";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";

const schema = z.object({
  addressOrEmail: z
    .string()
    .min(1, { message: "Input is required" })
    .refine(
      (value) =>
        /^0x[a-fA-F0-9]{40}$/.test(value) ||
        /^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/.test(value),
      { message: "Must be a valid email or Ethereum address" }
    ),
});

type SchemaType = z.infer<typeof schema>;

export default function SumupAdminPage() {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${envVars.NEXT_PUBLIC_KARMA_API}/sum-up/user/whitelist`,
        {
          identifier: data.addressOrEmail,
        }
      );
      reset();
      toast.success(MESSAGES.SUMUP_ADMIN.ADD_TO_WHITELIST.SUCCESS);
    } catch (error: any) {
      errorManager(
        MESSAGES.SUMUP_ADMIN.ADD_TO_WHITELIST.ERROR,
        error,
        {
          addressOrEmail: data.addressOrEmail,
        },
        { error: MESSAGES.SUMUP_ADMIN.ADD_TO_WHITELIST.ERROR }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return isOwner ? (
    <div className="flex flex-col w-full justify-center items-center p-3 gap-2">
      <div className="font-bold text-2xl">SumUp Config</div>

      <div className="w-full transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-4"
        >
          <div className="flex w-full flex-col">
            <div className="font-bold text-base">WhiteList</div>
            <label htmlFor="addressOrEmail" className={"text-sm font-bold"}>
              Email or Wallet address *
            </label>
            <input
              id="addressOrEmail"
              className={
                "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              }
              placeholder="Ex: mahesh@karmahq.xyz or 0x1234567890abcdef1234567890abcdef12345678"
              {...register("addressOrEmail")}
            />
            <p className="text-base text-red-400">
              {errors.addressOrEmail?.message}
            </p>
          </div>
          <div className="flex flex-row gap-4 justify-end">
            <Button
              className="text-white text-lg bg-primary-500 border-black  hover:bg-primary-600 hover:text-white"
              disabled={isLoading}
              isLoading={isLoading}
              type="submit"
            >
              Whitelist
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : (
    <div className="flex w-full items-center justify-center m-12">
      <p>
        You are account isnt super admin.Only Super admin can view this page
      </p>
    </div>
  );
}
