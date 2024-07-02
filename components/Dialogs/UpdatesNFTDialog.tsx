/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "../Utilities/Button";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import {
  usePublicClient,
  useWalletClient,
  useAccount,
  useChainId,
  useSignTypedData,
} from "wagmi";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";
import { Address, parseEther } from "viem";
import ZoraCollectPremint from "../Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CollectPremint";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import Image from "next/image";
import satori from "satori";
import { storeFile, storeJSON, storeMetadata } from "@/utilities/storeOnIPFS";
import { TicketIcon } from "@heroicons/react/24/outline";
import { Spinner } from "../Utilities/Spinner";
import { envVars } from "@/utilities/enviromentVars";

type UpdatesNFTDialogProps = {
  nftContractName: string;
  entityTitle: string;
  entityDescription: string;
  projectName: string;
  projectSlug: string;
  updateTitle: string;
  updateDescription: string;
  platformAddress: Address;
  mintChainID: number;
  entityUID: `0x${string}`;
};

export const UpdatesNFTDialog: FC<UpdatesNFTDialogProps> = ({
  entityTitle,
  entityDescription,
  projectName,
  projectSlug,
  updateTitle,
  updateDescription,
  nftContractName,
  entityUID,
  mintChainID,
  platformAddress,
}) => {
  const publicClient = usePublicClient();
  const { address: creatorAddress } = useAccount();
  const { signTypedData, data: signature } = useSignTypedData();
  const [svg, setSvg] = useState<string | null>("");

  const [pricePerToken, setPricePerToken] = useState<string>("0");
  const [debugGlobalAddress, setDebugGlobalAddress] = useState<string | null>(
    null
  );
  const [debugGlobalUid, setDebugGlobalUid] = useState<number | null>(null);
  const [premintConfig, setPremintConfig] = useState<any>(null);
  const [collectionAddress, setCollectionAddress] = useState<string | null>(
    null
  );
  const [typedDataDefinition, setTypedDataDefinition] = useState<any>(null);
  const [submit, setSubmit] = useState<Function | null>(null);
  const [contractURI, setContractURI] = useState<string>("");
  const [tokenURI, setTokenURI] = useState<string>("");

  const creatorClient = createCreatorClient({
    chainId: mintChainID,
    publicClient: publicClient as any,
  });

  let [isOpen, setIsOpen] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }

  // Store metadata
  async function storeMetadataToIPFS(svg: string) {
    storeFile(new File([svg], "image.svg", { type: "image/svg+xml" })).then(
      (imageCID) => {
        console.log("Image CID ", `ipfs://${imageCID}`);
        storeMetadata({
          name: entityTitle,
          description: entityDescription,
          image: `ipfs://${imageCID}`,
          external_url: `${envVars.VERCEL_URL}/project/${projectSlug}`,
          attributes: [
            {
              trait_type: "Project",
              value: projectName,
            },
            {
              trait_type: "Entity Title",
              value: entityTitle,
            },
            {
              trait_type: "Entity Description",
              value: entityDescription,
            },
            {
              trait_type: "Update Title",
              value: updateTitle,
            },
            {
              trait_type: "Update Description",
              value: updateDescription,
            },
            {
              trait_type: "Mint Chain ID",
              value: mintChainID,
            },
            {
              trait_type: "Platform Address",
              value: platformAddress,
            },
          ],
        })
          .then((cid) => {
            console.log("Token Metadata CID ", `ipfs://${cid}`);
            setTokenURI(`ipfs://${cid}`);
          })
          .catch((error) => {
            console.error("Error storing metadata", error);
          });
        storeMetadata({
          name: nftContractName,
          description:
            "This is an NFT contract for a milestone update on Karma GAP.",
          image: `ipfs://${imageCID}`,
        })
          .then((cid) => {
            console.log("Contract Metadata CID ", `ipfs://${cid}`);
            setContractURI(`ipfs://${cid}`);
          })
          .catch((error) => {
            console.error("Error storing metadata", error);
          });
      }
    );
  }

  // Render image using milestone data
  useEffect(() => {
    (async () => {
      const normalFont = await fetch("/fonts/Poppins/poppins_regular.ttf");
      const normalFontBuffer = await normalFont.arrayBuffer();

      const boldFont = await fetch("/fonts/Poppins/poppins_bold.ttf");
      const boldFontBuffer = await boldFont.arrayBuffer();

      const svgString = await satori(
        <section
          tw="bg-white flex flex-col w-full h-full items-start justify-between p-4"
          style={{ color: "black" }}
        >
          <div tw="flex justify-between items-center w-full">
            <div
              style={{ fontFamily: "Poppins Bold" }}
              tw="w-[50%] text-2xl bg-teal-400 h-full flex justify-start px-2 pt-2 rounded-md items-center text-white"
            >
              {nftContractName}
            </div>
            <img src="/logo/karma-gap-logo-white.svg" height={45} alt="" />
          </div>
          <div tw="flex flex-col justify-start items-between">
            <section tw="flex flex-col bg-zinc-200 p-2 rounded-xl justify-start items-start">
              <div tw="flex flex-col">
                <div
                  tw="flex mb-1"
                  style={{
                    fontFamily: "Poppins Bold",
                  }}
                >
                  {entityTitle}
                </div>
                <div tw="flex text-sm leading-1">{entityDescription}</div>
              </div>
              <div tw="flex flex-col mt-4">
                <div
                  tw="flex mb-1"
                  style={{
                    fontFamily: "Poppins Bold",
                  }}
                >
                  {updateTitle}
                </div>
                <div tw="flex text-sm leading-1">{updateDescription}</div>
              </div>
            </section>
          </div>
          <section tw="flex justify-between items-end w-full">
            <div
              tw="flex text-2xl mb-1 w-[60%] leading-[1.1]"
              style={{
                fontFamily: "Poppins Bold",
              }}
            >
              {projectName}
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.href}`}
              height={150}
              alt=""
            />
          </section>
        </section>,
        {
          width: 500,
          height: 500,
          fonts: [
            {
              name: "Poppins Normal",
              // Use `fs` (Node.js only) or `fetch` to read the font as Buffer/ArrayBuffer and provide `data` here.
              data: normalFontBuffer,
              weight: 400,
              style: "normal",
            },
            {
              name: "Poppins Bold",
              // Use `fs` (Node.js only) or `fetch` to read the font as Buffer/ArrayBuffer and provide `data` here.
              data: boldFontBuffer,
              weight: 700,
              style: "normal",
            },
          ],
        }
      );
      setSvg(svgString);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [data, error] = await fetchData(
        INDEXER.GRANTS.MILESTONES.GET(String(entityUID))
      );

      console.log("MilestoneNFT Already Exists", data, error, entityUID);

      if (data) {
        setDebugGlobalAddress(data.contractAddress);
        setDebugGlobalUid(data.zoraPremintUID);
      }
    })();
  }, []);

  useEffect(() => {
    async function createPremint() {
      await storeMetadataToIPFS(svg as string);
      console.log("Metadata stored on IPFS");
      const {
        premintConfig: pC,
        collectionAddress: cA,
        typedDataDefinition: tDD,
        submit: sub,
      } = await creatorClient.createPremint({
        // collection info of collection to create.  The combination of these fields will determine the
        // deterministic collection address.
        contract: {
          // the account that will be the admin of the collection.  Must match the signer of the premint.
          contractAdmin: creatorAddress as Address,
          contractName: nftContractName,
          contractURI: contractURI, // "ipfs://QmYjwarNweXhQAfu3phirz8vwnwFEqo5t8m3xt3HWpFd8N",
        },
        // token info of token to create
        token: {
          tokenURI: tokenURI, // "ipfs://QmXr9NuvX9afZhHTpd2jRgFHbVnaWPKD315AtnTT6H67hz",
          createReferral: platformAddress,
          maxSupply: BigInt(50000),
          maxTokensPerAddress: BigInt(1),
          mintStart: BigInt(0),
          mintDuration: BigInt(0), // 0 for infinite.
          pricePerToken: BigInt(parseEther(pricePerToken, "wei")), // 0 for it to be a free mint.
          payoutRecipient: creatorAddress as Address, // address to receive creator rewards for free mints, or if its a paid mint, the paid mint sale proceeds.
        },
      });

      setPremintConfig(pC);
      setCollectionAddress(cA);
      setTypedDataDefinition(tDD);
      setSubmit(() => sub); // Ensure submit is set as a function
    }

    if (creatorAddress && svg) {
      createPremint();
    }
  }, [creatorAddress]);

  useEffect(() => {
    if (signature) {
      if (submit) {
        // Submit the premint
        submit({
          signature,
        });
        // Set the contractAddress and zoraPremintUID to DB
        fetchData(INDEXER.GRANTS.MILESTONES.CREATE(String(entityUID)), "POST", {
          contractAddress: collectionAddress,
          zoraPremintUID: premintConfig.uid,
          chainID: mintChainID,
        }).then(([data, error]) => {
          console.log("MilestoneNFT Saved!", data, error);

          // Debug to store collection info
          setDebugGlobalAddress(collectionAddress);
          setDebugGlobalUid(premintConfig.uid);
        });
      } else {
        console.error("Submit function is not set.");
      }
    }
  }, [signature]);

  return (
    <div className="mx-2">
      <Button
        onClick={openModal}
        className="px-2 py-1 w-max h-max text-white transition-all duration-500 bg-gradient-to-tr to-red-400 via-violet-600 from-blue-500 bg-size-200 bg-pos-0 hover:bg-pos-100  shadow"
      >
        <TicketIcon className="text-white w-5 h-5 mr-1" />
        Mint as NFT
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
                    <p className="font-normal">
                      Are you sure you want to mint this update as an NFT?
                    </p>
                  </Dialog.Title>
                  <section>
                    {svg ? (
                      <div>
                        <div className="flex rounded-lg border-2 border-zinc-200 p-2 items-center justify-between w-full mt-3">
                          <label
                            htmlFor="name-input"
                            className="font-bold mr-3"
                          >
                            Price Per Token <br /> (in ETH):
                          </label>
                          <input
                            id="price-per-token-input"
                            type="number"
                            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                            placeholder="0.001"
                            value={pricePerToken}
                            onChange={(e) => {
                              setPricePerToken(e.target.value);
                            }}
                          />
                        </div>
                        <div
                          dangerouslySetInnerHTML={{ __html: svg }}
                          className="bg-zinc-200 rounded-lg shadow-lg mt-3 flex justify-center py-3"
                        />
                      </div>
                    ) : (
                      <div className="bg-zinc-100 shadow-xl mt-4 flex flex-col-reverse justify-center items-center py-10 w-full h-full">
                        Generating NFT Preview... <Spinner className="mb-3" />
                      </div>
                    )}
                  </section>

                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-transparent dark:hover:bg-zinc-900 dark:hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={closeModal}
                      disabled={isMinting}
                    >
                      Cancel
                    </Button>

                    {!debugGlobalAddress || !debugGlobalUid ? (
                      <Button
                        className="text-white text-lg bg-blue-600 border-black  hover:bg-blue-500 hover:text-white"
                        onClick={() => signTypedData(typedDataDefinition)}
                        disabled={isMinting}
                        isLoading={isMinting}
                      >
                        {isMinting
                          ? "Minting..."
                          : "Premint (Gasless via Zora)"}
                      </Button>
                    ) : (
                      <div className="flex h-10 items-center space-x-4">
                        <div className="flex flex-col ">
                          <p>Collection Address: {debugGlobalAddress}</p>
                          <p>UID: {debugGlobalUid}</p>
                        </div>

                        <br />
                        <ZoraCollectPremint
                          contractAddress={debugGlobalAddress}
                          uid={debugGlobalUid}
                        />
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
