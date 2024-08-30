"use client";
/* eslint-disable @next/next/no-img-element */
import React from "react";
import { useState, } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { TransactionLink } from "@/components/Utilities/TransactionLink";
import axios from "axios";
import { formatEther } from "viem";
import { envVars } from "@/utilities/enviromentVars";
import { useWriteContract, useReadContract, } from "wagmi";
import { NetworkDropdown } from "@/components/Dialogs/ProjectDialog/NetworkDropdown";
import { appNetwork, getChainNameById } from "@/utilities/network";
import AirdropNFTABI from "@show-karma/karma-gap-sdk/core/abi/AirdropNFT.json"
import { Networks } from "@show-karma/karma-gap-sdk";
import toast from "react-hot-toast";
import { getGitcoinDonations } from "@/utilities/allo/getGitcoinDonations";
import { getProjectDetails } from "@/utilities/allo/getProjectDetails";
import { errorManager } from "@/components/Utilities/errorManager";


type ProjectApplicationData = {
    project: {
        metadata: {
            title: string
            logoImg: string
        }
    },
    totalAmountDonatedInUsd: string
    uniqueDonorsCount: number
    chainId: number
    roundId: string
    id: string
};

type DonationData = {
    donorAddress: string
    amountInUsd: string
    transactionHash: string
    chainId: number
}

type Metadata = {
    name: string
    description: string
    image: string
    attributes: {
        trait_type: string
        value: string
    }[]
}



const PlatformFeeNote = (
    {
        platformFee
    }: {
        platformFee: bigint
    }
) => {
    return (
        <p className="text-sm text-gray-600 dark:text-gray-300">
            Note: A platform fee of {platformFee ? formatEther(platformFee) : "N/A"} ETH will be charged, excluding gas fees.
        </p>
    )
}

