"use client";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/community";
import { useGrantStore } from "@/store/grant";
import { useState, useEffect } from "react";
import { MESSAGES } from "@/utilities/messages";
import { GrantsOutputsLoading } from "../../Project/Loading/Grants/Outputs";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import toast from "react-hot-toast";
import Link from "next/link";
import { Card, Title, AreaChart } from "@tremor/react";

type OutputForm = {
    outputId: string;
    categoryId: string;
    value: string[];
    proof: string[];
    outputTimestamp: string[];
    isEditing?: boolean;
    isSaving?: boolean;
    isEdited?: boolean;
};

type ChartDataPoint = {
    date: string;
    value: number;
};

const prepareChartData = (
    values: string[],
    timestamps: string[]
): ChartDataPoint[] => {
    return timestamps
        .map((timestamp, index) => ({
            date: new Date(timestamp).toLocaleDateString(),
            value: Number(values[index]) || 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const GrantOutputs = () => {
    const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
    const isContractOwner = useOwnerStore((state) => state.isOwner);
    const isCommunityAdmin = useCommunityAdminStore(
        (state) => state.isCommunityAdmin
    );

    const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;

    const [outputAnswers, setOutputAnswers] = useState<{
        id: string;
        grantUID: string;
        categoryId: string;
        categoryName: string;
        chainID: number;
        outputId: string;
        name: string;
        value: string[];
        proof: string[];
        outputTimestamp: string[];
        createdAt: Date;
        updatedAt: Date;
    }[]>([]);
    const [forms, setForms] = useState<OutputForm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { grant } = useGrantStore();

    const handleSubmit = async (outputId: string) => {
        const form = forms.find(f => f.outputId === outputId);
        if (!form?.value?.length) {
            toast.error("Please enter a value");
            return;
        }

        if (!form.outputTimestamp?.length) {
            toast.error("Please select a date");
            return;
        }

        setForms(prev => prev.map(f =>
            f.outputId === outputId ? { ...f, isSaving: true } : f
        ));

        await sendOutputAnswer(
            outputId,
            form.categoryId,
            form.value[form.value.length - 1],
            form.proof[form.proof.length - 1],
            form.outputTimestamp[form.outputTimestamp.length - 1]
        );

        setForms(prev => prev.map(f =>
            f.outputId === outputId ? {
                ...f,
                isSaving: false,
                isEdited: false
            } : f
        ));

        if (grant) {
            const [response] = await fetchData(INDEXER.GRANTS.OUTPUTS.GET(grant.uid));
            setOutputAnswers(response);
        }
    };

    const handleInputChange = (outputId: string, categoryId: string, field: 'value' | 'proof' | 'outputTimestamp', value: string) => {
        setForms(prev => {
            const existingForm = prev.find(f => f.outputId === outputId);
            const currentOutput = outputAnswers.find(o => o.outputId === outputId);

            const currentValues = currentOutput?.value || [];
            const currentProofs = currentOutput?.proof || [];
            const currentTimestamps = currentOutput?.outputTimestamp || [];

            const isValueChanged = field === 'value'
                ? !currentValues.includes(value)
                : field === 'proof'
                    ? !currentProofs.includes(value)
                    : !currentTimestamps.includes(value);

            if (existingForm) {
                return prev.map(f => {
                    if (f.outputId === outputId) {
                        const updatedForm = { ...f };
                        if (field === 'value') {
                            updatedForm.value = [...currentValues, value];
                        } else if (field === 'proof') {
                            updatedForm.proof = [...currentProofs, value];
                        } else {
                            updatedForm.outputTimestamp = [...currentTimestamps, value];
                        }
                        updatedForm.isEdited = isValueChanged;
                        return updatedForm;
                    }
                    return f;
                });
            }

            const newForm: OutputForm = {
                outputId,
                categoryId,
                value: field === 'value' ? [value] : currentValues,
                proof: field === 'proof' ? [value] : currentProofs,
                outputTimestamp: field === 'outputTimestamp' ? [value] : currentTimestamps,
                isEdited: isValueChanged
            };
            return [...prev, newForm];
        });
    };

    async function sendOutputAnswer(outputId: string, categoryId: string, value: string, proof: string, outputTimestamp: string) {
        const formattedTimestamp = outputTimestamp || new Date().toISOString().split('T')[0];

        const [response] = await fetchData(
            INDEXER.GRANTS.OUTPUTS.SEND(grant?.uid as string),
            "POST",
            {
                outputId,
                categoryId,
                value,
                proof,
                outputTimestamp: formattedTimestamp
            }
        );

        if (response.success) {
            toast.success(MESSAGES.GRANT.OUTPUTS.SUCCESS);
            handleCancel(outputId);
        } else {
            toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
        }
    }

    useEffect(() => {
        async function getOutputAnswers(grantUid: string) {
            setIsLoading(true);
            const [data] = await fetchData(INDEXER.GRANTS.OUTPUTS.GET(grantUid));
            const outputDataWithAnswers = data;
            setOutputAnswers(outputDataWithAnswers);

            // Initialize forms with existing values
            setForms(outputDataWithAnswers.map((item: any) => ({
                outputId: item.outputId,
                categoryId: item.categoryId,
                value: item.value || [],
                proof: item.proof || [],
                outputTimestamp: item.outputTimestamp || [new Date().toISOString()],
                isEdited: false
            })));

            setIsLoading(false);
        }

        if (grant) getOutputAnswers(grant.uid);
    }, [grant]);

    const handleEditClick = (outputId: string) => {
        setForms(prev => prev.map(f =>
            f.outputId === outputId ? { ...f, isEditing: true } : f
        ));
    };

    const handleCancel = (outputId: string) => {
        setForms(prev => prev.map(f => {
            if (f.outputId === outputId) {
                const currentOutput = outputAnswers.find(o => o.outputId === outputId);
                return {
                    ...f,
                    isEditing: false,
                    isEdited: false,
                    value: currentOutput?.value || [],
                    proof: currentOutput?.proof || [],
                    outputTimestamp: currentOutput?.outputTimestamp || []
                };
            }
            return f;
        }));
    };

    if (!grant || isLoading) return <GrantsOutputsLoading />;

    // Filter outputs based on authorization
    const filteredOutputs = isAuthorized
        ? outputAnswers
        : outputAnswers.filter(item => item.value);

    return (
        <div className="w-full max-w-[100rem]">
            {filteredOutputs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {filteredOutputs.map((item) => {
                        const form = forms.find(f => f.outputId === item.outputId);
                        return (
                            <div
                                key={item.outputId}
                                className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                                            Category: {item.categoryName}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">

                                        {!form?.isEditing && isAuthorized && (
                                            <button
                                                onClick={() => handleEditClick(item.outputId)}
                                                className="px-3 py-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-5">
                                    {item.value?.length > 1 && (
                                        <Card className="mt-4">
                                            <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
                                                Historical Values
                                            </Title>
                                            <AreaChart
                                                className="h-48 mt-4"
                                                data={prepareChartData(item.value, item.outputTimestamp)}
                                                index="date"
                                                categories={["value"]}
                                                colors={["primary"]}
                                                valueFormatter={(value) => `${value}`}
                                                showLegend={false}
                                            />
                                        </Card>
                                    )}

                                    <div className="space-y-2">
                                        <label
                                            htmlFor={`value-${item.outputId}`}
                                            className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
                                        >
                                            Value
                                        </label>
                                        {form?.isEditing && isAuthorized ? (
                                            <input
                                                id={`value-${item.outputId}`}
                                                type="number"
                                                value={form?.value?.[form?.value?.length - 1] || ''}
                                                onChange={(e) => handleInputChange(item.outputId, item.categoryId, 'value', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100 transition-colors"
                                                placeholder="Enter output value"
                                            />
                                        ) : (
                                            <p className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-md text-zinc-800 dark:text-zinc-100">
                                                {item.value?.[item.value.length - 1] || 'No value set'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label
                                            htmlFor={`timestamp-${item.outputId}`}
                                            className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
                                        >
                                            Timestamp
                                        </label>
                                        {form?.isEditing && isAuthorized ? (
                                            <input
                                                id={`timestamp-${item.outputId}`}
                                                type="date"
                                                value={form?.outputTimestamp?.[form?.outputTimestamp?.length - 1]?.split('T')[0] || new Date().toISOString().split('T')[0]}
                                                onChange={(e) => handleInputChange(item.outputId, item.categoryId, 'outputTimestamp', new Date(e.target.value).toISOString())}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100 transition-colors"
                                                placeholder="Enter timestamp"
                                            />
                                        ) : (
                                            <p className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-md text-zinc-800 dark:text-zinc-100">
                                                {new Date(item.outputTimestamp?.[item.outputTimestamp.length - 1] || new Date()).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor={`proof-${item.outputId}`}
                                            className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
                                        >
                                            Proof
                                        </label>
                                        {form?.isEditing && isAuthorized ? (
                                            <textarea
                                                id={`proof-${item.outputId}`}
                                                value={form?.proof?.[form?.proof?.length - 1] || ''}
                                                onChange={(e) => handleInputChange(item.outputId, item.categoryId, 'proof', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100 transition-colors"
                                                placeholder="Enter proof (optional)"
                                                rows={3}
                                            />
                                        ) : (
                                            item.proof?.[item.proof.length - 1]?.startsWith('http') ? (
                                                <Link
                                                    href={item.proof[item.proof.length - 1]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <p className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-md text-zinc-800 dark:text-zinc-100 overflow-hidden text-ellipsis break-words">
                                                        {item.proof[item.proof.length - 1] || 'No proof provided'}
                                                    </p>
                                                </Link>
                                            ) : (
                                                <p className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-md text-zinc-800 dark:text-zinc-100 overflow-hidden text-ellipsis break-words">
                                                    {item.proof?.[item.proof.length - 1] || 'No proof provided'}
                                                </p>
                                            )
                                        )}
                                    </div>

                                    <span className="text-sm text-gray-500 dark:text-zinc-400">
                                        Last updated {new Date(item?.updatedAt || new Date()).toLocaleDateString()}
                                    </span>

                                    {form?.isEditing && isAuthorized && (
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => handleSubmit(item.outputId)}
                                                disabled={form?.isSaving || !form?.isEdited}
                                                className="flex text-sm items-center justify-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
                                            >
                                                {form?.isSaving ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span>Saving...</span>
                                                    </div>
                                                ) : (
                                                    'Save Changes'
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleCancel(item.outputId)}
                                                disabled={form?.isSaving}
                                                className="px-3 text-sm py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="w-full text-center py-12 bg-white dark:bg-zinc-800/50 rounded-md border border-gray-200 dark:border-zinc-700">
                    <p className="text-gray-600 dark:text-zinc-300">
                        {MESSAGES.GRANT.OUTPUTS.EMPTY}
                    </p>
                </div>
            )}
        </div>
    );
};
