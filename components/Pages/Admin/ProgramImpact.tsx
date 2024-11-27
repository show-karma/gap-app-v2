"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { Question } from "@/types";
import Link from "next/link";
import { CheckIcon, ChevronLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import fetchData from "@/utilities/fetchData";
import { Button } from "@/components/Utilities/Button";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { INDEXER } from "@/utilities/indexer";
import { useAuthStore } from "@/store/auth";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { ProgramAnalytics } from "./ProgramAnalytics";
import { SearchGrantProgram } from "@/components/GrantProgramDropdown";
import { formatDate } from "@/utilities/formatDate";



// Add new interface for the grouped response
export interface ProgramImpactDataResponse {
    categoryName: string;
    outputs: {
        chainID: number;
        grantUID: string;
        grantTitle: string;
        projectUID: string;
        projectTitle: string;
        projectSlug: string;
        amount: string;
        outputId: string;
        name: string;
        categoryId: string;
        categoryName: string;
        value: string;
        proof: string;
        lastUpdated: string;
    }[];
}



export default function ProgramImpactPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { isAuth } = useAuthStore();
    const params = useParams();
    const communityId = params.communityId as string;
    const [selectedProgram, setSelectedProgram] = useState<GrantProgram | undefined>(
        undefined
    );


    const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
    const [community, setCommunity] = useState<ICommunityResponse | undefined>(
        undefined
    ); // Data returned from the API
    const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
    const signer = useSigner();

    // Update the state to handle grouped data
    const [programImpactData, setProgramImpactData] = useState<ProgramImpactDataResponse[]>([]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!communityId) return;
            setLoading(true);
            try {
                const { data: result } = await gapIndexerApi.communityBySlug(
                    communityId
                );
                if (!result || result.uid === zeroUID)
                    throw new Error("Community not found");
                setCommunity(result);
            } catch (error: any) {
                errorManager(`Error fetching community ${communityId}`, error, {
                    community: communityId,
                });
                console.error("Error fetching data:", error);
                if (
                    error.message === "Community not found" ||
                    error.message.includes("422")
                ) {
                    router.push(PAGES.NOT_FOUND);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [communityId]);

    useEffect(() => {
        console.log(programImpactData);
    }, [programImpactData]);

    useEffect(() => {
        if (!community) return;

        const checkIfAdmin = async () => {
            setLoading(true);
            if (!community?.uid || !isAuth) return;
            try {
                const checkAdmin = await isCommunityAdminOf(
                    community,
                    address as string,
                    signer
                );
                setIsAdmin(checkAdmin);
            } catch (error: any) {
                errorManager(
                    `Error checking if ${address} is admin of community ${communityId}`,
                    error,
                    {
                        community: communityId,
                        address: address,
                    }
                );
                console.log(error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkIfAdmin();
    }, [address, isConnected, isAuth, community?.uid, signer]);

    useMemo(() => {
        if (community?.uid) {
            setLoading(true);
        }
    }, [community?.uid]);

    async function getProgramImpact() {
        if (!selectedProgram?.programId) return;
        const [data, error] = await fetchData(INDEXER.COMMUNITY.PROGRAM_IMPACT(communityId, selectedProgram.programId));
        if (error) {
            console.error(error);
            return;
        }

        setProgramImpactData(data.map((item: any) => ({
            categoryName: item.categoryName,
            outputs: item.outputs.map((output: any) => ({
                ...output,
                lastUpdated: output.createdAt || output.updatedAt
            }))
        })));
    }

    useEffect(() => {
        if (selectedProgram?.programId) {
            getProgramImpact();
        }
    }, [selectedProgram?.programId]);

    function reduceText(text: string, maxLength: number) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }


    return (
        <div className="mt-12 flex flex-row max-lg:flex-col-reverse w-full">

            {loading ? (
                <div className="flex w-full items-center justify-center">
                    <Spinner />
                </div>
            ) : !isAdmin ? (
                <div className="flex w-full flex-1 flex-col items-center gap-8">
                    <div className="w-full flex flex-row items-center justify-between  max-w-4xl">
                        <Link
                            href={PAGES.ADMIN.ROOT(
                                community?.details?.data?.slug || (community?.uid as string)
                            )}
                        >
                            <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
                                <ChevronLeftIcon className="h-5 w-5" />
                                Return to admin page
                            </Button>
                        </Link>
                    </div>
                    <div className="w-full max-w-4xl">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                                Select a grant program to view impact outputs
                            </h2>
                            <SearchGrantProgram
                                communityUID={community?.uid || ""}
                                setSelectedProgram={setSelectedProgram}
                            />
                        </div>
                    </div>

                    {programImpactData.length > 0 ? (
                        <div className="w-full max-w-4xl space-y-6">
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Grant Program
                                        </h3>
                                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {programImpactData[0]?.outputs[0]?.grantTitle || selectedProgram?.metadata?.title}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Total Projects
                                            </h4>
                                            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {new Set(programImpactData.flatMap(group =>
                                                    group.outputs.map(output => output.projectUID)
                                                )).size}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Total Categories
                                            </h4>
                                            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {programImpactData.length}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Total Funding Allocated (with available data)
                                            </h4>
                                            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {programImpactData.reduce((acc, curr) => acc + curr.outputs.reduce((acc2, curr2) => {
                                                    const amount = curr2.amount || '0';
                                                    const numericAmount = Number(amount.split(' ')[0]);
                                                    return acc2 + (numericAmount || 0);
                                                }, 0), 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {programImpactData.map((group) => (
                                <div key={group.categoryName} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {group.categoryName}
                                        </h3>
                                        <span className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                                            {group.outputs.length} projects
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Grant Program
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Project
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Output Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Value
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Amount funded
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Last Updated
                                                    </th>

                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                {group.outputs.map((item) => (
                                                    <tr key={`${item.outputId}-${item.lastUpdated}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            <Link className="underline font-bold" target="_blank" href={PAGES.PROJECT.GRANT(item.projectSlug, item.grantUID)}>
                                                                {item.grantTitle}
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            <Link className="underline font-bold" target="_blank" href={PAGES.PROJECT.OVERVIEW(item.projectSlug)}>
                                                                {reduceText(item.projectTitle, 20)}
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            {item.name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            {item.value}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            {item.amount}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {formatDate(item.lastUpdated)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                                    Program Analytics
                                </h2>
                                <ProgramAnalytics data={programImpactData} />
                            </div>
                        </div>
                    ) : (
                        <div className="w-full mb-4 max-w-4xl p-6 text-center bg-gray-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-400">
                                {selectedProgram
                                    ? "No impact data available for this program"
                                    : "Select a program to view impact data"}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex w-full items-center justify-center">
                    <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
                </div>
            )}
        </div>
    );
}


export const metadata = defaultMetadata;
