"use client";
/* eslint-disable @next/next/no-img-element */
import React from "react";
import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { TransactionLink } from "@/components/Utilities/TransactionLink";
import axios from "axios";
import { formatEther } from "viem";
import { envVars } from "@/utilities/enviromentVars";
import { useWriteContract, useReadContract } from "wagmi";
import { NetworkDropdown } from "@/components/Dialogs/ProjectDialog/NetworkDropdown";
import { appNetwork, getChainNameById } from "@/utilities/network";
import AirdropNFTABI from "@show-karma/karma-gap-sdk/core/abi/AirdropNFT.json";
import { Networks } from "@show-karma/karma-gap-sdk";
import toast from "react-hot-toast";
import { getGitcoinDonations } from "@/utilities/allo/getGitcoinDonations";
import { getProjectDetails } from "@/utilities/allo/getProjectDetails";
import { errorManager } from "@/components/Utilities/errorManager";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Dispatch, SetStateAction } from "react";

type ProjectApplicationData = {
  project: {
    metadata: {
      title: string;
      logoImg: string;
    };
  };
  totalAmountDonatedInUsd: string;
  uniqueDonorsCount: number;
  chainId: number;
  roundId: string;
  id: string;
};

type DonationData = {
  donorAddress: string;
  amountInUsd: string;
  transactionHash: string;
  chainId: number;
};

type Metadata = {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
};

const PlatformFeeNote = ({
  setPlatformFee,
  chainId,
}: {
  chainId: number;
  setPlatformFee: Dispatch<SetStateAction<string | null>>;
}) => {
  const {
    data: platformFee,
    isLoading: isPlatformFeeLoading,
    error: platformFeeError,
  }: any = useReadContract({
    chainId,
    address: Networks[getChainNameById(chainId)]?.contracts
      ?.airdropNFT as `0x${string}`,
    abi: AirdropNFTABI,
    functionName: "PLATFORM_FEE",
  });

  const { address: walletAddress } = useAccount();

  useEffect(() => {
    if (platformFee) {
      setPlatformFee(String(platformFee));
    } else {
      setPlatformFee(String(8000000000000000));
    }
  }, [platformFee]);

  useEffect(() => {
    if (platformFeeError) {
      console.log("Error fetching platform fee", platformFeeError);
      errorManager("Error fetching platform fee", platformFeeError);
    }
  }, [platformFeeError]);

  return !isPlatformFeeLoading ? (
    <p className="text-sm text-slate-600 dark:text-slate-300">
      {walletAddress
        ? `Note: A platform fee of ${formatEther(
            platformFee || String(8000000000000000)
          )} ETH will be charged, excluding gas fees.`
        : "Note: Connect your wallet to fetch the platform fee for the selected network."}
    </p>
  ) : (
    <p className="text-sm text-slate-600 dark:text-slate-300">
      Loading platform fee...
    </p>
  );
};

