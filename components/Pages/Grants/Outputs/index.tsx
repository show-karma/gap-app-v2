"use client";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useGrantStore } from "@/store/grant";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { TrashIcon } from "@heroicons/react/24/outline";
import { AreaChart, Card, Title } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GrantsOutputsLoading } from "../../Project/Loading/Grants/Outputs";

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

const prepareChartData = (
  values: string[],
  timestamps: string[],
  name: string
) => {
  return timestamps
    .map((timestamp, index) => ({
      date: formatDate(new Date(timestamp), true),
      [name]: Number(values[index]) || 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
interface OutputAnswers {
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
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export const GrantOutputs = () => {
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;

  const [outputAnswers, setOutputAnswers] = useState<OutputAnswers[]>([]);
  const [forms, setForms] = useState<OutputForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { grant } = useGrantStore();

  const handleSubmit = async (outputId: string) => {
    const form = forms.find((f) => f.outputId === outputId);
    if (!form?.value?.length) {
      toast.error("Please enter a value");
      return;
    }

    setForms((prev) =>
      prev.map((f) => (f.outputId === outputId ? { ...f, isSaving: true } : f))
    );

    await sendOutputAnswer(
      outputId,
      form.categoryId,
      form.value,
      form.proof,
      form.outputTimestamp
    );

    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              isSaving: false,
              isEdited: false,
            }
          : f
      )
    );

    if (grant) {
      const [response] = await fetchData(INDEXER.GRANTS.OUTPUTS.GET(grant.uid));
      setOutputAnswers(response);
    }
  };

  const handleInputChange = (
    outputId: string,
    categoryId: string,
    field: "value" | "proof" | "outputTimestamp",
    value: string,
    index: number
  ) => {
    setForms((prev) => {
      const existingForm = prev.find((f) => f.outputId === outputId);
      const currentOutput = outputAnswers.find((o) => o.outputId === outputId);

      const currentValues = currentOutput?.value || [];
      const currentProofs = currentOutput?.proof || [];
      const currentTimestamps = currentOutput?.outputTimestamp || [];

      const isValueChanged =
        field === "value"
          ? currentValues[index] !== value
          : field === "proof"
          ? currentProofs[index] !== value
          : currentTimestamps[index] !== value;

      if (existingForm) {
        return prev.map((f) => {
          if (f.outputId === outputId) {
            const updatedForm = { ...f };
            if (field === "value") {
              const newValues = [...(f.value || currentValues)];
              newValues[index] = value;
              updatedForm.value = newValues;
            } else if (field === "proof") {
              const newProofs = [...(f.proof || currentProofs)];
              newProofs[index] = value;
              updatedForm.proof = newProofs;
            } else {
              const newTimestamps = [
                ...(f.outputTimestamp || currentTimestamps),
              ];
              newTimestamps[index] = value;
              updatedForm.outputTimestamp = newTimestamps;
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
        value:
          field === "value"
            ? [...currentValues].map((v, i) => (i === index ? value : v))
            : currentValues,
        proof:
          field === "proof"
            ? [...currentProofs].map((p, i) => (i === index ? value : p))
            : currentProofs,
        outputTimestamp:
          field === "outputTimestamp"
            ? [...currentTimestamps].map((t, i) => (i === index ? value : t))
            : currentTimestamps,
        isEdited: isValueChanged,
      };
      return [...prev, newForm];
    });
  };

  async function sendOutputAnswer(
    outputId: string,
    categoryId: string,
    values: string[],
    proofs: string[],
    outputTimestamps: string[]
  ) {
    const formattedTimestamp = outputTimestamps.map(
      (item) => item || new Date().toISOString().split("T")[0]
    );

    const [response] = await fetchData(
      INDEXER.GRANTS.OUTPUTS.SEND(grant?.uid as string),
      "POST",
      {
        outputId,
        categoryId,
        value: values,
        proof: proofs,
        outputTimestamp: formattedTimestamp,
      }
    );

    if (response?.success) {
      toast.success(MESSAGES.GRANT.OUTPUTS.SUCCESS);
      handleCancel(outputId);
    } else {
      toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
    }
  }

  async function getOutputAnswers(grantUid: string, silent = false) {
    if (!silent) setIsLoading(true);
    const [data] = await fetchData(INDEXER.GRANTS.OUTPUTS.GET(grantUid));
    const outputDataWithAnswers = data;
    setOutputAnswers(outputDataWithAnswers);

    // Initialize forms with existing values
    setForms(
      outputDataWithAnswers.map((item: any) => ({
        outputId: item.outputId,
        categoryId: item.categoryId,
        value: item.value || [],
        proof:
          item.proof.length !== item.value.length
            ? Array(item.value.length).fill("")
            : item.proof || [],
        outputTimestamp: item.outputTimestamp || [new Date().toISOString()],
        isEdited: false,
        isEditing: false,
      }))
    );

    if (!silent) setIsLoading(false);
  }
  useEffect(() => {
    if (grant) getOutputAnswers(grant.uid);
  }, [grant]);

  const handleEditClick = (outputId: string) => {
    setForms((prev) =>
      prev.map((f) => (f.outputId === outputId ? { ...f, isEditing: true } : f))
    );
  };

  const handleCancel = async (outputId: string) => {
    await getOutputAnswers(grant?.uid as string);
  };

  // Filter outputs based on authorization
  const filteredOutputs = isAuthorized
    ? outputAnswers
    : outputAnswers.filter((item) => item.value?.length);

  const handleAddEntry = (outputId: string) => {
    const output = outputAnswers.find((o) => o.outputId === outputId);
    const categoryId = output?.categoryId;
    output?.value.push("");
    output?.proof.push("");
    output?.outputTimestamp.push(new Date().toISOString());

    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              value: [...f.value, ""],
              proof: [...f.proof, ""],
              outputTimestamp: [...f.outputTimestamp, new Date().toISOString()],
            }
          : f
      )
    );
  };

  const handleDeleteEntry = (outputId: string, index: number) => {
    const output = outputAnswers.find((o) => o.outputId === outputId);
    output?.value.splice(index, 1);
    output?.proof.splice(index, 1);
    output?.outputTimestamp.splice(index, 1);

    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              value: [...f.value].filter((_, i) => i !== index),
              proof: [...f.proof].filter((_, i) => i !== index),
              outputTimestamp: [...f.outputTimestamp].filter(
                (_, i) => i !== index
              ),
              isEdited: true,
            }
          : f
      )
    );
  };

  if (!grant || isLoading) return <GrantsOutputsLoading />;

  return (
    <div className="w-full max-w-[100rem]">
      {filteredOutputs.length > 0 ? (
        <div className="flex flex-col gap-8">
          {filteredOutputs.map((item) => {
            const form = forms.find((f) => f.outputId === item.outputId);
            const lastUpdated = filteredOutputs
              .find((subItem) => item.outputId === subItem.outputId)
              ?.outputTimestamp?.sort(
                (a, b) => new Date(b).getTime() - new Date(a).getTime()
              )[0];
            const allOutputs = filteredOutputs.find(
              (subItem) => subItem.outputId === item.outputId
            );
            const outputs = allOutputs?.value.map((value, index) => ({
              value,
              proof: allOutputs?.proof[index] || "",
              timestamp:
                allOutputs?.outputTimestamp[index] || new Date().toISOString(),
            }));

            const outputsWithProof = outputs?.filter((output) => output.proof);
            const lastWithProof = outputsWithProof?.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )[0];

            return (
              <div
                key={item.outputId}
                className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between flex-row flex-wrap max-md:items-start gap-4">
                  <div className="space-y-1 flex flex-col flex-1 gap-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                      {item.name}
                    </h3>
                    <div className="flex flex-row gap-2 items-center">
                      {lastWithProof?.proof ? (
                        <>
                          <Link
                            href={lastWithProof?.proof}
                            target="_blank"
                            className="underline text-sm text-brand-blue font-medium"
                          >
                            View Proof
                          </Link>
                          <div className="h-1 w-1 bg-gray-500 rounded-full" />
                        </>
                      ) : null}
                      {lastUpdated ? (
                        <span className="text-sm text-gray-500 dark:text-zinc-400">
                          Last updated {formatDate(new Date(lastUpdated), true)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 flex-wrap items-center">
                    <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                      {item.categoryName}
                    </p>
                    <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                      {item.name}
                    </p>
                    {item.type === "outcome" ? (
                      <p className="text-sm text-[#F79009] font-semibold dark:text-orange-400 bg-[#FFFAEB] dark:bg-yellow-950  rounded-2xl py-1 px-3">
                        Outcome
                      </p>
                    ) : (
                      <p className="text-sm text-[#5925DC] font-semibold dark:text-purple-400 bg-[#F4F3FF] dark:bg-purple-950 rounded-2xl py-1 px-3">
                        Output
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-row gap-4 max-md:flex-col-reverse">
                  <div className="flex flex-1">
                    <div className="w-full">
                      <div className="flex flex-col">
                        <div className="overflow-y-auto overflow-x-auto rounded">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700 rounded border border-gray-200 dark:border-zinc-700">
                            <thead className="">
                              <tr className="">
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  {item.name}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  Timestamp
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  Proof
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                              {item.value.map((value, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <input
                                        type="number"
                                        value={form?.value?.[index] || ""}
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.outputId,
                                            item.categoryId,
                                            "value",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100"
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {value}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <input
                                        type="date"
                                        value={
                                          form?.outputTimestamp?.[index]?.split(
                                            "T"
                                          )[0] ||
                                          new Date().toISOString().split("T")[0]
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.outputId,
                                            item.categoryId,
                                            "outputTimestamp",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100"
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {item.outputTimestamp[index]
                                          ? formatDate(
                                              new Date(
                                                item.outputTimestamp[index]
                                              ),
                                              true
                                            )
                                          : "N/A"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <input
                                        type="text"
                                        value={form.proof[index] || ""}
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.outputId,
                                            item.categoryId,
                                            "proof",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100"
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {item.proof[index] ||
                                          "No proof provided"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <button
                                        onClick={() =>
                                          handleDeleteEntry(
                                            item.outputId,
                                            index
                                          )
                                        }
                                      >
                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                              {form?.isEditing && isAuthorized && (
                                <tr>
                                  <td className="px-4 py-2">
                                    <Button
                                      onClick={() =>
                                        handleAddEntry(item.outputId)
                                      }
                                    >
                                      Add new entry
                                    </Button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-5">
                    {item.value?.length > 1 && (
                      <Card className="bg-white dark:bg-zinc-800 rounded">
                        <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
                          Historical Values
                        </Title>
                        <AreaChart
                          className="h-48 mt-4"
                          data={prepareChartData(
                            item.value,
                            item.outputTimestamp,
                            item.name
                          )}
                          index="date"
                          categories={[item.name]}
                          colors={["blue"]}
                          valueFormatter={(value) => `${value}`}
                          showLegend={false}
                        />
                      </Card>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full justify-end">
                  {!form?.isEditing && isAuthorized && (
                    <button
                      onClick={() => handleEditClick(item.outputId)}
                      className="rounded-sm px-6 py-2 text-sm font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {form?.isEditing && isAuthorized && (
                    <div className="flex gap-3 pt-2 flex-row">
                      <button
                        onClick={() => handleCancel(item.outputId)}
                        disabled={form?.isSaving}
                        className="rounded-sm border border-black dark:border-zinc-100 px-6 py-2 text-sm font-medium text-black bg-white dark:bg-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-100/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={() => handleSubmit(item.outputId)}
                        disabled={form?.isSaving || !form?.isEdited}
                        className="rounded-sm px-6 py-2 text-sm cursor-pointer font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                      >
                        {form?.isSaving ? (
                          <div className="flex items-center justify-center gap-2">
                            <span>Saving...</span>
                          </div>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
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