function MintNFTs({
    projectDetails,
    donations
}: {
    projectDetails: ProjectApplicationData,
    donations: DonationData[]
}) {
    const [fileUploading, setFileUploading] = useState(false);
    const [imageIPFSHash, setImageIPFSHash] = useState<string | null>(null);
    const [chainSelected, setChainSelected] = useState<number>(
        envVars.isDev ? 84532 : 42161 // 84532 is base sepolia, 42161 is arbitrum
    );
    const [metadataIPFSHash, setMetadataIPFSHash] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<Metadata | null>(null)
    const [customDescription, setCustomDescription] = useState("");

    const { switchChainAsync } = useSwitchChain();

    const chainId = useChainId()
    const { data: platformFee }: any = useReadContract({
        chainId,
        address: Networks[getChainNameById(chainId)]?.contracts?.airdropNFT as `0x${string}`,
        abi: AirdropNFTABI,
        functionName: "PLATFORM_FEE"
    })
    const { writeContract: mintNFTs, data: txData, isPending: isMinting, error: mintError, isSuccess, } = useWriteContract()


    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFileUploading(true);
            const formData = new FormData();
            formData.append('file', event.target.files[0]);

            await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Authorization': `Bearer ${envVars.IPFS_TOKEN}`,
                    'Content-Type': 'multipart/form-data'
                }
            }).then(async (response) => {
                setImageIPFSHash(response.data.IpfsHash);

                const defaultDescription = `This NFT is issued to honor and recognize your invaluable support of donors who have generously funded ${projectDetails.project.metadata.title}, symbolizing their crucial role in driving impactful change.`;
                const fullDescription = customDescription ? `${customDescription} \n|\n ${defaultDescription}` : defaultDescription;

                const metadata = {
                    name: `${projectDetails.project.metadata.title} - Karma GAP Patron`,
                    description: fullDescription,
                    image: `ipfs://${response.data.IpfsHash}`,
                    attributes: []
                };

                await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                    pinataContent: metadata,
                    pinataMetadata: {
                        name: "Karma GAP Patron NFT Metadata"
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${envVars.IPFS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }).then((metadataResponse) => {
                    setMetadata(metadata)
                    setMetadataIPFSHash(metadataResponse.data.IpfsHash);
                    setFileUploading(false);
                }).catch((err) => {
                    errorManager("Error uploading to IPFS", err)
                    setFileUploading(false);
                })
            }).catch((err) => {
                errorManager("Error uploading to IPFS", err)
                setFileUploading(false);
            })
        }
    };

    const handleMintNFTs = async () => {
        if (!imageIPFSHash && !metadataIPFSHash) {
            alert("Please upload an NFT image first.");
            return;
        }


        if (chainId !== chainSelected) {
            await switchChainAsync?.({ chainId: chainSelected });

        }

        try {
            console.log("Minting NFTs for", donations.length, "contributors with IPFS hash:", metadataIPFSHash);
            mintNFTs({
                address: Networks[getChainNameById(chainId)]?.contracts?.airdropNFT as `0x${string}`,
                abi: AirdropNFTABI,
                functionName: "mintNFTsToContributors",
                args: [
                    `${projectDetails.chainId}_${projectDetails.roundId}_${projectDetails.id}`,
                    `ipfs://${metadataIPFSHash}`,
                    Array.from(new Set(donations.map((donation: any) => donation.donorAddress)))
                ],
                value: BigInt(
                    platformFee ? platformFee : 0
                )
            });

            if (mintError) {
                toast.error(mintError.message.includes("insufficient funds") ? "Insufficient funds for transaction" : mintError.message.includes("Project already exists") ? "Project already minted" : mintError.message)
            }
        } catch (error) {
            errorManager("Error minting NFTs", error)
        }
    };



    return (
        <div className="flex flex-col md:flex-row items-start gap-4 w-full h-full mx-auto mt-3 p-5 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <div className="flex flex-col justify-between items-between w-full md:w-1/2 h-full md:pr-4">
                <h2 className="text-xl font-bold text-black dark:text-white mb-2">Mint NFTs for {projectDetails.uniqueDonorsCount} contributors, across {donations.length} donations</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Choose an image/file for the NFT, add a custom message, and mint it for all your contributors.
                </p>

                <div className="flex w-full flex-col gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-3 mb-2 mt-2">
                    <label htmlFor="chain-id-input" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        Choose a network
                    </label>
                    <div className="w-fit shadow-md">
                        <NetworkDropdown
                            onSelectFunction={(networkId) => {
                                setChainSelected(networkId)
                            }}
                            networks={appNetwork}
                            previousValue={chainSelected}
                        /></div>
                </div>

                <div className="mb-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Add a message (optional)
                    </label>
                    <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none"
                        rows={2}
                        placeholder="Enter a custom description for your NFT"
                    ></textarea>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Upload file for NFT *
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>



                {imageIPFSHash && metadataIPFSHash && (
                    <div className="text-sm mb-4 bg-gray-100 dark:bg-gray-700 my-2 rounded-md">
                        <p className="font-semibold mb-2">Metadata:</p>
                        <div className="bg-gray-100 text-zinc-800 dark:bg-gray-700 py-2 rounded-md">
                            {metadata && <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">NFT Name:</div>
                                <div>{metadata.name}</div>
                                <div className="font-medium">NFT Description:</div>
                                <div>{metadata.description}</div>
                            </div>}
                        </div>
                    </div>
                )}
                <button
                    onClick={handleMintNFTs}
                    disabled={!imageIPFSHash || isMinting || isSuccess}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed mb-2"
                >
                    {isMinting ? "Minting..." : isSuccess ? "NFTs minted successfully!" : "Mint NFTs to Contributors"}
                </button>
                {isSuccess && <p className="text-green-500 text-sm">
                    View transaction on <TransactionLink chainId={chainId} transactionHash={txData} />
                </p>}
                {mintError && <p className="text-red-500 text-sm">
                    {mintError.message.includes("insufficient funds") ? "Insufficient funds for transaction" : mintError.message.includes("Project already exists") ? "Project already minted" : mintError.message}
                </p>}
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <PlatformFeeNote platformFee={platformFee} />
                </div>
            </div>
            <div className="w-full md:w-1/2 h-full mt-4 md:mt-0">
                {fileUploading ? (
                    <div className="w-full min-h-80   flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500">
                        </div>
                    </div>
                ) : imageIPFSHash ? (
                    <img
                        src={`/api/img-proxy?url=https://gateway.pinata.cloud/ipfs/${imageIPFSHash}`}
                        alt="NFT Image"
                        className="w-full h-auto rounded-xl bg-zinc-300"
                    />
                ) : (
                    <div className="w-full  min-h-80   flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl">
                        <p className="text-gray-500 dark:text-gray-400">No image uploaded</p>
                    </div>
                )}
            </div>
        </div>
    );
}


