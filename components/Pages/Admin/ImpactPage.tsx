"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/Utilities/Spinner";
import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { OutputMetrics } from "./OutputMetrics";
import ProgramImpact from "./ProgramImpact";
import { cn } from "@/utilities/tailwind";


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

type Tab = "metrics" | "impact";

export default function ProgramImpactPage() {
    const router = useRouter();
    const params = useParams();
    const communityId = params.communityId as string;
    const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
    const [community, setCommunity] = useState<ICommunityResponse | undefined>(
        undefined
    ); // Data returned from the API 
    const [activeTab, setActiveTab] = useState<Tab>("metrics");

    useEffect(() => {
        const fetchDetails = async () => {
            if (!communityId) return;
            setLoading(true);
            console.log("Fetching community data");
            try {
                const { data: result } = await gapIndexerApi.communityBySlug(
                    communityId
                );
                if (!result || result.uid === zeroUID)
                    throw new Error("Community not found");
                setCommunity(result);

                setLoading(false);
            } catch (error: any) {
                setLoading(false);
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



    const tabs = [
        { id: "metrics", label: "Output Metrics" },
        { id: "impact", label: "Program Impact" },
    ];

    return (
        <div className="mt-12 flex flex-row max-lg:flex-col-reverse w-full">
            {loading ? (
                <div className="flex w-full items-center justify-center">
                    <Spinner />
                </div>
            ) : (<div className="flex w-full flex-1 flex-col items-center gap-8">
                <div className="w-full flex flex-row items-center justify-between max-w-4xl">
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
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex space-x-8" aria-label="Program Impact Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={cn(
                                        "py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
                                        {
                                            "border-primary-500 text-primary-600 dark:text-primary-400":
                                                activeTab === tab.id,
                                            "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300":
                                                activeTab !== tab.id
                                        }
                                    )}
                                    aria-current={activeTab === tab.id ? "page" : undefined}
                                    tabIndex={0}
                                    role="tab"
                                    aria-label={tab.label}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6">
                        {activeTab === "metrics" && (
                            <OutputMetrics
                                communitySlug={community?.details?.data?.slug || ""}
                            />
                        )}
                        {activeTab === "impact" && <ProgramImpact />}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}


export const metadata = defaultMetadata;
