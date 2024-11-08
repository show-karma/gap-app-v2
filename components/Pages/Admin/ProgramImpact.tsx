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
import { Card, Title, BarChart, LineChart, DonutChart } from "@tremor/react";

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

interface Category {
    id: string;
    name: string;
    category: string;
    outputs: {
        id: string
        name: string
        categoryId: string
    }[];
    questions: Question[];
}

export const metadata = defaultMetadata;


export function SearchGrantProgram({
    communityUID,
    setSelectedProgram,
}: {
    communityUID: string;
    setSelectedProgram: any;
}) {
    const [allPrograms, setAllPrograms] = useState<GrantProgram[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const [result, error] = await fetchData(
                INDEXER.COMMUNITY.PROGRAMS(communityUID)
            );
            if (error) {
                console.log(error);
            }
            const sortedAlphabetically = result.sort(
                (a: GrantProgram, b: GrantProgram) => {
                    const aTitle = a.metadata?.title || "";
                    const bTitle = b.metadata?.title || "";
                    if (aTitle < bTitle) return -1;
                    if (aTitle > bTitle) return 1;
                    return 0;
                }
            );
            setAllPrograms(sortedAlphabetically);
            setIsLoading(false);
        })();
    }, [communityUID]);

    return (
        <div className="w-full max-w-[400px]">
            {isLoading ? (
                <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
                    Loading Grants...
                </div>
            ) : !communityUID ? (
                <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
                    Select a community to proceed
                </div>
            ) : (
                <div>
                    <select
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100 transition-colors"
                        onChange={(e) => {
                            const selected = allPrograms.find(
                                (program) => program.programId === e.target.value
                            );
                            setSelectedProgram(selected);
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Select a grant program
                        </option>
                        {allPrograms.map((program) => (
                            <option
                                key={program.programId}
                                value={program.programId}
                            >
                                {program.metadata?.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

// Add new interface for the grouped response
interface GroupedProgramImpact {
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
        createdAt: string;
        updatedAt: string;
    }[];
}

interface ChartData {
    category: string;
    value: number;
}

interface TimeSeriesData {
    date: string;
    value: number;
    category: string;
}

const aggregateDataForCharts = (data: GroupedProgramImpact[]) => {
    // Group data by output names across all categories
    const outputNameGroups: { [key: string]: number[] } = {};
    data.forEach(group => {
        group.outputs.forEach(output => {
            if (!outputNameGroups[output.name]) {
                outputNameGroups[output.name] = [];
            }
            outputNameGroups[output.name].push(Number(output.value));
        });
    });

    // Calculate metrics for each output name
    const outputMetrics = Object.entries(outputNameGroups).map(([name, values]) => ({
        name,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        total: values.reduce((a, b) => a + b, 0),
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values)
    }));

    // Time series by output name
    const timeSeriesByOutput: { [key: string]: TimeSeriesData[] } = {};
    data.forEach(group => {
        group.outputs.forEach(output => {
            if (!timeSeriesByOutput[output.name]) {
                timeSeriesByOutput[output.name] = [];
            }
            timeSeriesByOutput[output.name].push({
                date: output.createdAt.split('T')[0],
                value: Number(output.value),
                category: group.categoryName
            });
        });
    });

    // Distribution data for specific metrics (like "No. of members")
    const membershipDistribution = data
        .flatMap(group => group.outputs)
        .filter(output => output.name.toLowerCase().includes('member'))
        .map(output => ({
            range: getRangeLabel(Number(output.value)),
            count: 1
        }))
        .reduce((acc: { range: string; count: number }[], curr) => {
            const existing = acc.find(item => item.range === curr.range);
            if (existing) {
                existing.count += 1;
            } else {
                acc.push(curr);
            }
            return acc;
        }, [])
        .sort((a, b) => {
            const aNum = parseInt(a.range.split('-')[0]);
            const bNum = parseInt(b.range.split('-')[0]);
            return aNum - bNum;
        });

    return {
        outputMetrics,
        timeSeriesByOutput,
        membershipDistribution
    };
};

// Add utility function for creating range labels
const getRangeLabel = (value: number): string => {
    const ranges = [
        { max: 10, label: '0-10' },
        { max: 50, label: '11-50' },
        { max: 100, label: '51-100' },
        { max: 500, label: '101-500' },
        { max: 1000, label: '501-1000' },
        { max: Infinity, label: '1000+' }
    ];

    for (const range of ranges) {
        if (value <= range.max) return range.label;
    }
    return '1000+';
};

const ProgramAnalytics = ({ data }: { data: GroupedProgramImpact[] }) => {
    const chartData = aggregateDataForCharts(data);
    const [selectedMetric, setSelectedMetric] = useState<string>('');

    // Find all unique output names
    const outputNames = Array.from(new Set(data.flatMap(group =>
        group.outputs.map(output => output.name)
    )));

    return (
        <div className="space-y-6 w-full max-w-4xl">
            <div className="flex flex-col gap-4">
                <select
                    className="w-full max-w-xs px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                >
                    <option value="">Select an output metric</option>
                    {outputNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            <Card className="p-6">
                <Title className="text-lg font-semibold mb-4">Output Metrics Overview</Title>
                <BarChart
                    data={chartData.outputMetrics}
                    index="name"
                    categories={["average", "max"]}
                    colors={["blue", "emerald"]}
                    valueFormatter={(value) => value.toLocaleString()}
                    yAxisWidth={48}
                    className="h-72"
                />
            </Card>



            {chartData.membershipDistribution.length > 0 && (
                <Card className="p-6">
                    <Title className="text-lg font-semibold mb-4">
                        Membership Size Distribution
                    </Title>
                    <BarChart
                        data={chartData.membershipDistribution}
                        index="range"
                        categories={["count"]}
                        colors={["indigo"]}
                        valueFormatter={(value) => value.toString()}
                        yAxisWidth={48}
                        className="h-64"
                    />
                </Card>
            )}

            <Card className="p-6">
                <Title className="text-lg font-semibold mb-4">Output Metrics Summary</Title>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chartData.outputMetrics.map((metric) => (
                        <div
                            key={metric.name}
                            className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800"
                        >
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                {metric.name}
                            </h3>
                            <dl className="mt-2 space-y-1">
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500 dark:text-gray-400">Average:</dt>
                                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {metric.average.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-500 dark:text-gray-400">Total:</dt>
                                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {metric.total.toLocaleString()}
                                    </dd>
                                </div>

                            </dl>
                        </div>
                    ))}
                </div>
            </Card>


            <div className="w-full h-full">
                <iframe className="w-full h-[400px]" src="https://dune.com/embeds/2355896/3859009/" />
            </div>
        </div>
    );
};

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
    const [programImpactData, setProgramImpactData] = useState<GroupedProgramImpact[]>([]);

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
        const [data] = await fetchData(INDEXER.COMMUNITY.PROGRAM_IMPACT(communityId, selectedProgram.programId));
        setProgramImpactData(data);
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
            ) : isAdmin ? (
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
                                                        Created
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Updated
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                {group.outputs.map((item) => (
                                                    <tr key={`${item.outputId}-${item.createdAt}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            {item.grantTitle}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                            {reduceText(item.projectTitle, 20)}
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
                                                            {formatDate(item.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {formatDate(item.updatedAt)}
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
