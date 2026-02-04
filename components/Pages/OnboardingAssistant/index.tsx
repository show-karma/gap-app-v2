"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useCallback, useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { useOnboardingAssistantModalStore } from "@/store/modals/onboardingAssistant";
import { useOnboardingAssistantDataStore } from "@/store/onboardingAssistantData";
import { OnboardingChat } from "./OnboardingChat";
import { OnboardingSuggestions } from "./OnboardingSuggestions";
import { ReviewPanel } from "./ReviewPanel";
import { useOnboardingChat } from "./useOnboardingChat";

type DrawerView = "suggestions" | "chat" | "review";

export function OnboardingAssistantDrawer() {
  const { isOnboardingAssistantOpen, closeOnboardingAssistant } =
    useOnboardingAssistantModalStore();
  const { setExtractedData: setStoreData } = useOnboardingAssistantDataStore();

  const [view, setView] = useState<DrawerView>("suggestions");
  const chatHook = useOnboardingChat();

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      chatHook.setInput(suggestion);
      setView("chat");
      // Submit after state updates
      setTimeout(() => {
        const fakeEvent = {
          preventDefault: () => {},
        } as React.FormEvent;
        chatHook.handleSubmit(fakeEvent);
      }, 0);
    },
    [chatHook]
  );

  const handleClose = useCallback(() => {
    closeOnboardingAssistant();
  }, [closeOnboardingAssistant]);

  const handleReset = useCallback(() => {
    chatHook.resetConversation();
    setView("suggestions");
  }, [chatHook]);

  const handleReviewClick = useCallback(() => {
    if (chatHook.hasExtractedData) {
      setView("review");
    }
  }, [chatHook.hasExtractedData]);

  const handleBackToChat = useCallback(() => {
    setView("chat");
  }, []);

  const handleCreateProject = useCallback(() => {
    if (chatHook.extractedData) {
      setStoreData(chatHook.extractedData);
      closeOnboardingAssistant();
      // The ProjectDialog will pick up the data from the store
      const createButton = document.getElementById("new-project-button");
      if (createButton) {
        createButton.click();
      }
    }
  }, [chatHook.extractedData, setStoreData, closeOnboardingAssistant]);

  // When messages arrive and we're on suggestions, switch to chat
  if (view === "suggestions" && chatHook.messages.length > 0) {
    setView("chat");
  }

  return (
    <DrawerPrimitive.Root
      direction="right"
      open={isOnboardingAssistantOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DrawerPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-50 w-[500px] max-w-[90vw] bg-white dark:bg-zinc-900 shadow-xl flex flex-col outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <Image src="/logo/logo-dark.png" width={24} height={24} alt="Karma AI" quality={50} />
              <DrawerPrimitive.Title className="text-base font-semibold text-gray-900 dark:text-white">
                Karma AI Assistant
              </DrawerPrimitive.Title>
            </div>
            <div className="flex items-center gap-1">
              {chatHook.hasExtractedData && view === "chat" && (
                <button
                  type="button"
                  onClick={handleReviewClick}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                >
                  Review Data
                </button>
              )}
              {view !== "suggestions" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Reset conversation"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {view === "suggestions" && (
              <OnboardingSuggestions
                onSuggestionClick={handleSuggestionClick}
                disabled={chatHook.isLoading}
              />
            )}
            {view === "chat" && (
              <OnboardingChat
                messages={chatHook.messages}
                input={chatHook.input}
                onInputChange={chatHook.handleInputChange}
                onSubmit={chatHook.handleSubmit}
                isLoading={chatHook.isLoading}
                isStreaming={chatHook.isStreaming}
                error={chatHook.error}
              />
            )}
            {view === "review" && chatHook.extractedData && (
              <ReviewPanel
                data={chatHook.extractedData}
                onEdit={handleBackToChat}
                onCreateProject={handleCreateProject}
              />
            )}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
