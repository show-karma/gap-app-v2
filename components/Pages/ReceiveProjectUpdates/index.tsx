"use client";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Spinner } from "@/components/Utilities/Spinner";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { z } from "zod";

const lookupSchema = z.object({
  address: z.string().refine((str) => isAddress(str), {
    message: "Invalid address",
  }),
});
const subscribeSchema = z.object({
  email: z.string().email(),
});

type LookupFormType = z.infer<typeof lookupSchema>;
type SubscribeFormType = z.infer<typeof subscribeSchema>;

interface SubscribeFormProps {
  address: string;
  changeIsSubscribed: (value: boolean) => void;
}

const SubscribeForm = ({ address, changeIsSubscribed }: SubscribeFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<SubscribeFormType>({
    resolver: zodResolver(subscribeSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<SubscribeFormType> = async (data) => {
    setIsLoading(true);
    try {
      const [res, error] = await fetchData(
        INDEXER.COMMUNITY.SUBSCRIBE.BULK,
        "POST",
        {
          publicAddress: address.toLowerCase(),
          email: data.email,
        }
      );
      if (error) {
        throw error;
      }
      changeIsSubscribed(true);
      toast.success(
        "You have subscribed to all the projects funded by your wallet"
      );
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while subscribing, try again later.");
      changeIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2 w-full">
          <input
            className="rounded w-full text-black dark:text-white dark:bg-zinc-700 placeholder:text-zinc-500 dark:placeholder:text-zinc-100"
            placeholder="Enter your e-mail address"
            {...register("email")}
          />
          <p className="text-red-400">{errors.email?.message}</p>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            You will receive updates from all the projects funded by your wallet
          </p>
        </div>
        <Button
          type="submit"
          className="w-full flex flex-row text-base justify-center items-center bg-zinc-700 hover:bg-zinc-700 text-white px-4 py-2 rounded"
          isLoading={isLoading}
          disabled={isLoading || !isValid}
        >
          Subscribe
        </Button>
      </form>
    </div>
  );
};
export const communitiesToBulkSubscribe: string[] = ["gitcoin"];

export const ReceiveProjectUpdates = ({
  communityName,
}: {
  communityName: string;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LookupFormType>({
    resolver: zodResolver(lookupSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [projectsFunded, setProjectsFunded] = useState(0);
  const [addressSearched, setAddressSearched] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const changeIsSubscribed = (value: boolean) => {
    setSubscribed(value);
  };

  const onSubmit: SubmitHandler<LookupFormType> = async (data) => {
    setAddressSearched(data.address);
    setIsLoading(true);
    changeIsSubscribed(false);
    try {
      const [res, error] = await fetchData(
        INDEXER.PROJECT.FUNDEDBY(data.address.toLowerCase())
      );
      if (error) {
        throw error;
      }
      setProjectsFunded(res.length);
    } catch (error) {
      console.error(error);
      setProjectsFunded(0);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col gap-8  max-w-xl w-full">
      <div className="flex flex-col gap-8">
        <h1 className="text-xl font-semibold">
          Receive updates from projects you have funded
        </h1>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <label>Your wallet address</label>
            <input
              className="rounded text-black dark:text-white dark:bg-zinc-700 placeholder:text-zinc-500 dark:placeholder:text-zinc-100"
              placeholder="Enter your wallet address"
              {...register("address")}
            />
            <p className="text-red-400">{errors.address?.message}</p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              This is the wallet you used to fund projects on {communityName}
            </p>
          </div>
          <Button
            disabled={isLoading || !isValid}
            type="submit"
            className="w-full flex flex-row justify-center text-base items-center bg-brand-blue text-white px-4 py-2 rounded"
            isLoading={isLoading}
          >
            Lookup
          </Button>
        </form>
        {addressSearched ? (
          isLoading ? (
            <div className="flex flex-col justify-center items-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-t border-t-zinc-300 pt-4">
              <p className="text-black dark:text-white">
                You have funded {projectsFunded} projects.{" "}
                {projectsFunded ? (
                  <>
                    You can find all the projects you have funded{" "}
                    <ExternalLink
                      className="underline text-blue-600 dark:text-blue-400"
                      href={`https://explorer.gitcoin.co/#/contributors/${addressSearched}`}
                    >
                      here.
                    </ExternalLink>
                  </>
                ) : null}
              </p>
              {projectsFunded > 0 ? (
                subscribed ? (
                  <p className="text-green-600 dark:text-green-500">
                    Successfully subscribed to all the projects funded by your
                    wallet.
                  </p>
                ) : (
                  <SubscribeForm
                    address={addressSearched}
                    changeIsSubscribed={changeIsSubscribed}
                  />
                )
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