export const GitcoinAirdropsManager = () => {
    const itemsPerPage = 10;

    const [projectURL, setProjectURL] = useState("")
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [projectData, setProjectData] = useState<{
        details: ProjectApplicationData | null, donations: DonationData[]
    }>(
        {
            details: null,
            donations: []
        }
    )

    const { address } = useAccount()


    async function handleGitcoinDataFetch() {
        setLoading(true);

        const chainId = parseInt(projectURL.split("/")[5])
        const roundId = projectURL.split("/")[6]
        const applicationId = projectURL.split("/")[7]


        const donations = await getGitcoinDonations(chainId, applicationId, roundId)
        const projectDetails = await getProjectDetails(chainId, applicationId, roundId)

        setLoading(false)
        setProjectData({
            details: projectDetails,
            donations: donations
        })
        setTotalPages(Math.ceil(donations.length / itemsPerPage))
    }

    function isValidGitcoinURL(url: string) {
        const urlPattern = /https:\/\/explorer\.gitcoin\.co\/#\/round\/(\d+)\/([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40}|[0-9]+)\/([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40}|[0-9]+)(-\d+)?/;
        return urlPattern.test(url);
    }

    return (
        <section className="my-8 flex container mx-auto flex-col justify-between items-center gap-6 px-4 pb-7 max-md:pt-0 max-md:my-4">
            <div className="flex flex-col w-full gap-3">
                <div className="flex flex-[3] flex-col gap-3 items-start justify-start text-left max-lg:gap-1">
                    <h1 className="text-2xl tracking-[-0.72px] 2xl:text-4xl font-bold text-start text-black dark:text-white max-lg:tracking-normal">
                        {`Airdrop NFT to your Gitcoin round contributors!`}
                    </h1>
                    <p className="text-start text-base md:text-lg max-w-5xl text-black dark:text-white">
                        Get started with Gitcoin supporter airdrops now!
                    </p>
                </div>
            </div>


            <section className="container">
                <div className="flex flex-col w-full gap-3">
                    <label htmlFor="gitcoinProjectUrl" className="text-lg font-medium text-black dark:text-white">
                        Enter your Gitcoin project URL
                    </label>
                    <input
                        type="text"
                        id="gitcoinProjectUrl"
                        name="gitcoinProjectUrl"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: https://explorer.gitcoin.co/#/round/42161/26/21"
                        onChange={
                            (e) => {
                                setProjectURL(e.target.value)
                            }
                        }
                    />
                </div>

                <button
                    className={`border-2 border-blue-500 text-blue-500 flex items-center gap-2 px-4 py-3 rounded-md mt-4 ${!address ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleGitcoinDataFetch}
                    disabled={!address}
                >
                    {loading ? (
                        <span>Loading...</span>
                    ) : (
                        address ? <>
                            <img src="/logos/gitcoin.png" alt="Gitcoin Logo" className="w-5 h-5 inline-block mr-2" />
                            <span>Fetch project from Gitcoin</span>
                        </> : <span>Connect wallet to get started</span>
                    )}
                </button>

            </section>

            <section className="container">
                {loading ? (
                    <div className="flex flex-col justify-center items-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="text-lg text-black dark:text-white">Loading project data...</p>
                    </div>
                ) : projectData?.details && projectData.donations.length > 0 ? (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                            You have selected the following project:
                        </h2>
                        <div className="flex flex-col sm:flex-row justify-start gap-4 items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
                            <img
                                src={`/api/img-proxy?url=https://gateway.pinata.cloud/ipfs/${projectData?.details?.project?.metadata?.logoImg}`}
                                alt="Project Logo"
                                className="w-20 h-20 rounded-full object-cover"
                            />
                            <div className="text-center sm:text-left mt-2 sm:mt-0">
                                <p className="text-xl sm:text-2xl font-bold">{projectData?.details?.project?.metadata?.title || "N/A"}</p>
                                <p className="text-black dark:text-white"><strong>Funding received in round:</strong> {projectData.details?.totalAmountDonatedInUsd} USD</p>
                            </div>
                        </div>


                        <MintNFTs projectDetails={projectData.details} donations={projectData.donations} />
                        <div className="mt-4">
                            <details className="bg-gray-100 dark:bg-gray-800 rounded-xl">
                                <summary className="cursor-pointer p-4 font-semibold text-black dark:text-white">
                                    View Donations ({projectData.donations.length})
                                </summary>
                                <div className="overflow-x-auto p-4">
                                    <table className="w-full table-auto">
                                        <thead>
                                            <tr className="bg-gray-200 dark:bg-gray-700">
                                                <th className="px-4 py-2 text-left text-black dark:text-white">Address</th>
                                                <th className="px-4 py-2 text-right text-black dark:text-white">Transaaction</th>
                                                <th className="px-4 py-2 text-right text-black dark:text-white">Amount</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {projectData.donations.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((donation: any, index: number) => (
                                                <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                                                    <td className="px-4 py-2 text-black dark:text-white">
                                                        <EthereumAddressToENSName address={donation.donorAddress} />
                                                    </td>
                                                    <td className="px-4 py-2 text-black text-right dark:text-white">
                                                        <TransactionLink chainId={
                                                            donation.chainId
                                                        } transactionHash={donation.transactionHash} />

                                                    </td>
                                                    <td className="px-4 py-2 text-black text-right dark:text-white">{parseFloat(donation.amountInUsd).toFixed(4)} USD</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
                                        <button className="bg-blue-500 text-white px-4 py-2 rounded-md mb-2 sm:mb-0" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
                                        <span className="mx-4 text-black dark:text-white">{page} / {totalPages}</span>
                                        <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</button>

                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                ) : projectURL && isValidGitcoinURL(projectURL) ? (
                    <div className="flex justify-start items-center">
                        <p className="text-lg text-black dark:text-white">No project data available. Please fetch Gitcoin data first.</p>
                    </div>
                ) : (
                    <div className="flex justify-start items-center">
                        {address && <p className="text-lg text-black dark:text-white">Please enter a valid Gitcoin project URL.</p>}
                    </div>
                )}
            </section>
        </section>
    );
};
