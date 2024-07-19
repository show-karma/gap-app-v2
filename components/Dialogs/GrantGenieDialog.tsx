/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

import { DocumentCheckIcon } from "@heroicons/react/24/solid";
import { Button } from "../Utilities/Button";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store";
import { useAccount, useSwitchChain } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getWalletClient } from "@wagmi/core";
import { useStepper } from "@/store/txStepper";
import { getProjectById } from "@/utilities/sdk";
import { config } from "@/utilities/wagmi/config";

import React from "react";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";

type Props = {};

function GrantGenieRecommendations({ projectId }: { projectId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recommendations, setRecommendations] = useState<
    {
      name: string;
      description: string;
      title: string;
      score: number;
      recommendation: string;
    }[]
  >([]);

  useEffect(() => {
    setIsLoading(true);
    fetchData(INDEXER.PROJECT.GRANTS_GENIE(projectId), "GET").then(
      ([res, error]) => {
        setIsLoading(false);
        setError(error);
        if (error) {
          toast.error("Failed to fetch recommendations");
          return;
        }
        setRecommendations(res?.grants);
      }
    );
  }, [projectId]);

  return (
    <section className="grid grid-cols-1 gap-4 mt-3 h-[60vh] overflow-y-scroll">
      {isLoading ? (
        <div>Loading...</div>
      ) : recommendations?.length === 0 || error ? (
        <div>No recommendations available at the moment.</div>
      ) : (
        recommendations.map((recommendation, index) => (
          <div
            key={index}
            className="rounded-xl bg-teal-100 p-5 gap-5 grid grid-cols-2"
          >
            <div className="">
              <h3 className="font-semibold">{recommendation.title}</h3>
              <p>{recommendation.description}</p>
            </div>
            {/* <div>
                <p>Relevance: {recommendation.score}</p>
              </div> */}
            <div className="">
              <h4 className="font-semibold">Recommendation: </h4>
              <p>{recommendation.recommendation}</p>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export const GrantsGenieDialog: FC<Props> = ({}) => {
  const { chain } = useAccount();
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);
  const { switchChainAsync } = useSwitchChain();
  let [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <Button
        onClick={openModal}
        className="flex items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900"
      >
        <DocumentCheckIcon className="h-4 w-4 text-primary-800" />
        Call Grants Genie
      </Button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Funding Recommendations from Karma Grants Genie 🧞:
                  </Dialog.Title>

                  <GrantGenieRecommendations
                    projectId={project?.uid as string}
                  />

                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                      disabled={isLoading}
                    >
                      Close
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
