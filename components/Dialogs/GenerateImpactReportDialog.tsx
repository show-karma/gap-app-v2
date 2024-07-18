/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Html from "react-pdf-html";

import { DocumentCheckIcon, PlusIcon } from "@heroicons/react/24/solid";
import { renderToHTML } from "@/utilities/markdown";
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
  Font,
} from "@react-pdf/renderer";
import { PDFViewer } from "@react-pdf/renderer";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";

// Create styles
const styles = StyleSheet.create({});
Font.registerEmojiSource({
  format: "png",
  url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/",
});

const defaultBannerImageURL = "http://localhost:3000/assets/impact-banner.jpg";

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
          lineHeight: 1.3,
          flexDirection: "column",
          paddingBottom: 20,
          paddingTop: 20,
          paddingHorizontal: 30,
        }}
      >
        <View
          style={{
            padding: 10,
            flexDirection: "column",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              marginBottom: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                width: "20%",
              }}
            >
              <Image
                src={"https://gap.karmahq.xyz/logo/logo-dark.png"}
                style={{
                  backgroundColor: "black",
                  padding: 5,
                  marginRight: 5,
                  width: 30,
                  height: 30,
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
                  width: 30,
                  height: 30,
                  borderRadius: 50,
                }}
              />
            </View>
            <View
              style={{
                color: "#52525b",
                fontSize: 10,
                flexDirection: "row",
                justifyContent: "flex-end",
                width: "80%",
                alignItems: "center",
              }}
            >
              <Image
                src={
                  "https://assets-global.website-files.com/5d66bdc65e51a0d114d15891/64cebe06bc8437de66e41758_X-EverythingApp-Logo-Black-Twitter.jpg"
                }
                style={{
                  borderRadius: 50,
                  marginRight: 2,
                  width: 15,
                  height: 15,
                }}
              />
              <Text
                style={{
                  marginRight: 10,
                }}
              >
                @
                {
                  project?.details?.data?.links?.find(
                    (social) => social?.type === "twitter"
                  )?.url
                }
              </Text>

              <Image
                src={
                  "https://static.vecteezy.com/system/resources/thumbnails/003/731/316/small_2x/web-icon-line-on-white-background-image-for-web-presentation-logo-icon-symbol-free-vector.jpg"
                }
                style={{
                  borderRadius: 50,
                  marginRight: 5,
                  padding: -3,
                  width: 10,
                  height: 10,
                }}
              />
              <Text
                style={{
                  marginRight: 10,
                }}
              >
                {
                  project?.details?.data?.links?.find(
                    (social) => social?.type === "website"
                  )?.url
                }
              </Text>

              <Image
                src={
                  "https://static-00.iconduck.com/assets.00/github-icon-2048x2048-qlv5m092.png"
                }
                style={{
                  backgroundColor: "black",
                  borderRadius: 50,
                  marginRight: 5,
                  padding: -5,
                  width: 10,
                  height: 10,
                }}
              />
              <Text
                style={{
                  marginRight: 10,
                }}
              >
                github.com/
                {
                  project?.details?.data?.links?.find(
                    (social) => social?.type === "github"
                  )?.url
                }
              </Text>
            </View>
          </View>

          <View style={{}}>
            <Text
              style={{
                color: "#2563eb",
                fontSize: 16,
                marginBottom: 5,
              }}
            >
              {grant.details?.data.title} - Impact Report
            </Text>
            <Text
              style={{
                fontFamily: "Helvetica",
                fontWeight: "heavy",
              }}
            >
              {project?.details?.data?.title}
            </Text>
            <View
              style={{
                backgroundColor: "#eef1f4",
                padding: 5,
                marginTop: 5,
                borderRadius: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                }}
              >
                📍 Location of Impact:{" "}
                {project?.details?.data?.locationOfImpact}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={{
            height: "180px", // Set your desired fixed height here
            width: "auto",
            borderRadius: 10,
            marginHorizontal: 10,
            overflow: "hidden", // Ensures the image does not overflow the container size
          }}
        >
          <Image
            src={impactBannerImageURL || defaultBannerImageURL}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover", // or 'contain' based on your preference
            }}
          />
        </View>

        <View
          style={{
            marginTop: 10,
            marginHorizontal: 10,
            padding: 20,
            borderRadius: 10,
            flexGrow: 1,
            backgroundColor: "#e2e8fb",
          }}
        >
          <Text
            style={{
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 8,
              fontFamily: "Helvetica-Bold",
            }}
          >
            🖊️ Mission Summary
          </Text>
          <Text
            style={{
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {project?.details?.data?.missionSummary}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
          }}
        >
          <View
            style={{
              margin: 10,
              padding: 20,
              flexGrow: 1,
              width: "50%",
              borderRadius: 10,
              backgroundColor: "#faf2d9",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              ⚠️ Problem
            </Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {project?.details?.data?.problem}
            </Text>
          </View>
          <View
            style={{
              margin: 10,
              padding: 20,
              borderRadius: 10,
              flexGrow: 1,
              width: "50%",
              backgroundColor: "#e4f6f2",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              ✅ Solution
            </Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {project?.details?.data?.solution}
            </Text>
          </View>
        </View>
        <View
          style={{
            margin: 10,
            padding: 10,
          }}
        >
          <View>
            <Text style={{}}>Milestone Progress</Text>
            {grant.milestones.map((milestone, index) => (
              <View
                style={{
                  flexGrow: 1,
                  marginBottom: 10,
                }}
                key={index}
              >
                <Text
                  style={{
                    fontSize: 14,
                    marginVertical: 10,
                    fontWeight: "bold",
                  }}
                >
                  🚩 #{index + 1} {JSON.stringify(milestone.data.title)}
                </Text>
                <View
                  style={{
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  <Html
                    stylesheet={{
                      img: {
                        width: "100%",
                      },
                    }}
                    style={{
                      fontSize: 11,
                    }}
                  >
                    {renderToHTML(milestone.data.description)}
                  </Html>
                </View>
                {milestone?.completed?.data?.reason && (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 12,
                      flexGrow: 1,
                      borderRadius: 10,
                      backgroundColor: "#f0f0f0",
                    }}
                  >
                    <View
                      style={{
                        fontSize: 11,
                      }}
                    >
                      <Text>Updates: </Text>
                      <Html
                        stylesheet={{
                          img: {
                            width: "100%",
                          },
                        }}
                        style={{
                          fontSize: 11,
                        }}
                      >
                        {renderToHTML(milestone?.completed?.data?.reason)}
                      </Html>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
        <View
          wrap={false}
          style={{
            margin: 10,
            padding: 20,
            borderRadius: 10,
            backgroundColor: "#faf5ee",
          }}
        >
          <Text>🌟 Impact Summary</Text>
          <Text
            style={{
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {impactSummary}
          </Text>
        </View>
        {impactRecipientTestimonial && (
          <View
            wrap={false}
            style={{
              margin: 10,
              padding: 20,
              borderRadius: 10,
              backgroundColor: "#f5f9f4",
            }}
          >
            <Text>💬 Impact Testimonial</Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              {impactRecipientTestimonial}
            </Text>
          </View>
        )}
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
  const [impactBannerImageURL, setImpactBannerImageURL] = useState<string>(``);

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
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-900 dark:text-zinc-100"
                  >
                    Generate Impact Report PDF
                  </Dialog.Title>
                  <section className="grid grid-cols-2 gap-5 mt-3">
                    <div>
                      <div className="flex flex-col gap-2 mb-10">
                        <label htmlFor="newOwner">Summary of the impact</label>
                        <textarea
                          className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                          id="impactSummary"
                          rows={5}
                          onChange={(e) => setImpactSummary(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-10">
                        <label htmlFor="newOwner">
                          Testimonial from impact recipient (optional)
                        </label>
                        <textarea
                          rows={5}
                          className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                          id="impactRecipientTestimonial"
                          value={impactRecipientTestimonial}
                          onChange={(e) =>
                            setImpactRecipientTestimonial(e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2 ">
                        <label htmlFor="newOwner">
                          Banner image URL (optional)
                        </label>
                        <input
                          className="rounded border border-zinc-300  dark:bg-zinc-800 px-2 py-1 text-black dark:text-white"
                          id="impactBannerImageURL"
                          value={impactBannerImageURL}
                          onChange={(e) =>
                            setImpactBannerImageURL(e.target.value)
                          }
                        />
                      </div>
                    </div>
                    {project && grant && impactSummary ? (
                      <div className="flex flex-col">
                        <h4 className="">Preview</h4>
                        <PDFViewer className="w-full h-full rounded-xl">
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
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mt-2">
                        <label htmlFor="newOwner">Preview</label>
                        <div className="bg-zinc-100 flex flex-col justify-center items-center gap-2 p-4  border border-zinc-300 dark:border-zinc-800 rounded dark:bg-zinc-800 h-full">
                          <p className="text-zinc-600 dark:text-zinc-100">
                            Please fill in all fields
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                      disabled={isLoading}
                    >
                      Cancel
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
