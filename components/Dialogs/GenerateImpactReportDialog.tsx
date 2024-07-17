/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { DocumentCheckIcon, PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "../Utilities/Button";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { useProjectStore } from "@/store";
import { useAccount, useSwitchChain } from "wagmi";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { appNetwork } from "@/utilities/network";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getWalletClient } from "@wagmi/core";
import { useStepper } from "@/store/txStepper";
import { getProjectById, getProjectOwner } from "@/utilities/sdk";
import { config } from "@/utilities/wagmi/config";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";

import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { PDFViewer } from "@react-pdf/renderer";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";

// Create styles
const styles = StyleSheet.create({});

function GenerateDocument({
  grant,
  project,
  impactSummary,
  impactRecipientTestimonial,
  impactBannerImageURL,
}: {
  grant: IGrantResponse;
  project: IProjectResponse;
  impactSummary: string;
  impactRecipientTestimonial: string;
  impactBannerImageURL: string;
}): ReactNode {
  return (
    <Document>
      <Page
        size="A4"
        style={{
          flexDirection: "column",
          backgroundColor: "#E4E4E4",
        }}
      >
        <View
          style={{
            margin: 10,
            padding: 10,
            flexGrow: 1,
            flexDirection: "row",
          }}
        >
          <View
            style={{
              marginRight: 10,
              flexDirection: "row",
            }}
          >
            <Image
              src={
                project?.details?.data?.imageURL ||
                "https://gap.karmahq.xyz/logo/logo-dark.png"
              }
              style={{
                backgroundColor: "black",
                padding: 10,
                marginRight: 5,
                width: 50,
                height: 50,
                borderRadius: 50,
              }}
            />
            <Image
              src={
                grant?.community?.details?.data?.imageURL ||
                "https://gap.karmahq.xyz/logo/logo-dark.png"
              }
              style={{
                backgroundColor: "black",
                width: 50,
                height: 50,
                borderRadius: 50,
              }}
            />
          </View>
          <View
            style={{
              flexGrow: 1,
              width: "62",
            }}
          >
            <Text
              style={{
                color: "#2563eb",
                fontSize: 20,
              }}
            >
              {grant.details?.data.title}
            </Text>
            <Text>{project?.details?.data?.title}</Text>
            <Text
              style={{
                color: "#52525b",
                fontSize: 15,
                marginTop: 5,
              }}
            >
              Location of Impact: {"Sub-Saharan Africa"}
            </Text>
            <Text
              style={{
                color: "#52525b",
                fontSize: 11,
              }}
            >
              {project?.details?.data?.links &&
                project?.details?.data?.links
                  .filter((social) => social?.url)
                  .map((social, index) => (
                    <Text key={index}>
                      {index != 0 && " | "}
                      {social?.url}
                    </Text>
                  ))}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexGrow: 1,
            height: "180px", // Set your desired fixed height here
            width: "100vw",
            overflow: "hidden", // Ensures the image does not overflow the container size
          }}
        >
          <Image
            src={impactBannerImageURL}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover", // or 'contain' based on your preference
            }}
          />
        </View>

        <View
          style={{
            margin: 10,
            padding: 10,
            flexGrow: 1,
          }}
        >
          <Text>Mission Summary</Text>
          <Text
            style={{
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {
              "We work with local NGOs tocreate innovative ways toaccelerate off-grid solar inunderserved communities. Weenvision emergent pilotprojects & sustainable fundingmodels to empower ourpartner communities to accessclean energy & have anownership stake in the solardeployed."
            }
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "gray",
            flexDirection: "row",
          }}
        >
          <View
            style={{
              margin: 10,
              padding: 10,
              flexGrow: 1,
              width: "30%",
            }}
          >
            <Text>Problem</Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {
                "We believe that new technologies such as Web3 & blockchain have the potential to accelerate progress address climate change especially for reducing GHG emissions deforestation through solar power and clean cooking. "
              }
            </Text>
          </View>
          <View
            style={{
              margin: 10,
              padding: 10,
              flexGrow: 1,
              width: "30%",
            }}
          >
            <Text>Solution</Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {
                "We believe that new technologies such as Web3 & blockchain have the potential to accelerate progress address climate change especially for reducing GHG emissions deforestation through solar power and clean cooking. "
              }
            </Text>
          </View>
        </View>
        <View
          style={{
            margin: 10,
            padding: 10,
            flexGrow: 1,
          }}
        >
          <Text style={{}}>Milestone Progress</Text>
          <View>
            {grant.milestones.map((milestone, index) => (
              <View
                style={{
                  flexGrow: 1,
                  marginTop: 10,
                }}
                key={index}
              >
                <Text
                  style={{
                    fontSize: 14,
                    marginTop: 5,
                  }}
                >
                  #{index + 1} {JSON.stringify(milestone.data.title)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  {/* <MarkdownPreview
                source={grant?.details?.data?.description}
              /> */}
                  {JSON.stringify(milestone.data.description)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  Updates: {milestone?.completed?.data?.reason}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View
          style={{
            margin: 10,
            padding: 10,
            flexGrow: 1,
          }}
        >
          <Text>Impact Summary</Text>
          <Text
            style={{
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {impactSummary ||
              `Solar for Education
·Rooftop solar for 2 rural schools in Nigeria including a computer lab that serves the entire community
Microgrid for a school in Tanzania, including teacher housing and offices

Solar for Community & Health Centers
·Rooftop solar for a Community Center in Nigeria
·Solar water pump & 2 water tanks; solar lights for security to provide water to local community members
· Rooftop solar for a health center in Kenya that includes a maternity ward and refrigeration for vaccines

Solar for Agroforestry
·Mobile solar for office; solar lights & fencing for nursery; solar home systems for volunteers and mobile phones to help showcase impact
Solar for Women
• Over 175 portable solar lanterns replaced unhealthy, polluting kerosene lamps in Uganda as a gateway to learning more about how solar works & how it can benefit the health, safety and economic development of off-grid families and communities`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

type Props = {
  grant: IGrantResponse;
};

export const GenerateImpactReportDialog: FC<Props> = ({ grant }) => {
  const signer = useSigner();
  const { chain } = useAccount();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);
  const { switchChainAsync } = useSwitchChain();
  const { changeStepperStep, setIsStepper } = useStepper();
  let [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [impactSummary, setImpactSummary] = useState<string>("");
  const [impactRecipientTestimonial, setImpactRecipientTestimonial] =
    useState<string>("");
  const [impactBannerImageURL, setImpactBannerImageURL] = useState<string>(
    `${envVars.VERCEL_URL}/images/karma-grant-reviews.png`
  );

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  const generate = async () => {
    if (!project) return;

    try {
      setIsLoading(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
      }

      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) return;

      closeModal();
    } catch (error) {
      toast.error("Something went wrong. Please try again later.");
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  return (
    <>
      <Button
        disabled={!isProjectOwner}
        onClick={openModal}
        className="flex items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900"
      >
        <DocumentCheckIcon className="h-4 w-4 text-primary-800" />
        Generate Impact Report PDF
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Generate Impact Report PDF
                  </Dialog.Title>
                  <div className="flex flex-col gap-2 mt-4 mb-3">
                    <label htmlFor="newOwner">
                      Add a summary of the impact
                    </label>
                    <textarea
                      className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                      id="impactSummary"
                      onChange={(e) => setImpactSummary(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-2 mb-3">
                    <label htmlFor="newOwner">
                      Add a testimonial from the impact recipient (optional)
                    </label>
                    <textarea
                      className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                      id="impactRecipientTestimonial"
                      value={impactRecipientTestimonial}
                      onChange={(e) =>
                        setImpactRecipientTestimonial(e.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-2 mb-5">
                    <label htmlFor="newOwner">
                      Add a banner image URL (optional)
                    </label>
                    <input
                      className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                      id="impactBannerImageURL"
                      value={impactBannerImageURL}
                      onChange={(e) => setImpactBannerImageURL(e.target.value)}
                    />
                  </div>
                  {project &&
                  grant &&
                  impactSummary &&
                  impactRecipientTestimonial &&
                  impactBannerImageURL ? (
                    <>
                      <h4 className="mb-3">Preview</h4>
                      <PDFViewer className="w-full h-60">
                        <GenerateDocument
                          grant={grant}
                          project={project}
                          impactSummary={impactSummary}
                          impactRecipientTestimonial={
                            impactRecipientTestimonial
                          }
                          impactBannerImageURL={impactBannerImageURL}
                        />
                      </PDFViewer>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2 mb-5">
                      <label htmlFor="newOwner">Preview</label>
                      <div className="bg-zinc-100 flex flex-col justify-center items-center gap-2 p-4 border border-zinc-300 dark:border-zinc-800 rounded dark:bg-zinc-800">
                        <p className="text-zinc-600 dark:text-zinc-100">
                          Please fill in all fields
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="text-white text-lg bg-red-600 border-black  hover:bg-red-600 hover:text-white"
                      onClick={generate}
                      disabled={isLoading || !impactSummary}
                      isLoading={isLoading}
                      type="button"
                    >
                      Continue
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