function MintNFTs({
  projectDetails,
  donations,
}: {
  projectDetails: ProjectApplicationData;
  donations: DonationData[];
}) {
  const [fileUploading, setFileUploading] = useState(false);
  const [imageIPFSHash, setImageIPFSHash] = useState<string | null>(null);
  const [chainSelected, setChainSelected] = useState<number>(
    envVars.isDev ? 84532 : 42161 // 84532 is base sepolia, 42161 is arbitrum
  );
  const [metadataIPFSHash, setMetadataIPFSHash] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [customDescription, setCustomDescription] = useState("");

  const [platformFee, setPlatformFee] = useState<string | null>(null);
  const [topDonors, setTopDonors] = useState<number>(donations.length);

  const { switchChainAsync } = useSwitchChain();

  const chainId = useChainId();

  const {
    writeContract: mintNFTs,
    data: txData,
    isPending: isMinting,
    error: mintError,
    isSuccess,
    isError: isMintError,
  } = useWriteContract();

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      setFileUploading(true);
      const formData = new FormData();
      formData.append("file", event.target.files[0]);

      await axios
        .post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
          headers: {
            Authorization: `Bearer ${envVars.IPFS_TOKEN}`,
            "Content-Type": "multipart/form-data",
          },
        })
        .then(async (response) => {
          setImageIPFSHash(response.data.IpfsHash);

          const defaultDescription = `This NFT is issued to honor and recognize your invaluable support of donors who have generously funded ${projectDetails.project.metadata.title}, symbolizing their crucial role in driving impactful change.`;
          const fullDescription = customDescription
            ? `${customDescription} \n|\n ${defaultDescription}`
            : defaultDescription;

          const metadata = {
            name: `${projectDetails.project.metadata.title}`,
            description: fullDescription,
            image: `ipfs://${response.data.IpfsHash}`,
            attributes: [],
          };

          await axios
            .post(
              "https://api.pinata.cloud/pinning/pinJSONToIPFS",
              {
                pinataContent: metadata,
                pinataMetadata: {
                  name: "Karma GAP Patron NFT Metadata",
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${envVars.IPFS_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            )
            .then((metadataResponse) => {
              setMetadata(metadata);
              setMetadataIPFSHash(metadataResponse.data.IpfsHash);
              setFileUploading(false);
            })
            .catch((err) => {
              errorManager("Error uploading to IPFS", err);
              setFileUploading(false);
            });
        })
        .catch((err) => {
          errorManager("Error uploading to IPFS", err);
          setFileUploading(false);
        });
    }
  };

  const handleMintNFTs = async () => {
    if (!imageIPFSHash && !metadataIPFSHash) {
      alert("Please upload an NFT image first.");
      return;
    }

    try {
      console.log(
        "Minting NFTs for",
        topDonors,
        "contributors with IPFS hash:",
        metadataIPFSHash
      );
      mintNFTs({
        address: Networks[getChainNameById(chainId)]?.contracts
          ?.airdropNFT as `0x${string}`,
        abi: AirdropNFTABI,
        functionName: "mintNFTsToContributors",
        args: [
          `${projectDetails.chainId}_${projectDetails.roundId}_${projectDetails.id}`,
          `ipfs://${metadataIPFSHash}`,
          Array.from(
            new Set(donations.map((donation: any) => donation.donorAddress))
          ).slice(0, topDonors),
        ],
        value: BigInt(platformFee ? platformFee : 0),
      });

      if (mintError) {
        toast.error(
          mintError.message.includes("insufficient funds")
            ? "Insufficient funds for transaction"
            : mintError.message.includes("Project already exists")
            ? "Project already minted"
            : mintError.message
        );
      }
    } catch (error) {
      console.log("Error minting NFTs", error);
      errorManager("Error minting NFTs", error);
    }
  };

  useEffect(() => {
    const checkAndSwitchChain = async () => {
      if (chainId !== chainSelected) {
        console.log("Switching chains");
        await switchChainAsync?.({ chainId: chainSelected }).catch((err) => {
          if (err.message.includes("wallet_switchEthereumChain")) {
            console.log("Already switching");
          }
        });
      }
    };

    checkAndSwitchChain();
  }, [chainId, chainSelected]);

  return (
    <div className="flex flex-col md:flex-row items-start gap-4 w-full h-full mx-auto bg-transparent rounded-xl py-4">
      <div className="flex flex-col justify-between items-between w-full md:w-1/2 h-full md:pr-4">
        <h2 className="text-xl font-bold text-black dark:text-white mb-2">
          Mint NFTs for {projectDetails.uniqueDonorsCount} contributors, across{" "}
          {donations.length} donations
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Choose an image/file for the NFT, add a custom message, and mint it
          for all your contributors.
        </p>

        <div className="flex w-full flex-col gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 mb-2 mt-2">
          <label
            htmlFor="chain-id-input"
            className="block text-sm font-bold text-slate-700 dark:text-slate-300"
          >
            Choose a network
          </label>
          <NetworkDropdown
            onSelectFunction={(networkId) => {
              setChainSelected(networkId);
            }}
            networks={appNetwork}
            previousValue={chainSelected}
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Add a message (optional)
          </label>
          <textarea
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            className="w-full px-3 py-2 text-slate-700 dark:text-slate-300 dark:bg-slate-700 bg-white border rounded-lg focus:outline-none "
            rows={2}
            placeholder="Enter a custom description for your NFT"
          />
        </div>

        <div className="mb-4 flex justify-between">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Upload file for NFT *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 file:bg-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Mint for top {topDonors} donors
            </label>
            <input
              type="number"
              max={donations.length}
              min={1}
              value={topDonors}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                // Ensure the value does not exceed the donations length
                if (value <= donations.length && value >= 1) {
                  setTopDonors(value);
                } else if (value < 1) {
                  setTopDonors(1); // Set it to the minimum value
                } else {
                  setTopDonors(donations.length); // Cap it to the max value
                }
              }}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-700 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border rounded-lg"
            />
          </div>
        </div>

        {imageIPFSHash && metadataIPFSHash && (
          <div className="text-sm mb-4 bg-slate-100 dark:bg-slate-700 my-2 rounded-md px-4 py-2">
            <p className="font-semibold mb-2 text-black dark:text-white">
              Metadata:
            </p>
            <div className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 py-2 rounded-md">
              {metadata && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">NFT Name:</div>
                  <div>{metadata.name}</div>
                  <div className="font-medium">NFT Description:</div>
                  <div>{metadata.description}</div>
                </div>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleMintNFTs}
          disabled={!imageIPFSHash || isMinting || isSuccess || isMintError}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed mb-2"
        >
          {isMinting
            ? "Minting..."
            : isSuccess
            ? "NFTs minted successfully!"
            : mintError
            ? "Error minting NFTs"
            : "Mint NFTs to Contributors"}
        </button>
        {isSuccess && (
          <p className="text-green-500 text-sm">
            View transaction on{" "}
            <TransactionLink chainId={chainId} transactionHash={txData} />
          </p>
        )}
        {mintError && (
          <p className="text-red-500 text-sm">
            {mintError.message.includes("insufficient funds")
              ? "Insufficient funds for transaction"
              : mintError.message.includes("Project already exists")
              ? "Project already minted"
              : mintError.message.includes("User rejected")
              ? "Transaction cancelled"
              : mintError.message}
          </p>
        )}
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <PlatformFeeNote
            setPlatformFee={setPlatformFee}
            chainId={chainSelected}
          />
        </div>
      </div>
      <div className="w-full md:w-1/2 h-full mt-4 md:mt-0">
        {fileUploading ? (
          <div className="w-full min-h-80   flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : imageIPFSHash ? (
          <img
            src={`/api/img-proxy?url=https://gateway.pinata.cloud/ipfs/${imageIPFSHash}`}
            alt="NFT Image"
            className="w-full h-auto rounded-xl bg-slate-300"
          />
        ) : (
          <div className="w-full  min-h-80   flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-xl">
            <p className="text-slate-500 dark:text-slate-400">
              No image uploaded
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const schema = z.object({
  gitcoinProjectUrl: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (url) => {
        const urlPattern =
          /https:\/\/explorer\.gitcoin\.co\/#\/round\/(\d+)\/([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40}|[0-9]+)\/([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40}|[0-9]+)(-\d+)?/;
        return urlPattern.test(url);
      },
      {
        message: "Please enter a valid Gitcoin project URL",
      }
    ),
});

type FormData = z.infer<typeof schema>;

export const GitcoinAirdropsManager = () => {
  const itemsPerPage = 10;
  const [projectURL, setProjectURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [projectData, setProjectData] = useState<{
    details: ProjectApplicationData | null;
    donations: DonationData[];
  }>({
    details: null,
    donations: [],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    setProjectURL(data.gitcoinProjectUrl);
  };

  useEffect(() => {
    if (projectURL) {
      handleGitcoinDataFetch();
    }
  }, [projectURL]);

  async function handleGitcoinDataFetch() {
    setLoading(true);

    const chainId = parseInt(projectURL.split("/")[5]);
    const roundId = projectURL.split("/")[6];
    const applicationId = projectURL.split("/")[7];

    const donations = await getGitcoinDonations(
      chainId,
      applicationId,
      roundId
    );
    const projectDetails = await getProjectDetails(
      chainId,
      applicationId,
      roundId
    );

    setProjectData({
      details: projectDetails,
      donations: donations,
    });
    setTotalPages(Math.ceil(donations.length / itemsPerPage));
    setLoading(false);
  }

  function isValidGitcoinURL(url: string) {
    const urlPattern =
      /https:\/\/explorer\.gitcoin\.co\/#\/round\/(\d+)\/([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40}|[0-9]+)\/([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40}|[0-9]+)(-\d+)?/;
    return urlPattern.test(url);
  }

  return (
    <section className="container pb-7 max-md:pt-0 max-md:my-4">
      <div className="flex flex-col w-full gap-6">
        <div className="flex flex-col gap-3 items-start justify-start text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white tracking-tight">
            Airdrop NFTs to Your Gitcoin Round Contributors!
          </h1>
          <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 max-w-3xl">
            Get started with Gitcoin supporter airdrops now!
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col w-full gap-4 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md"
        >
          <label
            htmlFor="gitcoinProjectUrl"
            className="text-lg font-medium text-slate-800 dark:text-slate-200"
          >
            Enter your Gitcoin project URL
          </label>
          <input
            type="text"
            id="gitcoinProjectUrl"
            {...register("gitcoinProjectUrl")}
            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-300"
            placeholder="E.g., https://explorer.gitcoin.co/#/round/42161/26/21"
          />
          {errors.gitcoinProjectUrl && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
              <p className="text-lg">{errors.gitcoinProjectUrl.message}</p>
            </div>
          )}
          <button
            type="submit"
            id="fetch-button"
            className={`w-fit border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 flex items-center gap-2 px-6 py-3 rounded-md mt-4 font-medium`}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </span>
            ) : (
              <>
                <img
                  src="/logos/gitcoin.png"
                  alt="Gitcoin Logo"
                  className="w-6 h-6"
                />
                <span>Fetch Project from Gitcoin</span>
              </>
            )}
          </button>
        </form>

        <section className="mt-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                Loading project data...
              </p>
            </div>
          ) : projectData?.details && projectData?.donations?.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex flex-col gap-6">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">
                Selected Project Details
              </h2>
              <div className="flex flex-col sm:flex-row justify-start gap-6 items-center bg-slate-100 dark:bg-slate-700 p-6 rounded-xl max-w-max w-full">
                <img
                  src={`/api/img-proxy?url=https://gateway.pinata.cloud/ipfs/${projectData?.details?.project?.metadata?.logoImg}`}
                  alt="Project Logo"
                  className="w-24 h-24 rounded-full object-cover shadow-md"
                />
                <div className="text-center sm:text-left">
                  <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-2">
                    {projectData?.details?.project?.metadata?.title || "N/A"}
                  </p>
                  <p className="text-lg text-slate-600 dark:text-slate-300">
                    <strong>Funding received in round:</strong> $
                    {parseFloat(
                      projectData.details?.totalAmountDonatedInUsd
                    ).toLocaleString()}{" "}
                    USD
                  </p>
                </div>
              </div>

              <MintNFTs
                projectDetails={projectData.details}
                donations={projectData.donations}
              />

              <div className="mt-8">
                <details className="bg-slate-100 dark:bg-slate-700 rounded-xl">
                  <summary className="cursor-pointer p-4 font-semibold text-slate-800 dark:text-white text-lg">
                    View Donations ({projectData.donations.length})
                  </summary>
                  <div className="overflow-x-auto p-4">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-600">
                          <th className="px-4 py-2 text-left text-slate-700 dark:text-slate-200">
                            S.No
                          </th>
                          <th className="px-4 py-2 text-left text-slate-700 dark:text-slate-200">
                            Address
                          </th>
                          <th className="px-4 py-2 text-right text-slate-700 dark:text-slate-200">
                            Transaction
                          </th>
                          <th className="px-4 py-2 text-right text-slate-700 dark:text-slate-200">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.donations
                          .slice((page - 1) * itemsPerPage, page * itemsPerPage)
                          .map((donation: any, index: number) => (
                            <tr
                              key={index}
                              className="border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors duration-150"
                            >
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                                {index + 1 + (page - 1) * itemsPerPage}
                              </td>
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                                <EthereumAddressToENSName
                                  address={donation.donorAddress}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <TransactionLink
                                  chainId={donation.chainId}
                                  transactionHash={donation.transactionHash}
                                />
                              </td>
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200 text-right">
                                ${parseFloat(donation.amountInUsd).toFixed(2)}{" "}
                                USD
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-6">
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                      <span className="text-slate-700 dark:text-slate-300">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          ) : projectURL && isValidGitcoinURL(projectURL) ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
              <p className="text-lg">
                No project data available. Please fetch Gitcoin data first.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
};
