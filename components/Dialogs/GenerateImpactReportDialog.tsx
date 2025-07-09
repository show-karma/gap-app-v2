/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { renderToHTML } from "@/utilities/markdown";
import { Dialog, Transition } from "@headlessui/react";
import {
  DocumentCheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { FC, Fragment, ReactNode, useState } from "react";
import toast from "react-hot-toast";
import Html from "react-pdf-html";
import { Button } from "../Utilities/Button";

import { useProjectStore } from "@/store";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { envVars } from "@/utilities/enviromentVars";
import { getProjectById } from "@/utilities/sdk";
import {
  BlobProvider,
  Document,
  Font,
  Image,
  Page,
  PDFDownloadLink,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { errorManager } from "../Utilities/errorManager";
import { useWallet } from "@/hooks/useWallet";
import { useProjectQuery } from "@/hooks/useProjectQuery";

// Create styles
const styles = StyleSheet.create({});
Font.registerEmojiSource({
  format: "png",
  url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/",
});
Font.register({
  family: "Open Sans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf",
      fontWeight: 600,
    },
  ],
});

const defaultBannerImageURL = `${envVars.VERCEL_URL}/assets/impact-banner.jpg`;

// Replace image URLs with a proxy URL to avoid CORS issues
export function replaceImageUrls(htmlString: string) {
  const proxyUrl = "/api/img-proxy?url=";
  return htmlString.replace(
    /<img\s+([^>]*?)src="([^"]+)"([^>]*?)>/g,
    (match: any, p1: any, p2: any, p3: any) => {
      const proxiedSrc = `${proxyUrl}${encodeURIComponent(p2)}`;
      return `<img ${p1}src="${proxiedSrc}"${p3}>`;
    }
  );
}

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
  const isLink = (link?: string) => {
    if (!link) return false;
    if (
      link.includes("http://") ||
      link.includes("https://") ||
      link.includes("www.")
    ) {
      return true;
    }
    return false;
  };

  const addPrefix = (link: string) => `https://${link}`;

  const removeHTTP = (link: string) => {
    if (link.includes("https://")) {
      return link.split("https://")[1];
    }
    if (link.includes("http://")) {
      return link.split("http://")[1];
    }
    return link;
  };

  const getTwitterUserNameOnly = (text: string) => {
    if (!text) return "";

    if (text.includes("twitter.com/")) {
      const twitterUsername = text.split("x.com/")[1];
      return twitterUsername;
    }

    if (text.includes("x.com/")) {
      const twitterUsername = text.split("x.com/")[1];
      return twitterUsername;
    }

    if (text.includes("@")) {
      const twitterUsername = text.split("@")[1];
      return twitterUsername;
    }

    return text;
  };

  return (
    <Document>
      <Page
        size={{ width: 595.28 }}
        style={{
          fontFamily: "Open Sans",
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
                width: "17%",
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
                width: "auto",
                alignItems: "center",
              }}
            >
              <Image
                src={
                  "https://assets-global.website-files.com/5d66bdc65e51a0d114d15891/64cebe06bc8437de66e41758_X-EverythingApp-Logo-Black-Twitter.jpg"
                }
                style={{
                  borderRadius: 50,
                  marginRight: 1,
                  width: 15,
                  height: 15,
                }}
              />
              <Text
                style={{
                  marginRight: 10,
                }}
              >
                {`${getTwitterUserNameOnly(
                  project?.details?.data?.links?.find(
                    (social) => social?.type === "twitter"
                  )?.url as string
                )}`}
              </Text>

              <Image
                src={
                  "https://static.vecteezy.com/system/resources/thumbnails/003/731/316/small_2x/web-icon-line-on-white-background-image-for-web-presentation-logo-icon-symbol-free-vector.jpg"
                }
                style={{
                  borderRadius: 50,
                  marginRight: 4,
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
                {`${removeHTTP(
                  project?.details?.data?.links?.find(
                    (social) => social?.type === "website"
                  )?.url as string
                )}`}
              </Text>

              <Image
                src={
                  "https://static-00.iconduck.com/assets.00/github-icon-2048x2048-qlv5m092.png"
                }
                style={{
                  backgroundColor: "black",
                  borderRadius: 50,
                  marginRight: 4,
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
                {
                  project?.details?.data?.links?.find(
                    (social) => social?.type === "github"
                  )?.url as string
                }
              </Text>
            </View>
          </View>

          <View style={{}}>
            <Text
              style={{
                color: "#2563eb",
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              {grant.details?.data?.title} - Impact Report
            </Text>
            <Text
              style={{
                fontFamily: "Open Sans",
                fontWeight: 600,
              }}
            >
              {project?.details?.data?.title}
            </Text>
            {project?.details?.data?.locationOfImpact && (
              <View
                style={{
                  backgroundColor: "#eef1f4",
                  padding: 5,
                  marginTop: 8,
                  borderRadius: 5,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 5,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    📍 Location of Impact:{" "}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {project?.details?.data?.locationOfImpact}
                  </Text>
                </View>
              </View>
            )}
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

        {project?.details?.data?.missionSummary &&
          project?.details?.data?.problem &&
          project?.details?.data?.solution && (
            <>
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
                    fontSize: 15,
                    marginBottom: 8,
                    fontWeight: 600,
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
                  gap: 10,
                  marginTop: 10,
                  marginHorizontal: 10,
                }}
              >
                <View
                  style={{
                    // margin: 10,
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
                      fontWeight: 600,
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
                    // margin: 10,
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
                      fontWeight: 600,
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
            </>
          )}
        {grant.milestones.length > 0 ? (
          <View
            style={{
              margin: 10,
              padding: 10,
            }}
          >
            <View>
              <Text
                style={{
                  fontWeight: 600,
                }}
              >
                Milestone Progress
              </Text>
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
                      fontWeight: 600,
                    }}
                  >
                    🚩 #{index + 1} {JSON.stringify(milestone?.data?.title)}
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
                      {replaceImageUrls(
                        renderToHTML(milestone?.data?.description)
                      )}
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
                        <Text
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          Updates:{" "}
                        </Text>
                        <Html
                          stylesheet={{
                            img: {
                              width: "100%",
                            },
                          }}
                          style={{
                            fontSize: 11,
                            marginTop: -6,
                          }}
                        >
                          {replaceImageUrls(
                            renderToHTML(milestone?.completed?.data?.reason)
                          )}
                        </Html>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View
            style={{
              margin: 10,
              padding: 10,
            }}
          >
            <View>
              <Text
                style={{
                  fontWeight: 600,
                }}
              >
                Milestone Progress
              </Text>
              <View
                style={{
                  flexGrow: 1,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    marginVertical: 10,
                    fontWeight: 600,
                  }}
                >
                  🚩 No Milestones
                </Text>
              </View>
            </View>
          </View>
        )}

        <View
          wrap={false}
          style={{
            marginHorizontal: 15,
            padding: 20,
            borderRadius: 10,
            backgroundColor: "#faf5ee",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            🌟 Impact Summary
          </Text>
          <Html
            stylesheet={{
              img: {
                width: "100%",
              },
            }}
            style={{
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {replaceImageUrls(renderToHTML(impactSummary))}
          </Html>
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
            <Text
              style={{
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              💬 Impact Testimonial
            </Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 10,
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
  const { data: project } = useProjectQuery();
  const { chain, switchChainAsync, getSigner } = useWallet();
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
      const fetchedProject = await getProjectById(project.uid);
      if (!fetchedProject) return;

      closeModal();
    } catch (error: any) {
      errorManager(`Error generating impact report`, error);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
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

                  {!project?.details?.data?.missionSummary &&
                    !project?.details?.data?.problem &&
                    !project?.details?.data?.solution &&
                    !project?.details?.data?.locationOfImpact && (
                      <div className="flex w-full">
                        <div className="mt-5 flex w-full justify-between rounded-xl bg-[#bee1d8] border-l-[5px] border-[#1de9b6] rounded-l-lg p-4 gap-4 max-md:p-2 max-md:flex-col">
                          <div className="flex flex-row gap-4 items-center max-md:gap-2.5">
                            <ExclamationCircleIcon className="h-10 w-10" />
                            <div className="flex flex-col">
                              <p className="text-sm font-semibold text-[#080a0e] max-md:text-xs">
                                Your project is missing some key information to
                                generate a complete impact report. Please edit
                                your project to include the following: Mission
                                Summary, Problem, Solution, Location of Impact.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  <section className="grid grid-cols-1 md:grid-cols-2  gap-5 mt-5">
                    <div>
                      <div className="flex flex-col gap-2 mb-10">
                        <label htmlFor="newOwner">Summary of the impact</label>
                        <MarkdownEditor
                          value={impactSummary}
                          onChange={(newValue: string) =>
                            setImpactSummary(newValue)
                          }
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
                        <h4 className="mt-5 mb-3 md:mt-0 md:mb-0">Preview</h4>
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
                    <BlobProvider
                      document={
                        <GenerateDocument
                          grant={grant}
                          project={project as IProjectResponse}
                          impactSummary={impactSummary}
                          impactRecipientTestimonial={
                            impactRecipientTestimonial
                          }
                          impactBannerImageURL={impactBannerImageURL}
                        />
                      }
                    >
                      {({ blob, url, loading, error }) => (
                        <a
                          href={url || "#"}
                          download={`${
                            project?.details?.data?.slug || "project"
                          }-impact-report-${grant?.details?.data?.title?.replaceAll(
                            " ",
                            "-"
                          )}.pdf`}
                          className="text-primary-600 text-lg bg-primary-100 border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900 p-3 rounded-md"
                        >
                          {loading ? "Loading document..." : "💾 Download"}
                        </a>
                      )}
                    </BlobProvider>
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
