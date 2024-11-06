"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { Question } from "@/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { CheckIcon, ChevronLeftIcon, TrashIcon } from "@heroicons/react/24/outline";

import { NoSymbolIcon } from "@heroicons/react/24/solid";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import fetchData from "@/utilities/fetchData";
import { Button } from "@/components/Utilities/Button";
import dynamic from "next/dynamic";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";

import { useAuthStore } from "@/store/auth";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { QuestionCreationDialog } from "@/components/Pages/Admin/QuestionCreationDialog";
import { errorManager } from "@/components/Utilities/errorManager";

const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
});

type QuestionsAssigned = Record<string, string[]>;

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

export default function AssignQuestionsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const params = useParams();
  const communityId = params.communityId as string;
  // const { gap } = useGap();

  // Call API
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionsAssigned, setQuestionsAssigned] = useState<QuestionsAssigned>(
    {}
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<ICommunityResponse | undefined>(
    undefined
  ); // Data returned from the API
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
  const signer = useSigner();

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

      const getCategories = async () => {
        setLoading(true);

        try {
          const [data] = await fetchData(
            INDEXER.COMMUNITY.CATEGORIES(
              (community?.details?.data?.slug || community?.uid) as string
            )
          );
          if (data) {
            setCategories(data);
            const previousQuestions = data.reduce(
              (acc: QuestionsAssigned, category: Category) => {
                acc[category.id] = category.questions.map(
                  (question: Question) => question.id
                );
                return acc;
              },
              {}
            );
            setQuestionsAssigned(previousQuestions);
          }
        } catch (error: any) {
          errorManager(
            `Error fetching categories of community ${communityId}`,
            error,
            {
              community: communityId,
            }
          );
          setCategories([]);
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      const getQuestions = async () => {
        setLoading(true);
        try {
          const [data] = await fetchData(
            INDEXER.COMMUNITY.QUESTIONS(communityId)
          );
          if (data) {
            setQuestions(data);
          }
        } catch (error: any) {
          errorManager(
            `Error fetching questions of community ${communityId}`,
            error,
            {
              community: communityId,
            }
          );
          setQuestions([]);
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      getCategories();
      getQuestions();
    }
  }, [community?.uid]);

  const assign = (categoryID: string, question: string) => {
    const newQuestions = { ...questionsAssigned };

    const categoryQuestions = newQuestions[categoryID] || [];
    if (categoryQuestions.includes(question)) {
      newQuestions[categoryID] = categoryQuestions.filter(
        (q) => q !== question
      );
    } else {
      newQuestions[categoryID] = [...categoryQuestions, question];
    }

    setQuestionsAssigned(newQuestions);
  };

  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  const saveAssign = async (category: Category) => {
    setIsSaving({ ...isSaving, [category.id]: true });
    try {
      const [data, error] = await fetchData(
        INDEXER.CATEGORIES.QUESTIONS.UPDATE(category.id),
        "PUT",
        {
          idOrSlug: community?.uid,
          questions: questionsAssigned[category.id],
        }
      );
      if (error) throw new Error("Error saving questions");
      toast.success(
        MESSAGES.CATEGORIES.ASSIGN_QUESTIONS.SUCCESS(category.name)
      );
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast.error(
          MESSAGES.CATEGORIES.ASSIGN_QUESTIONS.ERROR.ALREADY_ANSWERED(
            category.name
          )
        );
      } else {
        toast.error(
          MESSAGES.CATEGORIES.ASSIGN_QUESTIONS.ERROR.GENERIC(category.name)
        );
        errorManager(
          `Error saving questions of community ${communityId}`,
          error,
          {
            community: communityId,
            idOrSlug: community?.uid,
            questions: questionsAssigned[category.id],
          }
        );
      }
      console.error(error);
    } finally {
      setIsSaving({ ...isSaving, [category.id]: false });
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [data] = await fetchData(INDEXER.COMMUNITY.QUESTIONS(communityId));
      if (data) {
        setQuestions(data);
      }
    } catch (error: any) {
      errorManager(
        `Error refreshing questions of community ${communityId}`,
        error,
        {
          community: communityId,
        }
      );
      setQuestions([]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [newOutputs, setNewOutputs] = useState<Record<string, string>>({});
  const [hasOutputChanges, setHasOutputChanges] = useState<Record<string, boolean>>({});
  const [isSavingOutputs, setIsSavingOutputs] = useState<Record<string, boolean>>({});

  const handleAddOutput = (categoryId: string) => {
    if (!newOutputs[categoryId]?.trim()) return;

    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      outputs: [
        ...updatedCategories[categoryIndex].outputs,
        {
          id: `temp-${Date.now()}`,
          name: newOutputs[categoryId].trim(),
          categoryId
        }
      ]
    };

    setCategories(updatedCategories);
    setNewOutputs(prev => ({ ...prev, [categoryId]: '' }));
    setHasOutputChanges(prev => ({ ...prev, [categoryId]: true }));
  };

  const handleRemoveOutput = (categoryId: string, outputId: string) => {
    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      outputs: updatedCategories[categoryIndex].outputs.filter(
        output => output.id !== outputId
      )
    };

    setCategories(updatedCategories);
    setHasOutputChanges(prev => ({ ...prev, [categoryId]: true }));
  };

  const saveOutputs = async (category: Category) => {
    setIsSavingOutputs({ ...isSavingOutputs, [category.id]: true });
    try {
      const [data, error] = await fetchData(
        INDEXER.CATEGORIES.OUTPUTS.UPDATE(category.id),
        "PUT",
        {
          idOrSlug: community?.uid,
          outputs: category.outputs?.map((output) => output?.name),
        }
      );
      if (error) throw new Error("Error saving outputs");
      toast.success(MESSAGES.CATEGORIES.OUTPUTS.SUCCESS(category.name));
      setHasOutputChanges(prev => ({ ...prev, [category.id]: false }));
    } catch (error: any) {
      toast.error(MESSAGES.CATEGORIES.ASSIGN_QUESTIONS.ERROR.GENERIC(category.name));
      errorManager(`Error saving outputs of community ${communityId}`, error, {
        community: communityId,
        idOrSlug: community?.uid,
        outputs: category.outputs?.map((output) => output?.name),
      });
    } finally {
      setIsSavingOutputs({ ...isSavingOutputs, [category.id]: false });
    }
  };

  return (
    <div className="mt-12 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
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
            <QuestionCreationDialog refreshQuestions={refresh} />
          </div>
          {categories.length ? (
            categories.map((category, index) => {
              return (
                <div
                  key={category.id}
                  className="flex w-full max-w-4xl flex-col items-start justify-start  gap-4 "
                  style={{
                    borderBottomWidth: index === categories.length - 1 ? 0 : 1,
                    borderBottomColor: "#E4E7EB",
                  }}
                >
                  <div className="flex w-full flex-1 flex-col items-start justify-start">
                    <h3 className="text-xl font-bold">{category.name}</h3>
                  </div>

                  <div className="w-full border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
                    <h5 className="text-md font-semibold mb-4">Modify outputs:</h5>
                    <div className="flex flex-col gap-2">
                      {category.outputs.map((output) => (
                        <div key={output.id}
                          className="flex items-center justify-between gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {output.name}
                          </span>
                          <button
                            onClick={() => handleRemoveOutput(category.id, output.id)}
                            className="text-secondary-500 hover:text-secondary-700 transition-colors"
                            aria-label="Remove output"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 mt-4 mx-2">
                        <input
                          type="text"
                          value={newOutputs[category.id] || ''}
                          onChange={(e) => setNewOutputs(prev => ({
                            ...prev,
                            [category.id]: e.target.value
                          }))}
                          placeholder="Enter new output name"
                          className="text-sm flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                            focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                        <Button
                          onClick={() => handleAddOutput(category.id)}
                          disabled={!newOutputs[category.id]?.trim()}
                          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 
                            transition-colors disabled:opacity-50"
                        >
                          Add Output
                        </Button>
                      </div>

                      {hasOutputChanges[category.id] && (
                        <Button
                          isLoading={isSavingOutputs[category.id]}
                          disabled={isSavingOutputs[category.id]}
                          onClick={() => saveOutputs(category)}
                          className="mt-4 bg-blue-500 px-4 py-2 rounded-md text-white hover:bg-blue-600 
                            dark:bg-blue-900 transition-colors"
                        >
                          Save outputs
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex w-full flex-1 flex-col flex-wrap items-start justify-start gap-1 break-words pb-10">

                    <h5 className="text-md font-semibold mb-4">Modify questions:</h5>

                    {questions.map((question) => {
                      const isSelected = questionsAssigned[
                        category.id
                      ]?.includes(question.id);
                      return (
                        <Button
                          key={`${category.id}${question.id}`}
                          className="flex h-max w-full max-w-2xl flex-row items-center justify-start gap-3 break-words bg-transparent px-0 py-1 text-left text-black dark:text-white transition-all duration-500 ease-in-out hover:bg-transparent"
                          style={{
                            opacity: isSelected ? 1 : 0.5,
                          }}
                          onClick={() => assign(category.id, question.id)}
                        >
                          <div className="flex h-4 w-4 flex-col items-center justify-start">
                            {isSelected ? (
                              <CheckIcon className="h-4 w-4" />
                            ) : (
                              <NoSymbolIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div data-color-mode="light">
                            <MarkdownPreview
                              components={{
                                strong: ({ children, ...props }) => {
                                  return (
                                    <ExternalLink {...props}>
                                      {children}
                                    </ExternalLink>
                                  );
                                },
                                a: ({ children, ...props }) => {
                                  return (
                                    <ExternalLink {...props}>
                                      {children}
                                    </ExternalLink>
                                  );
                                },
                              }}
                              source={question.query}
                            />
                          </div>
                        </Button>
                      );
                    })}
                    <div className="mt-4 flex w-max flex-row">
                      <Button
                        isLoading={isSaving[category.id]}
                        disabled={isSaving[category.id]}
                        onClick={() => saveAssign(category)}
                        className="bg-blue-500 px-4 py-2 rounded-md text-white hover:bg-blue-500 dark:bg-blue-900"
                      >
                        Save questions
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex w-full flex-1 flex-col items-center justify-center gap-3">
              <p>{MESSAGES.CATEGORIES.ASSIGN_QUESTIONS.EMPTY}</p>
              <div className="flex flex-row gap-10 items-center">
                <Link
                  href={PAGES.ADMIN.ASSIGN_QUESTIONS(
                    community?.details?.data?.slug || (community?.uid as string)
                  )}
                >
                  <Button className="px-10 py-8 bg-brand-blue hover:bg-brand-blue rounded-md transition-all ease-in-out duration-200">
                    Edit categories
                  </Button>
                </Link>
              </div>
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
