"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Send, Trash2, Loader2, ArrowDownIcon } from "lucide-react";
import { Button } from "@/components/Utilities/Button";
import {
  useNotificationConfigs,
  useSaveNotificationConfig,
  useDeleteNotificationConfig,
  useTestNotificationConfig,
  type NotificationProviderConfig,
} from "@/hooks/useNotificationConfig";

// ── Zod Schemas ──

const telegramConfigSchema = z.object({
  botToken: z.string().min(1, "Bot token is required"),
  chatId: z.string().min(1, "Chat ID is required"),
  isEnabled: z.boolean(),
});

const slackConfigSchema = z.object({
  webhookUrl: z.string().url("Must be a valid URL"),
  isEnabled: z.boolean(),
});

type TelegramFormData = z.infer<typeof telegramConfigSchema>;
type SlackFormData = z.infer<typeof slackConfigSchema>;

interface NotificationConfigTabProps {
  communityId: string;
  programId: string;
  readOnly?: boolean;
}

function ProviderCard({
  title,
  providerType,
  programId,
  communityId,
  config,
  communityConfig,
  readOnly,
}: {
  title: string;
  providerType: "TELEGRAM" | "SLACK";
  programId: string;
  communityId: string;
  config?: NotificationProviderConfig;
  communityConfig?: NotificationProviderConfig;
  readOnly?: boolean;
}) {
  const { mutate: saveConfig, isPending: isSaving } = useSaveNotificationConfig(communityId);
  const { mutate: deleteConfig, isPending: isDeleting } = useDeleteNotificationConfig(communityId);
  const { mutate: testConfig, isPending: isTesting } = useTestNotificationConfig(communityId);

  const isTelegram = providerType === "TELEGRAM";

  const form = useForm<TelegramFormData | SlackFormData>({
    resolver: zodResolver(isTelegram ? telegramConfigSchema : slackConfigSchema),
    defaultValues: isTelegram
      ? {
          botToken: (config as any)?.botToken ?? "",
          chatId: (config as any)?.chatId ?? "",
          isEnabled: config?.isEnabled ?? false,
        }
      : {
          webhookUrl: (config as any)?.webhookUrl ?? "",
          isEnabled: config?.isEnabled ?? false,
        },
  });

  const prevConfigId = useRef<string | undefined>(config?.id);
  useEffect(() => {
    if (config?.id !== prevConfigId.current) {
      prevConfigId.current = config?.id;
      if (isTelegram) {
        form.reset({
          botToken: (config as any)?.botToken ?? "",
          chatId: (config as any)?.chatId ?? "",
          isEnabled: config?.isEnabled ?? false,
        });
      } else {
        form.reset({
          webhookUrl: (config as any)?.webhookUrl ?? "",
          isEnabled: config?.isEnabled ?? false,
        });
      }
    }
  }, [config, form, isTelegram]);

  const onSubmit = (data: any) => {
    saveConfig(
      {
        programId,
        providerType,
        botToken: data.botToken ?? null,
        chatId: data.chatId ?? null,
        webhookUrl: data.webhookUrl ?? null,
        isEnabled: data.isEnabled,
      },
      {
        onSuccess: () => toast.success(`${title} configuration saved`),
        onError: (err) => toast.error(err.message || "Failed to save"),
      }
    );
  };

  const handleTest = () => {
    const values = form.getValues();
    testConfig(
      {
        providerType,
        botToken: (values as any).botToken ?? null,
        chatId: (values as any).chatId ?? null,
        webhookUrl: (values as any).webhookUrl ?? null,
      },
      {
        onSuccess: (result) => {
          if (result.success) toast.success("Test notification sent!");
          else toast.error(result.message || "Test failed");
        },
        onError: (err) => toast.error(err.message || "Test failed"),
      }
    );
  };

  const handleDelete = () => {
    if (!config?.id) return;
    if (!confirm(`Delete this program-level ${title} override?`)) return;
    deleteConfig(config.id, {
      onSuccess: () => toast.success(`${title} override deleted`),
      onError: (err) => toast.error(err.message || "Failed to delete"),
    });
  };

  const inheritsFromCommunity = !config && communityConfig;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
        <div className="flex items-center gap-2">
          {inheritsFromCommunity && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowDownIcon className="w-3 h-3" />
              Inherited from community
            </span>
          )}
          {config && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                config.isEnabled
                  ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}
            >
              {config.isEnabled ? "Override active" : "Override disabled"}
            </span>
          )}
          {!config && !communityConfig && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
              Not configured
            </span>
          )}
        </div>
      </div>

      {readOnly ? (
        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
          You don&apos;t have permission to edit notification settings for this program.
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-3">
          <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
            <input
              type="checkbox"
              id={`${providerType}-enabled`}
              {...form.register("isEnabled")}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor={`${providerType}-enabled`} className="text-sm text-gray-900 dark:text-white">
              Enable {title} for this program
            </label>
          </div>

          {isTelegram ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Bot Token
                </label>
                <input
                  type="password"
                  {...(form.register as any)("botToken")}
                  placeholder="123456:ABC-DEF..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Chat ID
                </label>
                <input
                  type="text"
                  {...(form.register as any)("chatId")}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                {...(form.register as any)("webhookUrl")}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isSaving} className="text-sm px-3 py-1.5">
              {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              {config ? "Update Override" : "Save Override"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={isTesting}
              className="text-sm px-3 py-1.5"
            >
              {isTesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
              Test
            </Button>
            {config && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm px-3 py-1.5 text-red-600"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export function NotificationConfigTab({
  communityId,
  programId,
  readOnly = false,
}: NotificationConfigTabProps) {
  const { configs, isLoading, error } = useNotificationConfigs(communityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load notification settings.
        </p>
      </div>
    );
  }

  // Program-level configs
  const programConfigs = configs.filter((c) => c.programId === programId);
  const communityConfigs = configs.filter((c) => !c.programId);

  const programTelegram = programConfigs.find((c) => c.providerType === "TELEGRAM");
  const programSlack = programConfigs.find((c) => c.providerType === "SLACK");
  const communityTelegram = communityConfigs.find((c) => c.providerType === "TELEGRAM");
  const communitySlack = communityConfigs.find((c) => c.providerType === "SLACK");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          Notification Settings
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Override community-level notification settings for this specific program. If no override is
          set, the community settings apply.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Resolution order:</strong> Program override → Community settings → Email (default).
        </p>
      </div>

      <div className="space-y-4">
        <ProviderCard
          title="Telegram"
          providerType="TELEGRAM"
          programId={programId}
          communityId={communityId}
          config={programTelegram}
          communityConfig={communityTelegram}
          readOnly={readOnly}
        />
        <ProviderCard
          title="Slack"
          providerType="SLACK"
          programId={programId}
          communityId={communityId}
          config={programSlack}
          communityConfig={communitySlack}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
